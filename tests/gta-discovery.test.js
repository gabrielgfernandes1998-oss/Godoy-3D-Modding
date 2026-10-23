import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import discovery from '../desktop/gta-discovery.cjs';
test('Steam discovery follows extra libraries and manifest; rejects incomplete/Enhanced installs',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'godoy-steam-'));
 try {
  const steam=path.join(root,'Steam'),library=path.join(root,'Other disk'),game=path.join(library,'steamapps/common/GTA V Legacy');
  await mkdir(path.join(steam,'steamapps'),{recursive:true});await mkdir(game,{recursive:true});
  await writeFile(path.join(steam,'steamapps/libraryfolders.vdf'),`"libraryfolders" { "1" { "path" "${library.replaceAll('\\','\\\\')}" } }`);
  await writeFile(path.join(library,'steamapps/appmanifest_271590.acf'),'"AppState" { "installdir" "GTA V Legacy" }');
  await writeFile(path.join(game,'GTA5.exe'),'');
  const options={env:{},steamRoots:[steam],registry:false};
  assert.equal(await discovery.discoverGame(options),null);
  await writeFile(path.join(game,'x64v.rpf'),'');
  assert.equal(await discovery.discoverGame(options),game);
  assert.equal(await discovery.validGame(undefined),false);
  await rm(path.join(game,'GTA5.exe'));await writeFile(path.join(game,'GTA5_Enhanced.exe'),'');
  assert.equal(await discovery.discoverGame(options),null);
 } finally {await rm(root,{recursive:true,force:true});}
});
test('Steam VDF paths decode backslashes',()=>assert.deepEqual(discovery.libraryPaths('"path" "D:\\\\SteamLibrary"'),['D:\\SteamLibrary']));
