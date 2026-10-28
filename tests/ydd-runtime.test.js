import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {parseYdd} from '../modules/vehicles/src/formats/ydd.js';import {assertYddRuntimeHeaders} from '../src/ydd-runtime.js';
test('legacy shared fixup headers rejected even below resource size limit',()=>{
 assert.throws(()=>assertYddRuntimeHeaders(parseYdd(readFileSync('tests/fixtures/native-unsafe-shared-headers.ydd'))),/Invalid fixup/);
 assert.doesNotThrow(()=>assertYddRuntimeHeaders(parseYdd(readFileSync('tests/fixtures/native-converted-obj.ydd'))));
});
