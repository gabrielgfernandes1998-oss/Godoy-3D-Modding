import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const {createAssetHandler}=createRequire(import.meta.url)('../desktop/assets.cjs');

test('desktop serves local HTML and modules directly with correct MIME and CSP',async t=> {
  const root=await mkdtemp(path.join(os.tmpdir(),'godoy-assets-'));t.after(()=>rm(root,{recursive:true,force:true}));
  await writeFile(path.join(root,'index.html'),'<div id="app">studio</div>');
  await writeFile(path.join(root,'module.js'),'export const loaded = true;');
  const handler=createAssetHandler(root);
  for(const route of ['/','/index.html','/module.js']) {
    const response=await handler({url:'godoy://app'+route});assert.equal(response.status,200);
    assert.match(response.headers.get('content-security-policy'),/script-src 'self'/);
    assert.match(response.headers.get('content-type'),route.endsWith('.js')?/text\/javascript/:/text\/html/);
    assert.ok((await response.text()).length);
  }
  const head=await handler({url:'godoy://app/module.js',method:'HEAD'});assert.equal(await head.text(),'');
});
test('desktop rejects foreign hosts, missing assets, traversal and invalid encoding',async()=> {
  const handler=createAssetHandler('/tmp/godoy-does-not-exist');
  for(const [url,status] of [
    ['https://app/index.html',404],['godoy://other/index.html',404],
    ['godoy://app/missing.js',404],['godoy://app/%',400],
    ['godoy://app/%2e%2e%2fsecret',403],['godoy://app/%5c..%5csecret',403],
  ])assert.equal((await handler({url})).status,status,url);
  assert.equal((await handler({url:'godoy://app/index.html',method:'POST'})).status,405);
});
