import {_electron} from 'playwright';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdtemp,readFile,writeFile,mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {unzipSync} from 'fflate';
import {makeYdd,makeYtd,makeYft} from '../modules/vehicles/tests/fixtures.js';
import {parseYdd} from '../modules/vehicles/src/formats/ydd.js';
import {parseYtd} from '../modules/vehicles/src/formats/ytd.js';
import {exerciseMeshHistory} from './mesh-regression.mjs';
import {execFileSync} from 'node:child_process';
const executablePath=process.env.GODOY_DESKTOP_EXE;
if(!executablePath||!existsSync(executablePath))throw Error('Informe GODOY_DESKTOP_EXE com o executável Electron/portable.');
const output=await mkdtemp(path.join(os.tmpdir(),'godoy-desktop-'));
const args=['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',`--user-data-dir=${path.join(output,'profile')}`];
if(process.platform==='linux')args.push('--no-sandbox');
if(process.env.GODOY_HEADLESS)args.push('--ozone-platform=headless');
if(process.env.GODOY_DESKTOP_APP)args.push(process.env.GODOY_DESKTOP_APP);
let desktop;
try {
  desktop=await _electron.launch({executablePath,args,acceptDownloads:true,timeout:30000});
  const packaged=await desktop.evaluate(({app})=>app.isPackaged);
  if(!process.env.GODOY_DESKTOP_APP)assert.ok(packaged,'Test must launch the packaged app, not a development entry point');
  const page=await desktop.firstWindow({timeout:20000});page.setDefaultTimeout(20000);
  const failures=[],errors=[];
  page.on('requestfailed',r=>{if(r.url()!=='file:///etc/passwd')failures.push(`${r.url()}: ${r.failure()?.errorText}`);});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept().catch(()=>{}));
  await page.locator('#build-pack').waitFor();
  assert.equal(page.url(),'godoy://app/index.html');
  assert.match(await page.title(),/Godoy 3D Modding/);
  const html=await page.evaluate(async()=> {
    const response=await fetch('godoy://app/modules/clothing/index.html');
    return {status:response.status,type:response.headers.get('content-type'),body:await response.text()};
  });
  assert.equal(html.status,200);assert.match(html.type,/text\/html/);assert.match(html.body,/script/);
  assert.equal(await page.evaluate(()=>typeof window.require),'undefined');
  assert.equal(await page.evaluate(()=>typeof window.godoyNative?.loadPed),'function');
  if(process.platform==='win32') {
    const resourcesPath=await desktop.evaluate(()=>process.resourcesPath);
    const executable=path.join(resourcesPath,'native-bridge','Godoy.CodeWalkerBridge.exe');
    let result;
    try {execFileSync(executable,[],{input:JSON.stringify({command:'probe',codewalkerDirectory:path.join(output,'missing-codewalker')}),encoding:'utf8',windowsHide:true});throw Error('Missing CodeWalker must not report success');}
    catch(error){if(!error.stdout)throw error;result=JSON.parse(error.stdout);}
    assert.equal(result.ok,false);assert.match(result.error,/CodeWalker.Core.dll/);
    const bundled=JSON.parse(execFileSync(executable,[],{input:JSON.stringify({command:'probe',codewalkerDirectory:path.join(resourcesPath,'codewalker-local')}),encoding:'utf8',windowsHide:true}));
    assert.equal(bundled.ok,true);assert.ok(bundled.capabilities.includes('ped-base-rpf'));assert.ok(bundled.capabilities.includes('ydd-edit'));
    assert.ok((await readFile(path.join(resourcesPath,'codewalker-local/source/COPYING'),'utf8')).includes('GNU GENERAL PUBLIC LICENSE'));
  }
  const blocked=await page.evaluate(async()=> {try{await fetch('file:///etc/passwd');return false;}catch{return true;}});
  assert.ok(blocked,'Renderer must not have arbitrary file access');
  await page.locator('#pack-files').setInputFiles([
    {name:'jbib_000_u.ydd',mimeType:'application/octet-stream',buffer:Buffer.from(makeYdd())},
    {name:'jbib_diff_000_a_uni.ytd',mimeType:'application/octet-stream',buffer:Buffer.from(makeYtd())},
  ]);
  const packWait=page.waitForEvent('download');await page.click('#build-pack');
  const pack=await packWait;await pack.saveAs(path.join(output,'pack.zip'));
  assert.ok(unzipSync(await readFile(path.join(output,'pack.zip')))['stream/mp_m_freemode_01_godoy_pack.ymt']);
  await page.click('[data-tab=clothing]');const clothing=page.frameLocator('#clothing iframe');
  await clothing.locator('#batch-files').setInputFiles([
    {name:'jbib_000_u.ydd',mimeType:'application/octet-stream',buffer:Buffer.from(makeYdd())},
    {name:'jbib_diff_000_a_uni.ytd',mimeType:'application/octet-stream',buffer:Buffer.from(makeYtd())},
  ]);
  await clothing.locator('#batch-status').filter({hasText:'YTD associado'}).waitFor();
  const initial=await clothing.locator('#map').evaluate(c=>c.toDataURL());
  const box=await clothing.locator('#scene').boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  assert.notEqual(await clothing.locator('#map').evaluate(c=>c.toDataURL()),initial);
  const ytdWait=page.waitForEvent('download');await clothing.locator('#export-native').click();
  const ytd=await ytdWait;await ytd.saveAs(path.join(output,'edited.ytd'));
  assert.notDeepEqual(parseYtd(await readFile(path.join(output,'edited.ytd'))).textures[0].decode(),parseYtd(makeYtd()).textures[0].decode());
  assert.match(await page.locator('#pack-status').textContent(),/atualizados pelo editor/);
  await page.click('[data-tab=vehicles]');const vehicles=page.frameLocator('#vehicles iframe');
  await vehicles.locator('#model-file').setInputFiles({name:'test.yft',mimeType:'application/octet-stream',buffer:Buffer.from(makeYft())});
  await vehicles.locator('#asset-type').filter({hasText:'YFT NATIVO'}).waitFor();
  await page.click('[data-tab=mesh]');const mesh=page.frameLocator('#mesh iframe');
  await mesh.locator('#ped-file').setInputFiles({name:'mp_m_freemode_01.ydd',mimeType:'application/octet-stream',buffer:Buffer.from(makeYdd())});
  await mesh.locator('#ped-status').filter({hasText:'Ped salvo e carregado'}).waitFor();
  await mesh.locator('#ped-gender').selectOption('female');
  await mesh.locator('#ped-status').filter({hasText:'Nenhum ped salvo'}).waitFor();
  await mesh.locator('#ped-gender').selectOption('male');
  await mesh.locator('#ped-status').filter({hasText:'Ped carregado: mp_m_freemode_01.ydd'}).waitFor();
  await mesh.locator('#mesh-file').setInputFiles({name:'jbib_000_u.ydd',mimeType:'application/octet-stream',buffer:Buffer.from(makeYdd())});
  await mesh.locator('#status').filter({hasText:'carregado'}).waitFor();
  await exerciseMeshHistory(page,mesh);
  if(process.platform==='win32') {
    const original=await readFile('tests/fixtures/native-clothing.ydd');
    // Simulate extracted GTA bytes through real Electron IPC; no GTA install in CI.
    await desktop.evaluate(({ipcMain},data)=> {
      ipcMain.removeHandler('godoy:native-ped');
      ipcMain.handle('godoy:native-ped',()=>({ped:'mp_m_freemode_01',assets:[{name:'head_000_r.ydd',bytes:new Uint8Array(data)}],missing:[]}));
    },Array.from(original));
    await mesh.locator('#load-native-ped').evaluate(button=>button.disabled=false);
    await mesh.locator('#load-native-ped').click();
    await mesh.locator('#ped-status').filter({hasText:'Ped do GTA carregado: mp_m_freemode_01'}).waitFor();
    await mesh.locator('#native-status').filter({hasText:'Ped base carregado via CodeWalker'}).waitFor();
    await mesh.locator('#load-native-ped').waitFor({state:'visible'});
    // Wait for GLB cache/export completion before importing a different reference.
    await mesh.locator('#load-native-ped').evaluate(button=>new Promise(resolve=>{const check=()=>button.disabled?setTimeout(check,25):resolve();check();}));

    await mesh.locator('#ped-file').setInputFiles({name:'mp_m_freemode_01.ydd',mimeType:'application/octet-stream',buffer:original});
    await mesh.locator('#ped-status').filter({hasText:'Ped salvo e carregado'}).waitFor();
    await mesh.locator('#mesh-file').setInputFiles({name:'accs_000_u.ydd',mimeType:'application/octet-stream',buffer:original});
    await mesh.locator('#tree button').filter({hasText:'accs_000_u.ydd'}).click();
    assert.equal(await mesh.locator('#tree button').filter({hasText:/LOD|mesh_0/}).count(),0);
    await mesh.locator('#attachment-bone').selectOption('pelvis');
    await page.click('[data-tab=mesh]');await page.keyboard.press('Control+z');
    await mesh.locator('#attachment-bone option[value=preserve]:checked').waitFor({state:'attached'});
    assert.equal(await mesh.locator('#attachment-bone').inputValue(),'preserve');
    await page.keyboard.press('Control+y');await mesh.locator('#attachment-bone option[value=pelvis]:checked').waitFor({state:'attached'});assert.equal(await mesh.locator('#attachment-bone').inputValue(),'pelvis');
    await mesh.locator('#position-y').fill('-1');await mesh.locator('#apply-transform').click();
    await mesh.locator('#obj-file').setInputFiles({name:'cross.obj',mimeType:'text/plain',buffer:Buffer.from('v 0.1 1 0\nv 0.2 1 0\nv 0.1 1.1 0\nf 1 2 3\n')});
    await mesh.locator('#tree button').filter({hasText:'cross.obj'}).click();
    // Keep the OBJ selected: destination must come from the explicit YDD selector.
    await mesh.locator('#merge-target').selectOption({label:'accs_000_u.ydd'});
    await mesh.locator('#merge').click();
    await mesh.locator('#status').filter({hasText:'OBJ incorporado'}).waitFor();
    await mesh.locator('#tree button').filter({hasText:'cross.obj'}).waitFor({state:'detached'});
    await page.click('[data-tab=mesh]');await page.keyboard.press('Control+z');
    await mesh.locator('#tree button').filter({hasText:'cross.obj'}).waitFor();
    await page.keyboard.press('Control+y');await mesh.locator('#tree button').filter({hasText:'cross.obj'}).waitFor({state:'detached'});
    await mesh.locator('#ytd-file').setInputFiles('tests/fixtures/native-clothing.ytd');
    await mesh.locator('#ytd-status').filter({hasText:'native-clothing.ytd'}).waitFor();
    const pending=page.waitForEvent('download');await mesh.locator('#export-ydd').click();
    const exported=await pending;assert.equal(exported.suggestedFilename(),'accs_000_u-YDD-YTD-UV.zip');
    const target=path.join(output,'native-edited.ydd');await exported.saveAs(target);
    const files=unzipSync(await readFile(target));
    assert.ok(Object.keys(files).some(k=>k.startsWith('UV/')&&k.endsWith('.png')));
    const newYtd=parseYtd(files['native-clothing.ytd']);
    const objTexture=newYtd.textures.find(t=>t.name.startsWith('godoy_obj_')&&!/_[ns]$/.test(t.name));
    assert.ok(objTexture?.supported);assert.equal(objTexture.width,1024);
    const doc=parseYdd(files['accs_000_u.ydd']);
    assert.equal(doc.drawables[0].shaders[1].diffuseName,objTexture.name);assert.equal(doc.drawables[0].lods.length,2);
    for(let lod=0;lod<2;lod++) {
      const geometries=doc.drawables[0].readLod(lod);assert.equal(geometries.length,2,'Joined OBJ must exist inside the exported YDD at every LOD');
      assert.ok(Math.abs(geometries[0].positions[1]-1)<1e-6);
      assert.ok(Math.abs(geometries[1].positions[0]-.1)<1e-6&&Math.abs(geometries[1].positions[1]-1)<1e-6,'Joined OBJ must keep its scene position');
    }
    await page.click('[data-tab=clothing]');
    await clothing.locator('#batch-files').setInputFiles([
      {name:'accs_000_u.ydd',mimeType:'application/octet-stream',buffer:Buffer.from(files['accs_000_u.ydd'])},
      {name:'accs_diff_000_a_uni.ytd',mimeType:'application/octet-stream',buffer:Buffer.from(files['native-clothing.ytd'])},
    ]);
    await clothing.locator('#batch-status').filter({hasText:'YTD associado'}).waitFor();
    await clothing.locator('#texture-select').selectOption(objTexture.key);
    await clothing.locator('#tab-uv').click();
    const uvBox=await clothing.locator('#uv-view').boundingBox(),side=Math.min(uvBox.width,uvBox.height);
    await page.mouse.click(uvBox.x+(uvBox.width-side)/2+side*.35,uvBox.y+(uvBox.height-side)/2+side*.35);
    const paintPending=page.waitForEvent('download');await clothing.locator('#export-native').click();
    const paintDownload=await paintPending,paintTarget=path.join(output,'obj-painted.ytd');await paintDownload.saveAs(paintTarget);
    const painted=parseYtd(await readFile(paintTarget));
    assert.notDeepEqual(painted.textures.find(t=>t.name===objTexture.name).decode(),objTexture.decode(),'OBJ texture must be independently paintable');
    assert.deepEqual(painted.textures.find(t=>t.name==='original_diffuse').decode(),newYtd.textures.find(t=>t.name==='original_diffuse').decode(),'Painting the OBJ must preserve the clothing texture');

  }
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  await page.click('[data-tab=pack]');await mkdir('.test-output',{recursive:true});
  await page.screenshot({path:`.test-output/desktop-${process.platform}.png`});
  await writeFile(`.test-output/desktop-${process.platform}.json`,JSON.stringify({status:'passed',platform:process.platform,executable:executablePath,app:process.env.GODOY_DESKTOP_APP??'packaged executable',checks:['custom protocol assets','sandbox retained','pack download','clothing 3D paint / YTD export','editor-to-pack transfer','vehicle YFT import','mesh YDD import']},null,2));
} catch(error) {
  if(process.env.GITHUB_ACTIONS)console.error('::error title=Packaged desktop regression::'+String(error.stack??error.message).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A'));
  await mkdir('.test-output',{recursive:true});
  const page=desktop?.windows()[0];
  await page?.screenshot({path:`.test-output/desktop-${process.platform}.png`}).catch(()=>{});
  await writeFile(`.test-output/desktop-${process.platform}.json`,JSON.stringify({status:'failed',platform:process.platform,error:error.message},null,2));
  throw error;
} finally {
  if(desktop) {
    await desktop.evaluate(({dialog})=>{dialog.showMessageBoxSync=()=>1;}).catch(()=>{});
    await desktop.close();
  }
}
console.log(`PASS: packaged desktop (${process.platform}), all tabs, painting and downloads`);
