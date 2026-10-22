// Original local-file library. No GTA assets or grzyClothTool code are bundled.
async function open() {
  return new Promise((resolve,reject)=> {
    const request=indexedDB.open('godoy-reference-peds',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('peds');
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
}
function genderKey(gender) {
  if(!['male','female'].includes(gender))throw Error('Gênero de ped inválido.');
  return gender;
}
async function transaction(gender,mode,operation) {
  const key=genderKey(gender),db=await open();
  try {
    return await new Promise((resolve,reject)=> {
      const tx=db.transaction('peds',mode),request=operation(tx.objectStore('peds'),key);
      tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(request.error??tx.error??Error('Não foi possível acessar a biblioteca.'));tx.onabort=()=>reject(tx.error??Error('Não foi possível atualizar a biblioteca.'));
    });
  } finally {db.close();}
}
export async function rememberPed(gender,file) {
  if(!file||!file.size||file.size>80*1024*1024||!/\.(ydd|glb)$/i.test(file.name))throw Error('Selecione um ped YDD ou GLB válido de até 80 MB.');
  const record={name:file.name,bytes:await file.arrayBuffer()};
  return transaction(gender,'readwrite',(store,key)=>store.put(record,key));
}
export async function readPed(gender) {
  const record=await transaction(gender,'readonly',(store,key)=>store.get(key));
  return record?new File([record.bytes],record.name,{type:'application/octet-stream'}):null;
}
export const forgetPed=gender=>transaction(gender,'readwrite',(store,key)=>store.delete(key));
