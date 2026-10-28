import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {parseYdd} from '../modules/vehicles/src/formats/ydd.js';import {assertYddRuntimeHeaders,assertYddLodCounts} from '../src/ydd-runtime.js';
test('legacy shared fixup headers rejected even below resource size limit',()=>{
 assert.throws(()=>assertYddRuntimeHeaders(parseYdd(readFileSync('tests/fixtures/native-unsafe-shared-headers.ydd'))),/Invalid fixup/);
 assert.doesNotThrow(()=>assertYddRuntimeHeaders(parseYdd(readFileSync('tests/fixtures/native-converted-obj.ydd'))));
});
test('preview-readable models with zero runtime LOD counts are rejected',()=>{
 const old=parseYdd(readFileSync('tests/fixtures/native-unsafe-shared-headers.ydd'));
 assert.equal(old.drawables[0].readLod(0).length,1,'preview can still see the legacy model');
 assert.throws(()=>assertYddLodCounts(old),/contagem de renderização zero/);
 assert.doesNotThrow(()=>assertYddLodCounts(parseYdd(readFileSync('tests/fixtures/native-converted-obj.ydd'))));
});
