import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,readdir} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
const {createPedStorage}=createRequire(import.meta.url)('../desktop/ped-storage.cjs');
test('disk library survives reopen, copies view bytes, separates gender/kind and preserves deletion over migration',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'godoy-ped-store-'));
 try{const store=createPedStorage(root),bytes=new Uint8Array(new Uint8Array([99,1,2,88]).buffer,1,2);
 await store.write('male','preview',{name:'ped.ydd',bytes});await store.write('female','skeleton',{name:'skeleton.ydd',bytes:new Uint8Array([3,4])});
 const reopened=createPedStorage(root);assert.deepEqual([...(await reopened.read('male','preview')).bytes],[1,2]);assert.equal(await reopened.read('male','skeleton'),null);assert.deepEqual([...(await reopened.read('female','skeleton')).bytes],[3,4]);
 await assert.rejects(store.write('male','preview',{name:'bad.obj',bytes}),/inválido/);assert.equal((await store.read('male','preview')).name,'ped.ydd');
 for(const [gender,kind]of[['../male','preview'],['male','../secret']])await assert.rejects(store.read(gender,kind),/inválido/);
 await store.remove('male','preview');assert.deepEqual(await createPedStorage(root).read('male','preview'),{deleted:true});assert.ok((await readdir(root)).every(n=>!n.endsWith('.tmp')));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('disk library rejects corrupt records and a non-directory without deleting existing data',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'godoy-ped-store-'));
 try{await writeFile(path.join(root,'male-preview.gped'),'broken');await assert.rejects(createPedStorage(root).read('male','preview'),/inválida/);await writeFile(path.join(root,'not-a-directory'),'kept');await assert.rejects(createPedStorage(path.join(root,'not-a-directory')).write('male','preview',{name:'ped.ydd',bytes:new Uint8Array([1])}));}
 finally{await rm(root,{recursive:true,force:true});}
});
