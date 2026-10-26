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
 var shader=new ShaderFX{Name=new MetaHash(JenkHash.GenHash("ped_default")),FileName=new MetaHash(JenkHash.GenHash("ped_default.sps")),RenderBucketMask=0xff01};
 shader.ParametersList=new ShaderParametersBlock{Owner=shader,Count=1,Hashes=new[]{(MetaName)JenkHash.GenHash("diffusesampler")},Parameters=new[]{new ShaderParameter{DataType=0,Data=new TextureBase{Name="original_diffuse",NameHash=JenkHash.GenHash("original_diffuse")}}}};
 shader.ParameterCount=1;shader.TextureParametersCount=1;shader.ParameterSize=shader.ParametersList.ParametersSize;shader.ParameterDataSize=shader.ParametersList.ParametersDataSize;
 drawable.ShaderGroup=new ShaderGroup{Shaders=new ResourcePointerArray64<ShaderFX>{data_items=new[]{shader}}};
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
var addition=new {positions=new float[]{.1f,.1f,2,.2f,.1f,2,.1f,.2f,2},normals=new float[]{0,0,1,0,0,1,0,0,1},uvs=new float[]{.2f,.3f,.8f,.3f,.2f,.9f},indices=new[]{0,1,2}};
var convertPixels=Enumerable.Repeat(new byte[]{12,34,56,255},512*512).SelectMany(x=>x).ToArray();
JsonElement ConvertRequest(int boneTag=11816)=>JsonSerializer.SerializeToElement(new{name="accs_007_u",boneTag,parts=new[]{addition},textureSize=512,pixels=Convert.ToBase64String(convertPixels)});
var converted=ObjYdd.Create(Fixture(),ConvertRequest());var convertedDoc=new YddFile();convertedDoc.Load(converted.ydd);var convertedTexture=new YtdFile();convertedTexture.Load(converted.ytd);
Check(convertedDoc.Drawables.Length==1&&convertedDoc.Drawables[0].Name=="accs_007_u","new OBJ drawable name");
Check((convertedDoc.Drawables[0].RenderMaskHigh&1)!=0&&(convertedDoc.Drawables[0].RenderMaskLow&1)!=0,"converted drawable is visible in CodeWalker high/low render passes");
Check(convertedDoc.DrawableDict.Hashes[0]==JenkHash.GenHash("accs_007_u"),"new drawable dictionary hash");
foreach(var model in convertedDoc.Drawables[0].AllModels) {
 Check((model.RenderMask&1)!=0,"converted model survives CodeWalker/grzy final-render filter");
 Check(model.Geometries.All(g=>g.Shader.Name.Hash==JenkHash.GenHash("ped")&&g.Shader.FileName.Hash==JenkHash.GenHash("ped_default.sps")),"ped shader family and variant match clothing conventions");
 Check(model.HasSkin==1&&model.Geometries.Length==1,"new YDD contains OBJ alone, no ped geometry");var g=model.Geometries[0];Check(g.VertexData.VertexCount==3&&g.BoneIds.SequenceEqual(new ushort[]{1}),"OBJ vertex count and chosen pelvis palette");
 Near(g.VertexData.GetVector3(0,0),new Vector3(.1f,.1f,2),"OBJ world placement in bind pose");
 Check(g.VertexData.GetUByte4(0,1).R==255&&g.VertexData.GetUByte4(0,2).R==0,"single-bone 100 percent weights");
 Check(g.VertexData.GetColour(0,4).R==255,"white vertex colors avoid dark diffuse");
 Check(g.VertexData.GetVector2(0,6)==new Vector2(.2f,.3f),"converter retains supplied UV");
 Check(((TextureBase)g.Shader.ParametersList.Parameters[0].Data).Name=="accs_diff_007_a_uni","converter YDD sampler matches YTD name");
}
var ct=convertedTexture.TextureDict.Textures.data_items.Single();Check(ct.Name=="accs_diff_007_a_uni"&&ct.Width==512&&ct.Levels==10,"converter single diffuse and full mips");Check(CodeWalker.Utils.DDSIO.GetPixels(ct,0).Take(4).SequenceEqual(new byte[]{56,34,12,255}),"RGBA input becomes correct native BGRA");
// Pair normalization must preserve the exact rig/mesh and atlas while renaming both files.
var normalizedPair=ObjYdd.NormalizePair(converted.ydd,converted.ytd,"accs_021_u");
var normalizedDoc=new YddFile();normalizedDoc.Load(normalizedPair.ydd);var normalizedTex=new YtdFile();normalizedTex.Load(normalizedPair.ytd);
Check(normalizedDoc.Drawables[0].Name=="accs_021_u"&&normalizedDoc.DrawableDict.Hashes[0]==JenkHash.GenHash("accs_021_u"),"normalized pair drawable identity");
Check(normalizedTex.TextureDict.Textures.data_items[0].Name=="accs_diff_021_a_uni"&&normalizedTex.TextureDict.Textures.data_items[0].Data.FullData.SequenceEqual(ct.Data.FullData),"normalization keeps all mip pixels while renaming dictionary");
for(int mi=0;mi<convertedDoc.Drawables[0].AllModels.Length;mi++) {
 var a=convertedDoc.Drawables[0].AllModels[mi];var b=normalizedDoc.Drawables[0].AllModels[mi];
 Check(a.SkeletonBinding==b.SkeletonBinding&&a.RenderMaskFlags==b.RenderMaskFlags&&a.Geometries[0].VertexData.VertexBytes.SequenceEqual(b.Geometries[0].VertexData.VertexBytes)&&a.Geometries[0].BoneIds.SequenceEqual(b.Geometries[0].BoneIds)&&a.Geometries[0].IndexBuffer.Indices.SequenceEqual(b.Geometries[0].IndexBuffer.Indices),"pair normalization retains every LOD's rig, vertices, UV and triangles");
 Check(((TextureBase)b.Geometries[0].Shader.ParametersList.Parameters[0].Data).Name=="accs_diff_021_a_uni","normalized material resolves renamed dictionary texture");
}
var again=ObjYdd.NormalizePair(normalizedPair.ydd,normalizedPair.ytd,"accs_021_u");var againTex=new YtdFile();againTex.Load(again.ytd);Check(againTex.TextureDict.Textures.data_items[0].Data.FullData.SequenceEqual(ct.Data.FullData),"repeated pair normalization preserves pixels");
var mismatched=new YtdFile();mismatched.Load(converted.ytd);var mismatchedT=mismatched.TextureDict.Textures.data_items[0];mismatchedT.Name="unrelated";mismatched.TextureDict.BuildFromTextureList(new List<Texture>{mismatchedT});bool mismatchRejected=false;try{ObjYdd.NormalizePair(converted.ydd,mismatched.Save(),"accs_021_u");}catch(Exception){mismatchRejected=true;}Check(mismatchRejected,"unlinked YDD/YTD pair rejected before export");
Console.WriteLine("Confirmed grzy Test 1 paired normalization: identity, all LODs, rig, mip pixels, repeat save and mismatch rejection PASS");
var headConverted=new YddFile();headConverted.Load(ObjYdd.Create(Fixture(),ConvertRequest(31086)).ydd);Check(headConverted.Drawables[0].AllModels[0].Geometries[0].BoneIds[0]==2,"converter head selection");
bool absentBone=false;try{ObjYdd.Create(Fixture(),ConvertRequest(999));}catch(Exception){absentBone=true;}Check(absentBone,"converter missing bone rejected");
bool invalidConversion=false;try{ObjYdd.Create(Fixture(),JsonSerializer.SerializeToElement(new{name="../bad",boneTag=11816}));}catch(Exception){invalidConversion=true;}Check(invalidConversion,"converter unsafe name rejected");
Directory.CreateDirectory("tests/fixtures");File.WriteAllBytes("tests/fixtures/native-converted-obj.ydd",converted.ydd);File.WriteAllBytes("tests/fixtures/native-converted-obj.ytd",converted.ytd);
object LargeObjPart(int count) {
 var p=new float[count*3];var n=new float[count*3];var uv=new float[count*2];
 for(int i=0;i<count;i++){p[i*3]=(i%3)*.1f;p[i*3+1]=(i%7)*.1f;p[i*3+2]=1;n[i*3+2]=1;uv[i*2]=(i%3)*.25f;uv[i*2+1]=.5f;}
 return new{positions=p,normals=n,uvs=uv,indices=Enumerable.Range(0,count).ToArray()};
}
var largeObjRequest=JsonSerializer.SerializeToElement(new{name="accs_008_u",boneTag=11816,parts=new[]{LargeObjPart(65535),LargeObjPart(54465)},textureSize=512,pixels=Convert.ToBase64String(convertPixels)});
var largeConverted=new YddFile();largeConverted.Load(ObjYdd.Create(Fixture(),largeObjRequest).ydd);
foreach(var model in largeConverted.Drawables[0].AllModels){Check(model.Geometries.Length==2,"automatically split OBJ stays in one drawable at every LOD");Check(model.Geometries.Sum(g=>g.VertexData.VertexCount)==120000,"converter above old 100000 cap retains every vertex");Check(model.Geometries.All(g=>g.VertexData.VertexCount<=65535&&g.IndexBuffer.Indices.Max()<g.VertexData.VertexCount),"split native index range fits each geometry");Check(model.Geometries.All(g=>g.BoneIds.SequenceEqual(new ushort[]{1})),"all automatic parts use the selected bone");}
string binaryPartFile=Path.GetTempFileName();
try {
 using(var stream=File.Create(binaryPartFile))using(var writer=new BinaryWriter(stream)){
  writer.Write(0x324a424fu);writer.Write(40u);
  for(int part=0;part<40;part++){writer.Write(3u);writer.Write(3u);foreach(float v in addition.positions)writer.Write(v);foreach(float v in addition.normals)writer.Write(v);foreach(float v in addition.uvs)writer.Write(v);foreach(int v in addition.indices)writer.Write((ushort)v);}
 }
 var binaryRequest=JsonSerializer.SerializeToElement(new{name="accs_009_u",boneTag=11816,partsFile=binaryPartFile,textureSize=512,pixels=Convert.ToBase64String(convertPixels)});
 var binaryOutput=new YddFile();binaryOutput.Load(ObjYdd.Create(Fixture(),binaryRequest).ydd);Check(binaryOutput.Drawables[0].AllModels.All(m=>m.Geometries.Length==40),"binary transport preserves more than 32 parts");
 using(var stream=File.OpenWrite(binaryPartFile))stream.SetLength(stream.Length-1);
 bool truncatedRejected=false;try{ObjYdd.Create(Fixture(),binaryRequest);}catch(Exception){truncatedRejected=true;}Check(truncatedRejected,"truncated binary geometry rejected");
}finally{File.Delete(binaryPartFile);}
Console.WriteLine("OBJ binary transport: more than 32 geometries and truncated data validation PASS");
Console.WriteLine("OBJ converter large mesh: 120000 vertices, split 16-bit geometry, chosen bone and all LODs round trip PASS");
Console.WriteLine("OBJ converter: new drawable only, skeleton, head/pelvis weights, all LODs, UV, white colors, sampler, RGBA mip texture and validation PASS");
var joinFixture=Fixture();var sourceVertices=joinFixture.Drawables[0].AllModels[0].Geometries[0].VertexData.VertexBytes.ToArray();
var joinRequest=JsonSerializer.SerializeToElement(new {matrix=Matrix.Identity.ToArray(),bone="preserve",additions=new[]{addition}});
var joined=new YddFile();joined.Load(YddEditor.Export(joinFixture,joinRequest,null));
foreach(var model in joined.Drawables[0].AllModels) {
 Check(model.Geometries.Length==2,"OBJ geometry exists in every LOD");var originalGeometry=model.Geometries[0];var added=model.Geometries[1];
 Check(originalGeometry.VertexData.VertexBytes.SequenceEqual(sourceVertices),"original vertex channels retained");
 Check(added.ShaderID==originalGeometry.ShaderID&&added.BoneIds.SequenceEqual(originalGeometry.BoneIds),"material and bone palette inherited");
 Near(added.VertexData.GetVector3(0,0),new Vector3(.1f,.1f,2),"OBJ placement retained");
 Check(added.VertexData.GetUByte4(0,1).R==255&&added.VertexData.GetUByte4(0,2).R==0,"OBJ inherited skin weights");
 Check((added.VertexData.GetVector2(0,6)-new Vector2(.2f,.3f)).Length()<1e-5,"OBJ UV retained");
 Check(added.IndexBuffer.Indices.SequenceEqual(new ushort[]{0,1,2}),"OBJ indices retained");
}
var transformedJoin=new YddFile();transformedJoin.Load(YddEditor.Export(Fixture(),JsonSerializer.SerializeToElement(new{matrix=m.ToArray(),bone="pelvis",additions=new[]{addition}}),null));
Near(transformedJoin.Drawables[0].AllModels[0].Geometries[1].VertexData.GetVector3(0,0),Vector3.TransformCoordinate(new Vector3(.1f,.1f,2),m),"combined YDD transform");
Check(transformedJoin.Drawables[0].AllModels[0].Geometries[1].BoneIds[0]==1,"combined YDD rig rebind");
var rigidAddition=new {positions=new float[]{.1f,.1f,4,.2f,.1f,4,.1f,.2f,4},normals=addition.normals,uvs=addition.uvs,indices=addition.indices};
var rigidJoined=new YddFile();rigidJoined.Load(YddEditor.Export(Fixture(false,2),JsonSerializer.SerializeToElement(new{matrix=Matrix.Identity.ToArray(),bone="preserve",additions=new[]{rigidAddition}}),null));
Near(Vector3.TransformCoordinate(rigidJoined.Drawables[0].AllModels[0].Geometries[1].VertexData.GetVector3(0,0),rigidJoined.Drawables[0].Skeleton.Bones.Items[2].AbsTransform),new Vector3(.1f,.1f,4),"OBJ rigid bone-local conversion");
var secondary=Fixture();foreach(var model in secondary.Drawables[0].AllModels){var vb=model.Geometries[0].VertexBuffer;vb.Data2=vb.Data1;vb.Data1=null;}
var secondaryOut=new YddFile();secondaryOut.Load(YddEditor.Export(secondary,joinRequest,null));Check(secondaryOut.Drawables[0].AllModels[0].Geometries[1].VertexBuffer.Data1 is null&&secondaryOut.Drawables[0].AllModels[0].Geometries[1].VertexBuffer.Data2 is not null,"secondary vertex stream preserved");
bool badIndices=false;try{YddEditor.Export(Fixture(),JsonSerializer.SerializeToElement(new{matrix=Matrix.Identity.ToArray(),bone="preserve",additions=new[]{new{positions=addition.positions,normals=addition.normals,uvs=addition.uvs,indices=new[]{0,1,100}}}}),null);}catch{badIndices=true;}Check(badIndices,"invalid addition indices refused");
Console.WriteLine("Native OBJ incorporation: original vertices, all LODs, material, UV, skin weights, transforms and rigid bone coordinates PASS");
Directory.CreateDirectory("tests/fixtures");File.WriteAllBytes("tests/fixtures/native-clothing.ydd",original);File.WriteAllBytes("tests/fixtures/native-rigid.ydd",Fixture(false,2).Save());
Console.WriteLine("Native YDD: all LODs, transformed vertices, UVs, normals, weights, rigid pelvis bind, preserved rig and donor skeleton PASS");

