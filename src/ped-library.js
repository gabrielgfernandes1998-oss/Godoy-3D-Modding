// Ped storage is independent of Chromium's IndexedDB in the portable.
// Existing browser records are migrated on demand, never deleted/reset on failure.
const LIMIT=80*1024*1024;
function genderKey(gender){if(!['male','female'].includes(gender))throw Error('Gênero de ped inválido.');return gender;}
function kindKey(kind){if(!['preview','skeleton'].includes(kind))throw Error('Tipo de ped inválido.');return kind;}
function copy(record){return record?{name:record.name,bytes:pedSkeletonBytes(record.bytes)}:null;}
function recordFor(kind,value){
  if(!value||typeof value.name!=='string'||!(kind==='skeleton'?/\.ydd$/i:/\.(ydd|glb)$/i).test(value.name))throw Error('Cópia de ped inválida.');
  let bytes=value.bytes;
  if(Object.prototype.toString.call(bytes)==='[object ArrayBuffer]')bytes=new Uint8Array(bytes);
  return {name:value.name,bytes:pedSkeletonBytes(bytes)};
}
function nativeLibrary(){try{const host=typeof window==='undefined'?globalThis:window.parent;const native=host.godoyNative;return typeof native?.readPedLibrary==='function'&&typeof native?.writePedLibrary==='function'&&typeof native?.deletePedLibrary==='function'?native:null;}catch{return null;}}
function sharedSession(){try{const host=typeof window==='undefined'?globalThis:window.parent;return host.__godoyPedSessionV1??(host.__godoyPedSessionV1=new Map());}catch{return new Map();}}
export function createPedLibrary({getNative=nativeLibrary,getIndexedDB=()=>globalThis.indexedDB,session=new Map(),onStatus=()=>{},openTimeout=2500}={}){
  let idbFailed=false,info={persistent:true,backend:'unknown',message:''};
  function report(persistent,backend,message){info={persistent,backend,message};onStatus(info);return info;}
  function legacy(key,mode,operation){
    if(idbFailed)return Promise.reject(Error('Biblioteca antiga indisponível.'));
    return new Promise((resolve,reject)=>{
      let request,db,finished=false,timer;
      const end=(error,result)=>{if(finished)return;finished=true;clearTimeout(timer);db?.close();if(error){idbFailed=true;reject(error);}else resolve(result);};
      timer=setTimeout(()=>end(Error('Tempo de acesso à biblioteca antiga esgotado.')),openTimeout);
      try{
        request=getIndexedDB().open('godoy-reference-peds',1);
        request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('peds'))request.result.createObjectStore('peds');};
        request.onerror=()=>end(request.error??Error('Biblioteca antiga indisponível.'));
        request.onblocked=()=>end(Error('Biblioteca antiga está bloqueada por outra janela.'));
        request.onsuccess=()=>{
          db=request.result;if(finished){db.close();return;}db.onversionchange=()=>db.close();
          try{const tx=db.transaction('peds',mode),r=operation(tx.objectStore('peds'),key);tx.oncomplete=()=>end(null,r.result);tx.onerror=()=>end(r.error??tx.error??Error('Falha na biblioteca antiga.'));tx.onabort=()=>end(tx.error??Error('Operação da biblioteca antiga cancelada.'));}
          catch(error){end(error);}
        };
      }catch(error){end(error);}
    });
  }
  const keyFor=(gender,kind)=>genderKey(gender)+(kindKey(kind)==='skeleton'?'-skeleton':'');
  return {
    info:()=>({...info}),
    async get(gender,kind){
      const key=keyFor(gender,kind);if(session.has(key))return copy(session.get(key));
      const native=getNative();let diskError=null,diskMissing=false;
      if(native)try{
        const stored=await native.readPedLibrary(gender,kind);
        if(stored?.deleted){session.set(key,null);report(true,'disk','Biblioteca de peds salva no disco.');return null;}
        if(stored){const record=recordFor(kind,stored);session.set(key,record);report(true,'disk','Biblioteca de peds salva no disco.');return copy(record);}
        diskMissing=true;
      }catch(error){diskError=error;}
      try{
        const old=await legacy(key,'readonly',(store,k)=>store.get(k));
        if(old){
          const record=recordFor(kind,kind==='skeleton'?{name:gender+'-skeleton.ydd',bytes:old}:old);session.set(key,record);
          if(native&&diskMissing)try{await native.writePedLibrary(gender,kind,copy(record));report(true,'disk','Ped recuperado da biblioteca antiga e salvo no disco.');return copy(record);}catch(error){diskError=error;}
          report(true,'indexeddb',diskError?'Cópia recuperada da biblioteca antiga; salvamento em disco indisponível.':'Biblioteca de peds salva neste navegador.');return copy(record);
        }
        report(true,native&&!diskError?'disk':'indexeddb',diskError?'A cópia salva no disco não pôde ser lida. Carregue ou importe o ped novamente.':'');return null;
      }catch{
        report(false,'session',native&&!diskError?'A biblioteca antiga não pôde ser lida. Carregue ou importe o ped novamente; a nova cópia será salva no disco.':'Biblioteca salva indisponível. Você pode carregar/importar o ped e usar o conversor nesta sessão.');return null;
      }
    },
    async put(gender,kind,value){
      const key=keyFor(gender,kind),record=recordFor(kind,value);session.set(key,record);
      const native=getNative();
      if(native)try{await native.writePedLibrary(gender,kind,copy(record));return report(true,'disk','Ped salvo no disco deste computador.');}catch{}
      try{await legacy(key,'readwrite',(store,k)=>store.put(kind==='skeleton'?record.bytes:record,k));return report(true,'indexeddb','Ped salvo na biblioteca do navegador.');}
      catch{return report(false,'session','Ped disponível somente nesta sessão. O salvamento local está indisponível; guarde seus arquivos e importe o ped novamente ao reabrir.');}
    },
    async remove(gender,kind){
      const key=keyFor(gender,kind);session.set(key,null);let disk=false,idb=false;const native=getNative();
      if(native)try{await native.deletePedLibrary(gender,kind);disk=true;}catch{}
      try{await legacy(key,'readwrite',(store,k)=>store.delete(k));idb=true;}catch{}
      return report(disk||idb,disk?'disk':idb?'indexeddb':'session',disk||idb?'Ped removido da biblioteca.':'Ped removido desta sessão. A cópia salva não pôde ser removida e pode reaparecer ao reabrir.');
    },
  };
}
const library=createPedLibrary({session:sharedSession(),onStatus:detail=>{if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('godoy-ped-library-status',{detail}));}});
export const pedLibraryInfo=()=>library.info();
export async function rememberPed(gender,file){
  if(!file||!file.size||file.size>LIMIT||!/\.(ydd|glb)$/i.test(file.name))throw Error('Selecione um ped YDD ou GLB válido de até 80 MB.');
  return library.put(gender,'preview',{name:file.name,bytes:new Uint8Array(await file.arrayBuffer())});
}
export async function readPed(gender){const record=await library.get(gender,'preview');return record?new File([record.bytes],record.name,{type:'application/octet-stream'}):null;}
export const forgetPed=gender=>library.remove(gender,'preview');
export const rememberPedSkeleton=(gender,bytes)=>library.put(gender,'skeleton',{name:gender+'-skeleton.ydd',bytes:pedSkeletonBytes(bytes)});
export async function readPedSkeleton(gender){const record=await library.get(gender,'skeleton');return record?.bytes??null;}
export const forgetPedSkeleton=gender=>library.remove(gender,'skeleton');
// Native results cross the main-window / iframe boundary; instanceof is realm-local.
export function pedSkeletonBytes(value){
  if(!ArrayBuffer.isView(value)||Object.prototype.toString.call(value)!=='[object Uint8Array]'||!value.byteLength||value.byteLength>LIMIT)throw Error('Esqueleto de ped inválido.');
  return new Uint8Array(value.buffer,value.byteOffset,value.byteLength).slice();
}
