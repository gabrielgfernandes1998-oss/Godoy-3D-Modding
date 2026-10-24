import {Matrix4,Matrix3,Vector3} from 'three';

export function serializeAdditions(target,additions=[],{texturePrefix,maxVertices=100000,maxJsonBytes=10*1024*1024}={}) {
  target.updateWorldMatrix(true,true);
  const inverse=target.matrixWorld.clone().invert(),parts=[];let total=0;
  for(const addition of additions)addition.traverseVisible(mesh=> {
    if(!mesh.isMesh)return;if(mesh.isSkinnedMesh)throw Error('Use um OBJ estático para incorporar ao YDD.');
    const geometry=mesh.geometry,position=geometry.attributes.position;
    if(!position||position.count<3||position.count>65535||(total+=position.count)>maxVertices)throw Error(`OBJ: até 65535 vértices por parte e ${maxVertices} no total.`);
    let normal=geometry.attributes.normal;
    if(!normal){const copy=geometry.clone();copy.computeVertexNormals();normal=copy.attributes.normal.clone();copy.dispose();}
    const matrix=new Matrix4().multiplyMatrices(inverse,mesh.matrixWorld),normalMatrix=new Matrix3().getNormalMatrix(matrix);
    const positions=[],normals=[],uvs=[];
    if(!geometry.boundingBox)geometry.computeBoundingBox();
    const box=geometry.boundingBox,size=box.getSize(new Vector3()),axes=['x','y','z'].sort((a,b)=>size[b]-size[a]);
    for(let i=0;i<position.count;i++) {
      const p=new Vector3().fromBufferAttribute(position,i).applyMatrix4(matrix),n=new Vector3().fromBufferAttribute(normal,i).applyMatrix3(normalMatrix).normalize();
      positions.push(p.x,-p.z,p.y);normals.push(n.x,-n.z,n.y);
      if(geometry.attributes.uv){uvs.push(geometry.attributes.uv.getX(i),1-geometry.attributes.uv.getY(i));}
      else {const original=new Vector3().fromBufferAttribute(position,i);uvs.push((original[axes[0]]-box.min[axes[0]])/(size[axes[0]]||1),1-(original[axes[1]]-box.min[axes[1]])/(size[axes[1]]||1));}
    }
    if([...positions,...normals,...uvs].some(n=>!Number.isFinite(n)||Math.abs(n)>100000))throw Error('OBJ contém coordenadas inválidas.');
    const indices=geometry.index?Array.from(geometry.index.array):Array.from({length:position.count},(_,i)=>i);
    if(indices.length%3||indices.some(i=>!Number.isInteger(i)||i<0||i>=position.count))throw Error('Triângulos OBJ inválidos.');
    if(matrix.determinant()<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
    if(texturePrefix) {
      // Separate chart per triangle: works for OBJ with missing/overlapping UVs.
      // Duplicate seam vertices so every face has its own editable area.
      if(indices.length>65535)throw Error('UV automático: divida o OBJ em partes com até 21845 triângulos.');
      const count=indices.length/3,grid=Math.ceil(Math.sqrt(count)),padding=.12;
      const p=[],n=[],uv=[],idx=[];
      for(let f=0;f<count;f++) {
        const x=f%grid,y=Math.floor(f/grid),corners=[[padding,padding],[1-padding,padding],[padding,1-padding]];
        for(let c=0;c<3;c++) {const i=indices[f*3+c];p.push(...positions.slice(i*3,i*3+3));n.push(...normals.slice(i*3,i*3+3));uv.push((x+corners[c][0])/grid,(y+corners[c][1])/grid);idx.push(f*3+c);}
      }
      parts.push({positions:p,normals:n,uvs:uv,indices:idx,textureName:`${texturePrefix}_${parts.length+1}`});
    } else parts.push({positions,normals,uvs,indices});
  });
  if(parts.reduce((sum,p)=>sum+p.positions.length/3,0)>maxVertices)throw Error(`UV automático acima de ${maxVertices} vértices: reduza o OBJ.`);
  if(parts.length>32)throw Error('Até 32 partes OBJ por união.');
  if(JSON.stringify(parts).length>maxJsonBytes)throw Error(`Dados OBJ acima de ${maxJsonBytes/1024/1024} MB: reduza a geometria.`);
  return parts;
}
export function joinToYdd(content,target,object,record,history,select) {
  // Keep a matrix instead of decomposing: nonuniform YDD scale can induce shear.
  content.updateMatrixWorld(true);
  const world=object.matrixWorld.clone(),local=new Matrix4().multiplyMatrices(target.matrixWorld.clone().invert(),world);
  const originalMatrix=object.matrix.clone(),auto=object.matrixAutoUpdate,index=content.children.indexOf(object);
  const additions=record.additions??(record.additions=[]);
  history.execute({label:'Incorporar OBJ ao YDD',objects:[target,object],
    redo:()=>{target.add(object);object.matrixAutoUpdate=false;object.matrix.copy(local);object.updateMatrixWorld(true);additions.push(object);select(target);},
    undo:()=>{additions.splice(additions.indexOf(object),1);content.add(object);object.matrixAutoUpdate=auto;object.matrix.copy(originalMatrix);object.updateMatrixWorld(true);content.children.splice(content.children.indexOf(object),1);content.children.splice(index,0,object);select(target);}
  });
}
