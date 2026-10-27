import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resourceBudget,assertFiveMBudget} from '../src/resource-budget.js';
test('checks reserved resource memory even when compressed file is tiny',()=>{
 const bytes=new Uint8Array(20),v=new DataView(bytes.buffer);v.setUint32(0,0x37435352,true);v.setUint32(8,(1<<4)|10,true);
 assert.equal(resourceBudget(bytes).systemBytes,134217728);
 assert.throws(()=>assertFiveMBudget(bytes,'large.ydd'),/100 MB/);
 v.setUint32(8,(1<<4)|9,true);assert.equal(assertFiveMBudget(bytes,'safe.ydd').systemBytes,67108864);
});
test('normal converted resource passes, unrelated bytes ignored',()=>{
 assert.ok(assertFiveMBudget(readFileSync('tests/fixtures/native-converted-obj.ydd'),'converted.ydd'));
 assert.equal(resourceBudget(new Uint8Array(20)),null);assert.equal(resourceBudget(new Uint8Array(2)),null);
});
