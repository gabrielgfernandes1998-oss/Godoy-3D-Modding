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
