using CodeWalker.GameFiles;
using SharpDX;

// Freemode clothing uses skeleton-global blend indices and an identity bone
// table, as in the authored ped YDD reference. Compact local palettes are not
// the runtime profile used by this converter.
static class PedSkin {
    public static ushort[] Identity(Skeleton skeleton){
        var bones=skeleton.Bones?.Items??throw new Exception("Esqueleto sem ossos.");
        if(bones.Length<1||bones.Length>255)throw new Exception("Este vínculo requer um esqueleto de 1 a 255 ossos.");
        for(int i=0;i<bones.Length;i++)if(bones[i].Index!=i)throw new Exception("A ordem dos ossos não corresponde aos índices do esqueleto.");
        return Enumerable.Range(0,bones.Length).Select(i=>(ushort)i).ToArray();
    }
    static bool ConverterMaterial(ShaderFX? shader){
        var p=shader?.ParametersList;
        return shader?.Name.Hash==JenkHash.GenHash("ped_default")&&shader.FileName.Hash==JenkHash.GenHash("ped_default.sps")&&p?.Parameters?.Length==13&&p.Hashes.Length==13&&(uint)p.Hashes[0]==JenkHash.GenHash("diffusesampler")&&(uint)p.Hashes[12]==JenkHash.GenHash("stubblecontrol");
    }
    static bool LocalRigid(DrawableGeometry g){
        var data=g.VertexData;var vb=g.VertexBuffer;
        if(g.BoneIds?.Length!=1||!ConverterMaterial(g.Shader)||data.Info.Flags!=127||data.Info.Types!=VertexDeclarationTypes.GTAV1||data.VertexStride!=48)return false;
        if(vb.Data1!=null&&!ReferenceEquals(vb.Data1,data)||vb.Data2!=null&&!ReferenceEquals(vb.Data2,data))return false;
        for(int i=0;i<data.VertexCount;i++){
            var w=data.GetUByte4(i,1);var b=data.GetUByte4(i,2);
            if(w.R!=255||w.G!=0||w.B!=0||w.A!=0||b.R!=0)return false;
        }
        return true;
    }
    public static int Repair(YddFile file){
        int changed=0;
        foreach(var d in file.Drawables){
            if(d.Skeleton?.Bones?.Items is not {Length:>1})continue;
            // Snapshot all candidates before changing headers shared by old LODs.
            var models=d.AllModels.Where(m=>m.HasSkin!=0&&m.Geometries.Length>0&&m.Geometries.All(LocalRigid)).ToArray();
            if(models.Length==0)continue;
            var palette=Identity(d.Skeleton);
            var converted=new Dictionary<(VertexData data,ushort bone),VertexData>();
            foreach(var model in models){
                foreach(var g in model.Geometries){
                    ushort index=g.BoneIds[0];if(index>=palette.Length)throw new Exception("Osso da conversão antiga fora do esqueleto.");
                    var old=g.VertexData;
                    if(!converted.TryGetValue((old,index),out var data)){
                        data=new VertexData{Info=old.Info,VertexCount=old.VertexCount,VertexStride=old.VertexStride,VertexBytes=old.VertexBytes.ToArray()};
                        for(int i=0;i<data.VertexCount;i++)data.SetUByte4(i,2,new Color((byte)index,(byte)0,(byte)0,(byte)0));
                        converted[(old,index)]=data;
                    }
                    // Keep all unknown buffer metadata; isolate pointer fields if an
                    // old file reused the same header for several geometries.
                    var vb=(VertexBuffer)typeof(object).GetMethod("MemberwiseClone",System.Reflection.BindingFlags.Instance|System.Reflection.BindingFlags.NonPublic)!.Invoke(g.VertexBuffer,null)!;
                    vb.Data1=data;vb.Data2=data;g.VertexBuffer=vb;g.VertexData=data;g.BoneIds=palette;
                }
                model.Flags|=1;model.SkeletonBindUnk1=(byte)palette.Length;changed++;
            }
        }
        return changed;
    }
    public static void Verify(YddFile file,ushort tag){
        foreach(var d in file.Drawables){
            var palette=Identity(d.Skeleton);var bone=d.Skeleton.Bones.Items.Single(b=>b.Tag==tag);
            foreach(var model in d.AllModels){
                if(model.HasSkin!=1||(model.Flags&1)==0||model.SkeletonBindUnk1!=palette.Length)throw new Exception("Cabeçalho de skin incompatível com o esqueleto do ped.");
                foreach(var g in model.Geometries){
                    if(!g.BoneIds.SequenceEqual(palette))throw new Exception("Tabela de ossos da conversão não corresponde ao esqueleto.");
                    for(int i=0;i<g.VertexData.VertexCount;i++){
                        var w=g.VertexData.GetUByte4(i,1);var b=g.VertexData.GetUByte4(i,2);
                        if(w.R!=255||w.G!=0||w.B!=0||w.A!=0||b.R!=bone.Index)throw new Exception("O vértice exportado não aponta para o osso escolhido.");
                    }
                }
            }
        }
    }
}
