import {Float32BufferAttribute,Group} from 'three';
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
export function prepareConverterObject(object) {
 let triangles=0,vertices=0,meshes=0,hasUv=!object.userData.converterMissingUv;
 object.traverse(o=>{if(!o.isMesh)return;meshes++;const g=o.geometry,count=g.index?.count??g.attributes.position.count;vertices+=count;triangles+=count/3;if(count%3||count>65535)throw Error('Divida o OBJ em partes de até 65535 vértices.');if(!g.attributes.uv)hasUv=false;});
 if(!meshes||meshes>32||vertices>100000)throw Error('Use até 32 partes e 100000 vértices por OBJ.');
 object.traverse(o=>{if(!o.isMesh)return;const old=o.geometry;o.geometry=old.index?old.toNonIndexed():old.clone();old.dispose();o.userData.converterOriginalUv=o.geometry.attributes.uv?.clone()??null;});
 object.userData.converter={triangles,vertices,hasUv};return object.userData.converter;
}
export function converterUv(object,mode) {
 const state=object.userData.converter;if(!state)throw Error('Importe um OBJ para converter.');
 if(mode==='original'&&!state.hasUv)throw Error('O OBJ não contém UV em todas as partes. Gere um novo mapa.');
 const grid=Math.ceil(Math.sqrt(state.triangles));let face=0;
 object.traverse(o=>{if(!o.isMesh)return;const g=o.geometry;if(mode==='original'){g.setAttribute('uv',o.userData.converterOriginalUv.clone());return;}const uv=[];for(let f=0;f<g.attributes.position.count/3;f++,face++){const x=face%grid,y=Math.floor(face/grid);for(const [u,v] of [[.08,.08],[.92,.08],[.08,.92]])uv.push((x+u)/grid,1-(y+v)/grid);}g.setAttribute('uv',new Float32BufferAttribute(uv,2));});
}
export function converterParts(object){object.updateWorldMatrix(true,true);return serializeAdditions(new Group(),[object]);}
