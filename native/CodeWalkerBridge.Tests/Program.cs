using CodeWalker.GameFiles;
using SharpDX;
using System.Text.Json;
static void Check(bool condition,string message){if(!condition)throw new Exception(message);}
static void Near(Vector3 a,Vector3 b,string message)=>Check((a-b).Length()<0.0001,message+": "+a+" != "+b);
YddFile Fixture(bool skin=true,byte bind=0) {
 var bones=new[]{
  new Bone{Name="SKEL_ROOT",Tag=0,ParentIndex=-1,Scale=Vector3.One,Rotation=Quaternion.Identity},
  new Bone{Name="SKEL_Pelvis",Index=1,Index2=1,Tag=11816,ParentIndex=0,Translation=new Vector3(0,0,1),Scale=Vector3.One,Rotation=Quaternion.Identity},
  new Bone{Name="SKEL_Head",Index=2,Index2=2,Tag=31086,ParentIndex=1,Translation=new Vector3(0,0,1),Scale=Vector3.One,Rotation=Quaternion.Identity}};
 var skeleton=new Skeleton{Bones=new SkeletonBonesBlock{Items=bones}};
 skeleton.BuildIndices();skeleton.BuildBoneTags();skeleton.AssignBoneParents();skeleton.BuildTransformations();skeleton.BuildBonesMap();
 DrawableModel Model() {
  var info=new VertexDeclaration{Flags=79,Types=(VertexDeclarationTypes)0x7755555555996996};info.UpdateCountAndStride();
  var data=new VertexData{Info=info,VertexCount=3,VertexStride=info.Stride,VertexBytes=new byte[3*info.Stride]};
  for(int i=0;i<3;i++){data.SetVector3(i,0,new Vector3(i%2,i/2,2));data.SetVector3(i,3,Vector3.UnitZ);data.SetVector2(i,6,new Vector2(i%2,i/2));data.SetUByte4(i,1,new Color((byte)255,(byte)0,(byte)0,(byte)0));data.SetUByte4(i,2,new Color((byte)0,(byte)0,(byte)0,(byte)0));}
  var geometry=new DrawableGeometry{VertexData=data,VertexBuffer=new VertexBuffer{Data1=data,Info=info,VertexCount=3,VertexStride=info.Stride},IndexBuffer=new IndexBuffer{Indices=new ushort[]{0,1,2}},BoneIds=new ushort[]{2},VerticesCount=3,VertexStride=info.Stride};
  var model=new DrawableModel{Geometries=new[]{geometry},ShaderMapping=new ushort[]{0},GeometriesCount1=1,GeometriesCount2=1,GeometriesCount3=1,BoneIndex=bind,HasSkin=(byte)(skin?1:0)};model.RebuildBounds();return model;
 }
 var drawable=new Drawable{LightAttributes=new ResourceSimpleList64<LightAttributes>(),Name="godoy_test",Skeleton=skeleton,DrawableModels=new DrawableModelsBlock{High=new[]{Model()},Low=new[]{Model()}},LodDistHigh=999,LodDistMed=999,LodDistLow=999,LodDistVlow=999};
 drawable.BuildAllModels();drawable.BuildVertexDecls();drawable.BuildRenderMasks();
 var file=new YddFile{DrawableDict=new DrawableDictionary{Hashes=new uint[]{123},Drawables=new ResourcePointerArray64<Drawable>{data_items=new[]{drawable}}},Drawables=new[]{drawable}};
 var loaded=new YddFile();loaded.Load(file.Save());return loaded;
}
JsonElement Request(Matrix matrix,string bone)=>JsonSerializer.SerializeToElement(new{matrix=matrix.ToArray(),bone});
var fixture=Fixture();var original=fixture.Save();
var m=Matrix.Scaling(2,3,4)*Matrix.RotationZ(.4f)*Matrix.Translation(1,-2,-1);
var output=YddEditor.Export(fixture,Request(m,"pelvis"),null);var result=new YddFile();result.Load(output);
Check(result.Drawables[0].AllModels.Length==2,"all LODs retained");
foreach(var model in result.Drawables[0].AllModels){var g=model.Geometries[0];Check(g.BoneIds.SequenceEqual(new ushort[]{1}),"pelvis palette");for(int i=0;i<3;i++){
 Near(g.VertexData.GetVector3(i,0),Vector3.TransformCoordinate(new Vector3(i%2,i/2,2),m),"transformed position");
 Check(g.VertexData.GetUByte4(i,1).R==255&&g.VertexData.GetUByte4(i,2).R==0,"rigid skin weights");
 Check(g.VertexData.GetVector2(i,6)==new Vector2(i%2,i/2),"UV retained");
 Near(g.VertexData.GetVector3(i,3),Vector3.UnitZ,"normal normalized");
}}
var preserve=Fixture();var preserved=new YddFile();preserved.Load(YddEditor.Export(preserve,Request(m,"preserve"),null));Check(preserved.Drawables[0].AllModels[0].Geometries[0].BoneIds[0]==2,"preserve head weights");
var rigid=Fixture(false);var rigidOut=new YddFile();rigidOut.Load(YddEditor.Export(rigid,Request(m,"pelvis"),null));
var rigidModel=rigidOut.Drawables[0].AllModels[0];Check(rigidModel.BoneIndex==1&&rigidModel.HasSkin==0,"rigid binding");Near(Vector3.TransformCoordinate(rigidModel.Geometries[0].VertexData.GetVector3(0,0),rigidOut.Drawables[0].Skeleton.Bones.Items[1].AbsTransform),Vector3.TransformCoordinate(new Vector3(0,0,2),m),"rigid local bind position");
var localRigid=Fixture(false,2);var localOutput=new YddFile();localOutput.Load(YddEditor.Export(localRigid,Request(m,"pelvis"),null));
Near(Vector3.TransformCoordinate(localOutput.Drawables[0].AllModels[0].Geometries[0].VertexData.GetVector3(0,0),localOutput.Drawables[0].Skeleton.Bones.Items[1].AbsTransform),Vector3.TransformCoordinate(new Vector3(0,0,4),m),"original head-local bind respected");
var missing=Fixture();missing.Drawables[0].Skeleton=null;bool refused=false;try{YddEditor.Export(missing,Request(m,"pelvis"),null);}catch{refused=true;}Check(refused,"missing skeleton refused");
var donor=Fixture();YddEditor.Export(missing,Request(m,"pelvis"),donor);
Directory.CreateDirectory("tests/fixtures");File.WriteAllBytes("tests/fixtures/native-clothing.ydd",original);File.WriteAllBytes("tests/fixtures/native-rigid.ydd",Fixture(false,2).Save());
Console.WriteLine("Native YDD: all LODs, transformed vertices, UVs, normals, weights, rigid pelvis bind, preserved rig and donor skeleton PASS");
