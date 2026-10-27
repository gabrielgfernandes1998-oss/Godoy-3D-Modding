const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const LIMIT=80*1024*1024;
function target(root,gender,kind){
  if(!['male','female'].includes(gender)||!['preview','skeleton'].includes(kind))throw Error('Tipo de ped inválido.');
  return path.join(root,`${gender}-${kind}.gped`);
}
function validate(record,kind){
  if(!record||typeof record.name!=='string'||record.name.length>256||/[\\/\0]/.test(record.name)||!(kind==='skeleton'?/\.ydd$/i:/\.(ydd|glb)$/i).test(record.name))throw Error('Arquivo de ped inválido.');
  const v=record.bytes;
  if(!ArrayBuffer.isView(v)||v.BYTES_PER_ELEMENT!==1||!v.byteLength||v.byteLength>LIMIT)throw Error('Dados do ped inválidos ou acima de 80 MB.');
  return Buffer.from(v.buffer,v.byteOffset,v.byteLength);
}
function createPedStorage(root){
  async function write(gender,kind,record){
    const destination=target(root,gender,kind),deleted=record?.deleted===true;
    const payload=deleted?Buffer.alloc(0):validate(record,kind);
    const metadata=Buffer.from(JSON.stringify(deleted?{deleted:true}:{name:record.name}));
    const header=Buffer.alloc(8);header.write('GPD1');header.writeUInt32LE(metadata.length,4);
    await fs.mkdir(root,{recursive:true});const temp=destination+'.'+randomUUID()+'.tmp';
    try{await fs.writeFile(temp,Buffer.concat([header,metadata,payload]),{flag:'wx',mode:0o600});await fs.rename(temp,destination);}
    finally{await fs.rm(temp,{force:true});}
  }
  return {
    async read(gender,kind){
      const file=target(root,gender,kind);let handle;
      try{
        handle=await fs.open(file,'r');const stat=await handle.stat();if(stat.size<8||stat.size>LIMIT+4104)throw Error('Cópia de ped salva inválida.');
        const data=await handle.readFile(),length=data.readUInt32LE(4);
        if(data.toString('ascii',0,4)!=='GPD1'||length>4096||8+length>data.length)throw Error('Cópia de ped salva inválida.');
        const metadata=JSON.parse(data.toString('utf8',8,8+length));
        if(metadata.deleted===true){if(data.length!==8+length)throw Error('Registro removido inválido.');return {deleted:true};}
        const record={name:metadata.name,bytes:new Uint8Array(data.subarray(8+length))};validate(record,kind);return record;
      }catch(error){if(error.code==='ENOENT')return null;throw error;}
      finally{await handle?.close();}
    },
    async write(gender,kind,record){if(record?.deleted)throw Error('Registro de ped inválido.');await write(gender,kind,record);return {persistent:true};},
    // A tombstone prevents an old IndexedDB copy from returning after a restart.
    async remove(gender,kind){await write(gender,kind,{deleted:true});return {persistent:true};},
  };
}
module.exports={createPedStorage};