var ytdFixture=new YtdFile{TextureDict=new TextureDictionary()};
ytdFixture.TextureDict.BuildFromTextureList(new List<Texture>{YddTextures.Solid("original_diffuse",4,30,60,90)});
var originalYtd=ytdFixture.Save();File.WriteAllBytes("tests/fixtures/native-clothing.ytd",originalYtd);
var textureName="godoy_obj_test_1";
var textureRequest=JsonSerializer.SerializeToElement(new {matrix=Matrix.Identity.ToArray(),bone="preserve",ytdData=Convert.ToBase64String(originalYtd),additions=new[]{new{positions=addition.positions,normals=addition.normals,uvs=addition.uvs,indices=addition.indices,textureName}}});
var updatedYtd=new YtdFile();updatedYtd.Load(YddTextures.Build(textureRequest)!);
Check(updatedYtd.TextureDict.Textures.data_items.Length==4,"original plus diffuse/normal/spec OBJ entries");
var newTexture=updatedYtd.TextureDict.Textures.data_items.Single(t=>t.Name==textureName);
Check(newTexture.Width==1024&&newTexture.Levels==11&&newTexture.Data.FullData.Length==5592404,"complete OBJ texture and mip chain");
var texturedYdd=new YddFile();texturedYdd.Load(YddEditor.Export(Fixture(),textureRequest,null));
foreach(var model in texturedYdd.Drawables[0].AllModels) {
 Check(model.Geometries[0].ShaderID==0&&model.Geometries[1].ShaderID==1,"independent material on all LODs");
 Check(((TextureBase)model.Geometries[0].Shader.ParametersList.Parameters[0].Data).Name=="original_diffuse","original sampler unchanged");
 Check(((TextureBase)model.Geometries[1].Shader.ParametersList.Parameters[0].Data).Name==textureName,"OBJ sampler resolves new YTD entry");
}
Console.WriteLine("Native UV/YTD: separate material, texture lookup, full mips, all LODs, original texture bytes preserved PASS");

