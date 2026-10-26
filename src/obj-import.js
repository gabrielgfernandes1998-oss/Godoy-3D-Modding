import {Group,Mesh,BufferGeometry,BufferAttribute,MeshStandardMaterial,DoubleSide} from 'three';
export function importConverterObj(file,{progress=()=>{},signal}={}) {
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./obj-import.worker.js',import.meta.url),{type:'module'});let settled=false;
  const finish=(error,value)=>{if(settled)return;settled=true;worker.terminate();signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);};
  const abort=()=>finish(Error('Importação cancelada. A cena anterior foi preservada.'));
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}
  worker.onerror=e=>finish(Error(e.message||'Não foi possível processar o OBJ. Verifique a memória disponível.'));
  worker.onmessage=({data})=>{if(data.progress){progress(data.progress);return;}if(data.error){finish(Error(data.error));return;}
   try{const group=new Group(),material=new MeshStandardMaterial({color:0xdca05c,side:DoubleSide});for(const spec of data.meshes){const geometry=new BufferGeometry();for(const [name,a] of Object.entries(spec.attributes))geometry.setAttribute(name,new BufferAttribute(a.array,a.itemSize,a.normalized));const mesh=new Mesh(geometry,material);mesh.name=spec.name;mesh.matrix.fromArray(spec.matrix);mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);mesh.userData.converterOriginalUv=geometry.attributes.uv?.clone()??null;group.add(mesh);}group.userData.converter=data.state;finish(null,group);}catch(e){finish(e);}
  };worker.postMessage(file);
 });
}
