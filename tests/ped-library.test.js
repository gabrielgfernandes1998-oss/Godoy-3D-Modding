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
