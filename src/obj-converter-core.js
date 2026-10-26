import {BufferAttribute,BufferGeometry,Float32BufferAttribute,Group,Mesh,Matrix3,Vector3} from 'three';
import {parseYdd} from '../modules/vehicles/src/formats/ydd.js';
import {COMPONENTS} from './ymt.js';

export function converterName(component,index) {
 if(!COMPONENTS.includes(component)||!Number.isInteger(index)||index<0||index>999)throw Error('Use um componente válido e índice de 0 a 999.');
 return `${component}_${String(index).padStart(3,'0')}_u`;
}
export function converterBones(bytes) {
 const doc=parseYdd(bytes);for(const d of doc.drawables){const p=d.skeletonPointer;if(p==null)continue;const r=doc.resource,count=r.u16(p+0x5e),block=r.ptr(p+0x20,16);if(!count||count>512||block==null)continue;const bones=[];for(let i=0;i<count;i++){const b=block+i*80;r.range(b,80);const index=r.u16(b+0x42);if(index>255)continue;bones.push({name:r.stringAtPointer(b+0x38)||`Osso ${index}`,tag:r.u16(b+0x44),index});}if(bones.length)return bones;}
 throw Error('O ped não contém um esqueleto compatível. Carregue o ped pelo CodeWalker ou importe um ped YDD.');
}
const PART_VERTICES=65535; // 21845 whole triangles, with 16-bit native indices.
export function prepareConverterObject(object) {
 let triangles=0,vertices=0,parts=0,hasUv=!object.userData.converterMissingUv;const meshes=[];
 // Validate the complete import before changing any geometry.
 object.traverse(o=>{if(!o.isMesh)return;meshes.push(o);const g=o.geometry,count=g.index?.count??g.attributes.position?.count??0;if(!count||count%3)throw Error('O OBJ contém uma malha sem triângulos completos.');vertices+=count;triangles+=count/3;parts+=Math.ceil(count/PART_VERTICES);if(!g.attributes.uv)hasUv=false;});
 if(!meshes.length)throw Error('O OBJ não contém malhas trianguladas.');
 if(parts>65535)throw Error('A quantidade de geometrias não cabe no campo de 16 bits de um modelo YDD.');
 for(const mesh of meshes) {
  const old=mesh.geometry,flat=old.index?old.toNonIndexed():old,count=flat.attributes.position.count;
  const chunks=[];
  for(let start=0;start<count;start+=PART_VERTICES) {
   const end=Math.min(count,start+PART_VERTICES),geometry=new BufferGeometry();
   for(const [name,attribute] of Object.entries(flat.attributes))geometry.setAttribute(name,new BufferAttribute(attribute.array.slice(start*attribute.itemSize,end*attribute.itemSize),attribute.itemSize,attribute.normalized));
   chunks.push(geometry);
  }
  mesh.geometry=chunks[0];mesh.userData.converterOriginalUv=chunks[0].attributes.uv?.clone()??null;
  for(let i=1;i<chunks.length;i++) {
   // Identity children inherit the original mesh transform, including its parent
   // hierarchy. The imported OBJ remains one selectable/editable object.
   const part=new Mesh(chunks[i],mesh.material);part.userData.converterMaterial=mesh.userData.converterMaterial;part.name=`${mesh.name||'OBJ'} · parte ${i+1}`;part.userData.converterOriginalUv=chunks[i].attributes.uv?.clone()??null;mesh.add(part);
  }
  if(flat!==old)flat.dispose();old.dispose();
 }
 object.userData.converter={triangles,vertices,hasUv,parts,split:parts>meshes.length};return object.userData.converter;
}
export function converterUv(object,mode) {
 const state=object.userData.converter;if(!state)throw Error('Importe um OBJ para converter.');
 if(mode==='original'&&!state.hasUv)throw Error('O OBJ não contém UV em todas as partes. Gere um novo mapa.');
 const grid=Math.ceil(Math.sqrt(state.triangles));let face=0;
 object.traverse(o=>{if(!o.isMesh)return;const g=o.geometry;if(mode==='original'){g.setAttribute('uv',o.userData.converterOriginalUv.clone());return;}const uv=[];for(let f=0;f<g.attributes.position.count/3;f++,face++){const x=face%grid,y=Math.floor(face/grid);for(const [u,v] of [[.08,.08],[.92,.08],[.08,.92]])uv.push((x+u)/grid,1-(y+v)/grid);}g.setAttribute('uv',new Float32BufferAttribute(uv,2));});
}
// Typed arrays travel through IPC and a binary temporary file, not huge JSON arrays.
export function converterParts(object){
 object.updateWorldMatrix(true,true);const parts=[];
 object.traverseVisible(mesh=>{
  if(!mesh.isMesh)return;const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,count=p.count;
  if(count<3||count>65535||count%3)throw Error('Parte OBJ sem triângulos completos ou incompatível com índices de 16 bits.');
  let normals=n,copy;if(!normals){copy=g.clone();copy.computeVertexNormals();normals=copy.attributes.normal;}
  const positions=new Float32Array(count*3),outNormals=new Float32Array(count*3),uvs=new Float32Array(count*2),indices=new Uint16Array(count),normalMatrix=new Matrix3().getNormalMatrix(mesh.matrixWorld);
  const point=new Vector3(),direction=new Vector3();
  for(let i=0;i<count;i++){
   point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);direction.fromBufferAttribute(normals,i).applyMatrix3(normalMatrix).normalize();positions.set([point.x,-point.z,point.y],i*3);outNormals.set([direction.x,-direction.z,direction.y],i*3);if(!uv)throw Error('Prepare o UV antes de converter.');uvs.set([uv.getX(i),1-uv.getY(i)],i*2);indices[i]=i;
  }
  copy?.dispose();for(const array of [positions,outNormals,uvs])for(const value of array)if(!Number.isFinite(value)||Math.abs(value)>100000)throw Error('OBJ contém coordenadas inválidas.');
  if(mesh.matrixWorld.determinant()<0)for(let i=0;i<count;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
  // Exact deduplication of the complete native vertex; UV/normal seams remain.
  const keys=new Map(),positionBits=new Uint32Array(positions.buffer),normalBits=new Uint32Array(outNormals.buffer),uvBits=new Uint32Array(uvs.buffer),remap=new Uint16Array(count);let unique=0;
  for(let i=0;i<count;i++){
   const key=[positionBits[i*3],positionBits[i*3+1],positionBits[i*3+2],normalBits[i*3],normalBits[i*3+1],normalBits[i*3+2],uvBits[i*2],uvBits[i*2+1]].join('/');
   let index=keys.get(key);if(index===undefined){index=unique++;keys.set(key,index);if(index!==i){positions.copyWithin(index*3,i*3,i*3+3);outNormals.copyWithin(index*3,i*3,i*3+3);uvs.copyWithin(index*2,i*2,i*2+2);}}remap[i]=index;
  }
  for(let i=0;i<indices.length;i++)indices[i]=remap[indices[i]];
  parts.push({positions:positions.slice(0,unique*3),normals:outNormals.slice(0,unique*3),uvs:uvs.slice(0,unique*2),indices});
 });if(!parts.length)throw Error('O OBJ não contém malhas visíveis.');return parts;
}