// Regression: real GTA sampler hashes are lowercase, unlike the old synthetic fixture.
Check((uint)texturedYdd.Drawables[0].AllModels[0].Geometries[1].Shader.ParametersList.Hashes[0]==4059966321u,"canonical GTA diffuse hash preserved");
var legacyFixture=Fixture();legacyFixture.Drawables[0].ShaderGroup.Shaders.data_items[0].ParametersList.Hashes[0]=(MetaName)JenkHash.GenHash("DiffuseSampler");
YddEditor.Export(legacyFixture,textureRequest,null);
var mapsFixture=Fixture();var mapsShader=mapsFixture.Drawables[0].ShaderGroup.Shaders.data_items[0];
mapsShader.ParametersList.Hashes=new[]{(MetaName)JenkHash.GenHash("diffusesampler"),(MetaName)JenkHash.GenHash("bumpsampler"),(MetaName)JenkHash.GenHash("specsampler")};
mapsShader.ParametersList.Parameters=new[]{"diffuse","normal","spec"}.Select(n=>new ShaderParameter{DataType=0,Data=new TextureBase{Name=n,NameHash=JenkHash.GenHash(n)}}).ToArray();
mapsShader.ParametersList.Count=3;mapsShader.ParameterCount=3;mapsShader.TextureParametersCount=3;mapsShader.ParameterSize=mapsShader.ParametersList.ParametersSize;mapsShader.ParameterDataSize=mapsShader.ParametersList.ParametersDataSize;
var mapped=new YddFile();mapped.Load(YddEditor.Export(mapsFixture,textureRequest,null));
var mapParameters=mapped.Drawables[0].AllModels[0].Geometries[1].Shader.ParametersList.Parameters;
Check(((TextureBase)mapParameters[1].Data).Name==textureName+"_n","canonical bump sampler uses neutral normal");
Check(((TextureBase)mapParameters[2].Data).Name==textureName+"_s","canonical spec sampler uses neutral specular");
Console.WriteLine("GTA lowercase diffuse/bump/spec hashes and legacy mixed-case samplers PASS");

