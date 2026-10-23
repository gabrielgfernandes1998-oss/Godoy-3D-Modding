using CodeWalker.GameFiles;
using CodeWalker.Utils;
using SharpDX;
using System.Text.Json;

// One diffuse for ped preview/runtime overrides. Auxiliary atlases stay embedded in YDD.
static class YddAtlas {
    static bool Is(uint hash,string name)=>hash==JenkHash.GenHash(name)||hash==JenkHash.GenHash(name.ToLowerInvariant());
    static ShaderParameter? Slot(ShaderFX shader,string name) {
        var block=shader.ParametersList;
        for(int i=0;i<block.Parameters.Length;i++)if(block.Parameters[i].DataType==0&&Is((uint)block.Hashes[i],name))return block.Parameters[i];
        return null;
    }
    static int Pow2(int n){int value=1;while(value<n)value*=2;return value;}
    public static Vector2 AdditionUv(JsonElement request,int part,Vector2 uv) {
        int grid=(int)Math.Ceiling(Math.Sqrt(request.GetProperty("additions").GetArrayLength()));
        float padding=.015f;
        return new Vector2(.5f+((part%grid+padding+uv.X*(1-2*padding))/grid)*.5f,(part/grid+padding+uv.Y*(1-2*padding))/grid);
    }
    public static byte[] Build(YddFile ydd,JsonElement request) {
        var parts=request.GetProperty("additions");
        if(parts.ValueKind!=JsonValueKind.Array||parts.GetArrayLength()<1||parts.GetArrayLength()>32)throw new Exception("Atlas exige 1–32 partes OBJ.");
        var bytes=Convert.FromBase64String(request.GetProperty("ytdData").GetString()!);
        if(bytes.Length>80*1024*1024)throw new Exception("YTD acima de 80 MB.");
        var ytd=new YtdFile();ytd.Load(bytes);
        var dictionary=ytd.TextureDict??throw new Exception("YTD inválido.");
        Texture? Resolve(Drawable drawable,TextureBase reference)=>reference as Texture??dictionary.Lookup(reference.NameHash)??drawable.ShaderGroup.TextureDictionary?.Lookup(reference.NameHash);
        // FbxConverter uses this name when no texture was assigned. Only absent
        // placeholders are exempt: an actual checker image still needs UV handling.
        bool MissingPlaceholder(Drawable drawable,TextureBase reference)=>string.Equals(reference.Name,"givemechecker",StringComparison.OrdinalIgnoreCase)&&Resolve(drawable,reference) is null;
        var tiles=new Dictionary<ShaderFX,(Texture diffuse,Texture? normal,Texture? spec,int index)>();
        foreach(var drawable in ydd.Drawables)foreach(var model in drawable.AllModels)foreach(var geometry in model.Geometries) {
            var shader=geometry.Shader??throw new Exception("Geometria sem material nativo para atlas.");
            if(tiles.ContainsKey(shader))continue;
            var reference=Slot(shader,"DiffuseSampler")?.Data as TextureBase??throw new Exception("Atlas exige DiffuseSampler no material da roupa.");
            var diffuse=dictionary.Lookup(reference.NameHash)??(dictionary.Textures.data_items.Length==1?dictionary.Textures.data_items[0]:null)??Resolve(drawable,reference)??throw new Exception($"YTD não contém a diffuse '{reference.Name}'. Associe o YTD correspondente ao YDD original.");
            Texture? Auxiliary(string slot) {
                var data=Slot(shader,slot)?.Data as TextureBase;
                if(data is null||string.IsNullOrEmpty(data.Name)||MissingPlaceholder(drawable,data))return null;
                return Resolve(drawable,data)??throw new Exception($"Mapa auxiliar '{data.Name}' ausente. Associe um YTD que contenha esse mapa ou incorpore-o no YDD antes de gerar o atlas.");
            }
            if(Slot(shader,"DiffuseSampler2")?.Data is TextureBase secondary&&!string.IsNullOrEmpty(secondary.Name)&&!MissingPlaceholder(drawable,secondary))throw new Exception("Shader com segunda diffuse exige composição específica; atlas automático cancelado para preservar o material.");
            for(int i=0;i<shader.ParametersList.Parameters.Length;i++) {
                var parameter=shader.ParametersList.Parameters[i];
                if(parameter.DataType!=0||parameter.Data is not TextureBase other||string.IsNullOrEmpty(other.Name))continue;
                uint hash=(uint)shader.ParametersList.Hashes[i];
                if(MissingPlaceholder(drawable,other))continue; // Preserve opaque slot/hash/reference, not an image to atlas.
                if(!new[]{"DiffuseSampler","BumpSampler","NormalSampler","SpecSampler","TintPaletteSampler"}.Any(name=>Is(hash,name)))throw new Exception($"Sampler 0x{hash:x8} ('{other.Name}') exige tratamento específico de UV. Atlas cancelado para preservar o material.");
            }
            tiles.Add(shader,(diffuse,Auxiliary("BumpSampler")??Auxiliary("NormalSampler"),Auxiliary("SpecSampler"),tiles.Count));
        }
        if(tiles.Count==0)throw new Exception("YDD sem materiais para atlas.");
        int grid=(int)Math.Ceiling(Math.Sqrt(tiles.Count));
        int cellW=Pow2(tiles.Values.Max(t=>(int)t.diffuse.Width)),cellH=Pow2(tiles.Values.Max(t=>(int)t.diffuse.Height));
        int leftW=Pow2(Math.Max(256,cellW*grid));
        int side=Pow2(Math.Max(leftW*2,Math.Max(256,cellH*(int)Math.Ceiling(tiles.Count/(double)grid)))),width=side,height=side;
        if(width>8192||height>8192||(long)width*height>16777216)throw new Exception("Atlas excede 8192 pixels ou 16 megapixels. Reduza a resolução das texturas originais antes de exportar.");
        bool needNormal=tiles.Keys.Any(s=>Slot(s,"BumpSampler") is not null||Slot(s,"NormalSampler") is not null),needSpec=tiles.Keys.Any(s=>Slot(s,"SpecSampler") is not null);
        var diffusePixels=Fill(width,height,220,220,220);var normalPixels=needNormal?Fill(width,height,128,128,255):null;var specPixels=needSpec?Fill(width,height,0,0,0):null;
        foreach(var tile in tiles.Values) {
            int x=tile.index%grid*cellW,y=tile.index/grid*cellH;
            Paste(diffusePixels,width,x,y,tile.diffuse,tile.diffuse.Width,tile.diffuse.Height);
            if(tile.normal is not null)Paste(normalPixels!,width,x,y,tile.normal,tile.diffuse.Width,tile.diffuse.Height);
            if(tile.spec is not null)Paste(specPixels!,width,x,y,tile.spec,tile.diffuse.Width,tile.diffuse.Height);
        }
        string diffuseName=tiles.Values.First().diffuse.Name;
        string suffix=Guid.NewGuid().ToString("N")[..12];
        var diffuseAtlas=Pixels(diffuseName,width,height,diffusePixels,TextureUsage.DIFFUSE);
        var normalAtlas=normalPixels is null?null:Pixels("godoy_atlas_n_"+suffix,width,height,normalPixels,TextureUsage.NORMAL);
        var specAtlas=specPixels is null?null:Pixels("godoy_atlas_s_"+suffix,width,height,specPixels,TextureUsage.SPECULAR);
        var visited=new HashSet<VertexData>();
        foreach(var drawable in ydd.Drawables) {
            foreach(var model in drawable.AllModels)foreach(var geometry in model.Geometries) {
                var tile=tiles[geometry.Shader];var data=geometry.VertexData;
                if(!visited.Add(data))throw new Exception("Buffers UV compartilhados não suportados pelo atlas.");
                for(int i=0;i<data.VertexCount;i++) {
                    Vector2 uv=data.Info.GetComponentType(6) switch {VertexComponentType.Float2=>data.GetVector2(i,6),VertexComponentType.Half2=>(Vector2)data.GetHalf2(i,6),_=>throw new Exception("Atlas exige UV Float2 ou Half2.")};
                    if(!float.IsFinite(uv.X)||!float.IsFinite(uv.Y)||uv.X<0||uv.Y<0||uv.X>1||uv.Y>1)throw new Exception("UV original fora de 0–1: prepare as ilhas no editor antes de gerar o atlas; repetição não é recortada automaticamente.");
                    uv=new Vector2((tile.index%grid*cellW+.5f+uv.X*(tile.diffuse.Width-1))/width,(tile.index/grid*cellH+.5f+uv.Y*(tile.diffuse.Height-1))/height);
                    if(data.Info.GetComponentType(6)==VertexComponentType.Float2)data.SetVector2(i,6,uv);else data.SetHalf2(i,6,new Half2(uv.X,uv.Y));
                }
            }
            // Keep source palettes/details available when the output YTD contains only diffuse.
            var embedded=drawable.ShaderGroup.TextureDictionary??new TextureDictionary();
            var textures=embedded.Textures?.data_items?.Where(t=>t.NameHash!=diffuseAtlas.NameHash).ToList()??new List<Texture>();
            foreach(var texture in dictionary.Textures.data_items)if(texture.NameHash!=diffuseAtlas.NameHash&&!textures.Any(t=>t.NameHash==texture.NameHash))textures.Add(texture);
            foreach(var shader in drawable.ShaderGroup.Shaders.data_items) {
                if(!tiles.ContainsKey(shader))continue;
                Slot(shader,"DiffuseSampler")!.Data=new TextureBase{Name=diffuseName,NameHash=diffuseAtlas.NameHash};
                foreach(string slot in new[]{"BumpSampler","NormalSampler","SpecSampler"}) {
                    var parameter=Slot(shader,slot);if(parameter is null)continue;
                    var map=(slot=="SpecSampler"?specAtlas:normalAtlas)!;
                    parameter.Data=map;
                    if(!textures.Any(t=>t.NameHash==map.NameHash))textures.Add(map);
                }
            }
            if(textures.Count>0)embedded.BuildFromTextureList(textures);
            drawable.ShaderGroup.TextureDictionary=textures.Count>0?embedded:null;
        }
        // Exactly one YTD entry: grzy / ped diffuseOverride cannot select a neutral map.
        dictionary.BuildFromTextureList(new List<Texture>{diffuseAtlas});
        var saved=ytd.Save();var reopened=new YtdFile();reopened.Load(saved);
        var actual=reopened.TextureDict.Textures.data_items.Single();
        if(actual.Name!=diffuseName||actual.Width!=width||actual.Height!=height||!actual.Data.FullData.SequenceEqual(diffuseAtlas.Data.FullData))throw new Exception("Atlas YTD divergiu após reabertura.");
        return saved;
    }
    static byte[] Fill(int w,int h,byte r,byte g,byte b) {var data=new byte[w*h*4];for(int i=0;i<data.Length;i+=4){data[i]=b;data[i+1]=g;data[i+2]=r;data[i+3]=255;}return data;}
    static void Paste(byte[] target,int stride,int x,int y,Texture texture,int w,int h) {
        var pixels=DDSIO.GetPixels(texture,0)??throw new Exception($"Formato de textura não suportado no atlas: {texture.Name} ({texture.Format}).");
        if(pixels.Length!=texture.Width*texture.Height*4)throw new Exception("Dados de textura inválidos para atlas.");
        // Preserve diffuse pixels 1:1; auxiliary maps are resampled to their diffuse chart.
        for(int j=0;j<h;j++)for(int i=0;i<w;i++)Buffer.BlockCopy(pixels,((j*texture.Height/h)*texture.Width+i*texture.Width/w)*4,target,((y+j)*stride+x+i)*4,4);
    }
    public static Texture Pixels(string name,int w,int h,byte[] pixels,TextureUsage usage) {
        var mips=new List<byte>();byte levels=0;var current=pixels;
        int width=w,height=h;
        while(true) {
            mips.AddRange(current);levels++;if(width==1&&height==1)break;
            int nw=Math.Max(1,width/2),nh=Math.Max(1,height/2);var next=new byte[nw*nh*4];
            for(int y=0;y<nh;y++)for(int x=0;x<nw;x++)for(int c=0;c<4;c++){int sum=0;for(int dy=0;dy<2;dy++)for(int dx=0;dx<2;dx++)sum+=current[(Math.Min(height-1,y*2+dy)*width+Math.Min(width-1,x*2+dx))*4+c];next[(y*nw+x)*4+c]=(byte)((sum+2)/4);}
            current=next;width=nw;height=nh;
        }
        return new Texture{Name=name,NameHash=JenkHash.GenHash(name.ToLowerInvariant()),Width=(ushort)w,Height=(ushort)h,Depth=1,Stride=(ushort)(w*4),Levels=levels,Usage=usage,Format=TextureFormat.D3DFMT_A8R8G8B8,Data=new TextureData{FullData=mips.ToArray()}};
    }
}
