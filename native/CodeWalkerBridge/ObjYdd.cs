using CodeWalker.GameFiles;
using SharpDX;
using System.Text.Json;
using System.Text.RegularExpressions;

// Creates a new accessory. Only the selected ped skeleton is copied; no ped mesh.
static class ObjYdd {
    public static (byte[] ydd,byte[] ytd) Create(YddFile ped,JsonElement request) {
        var name=request.GetProperty("name").GetString()??"";
        if(!Regex.IsMatch(name,"^(head|berd|hair|uppr|lowr|hand|feet|teef|accs|task|decl|jbib)_[0-9]{3}_u$"))throw new Exception("Nome de componente inválido.");
        int tag=request.GetProperty("boneTag").GetInt32();
        if(tag<0||tag>65535)throw new Exception("Tag de osso inválida.");
        var skeleton=ped.Drawables?.Select(d=>d.Skeleton).FirstOrDefault(s=>s?.Bones?.Items?.Any(b=>b.Tag==tag)==true)??throw new Exception("Osso não encontrado no ped deste gênero.");
        var bone=skeleton.Bones.Items.First(b=>b.Tag==tag);
        if(bone.Index<0||bone.Index>255)throw new Exception("Índice de osso acima do limite de 255.");
        var parts=ReadParts(request);
        long graphics=parts.Sum(p=>44L*p.count+2L*p.indices.Length)*2;
        if(graphics>=0x10000000L)throw new Exception("A geometria não cabe no endereçamento de 28 bits do YDD. Reduza a malha ou divida em recursos diferentes.");
        int size=request.GetProperty("textureSize").GetInt32();if(size is not (512 or 1024 or 2048 or 4096))throw new Exception("Resolução inválida.");
        var pixels=request.TryGetProperty("pixelsFile",out var pixelFile)?File.ReadAllBytes(pixelFile.GetString()!):Convert.FromBase64String(request.GetProperty("pixels").GetString()??"");
        if(pixels.Length!=size*size*4)throw new Exception("Pixels RGBA inválidos.");
        for(int i=0;i<pixels.Length;i+=4)(pixels[i],pixels[i+2])=(pixels[i+2],pixels[i]); // RGBA -> native BGRA
        string textureName=name[..^2].Insert(name[..^2].LastIndexOf('_'),"_diff")+"_a_uni";
        var texture=YddAtlas.Pixels(textureName,size,size,pixels,TextureUsage.DIFFUSE);
        var ytd=new YtdFile{TextureDict=new TextureDictionary()};ytd.TextureDict.BuildFromTextureList(new List<Texture>{texture});
        var shader=new ShaderFX{Name=new MetaHash(JenkHash.GenHash("ped")),FileName=new MetaHash(JenkHash.GenHash("ped_default.sps")),RenderBucket=0,RenderBucketMask=0xff01};
        shader.ParametersList=new ShaderParametersBlock{Owner=shader,Count=2,Hashes=new[]{(MetaName)JenkHash.GenHash("diffusesampler"),(MetaName)JenkHash.GenHash("matmaterialcolorscale")},Parameters=new[]{new ShaderParameter{DataType=0,Data=new TextureBase{Name=textureName,NameHash=texture.NameHash,Unknown_32h=2}},new ShaderParameter{DataType=1,Data=Vector4.One}}};
        shader.ParameterCount=2;shader.TextureParametersCount=1;shader.ParameterSize=shader.ParametersList.ParametersSize;shader.ParameterDataSize=shader.ParametersList.ParametersDataSize;
        DrawableModel Model() {
            var geometries=parts.Select(part=> {
                var info=new VertexDeclaration{Flags=95,Types=VertexDeclarationTypes.GTAV1};info.UpdateCountAndStride();
                var data=new VertexData{Info=info,VertexCount=part.count,VertexStride=info.Stride,VertexBytes=new byte[part.count*info.Stride]};
                for(int i=0;i<part.count;i++) {
                    data.SetVector3(i,0,new Vector3(part.positions[i*3],part.positions[i*3+1],part.positions[i*3+2]));
                    var n=new Vector3(part.normals[i*3],part.normals[i*3+1],part.normals[i*3+2]);if(n.LengthSquared()<1e-12)n=Vector3.UnitZ;else n.Normalize();data.SetVector3(i,3,n);
                    data.SetVector2(i,6,new Vector2(part.uvs[i*2],part.uvs[i*2+1]));
                    data.SetUByte4(i,1,new Color((byte)255,(byte)0,(byte)0,(byte)0));data.SetUByte4(i,2,new Color((byte)0,(byte)0,(byte)0,(byte)0));data.SetColour(i,4,new Color((byte)255,(byte)255,(byte)255,(byte)255));
                }
                return new DrawableGeometry{VertexData=data,VertexBuffer=new VertexBuffer{Data1=data,Info=info,VertexCount=(uint)part.count,VertexStride=info.Stride},IndexBuffer=new IndexBuffer{Indices=part.indices,IndicesCount=(uint)part.indices.Length},BoneIds=new[]{(ushort)bone.Index},VerticesCount=(ushort)part.count,VertexStride=info.Stride,IndicesCount=(uint)part.indices.Length,TrianglesCount=(uint)part.indices.Length/3,Shader=shader,ShaderID=0};
            }).ToArray();
            var model=new DrawableModel{HasSkin=1,BoneIndex=0,RenderMask=255,Geometries=geometries,ShaderMapping=new ushort[geometries.Length],GeometriesCount1=(ushort)geometries.Length,GeometriesCount2=(ushort)geometries.Length,GeometriesCount3=(ushort)geometries.Length};model.RebuildBounds();return model;
        }
        var drawable=new Drawable{Name=name,Skeleton=skeleton,LightAttributes=new ResourceSimpleList64<LightAttributes>(),ShaderGroup=new ShaderGroup{Shaders=new ResourcePointerArray64<ShaderFX>{data_items=new[]{shader}}},DrawableModels=new DrawableModelsBlock{High=new[]{Model()},Low=new[]{Model()}},LodDistHigh=999,LodDistMed=999,LodDistLow=999,LodDistVlow=999};
        drawable.BuildAllModels();drawable.BuildVertexDecls();drawable.BuildRenderMasks();
        var file=new YddFile{Drawables=new[]{drawable},DrawableDict=new DrawableDictionary{Hashes=new[]{JenkHash.GenHash(name)},Drawables=new ResourcePointerArray64<Drawable>{data_items=new[]{drawable}}}};
        var edit=JsonSerializer.SerializeToElement(new{matrix=Matrix.Identity.ToArray(),bone="preserve"});
        var saved=YddEditor.Export(file,edit,null);var savedYtd=ytd.Save();
        // Parsing geometry alone is insufficient: CodeWalker/grzy skip models whose
        // final-render bit is absent, even when vertices and textures are valid.
        var visible=new YddFile();visible.Load(saved);
        if(visible.Drawables.Any(d=>(d.RenderMaskHigh&1)==0||(d.RenderMaskLow&1)==0||d.AllModels.Any(m=>(m.RenderMask&1)==0)))throw new Exception("YDD convertido sem máscara de visibilidade válida.");
        var check=new YtdFile();check.Load(savedYtd);var actual=check.TextureDict.Textures.data_items.Single();
        if(actual.Name!=textureName||actual.Width!=size||!actual.Data.FullData.SequenceEqual(texture.Data.FullData))throw new Exception("Falha ao verificar a textura convertida.");
        return (saved,savedYtd);
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
                graphics+=(44L*n+2L*indexCount)*2;if(graphics>=0x10000000L)throw new Exception("A geometria não cabe no endereçamento de 28 bits do YDD. Reduza a malha ou divida em recursos diferentes.");
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