// Shader-specific palette/detail slots must never be replaced with black maps.
var paletteFixture=Fixture();var paletteShader=paletteFixture.Drawables[0].ShaderGroup.Shaders.data_items[0];
var paletteParameter=new ShaderParameter{DataType=0,Data=new TextureBase{Name="original_palette",NameHash=JenkHash.GenHash("original_palette")}};
paletteShader.ParametersList.Hashes=paletteShader.ParametersList.Hashes.Append((MetaName)JenkHash.GenHash("tintpalettesampler")).ToArray();
paletteShader.ParametersList.Parameters=paletteShader.ParametersList.Parameters.Append(paletteParameter).ToArray();
paletteShader.ParametersList.Count=2;paletteShader.ParameterCount=2;paletteShader.TextureParametersCount=2;paletteShader.ParameterSize=paletteShader.ParametersList.ParametersSize;paletteShader.ParameterDataSize=paletteShader.ParametersList.ParametersDataSize;
var paletteOutput=new YddFile();paletteOutput.Load(YddEditor.Export(paletteFixture,textureRequest,null));
foreach(var model in paletteOutput.Drawables[0].AllModels)foreach(var geometry in model.Geometries)
 Check(((TextureBase)geometry.Shader.ParametersList.Parameters[1].Data).Name=="original_palette","original and added shader retain palette sampler");
Check(((TextureBase)paletteParameter.Data).Name=="original_palette","source palette sampler not mutated");
Console.WriteLine("Unknown shader samplers (palette/detail/mask) preserved instead of replaced with black PASS");

