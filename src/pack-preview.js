import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {parseYdd} from '../modules/vehicles/src/formats/ydd.js';
import {parseYtd} from '../modules/vehicles/src/formats/ytd.js';
import {previewBindMatrix} from './ydd-export.js';
import {previewDiffuse,previewTexture} from './preview-textures.js';
import {PROPS} from './ymt.js';
const anchors=['SKEL_Head','SKEL_Head','SKEL_Head','SKEL_Head','SKEL_L_Hand','SKEL_R_Hand','SKEL_L_Hand','SKEL_R_Hand','SKEL_Pelvis','SKEL_L_Foot','SKEL_R_Foot','PH_L_Hand','PH_R_Hand'];
export function createPackPreview(host,notify) {
 const scene=new THREE.Scene();scene.background=new THREE.Color('#18151b');const camera=new THREE.PerspectiveCamera(38,1,.001,10000);camera.position.set(2,1.5,3);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.append(renderer.domElement);
 const controls=new OrbitControls(camera,renderer.domElement);scene.add(new THREE.HemisphereLight(0xffffff,0x403048,2.6));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,5,4);scene.add(light);
 scene.add(new THREE.GridHelper(10,40,0x6a4353,0x302830));const clothes=new THREE.Group(),ped=new THREE.Group();scene.add(clothes,ped);let sequence=0,pedSequence=0,pedDocuments=[],wire=false;
 function dispose(root){root.traverse(o=>{o.geometry?.dispose();if(o.material){o.material.map?.dispose();o.material.dispose();}});root.clear();}
 function matrixForAnchor(component){for(const doc of pedDocuments)for(const d of doc.drawables){if(d.skeletonPointer==null)continue;const r=doc.resource,p=d.skeletonPointer,count=r.u16(p+0x5e),bones=r.ptr(p+0x20,16);if(bones==null||count>512)continue;for(let i=0;i<count;i++)if(r.stringAtPointer(bones+i*80+0x38)===anchors[PROPS.indexOf(component)])return previewBindMatrix(r,p,i);}return null;}
 function group(doc,dictionary,isPed=false,component=''){
  const root=new THREE.Group(),maps=new Map();let vertices=0;
  const texture=t=>{if(!t?.supported)return null;if(!maps.has(t.key))maps.set(t.key,previewTexture(t));return maps.get(t.key);};
  for(const d of doc.drawables)for(const data of d.readLod(0)){vertices+=data.vertexCount;if(vertices>1000000)throw Error('Preview acima de um milhão de vértices.');const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(data.positions,3));g.setAttribute('uv',new THREE.BufferAttribute(data.uvs,2));g.setIndex(new THREE.BufferAttribute(data.indices,1));if(data.normals)g.setAttribute('normal',new THREE.BufferAttribute(data.normals,3));else g.computeVertexNormals();
   if(!data.hasSkin){if(PROPS.includes(component)){const anchor=matrixForAnchor(component);if(anchor)g.applyMatrix4(anchor);else if(d.skeletonPointer!=null)g.applyMatrix4(previewBindMatrix(doc.resource,d.skeletonPointer,data.boneIndex));}else if(d.skeletonPointer!=null)g.applyMatrix4(previewBindMatrix(doc.resource,d.skeletonPointer,data.boneIndex));}
   const entry=previewDiffuse(d,data.shaderIndex,dictionary);
   const map=isPed?null:texture(entry);root.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({map,color:map?0xffffff:isPed?0x7d858d:0xb34a69,side:THREE.DoubleSide,roughness:.85,wireframe:wire,alphaTest:map?.01:0})));
  }return root;
 }
 async function setPed(files){const current=++pedSequence,next=new THREE.Group(),docs=[];try{for(const f of files){if(/\.glb$/i.test(f.name)){next.add((await new GLTFLoader().parseAsync(f.bytes.buffer??f.bytes,'')).scene);}else{const doc=parseYdd(f.bytes);docs.push(doc);next.add(group(doc,null,true));}}}catch(e){dispose(next);throw e;}if(current!==pedSequence){dispose(next);return;}dispose(ped);ped.add(...next.children.slice());pedDocuments=docs;frame();}
 async function show(project,items,variants={}){const current=++sequence,next=new THREE.Group();try{let total=0;for(const item of items){const a=project.assets.find(a=>a.id===item.asset);if(!a)continue;const doc=parseYdd(a.bytes);total+=doc.resource.data.length;const v=item.textures.find(v=>v.id===variants[item.id])??item.textures[0],asset=project.assets.find(a=>a.id===v?.asset),dict=asset?parseYtd(asset.bytes):null;total+=dict?.resource.data.length??0;if(total>256*1024*1024)throw Error('Preview descomprimido acima de 256 MB.');next.add(group(doc,dict,false,item.component));}if(current!==sequence){dispose(next);return;}dispose(clothes);clothes.add(...next.children.slice());}catch(e){dispose(next);notify(e.message);}}
 function frame(){const box=new THREE.Box3().setFromObject(ped.visible&&ped.children.length?ped:clothes);if(box.isEmpty())return;const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()).length()||1;controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(size*.65,size*.35,size*1.1));camera.near=Math.max(.0001,size/10000);camera.far=Math.max(100,size*100);camera.updateProjectionMatrix();controls.update();}
 function resize(){const {width,height}=host.getBoundingClientRect();if(width<1||height<1)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(host);
 renderer.setAnimationLoop(()=>{if(!host.checkVisibility())return;controls.update();renderer.render(scene,camera);});resize();
 return {show,setPed,frame,wireframe:value=>{wire=value;for(const root of [clothes,ped])root.traverse(o=>{if(o.material)o.material.wireframe=value;});},pedVisible:value=>ped.visible=value};
}
