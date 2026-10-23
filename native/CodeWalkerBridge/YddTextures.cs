using CodeWalker.GameFiles;
using System.Reflection;
using System.Text.Json;
using System.Text.RegularExpressions;

// Original textures are retained byte-for-byte. Added parts get independent samplers.
static class YddTextures {
    static T Clone<T>(T item) where T:class => (T)typeof(object).GetMethod("MemberwiseClone",BindingFlags.Instance|BindingFlags.NonPublic)!.Invoke(item,null)!;
    public static byte[]? Build(JsonElement request) {
        if(!request.TryGetProperty("ytdData",out var encoded))return null;
        var bytes=Convert.FromBase64String(encoded.GetString()!);
        if(bytes.Length>80*1024*1024)throw new Exception("YTD acima de 80 MB.");
        var file=new YtdFile();file.Load(bytes);
        var textures=file.TextureDict?.Textures?.data_items?.ToList()??throw new Exception("Dicionário YTD inválido.");
        var originals=textures.Select(t=>(t.Name,t.Width,t.Height,t.Format,data:t.Data.FullData.ToArray())).ToArray();
        var additions=request.GetProperty("additions");
        if(additions.ValueKind!=JsonValueKind.Array||additions.GetArrayLength()>32)throw new Exception("Quantidade de texturas OBJ inválida.");
        foreach(var part in additions.EnumerateArray()) {
            var name=Name(part);
            foreach(var texture in new[]{Solid(name,1024,220,220,220),Solid(name+"_n",4,128,128,255),Solid(name+"_s",4,0,0,0)}) {
                if(textures.Any(t=>t.NameHash==texture.NameHash))throw new Exception("Nome de textura OBJ já existe no YTD. Reimporte o YDD original ou use outro conjunto.");
                textures.Add(texture);
            }
        }
        file.TextureDict.BuildFromTextureList(textures);
        var saved=file.Save();var reopened=new YtdFile();reopened.Load(saved);
        foreach(var original in originals) {
            var t=reopened.TextureDict.Textures.data_items.Single(t=>t.Name==original.Name);
            if(t.Width!=original.Width||t.Height!=original.Height||t.Format!=original.Format||!t.Data.FullData.SequenceEqual(original.data))throw new Exception("Verificação YTD: textura original alterada.");
        }
        foreach(var texture in textures) {
            var actual=reopened.TextureDict.Textures.data_items.Single(t=>t.NameHash==texture.NameHash);
            if(actual.Levels!=texture.Levels||!actual.Data.FullData.SequenceEqual(texture.Data.FullData))throw new Exception("Verificação YTD: pixels/mipmaps divergentes.");
        }
        if(reopened.TextureDict.Textures.data_items.Length!=textures.Count)throw new Exception("Verificação YTD: textura OBJ ausente.");
        return saved;
    }
    static string Name(JsonElement part) {
        var name=part.GetProperty("textureName").GetString()??"";
        if(!Regex.IsMatch(name,"^godoy_obj_[a-z0-9_]{1,48}$"))throw new Exception("Nome de textura OBJ inválido.");
        return name;
    }
    public static ushort Material(Drawable drawable,DrawableGeometry template,JsonElement part) {
        var name=Name(part);var group=drawable.ShaderGroup;
        var source=template.Shader??group?.Shaders?.data_items?.ElementAtOrDefault(template.ShaderID);
        if(source?.ParametersList?.Parameters is null||group?.Shaders is null)throw new Exception("O YDD precisa de material nativo com diffuse para gerar a textura OBJ.");
        var shader=Clone(source);var parameters=Clone(source.ParametersList);shader.ParametersList=parameters;parameters.Owner=shader;
        parameters.Hashes=source.ParametersList.Hashes.ToArray();parameters.Parameters=source.ParametersList.Parameters.Select(Clone).ToArray();
        bool diffuse=false;
        for(int i=0;i<parameters.Parameters.Length;i++) {
            var p=parameters.Parameters[i];if(p.DataType!=0)continue;
            uint hash=(uint)parameters.Hashes[i];
            bool isDiffuse=hash==JenkHash.GenHash("DiffuseSampler")||hash==JenkHash.GenHash("DiffuseSampler2");
            bool normal=hash==JenkHash.GenHash("BumpSampler")||hash==JenkHash.GenHash("NormalSampler");
            string textureName=isDiffuse?name:name+(normal?"_n":"_s");
            p.Data=new TextureBase{Name=textureName,NameHash=JenkHash.GenHash(textureName)};
            diffuse|=isDiffuse;
        }
        if(!diffuse)throw new Exception("Material YDD sem DiffuseSampler compatível para o OBJ.");
        ushort index=checked((ushort)group.Shaders.data_items.Length);
        group.Shaders.data_items=group.Shaders.data_items.Append(shader).ToArray();return index;
    }
    public static Texture Solid(string name,int size,byte r,byte g,byte b) {
        var data=new List<byte>();byte levels=0;
        for(int width=size;width>0;width/=2) {levels++;for(int i=0;i<width*width;i++)data.AddRange(new byte[]{b,g,r,255});}
        return new Texture{Name=name,NameHash=JenkHash.GenHash(name),Width=(ushort)size,Height=(ushort)size,Depth=1,Stride=(ushort)(size*4),Levels=levels,Format=TextureFormat.D3DFMT_A8R8G8B8,Usage=TextureUsage.DIFFUSE,Data=new TextureData{FullData=data.ToArray()}};
    }
}