// Unified atlas: one primary entry (the exact texture grzy overrides), all LOD UVs.
var atlasRequest=JsonSerializer.SerializeToElement(new {matrix=Matrix.Identity.ToArray(),bone="preserve",atlas=true,ytdData=Convert.ToBase64String(originalYtd),additions=new[]{addition}});
var atlasFixture=Fixture();var originalAtlasVertices=atlasFixture.Drawables[0].AllModels[0].Geometries[0].VertexData;
var atlasYtd=new YtdFile();atlasYtd.Load(YddAtlas.Build(atlasFixture,atlasRequest));
var atlasYdd=new YddFile();atlasYdd.Load(YddEditor.Export(atlasFixture,atlasRequest,null));
Check(atlasYtd.TextureDict.Textures.data_items.Length==1,"single diffuse entry for ped/grzy override");
var atlasTexture=atlasYtd.TextureDict.Textures.data_items[0];
Check(atlasTexture.Name=="original_diffuse"&&atlasTexture.Width==512&&atlasTexture.Height==512&&atlasTexture.Levels==10,"atlas name/dimensions/mips");
var atlasPixels=CodeWalker.Utils.DDSIO.GetPixels(atlasTexture,0);
for(int y=0;y<4;y++)for(int x=0;x<4;x++)Check(atlasPixels[(y*512+x)*4]==90&&atlasPixels[(y*512+x)*4+1]==60&&atlasPixels[(y*512+x)*4+2]==30,"original diffuse pixels preserved 1:1 in atlas");
Check(atlasPixels[(100*512+400)*4]==220,"OBJ region initially gray");
foreach(var model in atlasYdd.Drawables[0].AllModels) {
 var baseGeometry=model.Geometries[0];var objGeometry=model.Geometries[1];
 Check(baseGeometry.ShaderID==objGeometry.ShaderID,"same material / primary diffuse under override");
 Check(baseGeometry.VertexData.GetVector2(0,6).X<.5&&objGeometry.VertexData.GetVector2(0,6).X>.5,"disjoint base and OBJ UV regions at every LOD");
 Check(((TextureBase)objGeometry.Shader.ParametersList.Parameters[0].Data).Name==atlasTexture.Name,"OBJ references unified atlas");
 Near(baseGeometry.VertexData.GetVector3(0,0),new Vector3(0,0,2),"atlas preserves original positions");
}
// Maps move with the source chart and neutral accessory region stays embedded, not first in YTD.
var auxFixture=Fixture();var auxShader=auxFixture.Drawables[0].ShaderGroup.Shaders.data_items[0];
auxShader.ParametersList.Hashes=mapsShader.ParametersList.Hashes.ToArray();
auxShader.ParametersList.Parameters=new[]{new ShaderParameter{DataType=0,Data=new TextureBase{Name="original_diffuse",NameHash=JenkHash.GenHash("original_diffuse")}},new ShaderParameter{DataType=0,Data=YddTextures.Solid("source_normal",4,90,100,250)},new ShaderParameter{DataType=0,Data=YddTextures.Solid("source_spec",4,40,50,60)}};
auxShader.ParameterCount=3;auxShader.TextureParametersCount=3;auxShader.ParametersList.Count=3;auxShader.ParameterSize=auxShader.ParametersList.ParametersSize;auxShader.ParameterDataSize=auxShader.ParametersList.ParametersDataSize;
YddAtlas.Build(auxFixture,atlasRequest);var auxOut=new YddFile();auxOut.Load(YddEditor.Export(auxFixture,atlasRequest,null));
var normalReference=(TextureBase)auxOut.Drawables[0].AllModels[0].Geometries[0].Shader.ParametersList.Parameters[1].Data;
var normal=auxOut.Drawables[0].ShaderGroup.TextureDictionary.Lookup(normalReference.NameHash);
Check(normal is not null&&normal.Width==512,"normal atlas is embedded in YDD");
var normalPixels=CodeWalker.Utils.DDSIO.GetPixels(normal,0);
Check(normalPixels[0]==250&&normalPixels[1]==100&&normalPixels[2]==90,"normal source pixels preserved");
Check(normalPixels[(100*512+400)*4]==255&&normalPixels[(100*512+400)*4+1]==128&&normalPixels[(100*512+400)*4+2]==128,"OBJ neutral normal region");
bool tiledRejected=false;try{var tiled=Fixture();tiled.Drawables[0].AllModels[0].Geometries[0].VertexData.SetVector2(0,6,new Vector2(2,0));YddAtlas.Build(tiled,atlasRequest);}catch(Exception e){tiledRejected=e.Message.Contains("fora de 0–1");}Check(tiledRejected,"tiled UV rejected rather than destroyed");
// Repeating UVs are valid when the source still occupies the entire texture.
var repeating=Fixture();
foreach(var model in repeating.Drawables[0].AllModels) {
 model.Geometries[0].VertexData.SetVector2(0,6,new Vector2(-1.25f,2.5f));
 model.Geometries[0].VertexData.SetVector2(1,6,new Vector2(2.25f,-.5f));
}
File.WriteAllBytes("tests/fixtures/native-clothing-tiled.ydd",repeating.Save());
var repeatingRequest=JsonSerializer.SerializeToElement(new{matrix=Matrix.Identity.ToArray(),bone="preserve",atlas=true,ytdData=Convert.ToBase64String(originalYtd),additions=new[]{addition},atlasLayout=new{size=512,sources=new[]{new{x=0,y=0,width=512,height=512}},additions=new[]{new{x=400,y=400,width=64,height=64}}}});
var repeatingYtd=new YtdFile();repeatingYtd.Load(YddAtlas.Build(repeating,repeatingRequest));
var repeatingOutput=new YddFile();repeatingOutput.Load(YddEditor.Export(repeating,repeatingRequest,null));
foreach(var model in repeatingOutput.Drawables[0].AllModels) {
 Check(model.Geometries.Length==2,"repeating source and OBJ exported together");
 Check(model.Geometries[0].VertexData.GetVector2(0,6)==new Vector2(-1.25f,2.5f),"negative and repeated UV unchanged after native round trip");
 Check(model.Geometries[0].VertexData.GetVector2(1,6)==new Vector2(2.25f,-.5f),"triangle crossing repeat boundaries remains intact at all LODs");
}
Check(repeatingYtd.TextureDict.Textures.data_items.Length==1,"repeating UV export still uses single YTD diffuse");
var nonFinite=Fixture();nonFinite.Drawables[0].AllModels[0].Geometries[0].VertexData.SetVector2(0,6,new Vector2(float.NaN,0));
bool invalidUvRejected=false;try{YddAtlas.Build(nonFinite,repeatingRequest);}catch(Exception e){invalidUvRejected=e.Message.Contains("não finitas");}Check(invalidUvRejected,"nonfinite UV rejected even for full-map source");
Console.WriteLine("Repeating negative/out-of-range UV native YDD+YTD round trip with OBJ at all LODs PASS");
Console.WriteLine("Unified atlas: single diffuse override, original pixels, disjoint all-LOD UV, embedded auxiliary maps, unchanged positions/rig PASS");

var embeddedSource=Fixture();var embeddedDictionary=new TextureDictionary();embeddedDictionary.BuildFromTextureList(new List<Texture>{YddTextures.Solid("original_diffuse",4,1,2,3)});embeddedSource.Drawables[0].ShaderGroup.TextureDictionary=embeddedDictionary;
YddAtlas.Build(embeddedSource,atlasRequest);Check(embeddedSource.Drawables[0].ShaderGroup.TextureDictionary?.Lookup(JenkHash.GenHash("original_diffuse")) is null,"stale embedded diffuse cannot shadow unified external atlas");
// Multiple OBJ parts share the right side without sharing UV cells.
var twoParts=JsonSerializer.SerializeToElement(new{additions=new[]{addition,addition}});
var firstUv=YddAtlas.AdditionUv(twoParts,0,new Vector2(.5f));var secondUv=YddAtlas.AdditionUv(twoParts,1,new Vector2(.5f));Check(firstUv.X>.5&&secondUv.X>firstUv.X,"multiple OBJ UV regions distinct");

var variantFixture=Fixture();var variantSource=new YtdFile{TextureDict=new TextureDictionary()};variantSource.TextureDict.BuildFromTextureList(new List<Texture>{YddTextures.Solid("variant_diffuse",4,70,80,90)});
var variantRequest=JsonSerializer.SerializeToElement(new{matrix=Matrix.Identity.ToArray(),bone="preserve",atlas=true,ytdData=Convert.ToBase64String(variantSource.Save()),additions=new[]{addition}});
var variantAtlas=new YtdFile();variantAtlas.Load(YddAtlas.Build(variantFixture,variantRequest));Check(variantAtlas.TextureDict.Textures.data_items.Single().Name=="variant_diffuse","single-entry texture variation follows ped diffuse override semantics");

