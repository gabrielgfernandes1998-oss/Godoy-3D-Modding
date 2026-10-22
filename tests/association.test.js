import test from 'node:test';
import assert from 'node:assert/strict';
import {rankTextureCandidates} from '../src/asset-batch.js';
const candidate=(name,textures)=>({file:{name},doc:{textures:textures.map(name=>({name}))}});
test('association prioritizes component/index and vehicle base name',()=> {
  const candidates=[candidate('wrong.ytd',['diff']),candidate('jbib_diff_000_a_uni.ytd',['diff'])];
  assert.equal(rankTextureCandidates('jbib_000_u.ydd',['DIFF'],candidates)[0].file.name,'jbib_diff_000_a_uni.ytd');
  assert.equal(rankTextureCandidates('police_hi.yft',['diff'],[candidate('other.ytd',['diff']),candidate('police.ytd',['diff'])])[0].file.name,'police.ytd');
});
test('equally matching dictionaries retain equal score for manual selection',()=> {
  const ranked=rankTextureCandidates('model.ydd',['diff'],[candidate('one.ytd',['diff']),candidate('two.ytd',['diff'])]);
  assert.equal(ranked[0].score,ranked[1].score);
});
