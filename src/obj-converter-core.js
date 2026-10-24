import {BufferAttribute,BufferGeometry,Float32BufferAttribute,Group,Mesh} from 'three';
import {serializeAdditions} from './ydd-additions.js';
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
export const CONVERTER_MAX_VERTICES=500000;
export const CONVERTER_MAX_PART_BYTES=32*1024*1024;
const PART_VERTICES=65535; // 21845 whole triangles, with 16-bit native indices.
export function prepareConverterObject(object) {
 let triangles=0,vertices=0,parts=0,hasUv=!object.userData.converterMissingUv;const meshes=[];
 // Validate the complete import before changing any geometry.
 object.traverse(o=>{if(!o.isMesh)return;meshes.push(o);const g=o.geometry,count=g.index?.count??g.attributes.position?.count??0;if(!count||count%3)throw Error('O OBJ contém uma malha sem triângulos completos.');vertices+=count;triangles+=count/3;parts+=Math.ceil(count/PART_VERTICES);if(!g.attributes.uv)hasUv=false;});
 if(!meshes.length||parts>32||vertices>CONVERTER_MAX_VERTICES)throw Error('Conversor: até 500000 vértices após triangulação e 32 partes automáticas. Reduza a geometria do OBJ.');
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
   const part=new Mesh(chunks[i],mesh.material);part.name=`${mesh.name||'OBJ'} · parte ${i+1}`;part.userData.converterOriginalUv=chunks[i].attributes.uv?.clone()??null;mesh.add(part);
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
export function converterParts(object){object.updateWorldMatrix(true,true);return serializeAdditions(new Group(),[object],{maxVertices:CONVERTER_MAX_VERTICES,maxJsonBytes:CONVERTER_MAX_PART_BYTES});}