// Real report: opaque sampler 0x8ab98831 references absent FBX placeholder.
void AppendTextureSlot(ShaderFX shader,uint hash,TextureBase texture) {
 shader.ParametersList.Hashes=shader.ParametersList.Hashes.Append((MetaName)hash).ToArray();
 shader.ParametersList.Parameters=shader.ParametersList.Parameters.Append(new ShaderParameter{DataType=0,Data=texture}).ToArray();
 shader.ParametersList.Count=shader.ParametersList.Parameters.Length;shader.ParameterCount=(byte)shader.ParametersList.Count;shader.TextureParametersCount=shader.ParametersList.TextureParamsCount;shader.ParameterSize=shader.ParametersList.ParametersSize;shader.ParameterDataSize=shader.ParametersList.ParametersDataSize;
}
TextureBase CheckerReference()=>new TextureBase{Name="givemechecker",NameHash=JenkHash.GenHash("givemechecker")};
var checkerFixture=Fixture();AppendTextureSlot(checkerFixture.Drawables[0].ShaderGroup.Shaders.data_items[0],0x8ab98831,CheckerReference());
File.WriteAllBytes("tests/fixtures/native-clothing-checker.ydd",checkerFixture.Save());
var checkerReload=new YddFile();checkerReload.Load(File.ReadAllBytes("tests/fixtures/native-clothing-checker.ydd"));checkerFixture=checkerReload;
var checkerAtlas=new YtdFile();checkerAtlas.Load(YddAtlas.Build(checkerFixture,atlasRequest));
var checkerOutput=new YddFile();checkerOutput.Load(YddEditor.Export(checkerFixture,atlasRequest,null));
Check(checkerAtlas.TextureDict.Textures.data_items.Length==1,"missing checker does not create another YTD entry");
foreach(var model in checkerOutput.Drawables[0].AllModels)foreach(var geometry in model.Geometries) {
 var block=geometry.Shader.ParametersList;
 Check((uint)block.Hashes[1]==0x8ab98831&&((TextureBase)block.Parameters[1].Data).Name=="givemechecker","opaque checker reference and hash preserved on all LODs");
}
var missingNormalFixture=Fixture();AppendTextureSlot(missingNormalFixture.Drawables[0].ShaderGroup.Shaders.data_items[0],JenkHash.GenHash("bumpsampler"),CheckerReference());
YddAtlas.Build(missingNormalFixture,atlasRequest);
var neutralNormal=(Texture)missingNormalFixture.Drawables[0].ShaderGroup.Shaders.data_items[0].ParametersList.Parameters[1].Data;
var neutralNormalPixels=CodeWalker.Utils.DDSIO.GetPixels(neutralNormal,0);Check(neutralNormalPixels[0]==255&&neutralNormalPixels[1]==128&&neutralNormalPixels[2]==128,"unassigned normal placeholder becomes neutral normal atlas");
var realCheckerYtd=new YtdFile{TextureDict=new TextureDictionary()};realCheckerYtd.TextureDict.BuildFromTextureList(new List<Texture>{YddTextures.Solid("original_diffuse",4,30,60,90),YddTextures.Solid("givemechecker",4,255,0,0)});
var realCheckerRequest=JsonSerializer.SerializeToElement(new{matrix=Matrix.Identity.ToArray(),bone="preserve",atlas=true,ytdData=Convert.ToBase64String(realCheckerYtd.Save()),additions=new[]{addition}});
var actualCheckerFixture=Fixture();AppendTextureSlot(actualCheckerFixture.Drawables[0].ShaderGroup.Shaders.data_items[0],0x8ab98831,CheckerReference());
bool actualCheckerRejected=false;try{YddAtlas.Build(actualCheckerFixture,realCheckerRequest);}catch(Exception e){actualCheckerRejected=e.Message.Contains("exige tratamento específico");}Check(actualCheckerRejected,"real checker image is not bypassed as a missing placeholder");
Console.WriteLine("Reported givemechecker sampler: missing placeholder preserved, neutral unassigned normal, real checker still protected PASS");

var missingSecondaryFixture=Fixture();AppendTextureSlot(missingSecondaryFixture.Drawables[0].ShaderGroup.Shaders.data_items[0],JenkHash.GenHash("diffusesampler2"),CheckerReference());
YddAtlas.Build(missingSecondaryFixture,atlasRequest);Check(((TextureBase)missingSecondaryFixture.Drawables[0].ShaderGroup.Shaders.data_items[0].ParametersList.Parameters[1].Data).Name=="givemechecker","missing secondary diffuse placeholder preserved without compositing");

