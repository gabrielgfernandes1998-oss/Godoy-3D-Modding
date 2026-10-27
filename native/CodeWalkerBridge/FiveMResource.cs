using CodeWalker.GameFiles;
using System.Security.Cryptography;

// Share byte-identical geometry buffers; keep every triangle, UV, rig and LOD.
static class FiveMResource {
    public const long Limit=100_000_000;
    public static (long system,long graphics,long total) Size(byte[] bytes){
        if(bytes.Length<16||BitConverter.ToUInt32(bytes,0)!=0x37435352)throw new Exception("Recurso RSC7 inválido.");
        long system=RpfResourceFileEntry.GetSizeFromFlags(BitConverter.ToUInt32(bytes,8)),graphics=RpfResourceFileEntry.GetSizeFromFlags(BitConverter.ToUInt32(bytes,12));
        if(system<0||graphics<0||system+graphics>512L*1024*1024)throw new Exception("Recurso original acima do limite de leitura de 512 MB.");return(system,graphics,system+graphics);
    }
    public static void Check(byte[] bytes){
        var s=Size(bytes);if(s.system>Limit||s.graphics>Limit||bytes.Length>Limit)throw new Exception($"YDD ainda acima do orçamento do FiveM: arquivo {bytes.Length/1e6:F2} MB, sistema {s.system/1e6:F2} MB, gráficos {s.graphics/1e6:F2} MB. A compactação sem perda não foi suficiente. Reduza a geometria/LODs na origem; nenhum triângulo foi removido.");
    }
    static string Hash(byte[] data)=>Convert.ToHexString(SHA256.HashData(data));
    static string IndexMetadata(IndexBuffer i)=>$"{i.VFT}/{i.Unknown_4h}/{i.IndicesCount}/{i.Unknown_Ch}/{i.Unknown_18h}/{i.Unknown_20h}/{i.Unknown_28h}/{i.Unknown_30h}/{i.Unknown_38h}/{i.Unknown_40h}/{i.Unknown_48h}/{i.Unknown_50h}/{i.Unknown_58h}";
    static bool Standard(VertexBuffer v)=>v.Unknown_4h==1&&v.Flags==0&&v.Unknown_Ch==0&&v.Unknown_1Ch==0&&v.Unknown_28h==0&&v.Unknown_38h==0&&v.Unknown_40h==0&&v.Unknown_48h==0&&v.Unknown_50h==0&&v.Unknown_58h==0&&v.Unknown_60h==0&&v.Unknown_68h==0&&v.Unknown_70h==0&&v.Unknown_78h==0;
    public static (int vertices,int indices) Share(YddFile file){
        int vertices=0,indices=0;
        foreach(var d in file.Drawables){
            var buffers=new Dictionary<string,(VertexData data,VertexBuffer buffer)>();var indexBuffers=new Dictionary<string,IndexBuffer>();
            foreach(var m in d.AllModels)foreach(var g in m.Geometries){
                var data=g.VertexData;var vb=g.VertexBuffer;
                // Distinct double buffers have separate semantics; leave them intact.
                if((vb.Data1!=null&&!ReferenceEquals(vb.Data1,data))||(vb.Data2!=null&&!ReferenceEquals(vb.Data2,data)))continue;
                string scope=$"{m.SkeletonBinding}/{g.ShaderID}/{string.Join(',',g.BoneIds??Array.Empty<ushort>())}";
                string key=$"{scope}/{data.Info.Flags}/{(ulong)data.Info.Types}/{data.Info.Stride}/{data.Info.Count}/{data.VertexCount}/{Hash(data.VertexBytes)}";
                if(buffers.TryGetValue(key,out var shared)&&shared.data.VertexBytes.SequenceEqual(data.VertexBytes)){
                    if(!ReferenceEquals(shared.data,data)){g.VertexData=shared.data;if(vb.Data1!=null)vb.Data1=shared.data;if(vb.Data2!=null)vb.Data2=shared.data;vertices++;}
                    if(Standard(vb)&&Standard(shared.buffer)&&vb.VFT==shared.buffer.VFT&&vb.VertexStride==shared.buffer.VertexStride&&vb.VertexCount==shared.buffer.VertexCount&&((vb.Data1!=null)==(shared.buffer.Data1!=null))&&((vb.Data2!=null)==(shared.buffer.Data2!=null)))g.VertexBuffer=shared.buffer;
                }else buffers[key]=(data,vb);
                var ib=g.IndexBuffer;var bytes=System.Runtime.InteropServices.MemoryMarshal.AsBytes(ib.Indices.AsSpan());
                string indexKey=scope+"/"+IndexMetadata(ib)+"/"+Convert.ToHexString(SHA256.HashData(bytes));
                if(indexBuffers.TryGetValue(indexKey,out var sharedIndex)&&sharedIndex.Indices.SequenceEqual(ib.Indices)){
                    if(!ReferenceEquals(ib,sharedIndex)){g.IndexBuffer=sharedIndex;indices++;}
                }else indexBuffers[indexKey]=ib;
            }
        }
        return(vertices,indices);
    }
    public static byte[] Compact(byte[] bytes,bool enforce=true){
        Size(bytes);if(BitConverter.ToInt32(bytes,4)!=165)throw new Exception("Selecione um YDD GTA V Legacy.");
        var file=new YddFile();file.Load(bytes);var counts=Share(file);
        var original=Size(bytes);
        var saved=counts.vertices+counts.indices>0||original.system>Limit||original.graphics>Limit?YddLayout.Save(file):bytes;
        if(enforce)Check(saved);
        var check=new YddFile();check.Load(saved);
        for(int di=0;di<file.Drawables.Length;di++){
            var a=file.Drawables[di];var b=check.Drawables[di];
            if(a.Name!=b.Name||a.AllModels.Length!=b.AllModels.Length||a.BoundingCenter!=b.BoundingCenter||a.BoundingBoxMin!=b.BoundingBoxMin||a.BoundingBoxMax!=b.BoundingBoxMax||a.BoundingSphereRadius!=b.BoundingSphereRadius)throw new Exception("Compactação alterou nomes ou LODs.");
            var oldBones=a.Skeleton?.Bones?.Items??Array.Empty<Bone>();var newBones=b.Skeleton?.Bones?.Items??Array.Empty<Bone>();
            if(oldBones.Length!=newBones.Length)throw new Exception("Compactação alterou esqueleto.");
            for(int bi=0;bi<oldBones.Length;bi++){
                var x=oldBones[bi];var y=newBones[bi];if(x.Name!=y.Name||x.Tag!=y.Tag||x.Index!=y.Index||x.ParentIndex!=y.ParentIndex||x.Translation!=y.Translation||x.Rotation!=y.Rotation||x.Scale!=y.Scale)throw new Exception("Compactação alterou pose ou hierarquia do esqueleto.");
            }
            for(int mi=0;mi<a.AllModels.Length;mi++){
                var am=a.AllModels[mi];var bm=b.AllModels[mi];if(am.SkeletonBinding!=bm.SkeletonBinding||am.RenderMaskFlags!=bm.RenderMaskFlags||am.Geometries.Length!=bm.Geometries.Length)throw new Exception("Compactação alterou vínculo/visibilidade.");
                for(int gi=0;gi<am.Geometries.Length;gi++){
                    var g=am.Geometries[gi];var h=bm.Geometries[gi];
                    if(g.VertexData.VertexCount!=h.VertexData.VertexCount||g.VertexData.VertexStride!=h.VertexData.VertexStride||g.VertexData.Info.Flags!=h.VertexData.Info.Flags||g.VertexData.Info.Types!=h.VertexData.Info.Types||!g.VertexData.VertexBytes.SequenceEqual(h.VertexData.VertexBytes)||!g.IndexBuffer.Indices.SequenceEqual(h.IndexBuffer.Indices)||!(g.BoneIds??Array.Empty<ushort>()).SequenceEqual(h.BoneIds??Array.Empty<ushort>())||g.ShaderID!=h.ShaderID)throw new Exception("Compactação alterou malha, UV, cores ou pesos.");
                }
            }
            var oldTextures=a.ShaderGroup?.TextureDictionary?.Textures?.data_items??Array.Empty<Texture>();var newTextures=b.ShaderGroup?.TextureDictionary?.Textures?.data_items??Array.Empty<Texture>();
            if(oldTextures.Length!=newTextures.Length)throw new Exception("Compactação alterou texturas embutidas.");
            foreach(var t in oldTextures){var n=newTextures.Single(x=>x.Name==t.Name);if(n.Format!=t.Format||n.Width!=t.Width||n.Height!=t.Height||n.Levels!=t.Levels||!n.Data.FullData.SequenceEqual(t.Data.FullData))throw new Exception("Compactação alterou pixels embutidos.");}
        }
        return saved;
    }
}
