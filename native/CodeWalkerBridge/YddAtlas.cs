using CodeWalker.GameFiles;
using CodeWalker.Utils;
using SharpDX;
using System.Text.Json;
using System.Security.Cryptography;

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
        if(request.TryGetProperty("atlasLayout",out var layout)) {
            var r=layout.GetProperty("additions")[part];float size=layout.GetProperty("size").GetInt32();
            return new Vector2((r.GetProperty("x").GetSingle()+.5f+uv.X*(r.GetProperty("width").GetSingle()-1))/size,(r.GetProperty("y").GetSingle()+.5f+uv.Y*(r.GetProperty("height").GetSingle()-1))/size);
        }
        int grid=(int)Math.Ceiling(Math.Sqrt(request.GetProperty("additions").GetArrayLength()));
        float padding=.015f;
        return new Vector2(.5f+((part%grid+padding+uv.X*(1-2*padding))/grid)*.5f,(part/grid+padding+uv.Y*(1-2*padding))/grid);
    }
    sealed record Tile(Texture diffuse,Texture? normal,Texture? spec,int index);
    public sealed record Rect(int x,int y,int width,int height);
    public sealed record AtlasPlan(int width,int height,int requiredSize,int divisor,int columns,int regions,int materials,int sourceWidth,int sourceHeight,int limit,bool reduced,bool fits,int auxiliaryResolution,Rect[]? sourceRects=null,Rect[]? additionRects=null,string[]? sourceNames=null);
    static (YtdFile ytd,Dictionary<ShaderFX,Tile> tiles) Gather(YddFile ydd,JsonElement request) {
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
        var tiles=new Dictionary<ShaderFX,Tile>();
        var regions=new Dictionary<(string,string,string),int>();var identities=new Dictionary<Texture,string>();
        string Identity(Texture? texture) {
            if(texture is null)return "";
            if(!identities.TryGetValue(texture,out var key)) {
                if(texture.Width<1||texture.Height<1||texture.Width>8192||texture.Height>8192||texture.Data?.FullData is null)throw new Exception("Dimensões/dados da textura inválidos para atlas.");
                key=$"{texture.Width}:{texture.Height}:{texture.Format}:{texture.Stride}:"+Convert.ToHexString(SHA256.HashData(texture.Data.FullData));identities[texture]=key;
            }
            return key;
        }
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
            var normal=Auxiliary("BumpSampler")??Auxiliary("NormalSampler");var spec=Auxiliary("SpecSampler");
            var identity=(Identity(diffuse),Identity(normal),Identity(spec));
            if(!regions.TryGetValue(identity,out int region)){region=regions.Count;regions[identity]=region;}
            tiles.Add(shader,new Tile(diffuse,normal,spec,region));
        }
        if(tiles.Count==0)throw new Exception("YDD sem materiais para atlas.");
        return (ytd,tiles);
    }
    static AtlasPlan Layout(Dictionary<ShaderFX,Tile> tiles,JsonElement request) {
        int limit=request.TryGetProperty("atlasMaxResolution",out var option)?option.GetInt32():4096;
        if(!new[]{0,1024,2048,4096}.Contains(limit))throw new Exception("Escolha resolução máxima de 1024, 2048 ou 4096, ou preservar original.");
        int regions=tiles.Values.Max(t=>t.index)+1,sourceW=tiles.Values.Max(t=>(int)t.diffuse.Width),sourceH=tiles.Values.Max(t=>(int)t.diffuse.Height);
        (int size,int columns) Size(int divisor) {
            int cellW=Pow2(Math.Max(1,sourceW/divisor)),cellH=Pow2(Math.Max(1,sourceH/divisor));
            int best=int.MaxValue,columns=1;
            for(int c=1;c<=regions;c++) {
                int size=Pow2(Math.Max(512,Math.Max(cellW*c*2,cellH*((regions+c-1)/c))));
                if(size<best){best=size;columns=c;}
            }
            return (best,columns);
        }
        if(request.TryGetProperty("atlasLayout",out var manual)) {
            int side=manual.GetProperty("size").GetInt32();
            if(!new[]{512,1024,2048,4096}.Contains(side))throw new Exception("Tamanho do atlas manual inválido.");
            Rect[] Rects(string key,int count) {
                var items=manual.GetProperty(key);if(items.ValueKind!=JsonValueKind.Array||items.GetArrayLength()!=count)throw new Exception("Quantidade de áreas UV inválida.");
                return items.EnumerateArray().Select(r=> {
                    var rect=new Rect(r.GetProperty("x").GetInt32(),r.GetProperty("y").GetInt32(),r.GetProperty("width").GetInt32(),r.GetProperty("height").GetInt32());
                    if(rect.x<0||rect.y<0||rect.width<4||rect.height<4||rect.x>side-rect.width||rect.y>side-rect.height)throw new Exception("Área UV fora do atlas ou menor que 4 pixels.");
                    return rect;
                }).ToArray();
            }
            var sources=Rects("sources",regions);var additions=Rects("additions",request.GetProperty("additions").GetArrayLength());
            bool Overlap(Rect a,Rect b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
            foreach(var group in new[]{sources,additions})for(int i=0;i<group.Length;i++)for(int j=i+1;j<group.Length;j++)if(Overlap(group[i],group[j]))throw new Exception("Áreas de dois OBJ ou duas texturas da roupa não podem se sobrepor.");
            bool reduced=tiles.Values.Any(t=>sources[t.index].width<t.diffuse.Width||sources[t.index].height<t.diffuse.Height);
            bool aux=tiles.Keys.Any(s=>Slot(s,"BumpSampler") is not null||Slot(s,"NormalSampler") is not null||Slot(s,"SpecSampler") is not null);
            return new AtlasPlan(side,side,side,1,1,regions,tiles.Count,sourceW,sourceH,limit,reduced,true,aux?Math.Min(side,2048):0,sources,additions,tiles.Values.DistinctBy(t=>t.index).OrderBy(t=>t.index).Select(t=>t.diffuse.Name).ToArray());
        }
        var original=Size(1);int divisor=1;var output=original;
        if(limit!=0)while(output.size>limit){divisor*=2;output=Size(divisor);}
        return new AtlasPlan(output.size,output.size,original.size,divisor,output.columns,regions,tiles.Count,sourceW,sourceH,limit,divisor>1,output.size<=4096,tiles.Keys.Any(s=>Slot(s,"BumpSampler") is not null||Slot(s,"NormalSampler") is not null||Slot(s,"SpecSampler") is not null)?Math.Min(output.size,2048):0,sourceNames:tiles.Values.DistinctBy(t=>t.index).OrderBy(t=>t.index).Select(t=>t.diffuse.Name).ToArray());
    }
    public static AtlasPlan Plan(YddFile ydd,JsonElement request) {var (_,tiles)=Gather(ydd,request);return Layout(tiles,request);}
    public static byte[] Build(YddFile ydd,JsonElement request) {
        var (ytd,tiles)=Gather(ydd,request);var dictionary=ytd.TextureDict;var plan=Layout(tiles,request);
        if(!plan.fits)throw new Exception($"Preservar a resolução exigiria atlas {plan.requiredSize}×{plan.requiredSize}. Escolha Ajustar até 4096 na resolução do atlas.");
        int grid=plan.columns,width=plan.width,height=plan.height;
        int cellW=Pow2(Math.Max(1,plan.sourceWidth/plan.divisor)),cellH=Pow2(Math.Max(1,plan.sourceHeight/plan.divisor));
        bool needNormal=tiles.Keys.Any(s=>Slot(s,"BumpSampler") is not null||Slot(s,"NormalSampler") is not null),needSpec=tiles.Keys.Any(s=>Slot(s,"SpecSampler") is not null);
        var diffusePixels=Fill(width,height,220,220,220);var normalPixels=needNormal?Fill(width,height,128,128,255):null;var specPixels=needSpec?Fill(width,height,0,0,0):null;
        foreach(var tile in tiles.Values.DistinctBy(t=>t.index)) {
            int x=plan.sourceRects?[tile.index].x??tile.index%grid*cellW,y=plan.sourceRects?[tile.index].y??tile.index/grid*cellH;
            int tileW=plan.sourceRects?[tile.index].width??Math.Max(1,tile.diffuse.Width/plan.divisor),tileH=plan.sourceRects?[tile.index].height??Math.Max(1,tile.diffuse.Height/plan.divisor);
            Paste(diffusePixels,width,x,y,tile.diffuse,tileW,tileH,true);
            if(tile.normal is not null)Paste(normalPixels!,width,x,y,tile.normal,tileW,tileH,false);
            if(tile.spec is not null)Paste(specPixels!,width,x,y,tile.spec,tileW,tileH,false);
        }
        // An accessory replaces only the explicitly reserved rectangle. Other
        // source pixels stay intact, including when the source fills the atlas.
        if(plan.additionRects is not null)foreach(var r in plan.additionRects) {
            void Clear(byte[]? target,byte b,byte g,byte red) {
                if(target is null)return;
                for(int y=r.y;y<r.y+r.height;y++)for(int x=r.x;x<r.x+r.width;x++){int p=(y*width+x)*4;target[p]=b;target[p+1]=g;target[p+2]=red;target[p+3]=255;}
            }
            Clear(diffusePixels,220,220,220);Clear(normalPixels,255,128,128);Clear(specPixels,0,0,0);
        }
        string diffuseName=tiles.Values.First().diffuse.Name;
        string suffix=Guid.NewGuid().ToString("N")[..12];
        var diffuseAtlas=Pixels(diffuseName,width,height,diffusePixels,TextureUsage.DIFFUSE);
        var normalAtlas=normalPixels is null?null:AuxiliaryPixels("godoy_atlas_n_"+suffix,width,height,normalPixels,TextureUsage.NORMAL);
        var specAtlas=specPixels is null?null:AuxiliaryPixels("godoy_atlas_s_"+suffix,width,height,specPixels,TextureUsage.SPECULAR);
        var visited=new HashSet<VertexData>();
        foreach(var drawable in ydd.Drawables) {
            foreach(var model in drawable.AllModels)foreach(var geometry in model.Geometries) {
                var tile=tiles[geometry.Shader];var data=geometry.VertexData;
                if(!visited.Add(data))throw new Exception("Buffers UV compartilhados não suportados pelo atlas.");
                for(int i=0;i<data.VertexCount;i++) {
                    Vector2 uv=data.Info.GetComponentType(6) switch {VertexComponentType.Float2=>data.GetVector2(i,6),VertexComponentType.Half2=>(Vector2)data.GetHalf2(i,6),_=>throw new Exception("Atlas exige UV Float2 ou Half2.")};
                    if(!float.IsFinite(uv.X)||!float.IsFinite(uv.Y))throw new Exception("UV original contém coordenadas não finitas.");
                    var rect=plan.sourceRects?[tile.index];
                    // With the original image covering the complete atlas, GTA's
                    // texture wrapping remains valid. Keep coordinates exactly,
                    // including triangles crossing tile boundaries and negative UVs.
                    // Folding individual vertices into 0–1 would deform those faces.
                    if(rect is not null&&rect.x==0&&rect.y==0&&rect.width==width&&rect.height==height)continue;
                    if(uv.X<0||uv.Y<0||uv.X>1||uv.Y>1)throw new Exception("UV original fora de 0–1: clique Roupa no mapa inteiro no ajuste UV para preservar a repetição. Reduzir a área da roupa exige recorte das faces repetidas.");
                    uv=rect is null?new Vector2((tile.index%grid*cellW+.5f+uv.X*(Math.Max(1,tile.diffuse.Width/plan.divisor)-1))/width,(tile.index/grid*cellH+.5f+uv.Y*(Math.Max(1,tile.diffuse.Height/plan.divisor)-1))/height):new Vector2((rect.x+uv.X*rect.width)/width,(rect.y+uv.Y*rect.height)/height);
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
            // The old diffuse/normal/spec images are no longer referenced after
            // atlas rebinding. Do not embed redundant copies just to keep their bytes.
            var references=drawable.ShaderGroup.Shaders.data_items.SelectMany(s=>s.ParametersList.Parameters).Where(p=>p.DataType==0).Select(p=>p.Data as TextureBase).Where(t=>t is not null&&t.NameHash!=diffuseAtlas.NameHash).ToArray();
            foreach(var texture in references.OfType<Texture>())if(!textures.Any(t=>t.NameHash==texture.NameHash))textures.Add(texture);
            var required=references.Select(t=>t!.NameHash).ToHashSet();
            textures=textures.Where(t=>required.Contains(t.NameHash)).DistinctBy(t=>t.NameHash).ToList();
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
    static void Paste(byte[] target,int stride,int x,int y,Texture texture,int w,int h,bool color) {
        var pixels=DDSIO.GetPixels(texture,0)??throw new Exception($"Formato de textura não suportado no atlas: {texture.Name} ({texture.Format}).");
        if(pixels.Length!=texture.Width*texture.Height*4)throw new Exception("Dados de textura inválidos para atlas.");
        if(w==texture.Width&&h==texture.Height) {
            for(int j=0;j<h;j++)Buffer.BlockCopy(pixels,j*w*4,target,((y+j)*stride+x)*4,w*4);
            return;
        }
        // Area filter; alpha-weighted diffuse avoids dark fringes on transparency.
        for(int j=0;j<h;j++)for(int i=0;i<w;i++) {
            double left=i*texture.Width/(double)w,right=(i+1)*texture.Width/(double)w,top=j*texture.Height/(double)h,bottom=(j+1)*texture.Height/(double)h;
            double weight=0,alpha=0,b=0,g=0,r=0;
            for(int sy=(int)top;sy<Math.Ceiling(bottom);sy++)for(int sx=(int)left;sx<Math.Ceiling(right);sx++) {
                double amount=(Math.Min(right,sx+1)-Math.Max(left,sx))*(Math.Min(bottom,sy+1)-Math.Max(top,sy));
                int source=(Math.Min(sy,texture.Height-1)*texture.Width+Math.Min(sx,texture.Width-1))*4;
                double rgbWeight=amount*(color?pixels[source+3]/255.0:1);weight+=amount;alpha+=pixels[source+3]*amount;
                b+=pixels[source]*rgbWeight;g+=pixels[source+1]*rgbWeight;r+=pixels[source+2]*rgbWeight;
            }
            double divisor=color?alpha/255:weight;int destination=((y+j)*stride+x+i)*4;
            byte Byte(double value)=>(byte)Math.Clamp((int)Math.Round(value),0,255);
            target[destination]=Byte(divisor>0?b/divisor:0);target[destination+1]=Byte(divisor>0?g/divisor:0);target[destination+2]=Byte(divisor>0?r/divisor:0);target[destination+3]=Byte(alpha/weight);
        }
    }
    // A 4096 BGRA mip chain occupies a 128 MiB RSC graphics page. Two such
    // maps exceed the reader budget once system pages/geometry are included.
    // Half-size auxiliary maps retain the same normalized UV coordinates.
    static Texture AuxiliaryPixels(string name,int w,int h,byte[] pixels,TextureUsage usage) {
        if(w<=2048)return Pixels(name,w,h,pixels,usage);
        int width=w/2,height=h/2;var reduced=new byte[width*height*4];
        for(int y=0;y<height;y++)for(int x=0;x<width;x++)for(int c=0;c<4;c++) {
            int sum=0;for(int dy=0;dy<2;dy++)for(int dx=0;dx<2;dx++)sum+=pixels[((y*2+dy)*w+x*2+dx)*4+c];
            reduced[(y*width+x)*4+c]=(byte)((sum+2)/4);
        }
        return Pixels(name,width,height,reduced,usage);
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
