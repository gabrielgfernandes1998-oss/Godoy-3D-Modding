import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {loadMaterialGlb} from './glb-materials.js';
import {prepareConverterObject} from './obj-converter-core.js';
self.onmessage=async({data:file})=>{
 try {
  let object,materials,sourceMaterialCount;
  if(/\.glb$/i.test(file.name)){self.postMessage({progress:'Lendo GLB, materiais e imagens embutidas…'});({object,materials,sourceMaterialCount}=await loadMaterialGlb(await file.arrayBuffer()));}
  else{self.postMessage({progress:'Lendo o OBJ…'});const text=await file.text();self.postMessage({progress:'Interpretando e triangulando o OBJ…'});object=new OBJLoader().parse(text);object.userData.converterMissingUv=false;for(const match of text.matchAll(/^[ \t]*f[ \t]+([^\r\n]*)/gm)){if(match[1].trim().split(/\s+/).some(vertex=>!vertex.split('/')[1])){object.userData.converterMissingUv=true;break;}}}
  self.postMessage({progress:'Preparando partes compatíveis com YDD…'});const state=prepareConverterObject(object),meshes=[],buffers=[];object.updateWorldMatrix(true,true);
  object.traverse(m=>{if(!m.isMesh)return;const attributes={};for(const [name,a] of Object.entries(m.geometry.attributes)){attributes[name]={array:a.array,itemSize:a.itemSize,normalized:a.normalized};buffers.push(a.array.buffer);}meshes.push({name:m.name,material:m.userData.converterMaterial,attributes,matrix:m.matrixWorld.toArray()});});
  if(materials)for(const m of materials)if(m.image)buffers.push(m.image.data.buffer);self.postMessage({state,meshes,materials,sourceMaterialCount},[...new Set(buffers)]);
 }catch(e){self.postMessage({error:e instanceof RangeError?'Não há memória disponível para interpretar este OBJ. Feche outros projetos ou reduza a geometria.':e.message});}
};
