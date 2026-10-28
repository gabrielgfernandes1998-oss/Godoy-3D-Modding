using CodeWalker.GameFiles;
using SharpDX;
using System.Text.Json;
using System.Text.RegularExpressions;

// Creates a new accessory. Only the selected ped skeleton is copied; no ped mesh.
static class ObjYdd {
    public const string CompatibilityProfile="codewalker-pair-roundtrip-v1";
    public static (byte[] ydd,byte[] ytd) Create(YddFile ped,JsonElement request) {
        var name=request.GetProperty("name").GetString()??"";
        if(!Regex.IsMatch(name,"^(head|berd|hair|uppr|lowr|hand|feet|teef|accs|task|decl|jbib)_[0-9]{3}_u$"))throw new Exception("Nome de componente inválido.");
        int tag=request.GetProperty("boneTag").GetInt32();
        if(tag<0||tag>65535)throw new Exception("Tag de osso inválida.");
        var skeleton=ped.Drawables?.Select(d=>d.Skeleton).FirstOrDefault(s=>s?.Bones?.Items?.Any(b=>b.Tag==tag)==true)??throw new Exception("Osso não encontrado no ped deste gênero.");
        var bone=skeleton.Bones.Items.First(b=>b.Tag==tag);
        if(bone.Index<0||bone.Index>255)throw new Exception("Índice de osso acima do limite de 255.");
        var parts=ReadParts(request);
        long graphics=parts.Sum(p=>(long)YddRender.PedStride*p.count+2L*p.indices.Length);
        if(graphics>=0x10000000L)throw new Exception("A geometria não cabe no endereçamento de 28 bits do YDD. Reduza a malha ou divida em recursos diferentes.");
        int size=request.GetProperty("textureSize").GetInt32();if(size is not (512 or 1024 or 2048 or 4096))throw new Exception("Resolução inválida.");
        var pixels=request.TryGetProperty("pixelsFile",out var pixelFile)?File.ReadAllBytes(pixelFile.GetString()!):Convert.FromBase64String(request.GetProperty("pixels").GetString()??"");
        if(pixels.Length!=size*size*4)throw new Exception("Pixels RGBA inválidos.");
        for(int i=0;i<pixels.Length;i+=4)(pixels[i],pixels[i+2])=(pixels[i+2],pixels[i]); // RGBA -> native BGRA
        string textureName=name[..^2].Insert(name[..^2].LastIndexOf('_'),"_diff")+"_a_uni";
        var texture=YddAtlas.Pixels(textureName,size,size,pixels,TextureUsage.DIFFUSE);
        var ytd=new YtdFile{TextureDict=new TextureDictionary()};ytd.TextureDict.BuildFromTextureList(new List<Texture>{texture});
        var shader=YddRender.PedMaterial(new TextureBase{Name=textureName,NameHash=texture.NameHash,Unknown_32h=2});
        DrawableModel Model() {
            var geometries=parts.Select(part=> {
                var info=new VertexDeclaration{Flags=YddRender.PedDeclaration,Types=VertexDeclarationTypes.GTAV1};info.UpdateCountAndStride();
                var data=new VertexData{Info=info,VertexCount=part.count,VertexStride=info.Stride,VertexBytes=new byte[part.count*info.Stride]};
                for(int i=0;i<part.count;i++) {
                    data.SetVector3(i,0,new Vector3(part.positions[i*3],part.positions[i*3+1],part.positions[i*3+2]));
                    var n=new Vector3(part.normals[i*3],part.normals[i*3+1],part.normals[i*3+2]);if(n.LengthSquared()<1e-12)n=Vector3.UnitZ;else n.Normalize();data.SetVector3(i,3,n);
                    data.SetVector2(i,6,new Vector2(part.uvs[i*2],part.uvs[i*2+1]));
                    data.SetUByte4(i,1,new Color((byte)255,(byte)0,(byte)0,(byte)0));data.SetUByte4(i,2,new Color((byte)0,(byte)0,(byte)0,(byte)0));data.SetColour(i,4,new Color((byte)255,(byte)255,(byte)255,(byte)255));
                    data.SetColour(i,5,new Color((byte)255,(byte)255,(byte)255,(byte)255));
                }
                return new DrawableGeometry{VertexData=data,VertexBuffer=new VertexBuffer{Data1=data,Data2=data,Info=info,VertexCount=(uint)part.count,VertexStride=info.Stride},IndexBuffer=new IndexBuffer{Indices=part.indices,IndicesCount=(uint)part.indices.Length},BoneIds=new[]{(ushort)bone.Index},VerticesCount=(ushort)part.count,VertexStride=info.Stride,IndicesCount=(uint)part.indices.Length,TrianglesCount=(uint)part.indices.Length/3,Shader=shader,ShaderID=0};
            }).ToArray();
            var model=new DrawableModel{HasSkin=1,Flags=1,SkeletonBindUnk1=1,BoneIndex=0,RenderMask=255,Geometries=geometries,ShaderMapping=new ushort[geometries.Length],GeometriesCount1=(ushort)geometries.Length,GeometriesCount2=(ushort)geometries.Length,GeometriesCount3=(ushort)geometries.Length};model.RebuildBounds();return model;
        }
        var high=Model();
        var low=new DrawableModel{GeometriesCount1=high.GeometriesCount1,GeometriesCount2=high.GeometriesCount2,GeometriesCount3=high.GeometriesCount3,HasSkin=high.HasSkin,Flags=high.Flags,SkeletonBindUnk1=high.SkeletonBindUnk1,BoneIndex=high.BoneIndex,RenderMask=high.RenderMask,ShaderMapping=high.ShaderMapping.ToArray(),Geometries=high.Geometries.Select(g=>new DrawableGeometry{VertexData=g.VertexData,VertexBuffer=g.VertexBuffer,IndexBuffer=g.IndexBuffer,BoneIds=g.BoneIds,VerticesCount=g.VerticesCount,VertexStride=g.VertexStride,IndicesCount=g.IndicesCount,TrianglesCount=g.TrianglesCount,Shader=g.Shader,ShaderID=g.ShaderID}).ToArray()};low.RebuildBounds();
        var drawable=new Drawable{Name=name,Skeleton=skeleton,LightAttributes=new ResourceSimpleList64<LightAttributes>(),ShaderGroup=new ShaderGroup{Shaders=new ResourcePointerArray64<ShaderFX>{data_items=new[]{shader}}},DrawableModels=new DrawableModelsBlock{High=new[]{high},Low=new[]{low}},LodDistHigh=999,LodDistMed=999,LodDistLow=999,LodDistVlow=999};
        drawable.BuildAllModels();drawable.BuildVertexDecls();drawable.BuildRenderMasks();drawable.FlagsHigh=1;drawable.FlagsLow=1;
        var file=new YddFile{Drawables=new[]{drawable},DrawableDict=new DrawableDictionary{Hashes=new[]{JenkHash.GenHash(name)},Drawables=new ResourcePointerArray64<Drawable>{data_items=new[]{drawable}}}};
        FiveMResource.Share(file);
        var edit=JsonSerializer.SerializeToElement(new{matrix=Matrix.Identity.ToArray(),bone="preserve"});
        var saved=YddEditor.Export(file,edit,null);var savedYtd=ytd.Save();
        // Parsing geometry alone is insufficient: CodeWalker/grzy skip models whose
        // final-render bit is absent, even when vertices and textures are valid.
        var visible=new YddFile();visible.Load(saved);
        YddRender.ValidateCounts(visible);
        if(visible.Drawables.Any(d=>(d.RenderMaskHigh&1)==0||(d.RenderMaskLow&1)==0||d.AllModels.Any(m=>(m.RenderMask&1)==0)))throw new Exception("YDD convertido sem máscara de visibilidade válida.");
        var check=new YtdFile();check.Load(savedYtd);var actual=check.TextureDict.Textures.data_items.Single();
        if(actual.Name!=textureName||actual.Width!=size||!actual.Data.FullData.SequenceEqual(texture.Data.FullData))throw new Exception("Falha ao verificar a textura convertida.");
        return NormalizePair(saved,savedYtd,name);
    }
    // Same paired load/rebuild/save operation as diagnostic Test 1 confirmed in grzy.
    // Keep the selected mesh, rig, UVs and every mip; normalize names/hash tables together.
    public static (byte[] ydd,byte[] ytd) NormalizePair(byte[] ydd,byte[] ytd,string name) {
        if(!Regex.IsMatch(name,"^(head|berd|hair|uppr|lowr|hand|feet|teef|accs|task|decl|jbib)_[0-9]{3}_u$"))throw new Exception("Nome de componente inválido.");
        var file=new YddFile();file.Load(ydd);
        var dictionary=new YtdFile();dictionary.Load(ytd);
        if(file.Drawables?.Length!=1||dictionary.TextureDict?.Textures?.data_items?.Length!=1)throw new Exception("A conversão requer uma peça e um atlas diffuse.");
        var texture=dictionary.TextureDict.Textures.data_items[0];
        var oldTextureName=texture.Name;
        var textureName=name[..^2].Insert(name[..^2].LastIndexOf('_'),"_diff")+"_a_uni";
        texture.Name=textureName;texture.NameHash=JenkHash.GenHash(textureName);
        dictionary.TextureDict.BuildFromTextureList(new List<Texture>{texture});
        var drawable=file.Drawables[0];drawable.Name=name;bool linked=false;
        foreach(var shader in drawable.ShaderGroup.Shaders.data_items)
            for(int i=0;i<shader.ParametersList.Parameters.Length;i++) {
                var parameter=shader.ParametersList.Parameters[i];
                if(parameter.Data is TextureBase sampler&&sampler.Name==oldTextureName) {
                    sampler.Name=textureName;sampler.NameHash=texture.NameHash;
                    if((uint)shader.ParametersList.Hashes[i]==JenkHash.GenHash("diffusesampler"))linked=true;
                }
            }
        if(!linked)throw new Exception("O YDD não referencia a textura do YTD convertido.");
        drawable.BuildAllModels();drawable.BuildVertexDecls();drawable.BuildRenderMasks();
        file.DrawableDict.Hashes=new[]{JenkHash.GenHash(name)};
        var normalizedYdd=file.Save();var normalizedYtd=dictionary.Save();
        var check=new YddFile();check.Load(normalizedYdd);
        var checkTexture=new YtdFile();checkTexture.Load(normalizedYtd);
        var actual=checkTexture.TextureDict.Textures.data_items.Single();
        if(actual.Name!=textureName||actual.Width!=texture.Width||actual.Height!=texture.Height||actual.Levels!=texture.Levels||actual.Format!=texture.Format||!actual.Data.FullData.SequenceEqual(texture.Data.FullData))throw new Exception("Normalização alterou o atlas ou seus mipmaps.");
        var output=check.Drawables.Single();
        if(output.Name!=name||check.DrawableDict.Hashes.Single()!=JenkHash.GenHash(name)||output.AllModels.Length!=drawable.AllModels.Length)throw new Exception("Normalização perdeu nomes ou LODs.");
        for(int mi=0;mi<drawable.AllModels.Length;mi++) {
            var before=drawable.AllModels[mi];var after=output.AllModels[mi];
            if(before.SkeletonBinding!=after.SkeletonBinding||after.RenderMask!=before.RenderMask||(after.RenderMask&1)==0||before.Geometries.Length!=after.Geometries.Length)throw new Exception("Normalização alterou o vínculo ou a visibilidade.");
            for(int gi=0;gi<before.Geometries.Length;gi++) {
                var a=before.Geometries[gi];var b=after.Geometries[gi];
                if(!a.VertexData.VertexBytes.SequenceEqual(b.VertexData.VertexBytes)||!a.IndexBuffer.Indices.SequenceEqual(b.IndexBuffer.Indices)||!(a.BoneIds??Array.Empty<ushort>()).SequenceEqual(b.BoneIds??Array.Empty<ushort>()))throw new Exception("Normalização alterou a malha, UV ou os pesos.");
                if(b.Shader.Name.Hash!=a.Shader.Name.Hash||b.Shader.FileName.Hash!=a.Shader.FileName.Hash||!b.Shader.ParametersList.Parameters.OfType<ShaderParameter>().Any(p=>p.Data is TextureBase t&&t.Name==textureName))throw new Exception("Normalização perdeu o material ou o vínculo ao YTD.");
            }
        }
        return(normalizedYdd,normalizedYtd);
    }
    static (float[] positions,float[] normals,float[] uvs,ushort[] indices,int count)[] ReadParts(JsonElement request) {
        if(request.TryGetProperty("partsFile",out var input)) {
            using var stream=File.OpenRead(input.GetString()!);using var reader=new BinaryReader(stream);
            if(reader.ReadUInt32()!=0x324a424f)throw new Exception("Cabeçalho de geometria binária inválido.");
            uint count=reader.ReadUInt32();if(count<1||count>65535)throw new Exception("Quantidade de geometrias incompatível com o campo de 16 bits do YDD.");
            var parts=new (float[] positions,float[] normals,float[] uvs,ushort[] indices,int count)[count];long graphics=0;
            for(int part=0;part<count;part++) {
                uint n=reader.ReadUInt32(),indexCount=reader.ReadUInt32();
                if(n<1||n>65535||indexCount<3||indexCount%3!=0||32L*n+2L*indexCount>stream.Length-stream.Position||indexCount>int.MaxValue)throw new Exception("Contagem ou tamanho de geometria binária inválido.");
                graphics+=((long)YddRender.PedStride*n+2L*indexCount);if(graphics>=0x10000000L)throw new Exception("A geometria não cabe no endereçamento de 28 bits do YDD. Reduza a malha ou divida em recursos diferentes.");
                float[] Floats(int size){var values=new float[size];for(int i=0;i<size;i++){float v=reader.ReadSingle();if(!float.IsFinite(v)||Math.Abs(v)>100000)throw new Exception("Coordenadas OBJ inválidas.");values[i]=v;}return values;}
                var positions=Floats((int)n*3);var normals=Floats((int)n*3);var uvs=Floats((int)n*2);var indices=new ushort[indexCount];
                for(int i=0;i<indexCount;i++){indices[i]=reader.ReadUInt16();if(indices[i]>=n)throw new Exception("Índice OBJ inválido.");}
                parts[part]=(positions,normals,uvs,indices,(int)n);
            }
            if(stream.Position!=stream.Length)throw new Exception("Dados extras após a geometria binária.");return parts;
        }
        var list=request.GetProperty("parts");
        if(list.ValueKind!=JsonValueKind.Array||list.GetArrayLength()<1||list.GetArrayLength()>65535)throw new Exception("Quantidade de geometrias incompatível com o campo de 16 bits do YDD.");
        int total=0;
        return list.EnumerateArray().Select(part=> {
            float[] Numbers(string key,int max){var a=part.GetProperty(key);if(a.ValueKind!=JsonValueKind.Array||a.GetArrayLength()>max)throw new Exception("Dados OBJ acima do limite.");return a.EnumerateArray().Select(x=>{float v=x.GetSingle();if(!float.IsFinite(v)||Math.Abs(v)>100000)throw new Exception("Coordenadas OBJ inválidas.");return v;}).ToArray();}
            var positions=Numbers("positions",300000);var normals=Numbers("normals",300000);var uvs=Numbers("uvs",200000);int count=positions.Length/3;total+=count;
            if(count<1||count>65535||positions.Length!=count*3||normals.Length!=count*3||uvs.Length!=count*2)throw new Exception("Formato YDD: até 65535 vértices por geometria.");
            var raw=part.GetProperty("indices");if(raw.ValueKind!=JsonValueKind.Array||raw.GetArrayLength()<3||raw.GetArrayLength()>600000||raw.GetArrayLength()%3!=0)throw new Exception("Triângulos OBJ inválidos.");
            var indices=raw.EnumerateArray().Select(x=>{int v=x.GetInt32();if(v<0||v>=count)throw new Exception("Índice OBJ inválido.");return (ushort)v;}).ToArray();
            return (positions,normals,uvs,indices,count);
        }).ToArray();

    }

}
