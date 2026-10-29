import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {parseYdd} from '../modules/vehicles/src/formats/ydd.js';import {assertYddRuntimeHeaders,assertYddLodCounts,assertConverterBone} from '../src/ydd-runtime.js';
test('legacy shared fixup headers rejected even below resource size limit',()=>{
 assert.throws(()=>assertYddRuntimeHeaders(parseYdd(readFileSync('tests/fixtures/native-unsafe-shared-headers.ydd'))),/Invalid fixup/);
 assert.doesNotThrow(()=>assertYddRuntimeHeaders(parseYdd(readFileSync('tests/fixtures/native-converted-obj.ydd'))));
});
test('converter bone is verified in skeleton, model, palette and every vertex',()=>{
 const doc=parseYdd(readFileSync('tests/fixtures/native-converted-obj.ydd'));
 assert.equal(assertConverterBone(doc,11816).index,1);
 assert.throws(()=>assertConverterBone(doc,31086),/vértices exportados/);
 assert.throws(()=>assertConverterBone(parseYdd(readFileSync('tests/fixtures/native-local-bone-indices.ydd')),11816),/skin local antigo/);
 const r=doc.resource,d=r.list(0x30,512)[0],list=r.ptr(d+0x50,16),model=r.list(list,1024)[0],g=r.list(model+8,65535)[0],vb=r.ptr(g+0x18,128),p=r.ptr(vb+0x10,144);
 r.data[p+48+16]=0; // corrupt only vertex 2; validating vertex 1 is insufficient
 assert.throws(()=>assertConverterBone(doc,11816),/vértices exportados/);
});
test('preview-readable models with zero runtime LOD counts are rejected',()=>{
 const old=parseYdd(readFileSync('tests/fixtures/native-unsafe-shared-headers.ydd'));
 assert.equal(old.drawables[0].readLod(0).length,1,'preview can still see the legacy model');
 assert.throws(()=>assertYddLodCounts(old),/contagem de renderização zero/);
 assert.doesNotThrow(()=>assertYddLodCounts(parseYdd(readFileSync('tests/fixtures/native-converted-obj.ydd'))));
});
