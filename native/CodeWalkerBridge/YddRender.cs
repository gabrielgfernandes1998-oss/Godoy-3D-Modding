using CodeWalker.GameFiles;
using SharpDX;

// Drawable FlagsHigh/Med/Low/Vlow are LOD model counts, independently of the
// render-pass masks. Skin model Flags bit 0 and the matrix count are separate.
static class YddRender {
    public const uint PedDeclaration=127; // position, skin, normal, both colours, UV0
    public const int PedStride=48;
    public static ShaderFX PedMaterial(TextureBase diffuse) {
        // ped_default.sps profile (diffuse clothing). No source asset/material copied.
        var shader=new ShaderFX{Name=new MetaHash(JenkHash.GenHash("ped_default")),FileName=new MetaHash(JenkHash.GenHash("ped_default.sps")),RenderBucket=0,RenderBucketMask=0xff01};
        var names=new[]{"diffusesampler","texturesamplerdiffpal","volumesampler","bumpsampler","specsampler","envefffatthickness","specmapintmask","specularintensitymult","specularfalloffmult","specularfresnel","bumpiness","detailsettings","stubblecontrol"};
        var parameters=new List<ShaderParameter>{new(){DataType=0,Data=diffuse}};
        for(int i=0;i<4;i++)parameters.Add(new ShaderParameter{DataType=0,Data=null});
        foreach(var value in new[]{new Vector4(25,25,0,0),new Vector4(1,0,0,0),new Vector4(.125f,0,0,0),new Vector4(100,0,0,0),new Vector4(.97f,0,0,0),new Vector4(1,0,0,0),new Vector4(.1f,.75f,40,0),new Vector4(2,.6f,0,0)})parameters.Add(new ShaderParameter{DataType=1,Data=value});
        shader.ParametersList=new ShaderParametersBlock{Owner=shader,Count=parameters.Count,Hashes=names.Select(n=>(MetaName)JenkHash.GenHash(n)).ToArray(),Parameters=parameters.ToArray()};
        shader.ParameterCount=(byte)parameters.Count;shader.TextureParametersCount=5;shader.ParameterSize=shader.ParametersList.ParametersSize;shader.ParameterDataSize=shader.ParametersList.ParametersDataSize;
        return shader;
    }
    public static int Repair(YddFile file) {
        int changed=0;
        byte Count(DrawableModel[]? models,byte current){
            int count=models?.Length??0;
            if(current!=0||count==0)return current;
            if(count>255)throw new Exception("Mais de 255 modelos no mesmo LOD; divida o YDD.");
            changed++;return (byte)count;
        }
        foreach(var d in file.Drawables){
            d.FlagsHigh=Count(d.DrawableModels?.High,d.FlagsHigh);d.FlagsMed=Count(d.DrawableModels?.Med,d.FlagsMed);
            d.FlagsLow=Count(d.DrawableModels?.Low,d.FlagsLow);d.FlagsVlow=Count(d.DrawableModels?.VLow,d.FlagsVlow);
            var replacements=new Dictionary<ShaderFX,ShaderFX>();
            var shaders=d.ShaderGroup?.Shaders?.data_items;
            if(shaders!=null)for(int i=0;i<shaders.Length;i++){
                var shader=shaders[i];var p=shader.ParametersList;
                // Only migrate the exact old Godoy converter signature. Existing
                // authored materials and unknown vertex formats remain untouched.
                if(shader.Name.Hash!=JenkHash.GenHash("ped")||shader.FileName.Hash!=JenkHash.GenHash("ped_default.sps")||p?.Parameters?.Length!=2||p.Hashes.Length!=2||(uint)p.Hashes[0]!=JenkHash.GenHash("diffusesampler")||(uint)p.Hashes[1]!=JenkHash.GenHash("matmaterialcolorscale")||p.Parameters[0].Data is not TextureBase diffuse)continue;
                var geometries=d.AllModels.SelectMany(m=>m.Geometries).Where(g=>ReferenceEquals(g.Shader,shader)).ToArray();
                if(geometries.Length==0||geometries.Any(g=>g.VertexData.Info.Flags!=95||g.VertexData.VertexStride!=44||g.VertexBuffer.Data2!=null&&!ReferenceEquals(g.VertexBuffer.Data2,g.VertexData)))continue;
                shaders[i]=PedMaterial(diffuse);replacements[shader]=shaders[i];changed++;
            }
            var upgraded=new Dictionary<VertexData,VertexData>();
            foreach(var model in d.AllModels){
                bool converted=false;
                foreach(var g in model.Geometries){
                    if(!replacements.TryGetValue(g.Shader,out var material))continue;
                    converted=true;var old=g.VertexData;
                    if(!upgraded.TryGetValue(old,out var data)){
                        var info=new VertexDeclaration{Flags=PedDeclaration,Types=VertexDeclarationTypes.GTAV1};info.UpdateCountAndStride();
                        data=new VertexData{Info=info,VertexCount=old.VertexCount,VertexStride=info.Stride,VertexBytes=new byte[old.VertexCount*info.Stride]};
                        for(int i=0;i<old.VertexCount;i++){
                            Buffer.BlockCopy(old.VertexBytes,i*44,data.VertexBytes,i*PedStride,36);
                            data.SetColour(i,5,new Color((byte)255,(byte)255,(byte)255,(byte)255));
                            Buffer.BlockCopy(old.VertexBytes,i*44+36,data.VertexBytes,i*PedStride+40,8);
                        }
                        upgraded[old]=data;
                    }
                    // Same non-distinct data references as CodeWalker's XML import.
                    var vb=g.VertexBuffer;vb.Data1=data;vb.Data2=data;
                    vb.Info=data.Info;vb.VertexStride=(ushort)data.VertexStride;g.VertexData=data;g.VertexStride=(ushort)data.VertexStride;g.Shader=material;
                }
                if(converted&&model.HasSkin!=0){
                    model.Flags|=1;
                    int count=model.Geometries.Max(g=>g.BoneIds?.Length??0);
                    if(count>255)throw new Exception("Palette de skin acima de 255 matrizes.");
                    if(model.SkeletonBindUnk1==0)model.SkeletonBindUnk1=(byte)count;
                }
            }
            d.BuildVertexDecls();
        }
        return changed;
    }
    public static void ValidateCounts(YddFile file){
        foreach(var d in file.Drawables){
            var lods=new[]{(d.DrawableModels?.High,d.FlagsHigh),(d.DrawableModels?.Med,d.FlagsMed),(d.DrawableModels?.Low,d.FlagsLow),(d.DrawableModels?.VLow,d.FlagsVlow)};
            foreach(var (models,count) in lods)if(models?.Length>0&&count==0)throw new Exception("YDD com modelos de LOD presentes e contagem de renderização zero. Repare o YDD antes de usar no jogo.");
        }
    }
}
