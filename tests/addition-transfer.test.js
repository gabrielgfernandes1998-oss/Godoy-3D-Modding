import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile,rm,readdir} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
const {validateTextures,writeTextures}=createRequire(import.meta.url)('../desktop/addition-transfer.cjs');
test('GLB image transport uses binary files and planning needs only dimensions',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'godoy-glb-transfer-')),texture={width:2,height:1,pixels:new Uint8Array([255,0,0,255,0,255,0,128])};
 try{
  assert.deepEqual(await writeTextures(directory,[texture],{plan:true}),[{width:2,height:1}]);assert.deepEqual(await readdir(directory),[]);
  const [descriptor]=await writeTextures(directory,[texture]);assert.deepEqual(new Uint8Array(await readFile(descriptor.pixelsFile)),texture.pixels);
  assert.deepEqual(Object.keys(descriptor).sort(),['height','pixelsFile','width']);
  for(const invalid of [{...texture,pixels:[]},{...texture,width:0},{...texture,height:1.5},{...texture,pixels:new Uint8Array(4)}])assert.throws(()=>validateTextures([invalid]),/inválidos/);
 }finally{await rm(directory,{recursive:true,force:true});}
});
