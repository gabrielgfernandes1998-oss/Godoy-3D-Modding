using CodeWalker.GameFiles;
using SharpDX;
using System.Text.Json;

// Edits the original native document. No reconstruction from the preview mesh.
static class YddEditor {
    public static byte[] Export(object original, JsonElement request, object? donor) {
        var file=(YddFile)original;
        var values=request.GetProperty("matrix").EnumerateArray().Select(x=>x.GetSingle()).ToArray();
        if(values.Length!=16||values.Any(x=>!float.IsFinite(x)||Math.Abs(x)>100000))throw new Exception("Matriz inválida.");
        var matrix=new Matrix(values);
        if(Math.Abs(matrix.M14)>1e-6||Math.Abs(matrix.M24)>1e-6||Math.Abs(matrix.M34)>1e-6||Math.Abs(matrix.M44-1)>1e-6||matrix.Determinant()<=1e-8)throw new Exception("Use uma transformação afim com escala positiva.");
        var bone=request.GetProperty("bone").GetString();
        ushort? tag=bone switch {"preserve"=>(ushort?)null,"pelvis"=>11816,"head"=>31086,"spine"=>23553,_=>throw new Exception("Vínculo de osso inválido.")};
        if(file.Drawables is null||file.Drawables.Length==0)throw new Exception("YDD vazio.");
        YddAdditions.Apply(file,request);
        foreach(var drawable in file.Drawables) {
            if(drawable.Bound is not null)throw new Exception("Este YDD contém colisão própria. A edição de colisões ainda não é suportada.");
            var originalBones=drawable.Skeleton?.Bones?.Items;
            Bone? target=null;
            if(tag is not null) {
                target=drawable.Skeleton?.Bones?.Items?.FirstOrDefault(b=>b.Tag==tag);
                if(target is null && donor is YddFile ped) {
                    var skeleton=ped.Drawables?.Select(d=>d.Skeleton).FirstOrDefault(s=>s?.Bones?.Items?.Any(b=>b.Tag==tag)==true);
                    if(skeleton is not null){drawable.Skeleton=skeleton;target=skeleton.Bones.Items.First(b=>b.Tag==tag);}
                }
                if(target is null)throw new Exception("Osso ausente no YDD. Carregue o ped do GTA ou importe um ped YDD com esqueleto antes de exportar.");
                if(target.Index<0||target.Index>255)throw new Exception("Índice de osso fora do limite.");
            }
            drawable.BuildAllModels();
            var overallMin=new Vector3(float.MaxValue);var overallMax=new Vector3(float.MinValue);int count=0;
            var edited=new Dictionary<VertexData,(Matrix matrix,bool skin)>();
            foreach(var model in drawable.AllModels) {
                var vertexMatrix=matrix;var outputBind=Matrix.Identity;
                if(model.HasSkin==0) {
                    if(model.BoneIndex!=0 && (originalBones is null||model.BoneIndex>=originalBones.Length))throw new Exception("Peça rígida sem transformação de origem do osso.");
                    var originalBind=originalBones is not null && model.BoneIndex<originalBones.Length?originalBones[model.BoneIndex].AbsTransform:Matrix.Identity;
                    outputBind=target?.AbsTransform??originalBind;
                    vertexMatrix=originalBind*matrix*Matrix.Invert(outputBind);
                }
                var normalMatrix=Matrix.Transpose(Matrix.Invert(vertexMatrix));
                foreach(var geometry in model.Geometries??Array.Empty<DrawableGeometry>()) {
                    var data=geometry.VertexData??throw new Exception("Geometria sem dados de vértice.");
                    bool repeated=edited.TryGetValue(data,out var applied);
                    if(repeated&&(applied.matrix!=vertexMatrix||applied.skin!=(model.HasSkin!=0)))throw new Exception("Buffer compartilhado com transformações diferentes. Exporte as peças separadamente.");
                    if(!repeated)edited[data]=(vertexMatrix,model.HasSkin!=0);
                    if(data.Info.GetComponentType(0)!=VertexComponentType.Float3)throw new Exception("Formato de posição não suportado para exportação nativa.");
                    var flags=data.Info.Flags;
                    if(target is not null && model.HasSkin!=0) {
                        if((flags&6)!=6||!IsBytes(data.Info.GetComponentType(1))||!IsBytes(data.Info.GetComponentType(2)))throw new Exception("Pesos/índices incompatíveis com vínculo rígido.");
                        geometry.BoneIds=PedSkin.Identity(drawable.Skeleton!);
                    }
                    for(int i=0;i<data.VertexCount;i++) {
                        var p=repeated?data.GetVector3(i,0):Vector3.TransformCoordinate(data.GetVector3(i,0),vertexMatrix);Check(p);
                        data.SetVector3(i,0,p);
                        // Bounds of the drawable are in the ped bind coordinate system.
                        var world=model.HasSkin==0?Vector3.TransformCoordinate(p,outputBind):p;
                        overallMin=Vector3.Min(overallMin,world);overallMax=Vector3.Max(overallMax,world);count++;
                        if(!repeated&&(flags&(1u<<3))!=0)Direction(data,i,3,normalMatrix);
                        if(!repeated&&(flags&(1u<<14))!=0)Direction(data,i,14,vertexMatrix);
                        if(target is not null && model.HasSkin!=0) {
                            data.SetUByte4(i,1,new Color((byte)255,(byte)0,(byte)0,(byte)0));
                            data.SetUByte4(i,2,new Color((byte)target.Index,(byte)0,(byte)0,(byte)0));
                        }
                    }
                    var vb=geometry.VertexBuffer;
                    // Both resource pointers must refer to the edited data, never stale copies.
                    if(vb.Data2 is not null && !ReferenceEquals(vb.Data2,data)&& !ReferenceEquals(vb.Data1,vb.Data2))throw new Exception("VertexBuffer duplo distinto ainda não suportado.");
                    if(vb.Data1 is not null)vb.Data1=data;if(vb.Data2 is not null)vb.Data2=data;
                }
                if(target is not null)model.BoneIndex=model.HasSkin==0?(byte)target.Index:(byte)0;
                if(target is not null&&model.HasSkin!=0){model.Flags|=1;model.SkeletonBindUnk1=(byte)PedSkin.Identity(drawable.Skeleton!).Length;}
                model.RebuildBounds();
            }
            if(count==0)throw new Exception("YDD sem vértices.");
            drawable.BoundingBoxMin=overallMin;drawable.BoundingBoxMax=overallMax;
            drawable.BoundingCenter=(overallMin+overallMax)*.5f;drawable.BoundingSphereRadius=(overallMax-overallMin).Length()*.5f;
            drawable.BuildRenderMasks();drawable.BuildVertexDecls();
        }
        var saved=file.Save();
        long systemBytes=RpfResourceFileEntry.GetSizeFromFlags(BitConverter.ToUInt32(saved,8)),graphicsBytes=RpfResourceFileEntry.GetSizeFromFlags(BitConverter.ToUInt32(saved,12));
        if(systemBytes<0||graphicsBytes<0||systemBytes+graphicsBytes>256L*1024*1024)throw new Exception("O YDD gerado exige mais de 256 MB de páginas RSC7. Reduza a geometria ou distribua em recursos diferentes; o modelo não foi truncado.");
        var reopened=new YddFile();reopened.Load(saved);
        if(reopened.Drawables?.Length!=file.Drawables.Length)throw new Exception("Falha ao verificar YDD exportado.");
        for(int d=0;d<file.Drawables.Length;d++) {
            var before=file.Drawables[d];var after=reopened.Drawables[d];
            if(before.AllModels.Length!=after.AllModels.Length)throw new Exception("Falha ao preservar LODs.");
            for(int mi=0;mi<before.AllModels.Length;mi++) {
                var a=before.AllModels[mi];var b=after.AllModels[mi];
                if(a.SkeletonBinding!=b.SkeletonBinding||a.Geometries.Length!=b.Geometries.Length)throw new Exception("Falha ao preservar vínculo de esqueleto.");
                for(int gi=0;gi<a.Geometries.Length;gi++) {
                    var ag=a.Geometries[gi];var bg=b.Geometries[gi];
                    if(ag.ShaderID!=bg.ShaderID)throw new Exception("YDD reaberto perdeu o material de uma geometria.");
                    var originalSamplers=ag.Shader?.ParametersList?.Parameters?.Where(p=>p.DataType==0).Select(p=>(p.Data as TextureBase)?.Name??"").ToArray()??Array.Empty<string>();
                    var savedSamplers=bg.Shader?.ParametersList?.Parameters?.Where(p=>p.DataType==0).Select(p=>(p.Data as TextureBase)?.Name??"").ToArray()??Array.Empty<string>();
                    if(!originalSamplers.SequenceEqual(savedSamplers))throw new Exception("YDD reaberto perdeu uma referência de textura.");
                    if(!ag.VertexData.VertexBytes.SequenceEqual(bg.VertexData.VertexBytes)||!ag.IndexBuffer.Indices.SequenceEqual(bg.IndexBuffer.Indices)||!(ag.BoneIds??Array.Empty<ushort>()).SequenceEqual(bg.BoneIds??Array.Empty<ushort>()))throw new Exception("YDD reaberto diverge dos vértices/pesos exportados.");
                }
            }
        }
        return saved;
    }
    static bool IsBytes(VertexComponentType type)=>type is VertexComponentType.UByte4 or VertexComponentType.Colour;
    static void Check(Vector3 v){if(!float.IsFinite(v.X)||!float.IsFinite(v.Y)||!float.IsFinite(v.Z)||v.Length()>100000)throw new Exception("Vértice fora do limite.");}
    static void Direction(VertexData data,int i,int channel,Matrix normal) {
        var type=data.Info.GetComponentType(channel);Vector3 v;float w=0;
        if(type==VertexComponentType.Float3)v=data.GetVector3(i,channel);
        else if(type==VertexComponentType.Float4){var a=data.GetVector4(i,channel);v=new Vector3(a.X,a.Y,a.Z);w=a.W;}
        else if(type==VertexComponentType.Dec3N)v=data.GetDec3N(i,channel);
        else throw new Exception("Formato de normal/tangente não suportado.");
        v=Vector3.TransformNormal(v,normal);if(v.LengthSquared()>1e-12)v.Normalize();
        if(type==VertexComponentType.Float3)data.SetVector3(i,channel,v);
        else if(type==VertexComponentType.Float4)data.SetVector4(i,channel,new Vector4(v,w));
        else data.SetDec3N(i,channel,v);
    }
}
