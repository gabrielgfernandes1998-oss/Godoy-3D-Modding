import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {connectedFaceGroups} from './mesh-components.js';
import {LoadingManager,Vector2,BufferGeometry,BufferAttribute,Mesh} from 'three';
export async function loadMaterialGlb(bytes){
 const manager=new LoadingManager();manager.setURLModifier(url=>{if(!/^(blob:|data:)/.test(url))throw Error('O GLB referencia um arquivo externo. Exporte um GLB com todas as imagens incluídas.');return url;});
 const gltf=await new GLTFLoader(manager).parseAsync(bytes,''),object=gltf.scene,materials=[],ids=new Map(),point=new Vector2();
 object.traverse(mesh=>{
  if(!mesh.isMesh)return;if(mesh.isSkinnedMesh||mesh.morphTargetInfluences?.length)throw Error('Exporte o GLB em pose estática, sem skin/morphs. O vínculo será criado no osso do ped.');
  if(mesh.geometry.attributes.color)throw Error('Este GLB usa cores por vértice. Exporte essas cores em uma imagem de textura antes de converter.');
  if(Array.isArray(mesh.material))throw Error('Primitiva GLB com lista de materiais não suportada.');const material=mesh.material;let id=ids.get(material);
  if(id===undefined){id=materials.length;ids.set(material,id);materials.push({name:material.name||`Material ${id+1}`,color:[material.color.r,material.color.g,material.color.b,material.opacity],opaque:!material.transparent&&material.alphaTest===0,bounds:[0,0,1,1],triangles:0,wrapS:material.map?.wrapS??1001,wrapT:material.map?.wrapT??1001,texture:material.map});}
  mesh.userData.converterMaterial=id;materials[id].triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;mesh.geometry=mesh.geometry.clone();
  const source=mesh.geometry.attributes[material.map?.channel?'uv'+material.map.channel:'uv'];if(material.map&&!source)throw Error(`O material ${material.name} tem imagem sem UV correspondente.`);
  if(source){const uv=source.clone();material.map?.updateMatrix();for(let i=0;i<uv.count;i++){point.set(source.getX(i),source.getY(i));if(material.map)point.applyMatrix3(material.map.matrix);if(!Number.isFinite(point.x)||!Number.isFinite(point.y))throw Error('O GLB contém UVs não finitos.');materials[id].bounds[0]=Math.min(materials[id].bounds[0],point.x);materials[id].bounds[1]=Math.min(materials[id].bounds[1],point.y);materials[id].bounds[2]=Math.max(materials[id].bounds[2],point.x);materials[id].bounds[3]=Math.max(materials[id].bounds[3],point.y);uv.setXY(i,point.x,1-point.y);}mesh.geometry.setAttribute('uv',uv);}
 });
 for(const m of materials){const texture=m.texture;delete m.texture;if(!texture)continue;const image=texture.image;if(!image?.width||!image?.height)throw Error(`Imagem ausente no material ${m.name}.`);const canvas=new OffscreenCanvas(image.width,image.height),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);m.image={width:image.width,height:image.height,data:ctx.getImageData(0,0,image.width,image.height).data};const p=m.image.data;let uniform=true;for(let i=4;i<p.length&&uniform;i+=4)for(let c=0;c<(m.opaque?3:4);c++)if(p[i+c]!==p[c]){uniform=false;break;}m.uniform=uniform;}
 const meshes=[];object.traverse(m=>{if(m.isMesh)meshes.push(m);});const charts=[];
 for(const mesh of meshes){const source=materials[mesh.userData.converterMaterial],sourceId=mesh.userData.converterMaterial,geometry=mesh.geometry,groups=connectedFaceGroups(geometry),uv=geometry.attributes.uv;
  groups.forEach((indices,i)=>{
   const bounds=[Infinity,Infinity,-Infinity,-Infinity];if(uv)for(const v of indices){const u=uv.getX(v),y=1-uv.getY(v);bounds[0]=Math.min(bounds[0],u);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],u);bounds[3]=Math.max(bounds[3],y);}else bounds.splice(0,4,0,0,1,1);
   const flat=!source.image||source.uniform||bounds[2]-bounds[0]<1e-9||bounds[3]-bounds[1]<1e-9,triangles=indices.length/3,side=Math.max(64,Math.ceil(1024*Math.sqrt(triangles/source.triangles)));
   const descriptor={...source,name:source.name+(groups.length>1?' · peça '+(i+1):''),bounds,triangles,sourceMaterial:sourceId,flat,paintWidth:flat?side:undefined,paintHeight:flat?side:undefined};
   const g=new BufferGeometry();for(const [key,attribute]of Object.entries(geometry.attributes))g.setAttribute(key,attribute);g.setIndex(new BufferAttribute(indices,1));
   const part=i===0?mesh:new Mesh(g,mesh.material);part.geometry=g;part.userData.converterMaterial=charts.length;if(i){part.name=mesh.name+' · peça '+(i+1);mesh.add(part);}charts.push(descriptor);
  });
 }
 return {object,materials:charts,sourceMaterialCount:materials.length};
}
