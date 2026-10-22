import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function mergeStaticMeshes(target, addition) {
  if(!target?.isMesh||target===addition||!addition) throw Error('Selecione uma malha de destino e um objeto diferente.');
  if(target.isSkinnedMesh) throw Error('União com rigging exige o compilador nativo. Use malhas estáticas.');
  target.updateWorldMatrix(true,false); addition.updateWorldMatrix(true,true);
  const inverse=target.matrixWorld.clone().invert(),geometries=[];
  const collect=mesh=> {
    if(!mesh.isMesh) return;
    if(mesh.isSkinnedMesh) throw Error('OBJ/GLB com rigging não pode ser achatado por esta operação.');
    if(!mesh.geometry.attributes.uv) throw Error('A malha não possui UV. Faça o unwrap antes de unir.');
    const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));
    if(!g.attributes.normal) g.computeVertexNormals();
    for(const name of Object.keys(g.attributes)) if(!['position','normal','uv'].includes(name)) g.deleteAttribute(name);
    for(const name of ['position','normal','uv']) {
      const a=g.attributes[name],values=new Float32Array(a.count*a.itemSize);
      for(let i=0;i<a.count;i++) for(let k=0;k<a.itemSize;k++) values[i*a.itemSize+k]=a.getComponent(i,k);
      g.setAttribute(name,new THREE.BufferAttribute(values,a.itemSize));
    }
    geometries.push(g);
  };
  try {
    collect(target); addition.traverse(collect);
    if(geometries.length<2) throw Error('O objeto não contém malhas para unir.');
    const merged=mergeGeometries(geometries,false);
    if(!merged) throw Error('Layouts de geometria incompatíveis.');
    merged.computeBoundingBox(); merged.computeBoundingSphere();
    return merged;
  } finally {geometries.forEach(g=>g.dispose());}
}
