using CodeWalker.GameFiles;
using SharpDX;
using System.Text.Json;
using System.Reflection;

// Appends real drawable geometries; original vertices/materials remain intact.
static class YddAdditions {
    static T Clone<T>(T item) where T:class => (T)typeof(object).GetMethod("MemberwiseClone",BindingFlags.Instance|BindingFlags.NonPublic)!.Invoke(item,null)!;
    public static void Apply(YddFile file,JsonElement request) {
        if(!request.TryGetProperty("additions",out var list))return;
        if(list.ValueKind!=JsonValueKind.Array||list.GetArrayLength()>32)throw new Exception("Quantidade de partes OBJ inválida.");
        int total=0;
        foreach(var part in list.EnumerateArray()) {
            var positions=Numbers(part,"positions");var normals=Numbers(part,"normals");var uvs=Numbers(part,"uvs");
            int count=positions.Length/3;total+=count;
            if(count<3||count>65535||total>100000||positions.Length!=count*3||normals.Length!=count*3||uvs.Length!=count*2)throw new Exception("OBJ exige 3–65535 vértices por parte e até 100000 no total.");
            var raw=part.GetProperty("indices");if(raw.ValueKind!=JsonValueKind.Array||raw.GetArrayLength()<3||raw.GetArrayLength()>600000||raw.GetArrayLength()%3!=0)throw new Exception("Triângulos OBJ inválidos.");
            var indices=raw.EnumerateArray().Select(x=>{int i=x.GetInt32();if(i<0||i>=count)throw new Exception("Índice OBJ inválido.");return (ushort)i;}).ToArray();
            var center=Vector3.Zero;for(int i=0;i<count;i++)center+=new Vector3(positions[i*3],positions[i*3+1],positions[i*3+2])/count;
            Drawable? destination=null;float best=float.MaxValue;
            foreach(var drawable in file.Drawables) {
                var lod=drawable.DrawableModels;
                var primary=lod is null?null:new[]{lod.High,lod.Med,lod.Low,lod.VLow}.FirstOrDefault(models=>models is not null&&models.Length>0);
                if(primary is null)continue;
                var candidate=Nearest(drawable,primary,center);
                if(candidate is not null&&candidate.Value.distance<best){best=candidate.Value.distance;destination=drawable;}
            }
            if(destination is null)throw new Exception("YDD sem geometria de destino compatível.");
            var models=destination.DrawableModels;
            foreach(var lod in new[]{models.High,models.Med,models.Low,models.VLow,models.Extra}) {
                if(lod is null||lod.Length==0)continue;
                var nearest=Nearest(destination,lod,center)??throw new Exception("LOD sem malha para receber OBJ.");
                var (model,template,sample,_,bind)=nearest;
                var info=template.VertexData.Info;int stride=info.Stride;
                if(stride!=template.VertexData.VertexStride)throw new Exception("Stride do destino incompatível.");
                var data=new VertexData{Info=info,VertexType=template.VertexData.VertexType,VertexCount=count,VertexStride=stride,VertexBytes=new byte[count*stride]};
                var inverse=Matrix.Invert(bind);var normalMatrix=Matrix.Transpose(bind);
                for(int i=0;i<count;i++) {
                    Buffer.BlockCopy(template.VertexData.VertexBytes,sample*stride,data.VertexBytes,i*stride,stride);
                    var p=Vector3.TransformCoordinate(new Vector3(positions[i*3],positions[i*3+1],positions[i*3+2]),inverse);
                    var n=Vector3.TransformNormal(new Vector3(normals[i*3],normals[i*3+1],normals[i*3+2]),normalMatrix);if(n.LengthSquared()>1e-12)n.Normalize();
                    data.SetVector3(i,0,p);
                    if((info.Flags&8)!=0)SetDirection(data,i,3,n,info.GetComponentType(3)==VertexComponentType.Float4?template.VertexData.GetVector4(sample,3).W:0);
                    var uv=new Vector2(uvs[i*2],uvs[i*2+1]);
                    switch(info.GetComponentType(6)) {
                        case VertexComponentType.Float2:data.SetVector2(i,6,uv);break;
                        case VertexComponentType.Half2:data.SetHalf2(i,6,new Half2(uv.X,uv.Y));break;
                        default:throw new Exception("Formato UV do destino ainda não suportado para OBJ.");
                    }
                }
                if((info.Flags&(1u<<14))!=0)Tangents(data,indices);
                var geometry=Clone(template);geometry.VertexData=data;geometry.BoneIds=template.BoneIds?.ToArray();
                geometry.VertexBuffer=Clone(template.VertexBuffer);geometry.VertexBuffer.Data1=template.VertexBuffer.Data1 is not null?data:null;geometry.VertexBuffer.Data2=template.VertexBuffer.Data2 is not null?data:null;
                if(geometry.VertexBuffer.Data1 is null&&geometry.VertexBuffer.Data2 is null)geometry.VertexBuffer.Data1=data;geometry.VertexBuffer.VertexCount=(uint)count;geometry.VertexBuffer.VertexStride=(ushort)stride;
                geometry.IndexBuffer=Clone(template.IndexBuffer);geometry.IndexBuffer.Indices=indices;geometry.IndexBuffer.IndicesCount=(uint)indices.Length;
                geometry.VerticesCount=(ushort)count;geometry.VertexStride=(ushort)stride;geometry.IndicesCount=(uint)indices.Length;geometry.TrianglesCount=(uint)indices.Length/3;
                model.Geometries=model.Geometries.Append(geometry).ToArray();
                model.GeometriesCount1=model.GeometriesCount2=model.GeometriesCount3=checked((ushort)model.Geometries.Length);
                model.ShaderMapping=model.Geometries.Select(g=>g.ShaderID).ToArray();model.RebuildBounds();
            }
            destination.BuildAllModels();
        }
    }
    static float[] Numbers(JsonElement part,string key) {
        var array=part.GetProperty(key);if(array.ValueKind!=JsonValueKind.Array||array.GetArrayLength()>300000)throw new Exception("Dados OBJ acima do limite.");
        return array.EnumerateArray().Select(x=>{float f=x.GetSingle();if(!float.IsFinite(f)||Math.Abs(f)>100000)throw new Exception("Coordenada OBJ inválida.");return f;}).ToArray();
    }
    static (DrawableModel model,DrawableGeometry geometry,int sample,float distance,Matrix bind)? Nearest(Drawable drawable,DrawableModel[] models,Vector3 center) {
        (DrawableModel,DrawableGeometry,int,float,Matrix)? found=null;float best=float.MaxValue;
        foreach(var model in models) {
            var bind=Matrix.Identity;
            if(model.HasSkin==0) {
                var bones=drawable.Skeleton?.Bones?.Items;
                if(model.BoneIndex!=0&&(bones is null||model.BoneIndex>=bones.Length))continue;
                if(bones is not null&&model.BoneIndex<bones.Length)bind=bones[model.BoneIndex].AbsTransform;
            }
            foreach(var geometry in model.Geometries??Array.Empty<DrawableGeometry>()) {
                var data=geometry.VertexData;
                if(data?.Info is null||data.Info.GetComponentType(0)!=VertexComponentType.Float3||(data.Info.Flags&(1u<<6))==0)continue;
                if(model.HasSkin!=0&&(data.Info.Flags&6)!=6)continue;
                for(int i=0;i<data.VertexCount;i++) {
                    var p=Vector3.TransformCoordinate(data.GetVector3(i,0),bind);float distance=(p-center).LengthSquared();
                    if(distance<best){best=distance;found=(model,geometry,i,distance,bind);}
                }
            }
        }
        return found;
    }
    static void SetDirection(VertexData data,int i,int c,Vector3 vector,float w) {
        switch(data.Info.GetComponentType(c)) {
            case VertexComponentType.Float3:data.SetVector3(i,c,vector);break;
            case VertexComponentType.Float4:data.SetVector4(i,c,new Vector4(vector,w));break;
            case VertexComponentType.Dec3N:data.SetDec3N(i,c,vector);break;
            default:throw new Exception("Normal/tangente do destino não suportada.");
        }
    }
    static void Tangents(VertexData data,ushort[] indices) {
        var t=new Vector3[data.VertexCount];var b=new Vector3[data.VertexCount];
        Vector2 Uv(int i)=>data.Info.GetComponentType(6)==VertexComponentType.Float2?data.GetVector2(i,6):(Vector2)data.GetHalf2(i,6);
        for(int f=0;f<indices.Length;f+=3) {
            int a=indices[f],c=indices[f+1],d=indices[f+2];
            var e1=data.GetVector3(c,0)-data.GetVector3(a,0);var e2=data.GetVector3(d,0)-data.GetVector3(a,0);var u=Uv(c)-Uv(a);var v=Uv(d)-Uv(a);
            float determinant=u.X*v.Y-u.Y*v.X;if(Math.Abs(determinant)<1e-12)continue;
            var tangent=(e1*v.Y-e2*u.Y)/determinant;var bitangent=(e2*u.X-e1*v.X)/determinant;
            foreach(int i in new[]{a,c,d}){t[i]+=tangent;b[i]+=bitangent;}
        }
        for(int i=0;i<data.VertexCount;i++) {
            var n=data.Info.GetComponentType(3) switch {VertexComponentType.Float3=>data.GetVector3(i,3),VertexComponentType.Float4=>new Vector3(data.GetVector4(i,3).X,data.GetVector4(i,3).Y,data.GetVector4(i,3).Z),VertexComponentType.Dec3N=>data.GetDec3N(i,3),_=>Vector3.UnitZ};
            var tangent=t[i]-n*Vector3.Dot(n,t[i]);if(tangent.LengthSquared()<1e-12)tangent=Vector3.Cross(n,Math.Abs(n.Z)<.9?Vector3.UnitZ:Vector3.UnitY);tangent.Normalize();
            SetDirection(data,i,14,tangent,Vector3.Dot(Vector3.Cross(n,tangent),b[i])<0?-1:1);
        }
    }
}