// Size reported by the user: a 4096 source needs an 8192 atlas without resizing.
void TestAtlasResolution() {
 var bigTexture=new Texture{Name="original_diffuse",NameHash=JenkHash.GenHash("original_diffuse"),Width=4096,Height=4096,Depth=1,Levels=1,Stride=2048,Format=TextureFormat.D3DFMT_DXT1,Data=new TextureData{FullData=new byte[4096*4096/2]}};
 var bigYtd=new YtdFile{TextureDict=new TextureDictionary()};bigYtd.TextureDict.BuildFromTextureList(new List<Texture>{bigTexture});var bigBytes=bigYtd.Save();File.WriteAllBytes("tests/fixtures/native-large-diffuse.ytd",bigBytes);
 var bigRequest=JsonSerializer.SerializeToElement(new{matrix=Matrix.Identity.ToArray(),bone="preserve",atlas=true,ytdData=Convert.ToBase64String(bigBytes),additions=new[]{addition},atlasMaxResolution=4096});
 var duplicateDrawables=Enumerable.Range(0,9).Select(i=>{var drawable=Fixture().Drawables[0];drawable.Name="duplicate_"+i;return drawable;}).ToArray();
 var duplicateFile=new YddFile{Drawables=duplicateDrawables};
 var unchanged=duplicateDrawables[0].AllModels[0].Geometries[0].VertexData.VertexBytes.ToArray();
 var size=YddAtlas.Plan(duplicateFile,bigRequest);
 Check(size.materials==9&&size.regions==1&&size.width==4096&&size.divisor==2&&size.requiredSize==8192,"deduplicate identical bindings and fit 4096 source within atlas limit");
 Check(duplicateDrawables[0].AllModels[0].Geometries[0].VertexData.VertexBytes.SequenceEqual(unchanged),"preflight never mutates original UV");
 var preserveRequest=JsonSerializer.SerializeToElement(new{matrix=Matrix.Identity.ToArray(),bone="preserve",atlas=true,ytdData=Convert.ToBase64String(bigBytes),additions=new[]{addition},atlasMaxResolution=0});
 Check(!YddAtlas.Plan(duplicateFile,preserveRequest).fits,"preserve mode reports oversized plan without silently reducing");
 bool preserveRejected=false;try{YddAtlas.Build(duplicateFile,preserveRequest);}catch(Exception e){preserveRejected=e.Message.Contains("Escolha Ajustar");}Check(preserveRejected,"preserve mode fails with actionable adjustment option");
 // Filtered downsampling and remapped UV at manageable test dimensions.
 var rgba=new byte[1024*1024*4];for(int y=0;y<1024;y++)for(int x=0;x<1024;x++){int p=(y*1024+x)*4;rgba[p]=rgba[p+1]=rgba[p+2]=(byte)((x%2)*255);rgba[p+3]=255;}
 var filterYtd=new YtdFile{TextureDict=new TextureDictionary()};filterYtd.TextureDict.BuildFromTextureList(new List<Texture>{YddAtlas.Pixels("original_diffuse",1024,1024,rgba,TextureUsage.DIFFUSE)});
 var filterRequest=JsonSerializer.SerializeToElement(new{matrix=Matrix.Identity.ToArray(),bone="preserve",atlas=true,ytdData=Convert.ToBase64String(filterYtd.Save()),additions=new[]{addition},atlasMaxResolution=1024});
 var filterSource=Fixture();var filterPlan=YddAtlas.Plan(filterSource,filterRequest);Check(filterPlan.width==1024&&filterPlan.reduced&&filterPlan.divisor==2,"selected resolution policy applies");
 var filtered=new YtdFile();filtered.Load(YddAtlas.Build(filterSource,filterRequest));
 var pixels=CodeWalker.Utils.DDSIO.GetPixels(filtered.TextureDict.Textures.data_items.Single(),0);
 Check(pixels[0]==128&&pixels[1]==128&&pixels[2]==128,"area filter averages detail instead of nearest-neighbor aliasing");
 var filterOutput=new YddFile();filterOutput.Load(YddEditor.Export(filterSource,filterRequest,null));
 foreach(var model in filterOutput.Drawables[0].AllModels){Check(model.Geometries[0].VertexData.GetVector2(1,6).X<.5&&model.Geometries[1].VertexData.GetVector2(0,6).X>.5,"scaled UVs remain separated in all LODs");Near(model.Geometries[0].VertexData.GetVector3(0,0),new Vector3(0,0,2),"resizing never changes geometry position");}
}
TestAtlasResolution();
Console.WriteLine("Atlas resolution: shared regions, 4096 input preflight, preserve mode, filtered downsampling and all-LOD UV PASS");

// Full-sized auxiliary mip chains used to reserve two 128 MiB graphics pages.
void TestAtlasResourceBudget() {
 var source=Fixture();var shader=source.Drawables[0].ShaderGroup.Shaders.data_items[0];
 shader.ParametersList.Hashes=auxShader.ParametersList.Hashes.ToArray();
 shader.ParametersList.Parameters=auxShader.ParametersList.Parameters.ToArray();
 shader.ParameterCount=3;shader.TextureParametersCount=3;shader.ParametersList.Count=3;shader.ParameterSize=shader.ParametersList.ParametersSize;shader.ParameterDataSize=shader.ParametersList.ParametersDataSize;
 var request=JsonSerializer.SerializeToElement(new{matrix=Matrix.Identity.ToArray(),bone="preserve",atlas=true,ytdData=Convert.ToBase64String(File.ReadAllBytes("tests/fixtures/native-large-diffuse.ytd")),additions=new[]{addition},atlasMaxResolution=4096});
 Check(YddAtlas.Plan(source,request).auxiliaryResolution==2048,"preflight discloses auxiliary resolution cap");
 var outputYtd=YddAtlas.Build(source,request);var outputYdd=YddEditor.Export(source,request,null);
 long PageSize(uint f)=>new RpfResourcePageFlags{Value=f}.Size;
 var reserved=PageSize(BitConverter.ToUInt32(outputYdd,8))+PageSize(BitConverter.ToUInt32(outputYdd,12));
 Console.WriteLine($"4096 atlas YDD reserved bytes: {reserved}; flags {BitConverter.ToUInt32(outputYdd,8):x8}/{BitConverter.ToUInt32(outputYdd,12):x8}");
 Check(reserved<=256L*1024*1024,"4096 atlas with normal and specular fits renderer resource budget");
 var reopened=new YddFile();reopened.Load(outputYdd);
 var textures=reopened.Drawables[0].ShaderGroup.TextureDictionary.Textures.data_items;
 Check(textures.Length==2&&textures.All(t=>t.Width==2048&&t.Height==2048&&t.Levels==12),"both auxiliary maps retain full mips within budget");
 var n=CodeWalker.Utils.DDSIO.GetPixels(textures.Single(t=>t.Usage==TextureUsage.NORMAL),0);
 Check(n[0]==250&&n[1]==100&&n[2]==90,"auxiliary source color preserved after filtered resize");
 Check(n[(100*2048+1500)*4]==255&&n[(100*2048+1500)*4+1]==128,"neutral OBJ auxiliary region remains aligned");
 Directory.CreateDirectory(".test-output");File.WriteAllBytes(".test-output/budget-atlas.ydd",outputYdd);File.WriteAllBytes(".test-output/budget-atlas.ytd",outputYtd);
}
TestAtlasResourceBudget();

