import test from 'node:test';import assert from 'node:assert/strict';import {patternPixels} from '../modules/clothing/src/editor/brush-pattern.js';
test('fabric presets are deterministic, tinted, opaque and distinct; strength zero is flat',()=>{
 const outputs=['leather','fabric','ripstop'].map(k=>patternPixels(k,'#9a5030'));
 for(let n=0;n<3;n++){const p=outputs[n];assert.deepEqual(p,patternPixels(['leather','fabric','ripstop'][n],'#9a5030'));assert.ok(new Set(p.filter((_,i)=>i%4===0)).size>5);for(let i=0;i<p.length;i+=4){assert.equal(p[i+3],255);assert.ok(p[i]>p[i+1]&&p[i+1]>p[i+2]);}}
 assert.notDeepEqual(outputs[0],outputs[1]);assert.notDeepEqual(outputs[1],outputs[2]);const flat=patternPixels('leather','#9a5030',64,0);for(let i=0;i<flat.length;i+=4)assert.deepEqual(Array.from(flat.slice(i,i+4)),[154,80,48,255]);
});
