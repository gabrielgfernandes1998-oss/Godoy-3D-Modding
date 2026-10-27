import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {pedSkeletonBytes} from '../src/ped-library.js';
test('ped skeleton accepts Uint8Array from the parent realm and copies only its view',()=>{
 const foreign=vm.runInNewContext('new Uint8Array(new Uint8Array([99,10,20,88]).buffer,1,2)');
 assert.equal(foreign instanceof Uint8Array,false);
 const local=pedSkeletonBytes(foreign);
 assert.ok(local instanceof Uint8Array);assert.deepEqual([...local],[10,20]);
 foreign[0]=50;assert.equal(local[0],10);
});
test('ped skeleton still rejects empty, oversized, non-byte and forged views',()=>{
 for(const value of [new Uint8Array(),new Uint16Array([1]),[1,2],null,{[Symbol.toStringTag]:'Uint8Array'},new Uint8Array(80*1024*1024+1)])assert.throws(()=>pedSkeletonBytes(value),/inválido/);
});

import {createPedLibrary} from '../src/ped-library.js';
const brokenIdb=()=>({open(){const req={};queueMicrotask(()=>{req.error=new Error('Internal error.');req.onerror();});return req;}});
const sample={name:'ped.ydd',bytes:new Uint8Array([1,2,3])};
test('IndexedDB Internal error does not prevent imports, skeleton reads, or session use',async()=>{
 const session=new Map(),a=createPedLibrary({getNative:()=>null,getIndexedDB:brokenIdb,session});
 assert.equal(await a.get('male','preview'),null);assert.equal((await a.put('male','preview',sample)).persistent,false);await a.put('male','skeleton',sample);assert.deepEqual([...(await a.get('male','skeleton')).bytes],[1,2,3]);assert.match(a.info().message,/sessão/);
 const b=createPedLibrary({getNative:()=>null,getIndexedDB:brokenIdb,session});assert.equal((await b.get('male','preview')).name,'ped.ydd');await a.remove('male','preview');assert.equal(await b.get('male','preview'),null);assert.equal(await b.get('female','preview'),null);
});
test('portable disk storage works with broken IndexedDB and survives an empty renderer session',async()=>{
 const disk=new Map(),native={readPedLibrary:async(g,k)=>disk.get(g+k)??null,writePedLibrary:async(g,k,r)=>disk.set(g+k,r),deletePedLibrary:async(g,k)=>disk.set(g+k,{deleted:true})};
 const a=createPedLibrary({getNative:()=>native,getIndexedDB:brokenIdb});assert.equal((await a.put('male','skeleton',sample)).backend,'disk');
 const b=createPedLibrary({getNative:()=>native,getIndexedDB:brokenIdb});assert.deepEqual([...(await b.get('male','skeleton')).bytes],[1,2,3]);await b.remove('male','skeleton');assert.equal(await createPedLibrary({getNative:()=>native,getIndexedDB:()=>{throw Error('must not resurrect legacy');}}).get('male','skeleton'),null);
});
test('legacy records migrate without deleting IndexedDB; blocked opens time out and late success closes',async()=>{
 let deleted=false;const record={name:'legacy.ydd',bytes:new Uint8Array([4,5]).buffer};
 const idb={open(){const req={};queueMicrotask(()=>{req.result={close(){},transaction(){const tx={objectStore(){return {get(){queueMicrotask(()=>tx.oncomplete());return {result:record};},delete(){deleted=true;}}}};return tx;}};req.onsuccess();});return req;}};
 let migrated;const native={readPedLibrary:async()=>null,writePedLibrary:async(g,k,r)=>{migrated=r;},deletePedLibrary:async()=>{}};
 const library=createPedLibrary({getNative:()=>native,getIndexedDB:()=>idb});assert.equal((await library.get('female','preview')).name,'legacy.ydd');assert.deepEqual([...migrated.bytes],[4,5]);assert.equal(deleted,false);
 let req,closed=false;const timeout=createPedLibrary({getNative:()=>null,getIndexedDB:()=>({open(){req={};return req;}}),openTimeout:10});assert.equal(await timeout.get('male','preview'),null);req.result={close(){closed=true;}};req.onsuccess();assert.equal(closed,true);
});
test('disk and browser failures fall back to memory while invalid skeleton data still fails',async()=>{
 const native={readPedLibrary:async()=>{throw Error('EACCES');},writePedLibrary:async()=>{throw Error('ENOSPC');},deletePedLibrary:async()=>{throw Error('EACCES');}};
 const library=createPedLibrary({getNative:()=>native,getIndexedDB:brokenIdb});const status=await library.put('female','skeleton',sample);assert.equal(status.persistent,false);assert.deepEqual([...(await library.get('female','skeleton')).bytes],[1,2,3]);await assert.rejects(library.put('female','skeleton',{name:'bad.ydd',bytes:new Uint16Array([1])}),/inválido/);
});