void TestManualAtlas() {
 var manual=new {size=512,sources=new[]{new{x=0,y=0,width=512,height=512}},additions=new[]{new{x=400,y=400,width=64,height=96}}};
 var request=JsonSerializer.SerializeToElement(new{matrix=Matrix.Identity.ToArray(),bone="preserve",atlas=true,ytdData=Convert.ToBase64String(originalYtd),additions=new[]{addition},atlasLayout=manual});
 var source=Fixture();var originalUv=source.Drawables[0].AllModels.Select(m=>m.Geometries[0].VertexData.GetVector2(1,6)).ToArray();
 var ytdBytes=YddAtlas.Build(source,request);var bytes=YddEditor.Export(source,request,null);var reopened=new YddFile();reopened.Load(bytes);
 for(int i=0;i<reopened.Drawables[0].AllModels.Length;i++) {
  var g=reopened.Drawables[0].AllModels[i].Geometries;Check(g[0].VertexData.GetVector2(1,6)==originalUv[i],"full-size manual atlas keeps original UV unchanged in every LOD");
  var uv=g[1].VertexData.GetVector2(0,6);Check(uv.X>=400f/512&&uv.X<464f/512&&uv.Y>=400f/512&&uv.Y<496f/512,"OBJ follows manually positioned/scaled rectangle");
 }
 var ytd=new YtdFile();ytd.Load(ytdBytes);var pixels=CodeWalker.Utils.DDSIO.GetPixels(ytd.TextureDict.Textures.data_items.Single(),0);
 Check(pixels[0]==90&&pixels[1]==60&&pixels[2]==30,"source texture kept outside reserved area");
 Check(pixels[(420*512+420)*4]==220,"only reserved area painted neutral for OBJ");
 var bad=JsonSerializer.SerializeToElement(new{atlas=true,ytdData=Convert.ToBase64String(originalYtd),additions=new[]{addition},atlasLayout=new{size=512,sources=manual.sources,additions=new[]{new{x=500,y=400,width=64,height=96}}}});
 bool refused=false;try{YddAtlas.Build(Fixture(),bad);}catch(Exception){refused=true;}Check(refused,"native bridge refuses out-of-bounds manual UV area");
}
TestManualAtlas();Console.WriteLine("Manual atlas: original UV unchanged, source pixels outside reserved area, positioned/scaled OBJ, all LODs and invalid bounds PASS");

// Cross-check the JS pack compiler against CodeWalker's independent metadata reader.
{
 var ymt=new YmtFile();ymt.Load(File.ReadAllBytes("tests/fixtures/native-pack-props.ymt"));
 var meta=ymt.Meta;Check(meta is not null,"pack YMT opened by CodeWalker");
 var data=MetaTypes.ConvertData<CPedVariationInfo>(meta.GetRootBlock().Data);var variation=new MCPedVariationInfo();variation.Load(meta,data);
 Check(variation.ComponentIndices[6]==0&&variation.ComponentData3.Length==1,"mixed pack retains component availability");
 Check(variation.PropInfo.PropMetaData.Length==1&&variation.PropInfo.Anchors.Length==1,"props and anchors decoded by independent reader");
 var prop=variation.PropInfo.PropMetaData[0];Check(prop.Data.anchorId==0&&prop.Data.propId==0&&prop.Data.propFlags==3,"prop anchor/index/flags preserved");
 Check(prop.TexData.Length==2&&prop.TexData[1].texId==1&&prop.TexData[1].distribution==255,"all prop texture variants registered");
 Check(Math.Abs(prop.Data.expressionMods.f0+.2)<.00001&&Math.Abs(variation.CompInfos[0].Data.pedXml_expressionMods.f4-.15)<.00001,"hair reduction and heels metadata decoded");
 Check(variation.CompInfos[0].Data.flags==7,"component flags retained");
 foreach(var structure in meta.StructureInfos){var expected=MetaTypes.GetStructureInfo(structure.StructureNameHash);if(expected is null)continue;Check(expected.StructureSize==structure.StructureSize,"YMT structure sizes agree with CodeWalker");
  foreach(var field in structure.Entries){if((uint)field.EntryNameHash==256)continue;var match=expected.Entries.FirstOrDefault(e=>e.EntryNameHash==field.EntryNameHash);Check(match.EntryNameHash==field.EntryNameHash&&match.DataOffset==field.DataOffset&&match.DataType==field.DataType&&match.ReferenceKey==field.ReferenceKey&&match.ReferenceTypeIndex==field.ReferenceTypeIndex,$"YMT schema field {structure.StructureNameHash}.{field.EntryNameHash} agrees with CodeWalker ({match.DataType} vs {field.DataType}; key {match.ReferenceKey}/{field.ReferenceKey}; index {match.ReferenceTypeIndex}/{field.ReferenceTypeIndex})");}}
 Check(meta.EnumInfos.Count==3,"component/anchor/render enum metadata included");
 foreach(var enumeration in meta.EnumInfos){var expected=MetaTypes.GetEnumInfo(enumeration.EnumNameHash);Check(expected.EnumKey==enumeration.EnumKey&&expected.Entries.Length==enumeration.Entries.Length,"enum schema agrees with CodeWalker");for(int i=0;i<expected.Entries.Length;i++)Check(expected.Entries[i].EntryNameHash==enumeration.Entries[i].EntryNameHash&&expected.Entries[i].EntryValue==enumeration.Entries[i].EntryValue,"enum entries agree with CodeWalker");}
 Console.WriteLine("Pack compiler: CodeWalker reads mixed clothing/props YMT, anchors, variants, hair/heel values and flags PASS");
}
