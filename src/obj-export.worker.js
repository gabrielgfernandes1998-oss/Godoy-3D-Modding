import {Group,Mesh,BufferGeometry,BufferAttribute} from 'three';
import {converterParts} from './obj-converter-core.js';
self.onmessage=({data:meshes})=>{try{
 self.postMessage({progress:'Compactando vértices idênticos e preparando geometria binária…'});const root=new Group();for(const spec of meshes){const g=new BufferGeometry();for(const [name,a] of Object.entries(spec.attributes))g.setAttribute(name,new BufferAttribute(a.array,a.itemSize,a.normalized));const mesh=new Mesh(g);mesh.matrixAutoUpdate=false;mesh.matrix.fromArray(spec.matrix);root.add(mesh);}
 const parts=converterParts(root);self.postMessage({parts},parts.flatMap(p=>[p.positions.buffer,p.normals.buffer,p.uvs.buffer,p.indices.buffer]));
}catch(e){self.postMessage({error:e instanceof RangeError?'Não há memória disponível para preparar esta geometria.':e.message});}};
