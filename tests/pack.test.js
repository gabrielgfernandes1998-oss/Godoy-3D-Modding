import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateRawSync} from 'node:zlib';
import {unzipSync,strFromU8} from 'fflate';
import {createClothingPack,zipPack} from '../src/pack.js';
import {createYmt,inspectYmt,hashName} from '../src/ymt.js';
import {makeYdd,makeYtd} from '../modules/vehicles/tests/fixtures.js';
const files=()=>[{name:'jbib_000_u.ydd',bytes:makeYdd()},{name:'jbib_diff_000_a_uni.ytd',bytes:makeYtd()}];
test('YMT has correct schema hash, root, availability and DLC hash',()=> {
  assert.equal(hashName('CPedVariationInfo'),376833625);
  const ymt=createYmt('test',[{name:'jbib',drawables:[{textures:2,kind:'u',skin:'uni'}]},{name:'feet',drawables:[{textures:1,kind:'r',skin:'whi'}]}]);
  const bytes=inflateRawSync(ymt.subarray(16)),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const ptr=o=>v.getUint32(o,true)-0x50000000;
  assert.equal(v.getUint32(16,true),0x50524430);assert.equal(v.getUint32(28,true),1);
  const table=ptr(48);assert.equal(v.getUint32(table,true),376833625);
  const root=ptr(table+8);assert.equal(bytes[root+4+6],0);assert.equal(bytes[root+4+11],1);assert.equal(bytes[root+4+3],255);
  assert.equal(v.getUint32(root+104,true),hashName('test',true));
  const decoded=inspectYmt(ymt);assert.deepEqual(decoded.components.map(c=>c.name),['feet','jbib']);
  assert.equal(decoded.components[0].drawables[0].textures[0].id,1);
  assert.equal(decoded.components[1].drawables[0].textures.length,2);
});
test('YMT refuses unsupported variants and counts',()=> {
  for(const d of [{textures:0,kind:'u',skin:'uni'},{textures:27,kind:'u',skin:'uni'},{textures:1,kind:'r',skin:'uni'}])assert.throws(()=>createYmt('test',[{name:'jbib',drawables:[d]}]));
  assert.throws(()=>createYmt('../test',[]));
});
test('pack contains binaries, generated metadata and manifest for both genders',()=> {
  for(const gender of ['male','female']) {
    const source=files(),result=createClothingPack({pack:'test',gender,files:source}),zip=unzipSync(zipPack(result));
    const ped=gender==='male'?'mp_m_freemode_01':'mp_f_freemode_01';
    const meta=strFromU8(zip[`${ped}_test.meta`]);
    assert.match(meta,/<dlcName>test<\/dlcName>/);assert.ok(meta.includes(`<fullDlcName>${ped}_test</fullDlcName>`));
    assert.deepEqual(zip[`stream/[${gender}]/jbib/${ped}_test^jbib_000_u.ydd`],source[0].bytes);
    assert.equal(inspectYmt(zip[`stream/${ped}_test.ymt`]).components[0].drawables.length,1);
    assert.match(strFromU8(zip['fxmanifest.lua']),/SHOP_PED_APPAREL_META_FILE/);
  }
});
test('pack rejects duplicate, missing, gapped and malformed assets',()=> {
  const variants=[files().slice(0,1),[...files(),files()[0]],files().map(f=>({...f,name:f.name.replace('000','001')})),files().map(f=>({...f,name:f.name.replace('_a_','_b_')})),[{name:'jbib_000_u.ydd',bytes:new Uint8Array(30)},files()[1]]];
  for(const input of variants)assert.throws(()=>createClothingPack({pack:'test',gender:'male',files:input}));
});
test('pack preserves component indices and multiple texture variants',()=> {
  const input=[...files(),{name:'jbib_diff_000_b_uni.ytd',bytes:makeYtd()}];
  const result=createClothingPack({pack:'test',gender:'male',files:input});
  assert.equal(result.components[0].drawables[0].textures,2);
  assert.equal(Object.keys(result.archive).filter(n=>n.endsWith('.ytd')).length,2);
});
