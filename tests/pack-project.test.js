import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {unzipSync,strFromU8} from 'fflate';
import {newPackProject,importPackAssets,buildManagedPack,savePackProject,loadPackProject,validateProject} from '../src/pack-project.js';
import {inspectYmt,createYmt} from '../src/ymt.js';
import {makeYdd,makeYtd} from '../modules/vehicles/tests/fixtures.js';
const files=(component='jbib',n='041')=>[{name:`${component}_${n}${component.startsWith('p_')?'':'_u'}.ydd`,bytes:makeYdd()},{name:`${component}_diff_${n}_a${component.startsWith('p_')?'':'_uni'}.ytd`,bytes:makeYtd()}];
test('manager imports gaps and exports compact indices without changing model/texture binaries',()=>{
 const p=importPackAssets(newPackProject(),files()).project;const built=buildManagedPack(p);assert.equal(built.collections,1);
 assert.deepEqual(built.archive['stream/[male]/jbib/mp_m_freemode_01_godoy_pack^jbib_000_u.ydd'],files()[0].bytes);
 const doc=inspectYmt(built.archive['stream/mp_m_freemode_01_godoy_pack.ymt']);assert.equal(doc.components[0].drawables.length,1);
});
test('later YTD imports associate by collection and component; variants survive project save/load',()=>{
 let p=importPackAssets(newPackProject(),files().slice(0,1)).project;assert.equal(p.items[0].textures.length,0);
 p=importPackAssets(p,files().slice(1)).project;p.items[0].group='Polícia';p.items[0].tags=['VIP'];p.items[0].textures.push({...p.items[0].textures[0],id:crypto.randomUUID(),label:'Nova pintura'});
 const restored=loadPackProject(savePackProject(p));assert.deepEqual(restored.items,p.items);assert.deepEqual(restored.assets[0].bytes,p.assets[0].bytes);
 const built=buildManagedPack(restored);assert(Object.keys(built.archive).some(k=>k.endsWith('diff_000_b_uni.ytd')));
});
test('collections split automatically at 128 models and at 255 texture variants per component',()=>{
 const p=importPackAssets(newPackProject(),files()).project,first=p.items[0];p.items=Array.from({length:129},(_,i)=>({...structuredClone(first),id:crypto.randomUUID(),textures:[{...first.textures[0],id:crypto.randomUUID()}]}));
 const b=buildManagedPack(p);assert.equal(b.collections,2);assert(Object.keys(b.archive).some(k=>k.includes('godoy_pack_002^jbib_000_u.ydd')));assert.match(strFromU8(b.archive['fxmanifest.lua']),/godoy_pack_002.meta/);
 p.items=p.items.slice(0,10).map(i=>({...i,textures:Array.from({length:26},()=>({...first.textures[0],id:crypto.randomUUID()}))}));assert.equal(buildManagedPack(p).collections,2);
});
test('props export canonical p-prefix filenames, anchor metadata and all texture variations',()=>{
 const p=importPackAssets(newPackProject(),files('p_head')).project;p.items[0].hairScale=.2;p.items[0].flags=3;p.items[0].textures.push({...p.items[0].textures[0],id:crypto.randomUUID(),label:'B'});
 const b=buildManagedPack(p);assert(Object.keys(b.archive).some(k=>k.endsWith('mp_m_freemode_01_p_godoy_pack^p_head_diff_000_a.ytd')));
 const ymt=b.archive['stream/mp_m_freemode_01_godoy_pack.ymt'],d=inspectYmt(ymt);assert.equal(d.components.length,0);assert.equal(d.props[0].anchor,0);assert.equal(d.props[0].textures.length,2);assert.equal(d.props[0].flags,3);assert(Math.abs(d.props[0].hairScale-.2)<1e-6);
 const mixed=createYmt('props_check',[{name:'feet',drawables:[{textures:1,kind:'u',skin:'uni',heel:.15,flags:7}]},{name:'p_head',drawables:[{textures:2,kind:'u',skin:'uni',hairScale:.2,flags:3}]}]);writeFileSync('tests/fixtures/native-pack-props.ymt',mixed);
});
test('malformed projects, missing assets and unsafe archive identifiers are rejected',()=>{
 const p=importPackAssets(newPackProject(),files()).project;assert.throws(()=>validateProject({...p,assets:[{...p.assets[0],id:'../../x'}]}));assert.throws(()=>loadPackProject(new Uint8Array([1,2,3])));
 p.items[0].textures=[];assert.throws(()=>buildManagedPack(p),/variação/);p.items[0].flags=-1;assert.throws(()=>validateProject(p));
});

test('same basenames can be imported for both genders without mixing texture variants',()=>{
 let p=importPackAssets(newPackProject(),files()).project;p.gender='female';p=importPackAssets(p,files()).project;
 assert.equal(p.items.length,2);assert.equal(p.assets.length,4);assert(p.items.every(i=>i.textures.length===1));assert.notEqual(p.items[0].textures[0].asset,p.items[1].textures[0].asset);
 const b=buildManagedPack(p);assert.equal(b.collections,2);assert(b.archive['stream/mp_f_freemode_01_godoy_pack.ymt']);assert(b.archive['stream/mp_m_freemode_01_godoy_pack.ymt']);
});
