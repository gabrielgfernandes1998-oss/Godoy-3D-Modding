import assert from 'node:assert/strict';
import {readFile,writeFile,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {unzipSync} from 'fflate';
import {parseYdd} from '../modules/vehicles/src/formats/ydd.js';
export async function exercisePedStorageFailure(page,output,{desktop=null}={}){
 // Reloading an edited scene triggers the app's native unsaved-changes dialog.
 // Accept it in this isolated test profile before navigation, not just in cleanup.
 if(desktop)await desktop.evaluate(({dialog})=>{dialog.showMessageBoxSync=()=>1;});
 const bytes=await readFile('tests/fixtures/native-clothing.ydd');
 await page.addInitScript(()=>{if(!location.search.includes('mode=converter'))return;Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:{open(){const r={};queueMicrotask(()=>{r.error=new DOMException('Internal error.','UnknownError');r.onerror?.();});return r;}}});});
 if(!desktop)await page.evaluate(bytes=>{window.godoyNative={...window.godoyNative,status:async()=>({available:true,configured:true,coreAvailable:true}),loadPed:async()=>({ped:'mp_m_freemode_01',assets:[{name:'native-clothing.ydd',bytes:new Uint8Array(bytes)}],missing:[]})};},Array.from(bytes));
 await page.locator('[data-tab=converter]').click();
 const frame=()=>page.frames().find(f=>f.url().includes('mode=converter')),ui=page.frameLocator('#converter iframe');
 async function reload(){await page.evaluate(()=>window.__godoyPedSessionV1?.clear());await frame().goto(frame().url());await ui.locator('#convert-export').waitFor();}
 await reload();
 if(desktop){
  // Real IPC disk library works with IndexedDB failing, including an empty session cache.
  await ui.locator('#ped-gender').selectOption('female');await ui.locator('#ped-file').setInputFiles('tests/fixtures/native-clothing.ydd');await ui.locator('#ped-status').filter({hasText:'Ped salvo e carregado'}).waitFor();await ui.locator('#ped-library-status').filter({hasText:'disco'}).waitFor();
  const saved=await page.evaluate(async()=>{const p=await window.godoyNative.readPedLibrary('female','skeleton');return {name:p.name,bytes:Array.from(p.bytes)};});assert.deepEqual(saved.bytes,Array.from(bytes));
  await reload();await ui.locator('#ped-gender').selectOption('female');await ui.locator('#ped-status').filter({hasText:'Ped carregado: native-clothing.ydd'}).waitFor();await ui.locator('#convert-bone option[value="11816"]').waitFor({state:'attached'});assert.match(await ui.locator('#ped-library-status').textContent(),/disco/);
 }
 let blockedDirectory,backup;
 try{
  if(desktop){
   const profile=await desktop.evaluate(({app})=>app.getPath('userData'));blockedDirectory=path.join(profile,'reference-peds');backup=blockedDirectory+'-test-backup';await rename(blockedDirectory,backup);await writeFile(blockedDirectory,'Simulated unavailable directory');await reload();
   await ui.locator('#ped-file').setInputFiles('tests/fixtures/native-clothing.ydd');await ui.locator('#ped-status').filter({hasText:'Ped carregado nesta sessão'}).waitFor();
  }else{
   // Browser harness simulates the CodeWalker response; both persistence backends are unavailable.
   await ui.locator('#load-native-ped').click();await ui.locator('#ped-status').filter({hasText:'Ped do GTA carregado: mp_m_freemode_01'}).waitFor();
  }
  await ui.locator('#ped-library-status').filter({hasText:'somente nesta sessão'}).waitFor();await ui.locator('#convert-bone option[value="11816"]').waitFor({state:'attached'});await ui.locator('#convert-bone').selectOption('11816');
  await ui.locator('#obj-file').setInputFiles({name:'session.obj',mimeType:'text/plain',buffer:Buffer.from('v 0 0 0\nv .1 0 0\nv 0 .1 0\nf 1 2 3\n')});await ui.locator('#convert-info').filter({hasText:'3 vértices'}).waitFor();await ui.locator('#convert-index').fill('7');await ui.locator('#convert-size').selectOption('512');
  const pending=page.waitForEvent('download',{timeout:120000});await ui.locator('#convert-export').click();const download=await pending,target=path.join(output,'ped-session-converted.zip');await download.saveAs(target);const files=unzipSync(await readFile(target));assert.ok(files['accs_007_u.ydd']);assert.ok(files['accs_diff_007_a_uni.ytd']);assert.equal(parseYdd(files['accs_007_u.ydd']).drawables[0].readLod(0)[0].vertexCount,3);assert.doesNotMatch(await ui.locator('#status').textContent(),/Internal error/);if(!desktop)assert.doesNotMatch(await ui.locator('#native-status').textContent(),/not defined|Não foi possível guardar/);
 }finally{if(backup){await rm(blockedDirectory,{force:true});await rename(backup,blockedDirectory);}}
}
