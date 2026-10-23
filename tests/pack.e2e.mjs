import {existsSync} from 'node:fs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,mkdir,writeFile} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {unzipSync} from 'fflate';
import {makeYdd,makeYtd} from '../modules/vehicles/tests/fixtures.js';
import {parseYtd} from '../modules/vehicles/src/formats/ytd.js';
import {inspectYmt} from '../src/ymt.js';
const port=4212,server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'pipe'});let browser,logs='';server.stderr.on('data',d=>logs+=d);server.stdout.on('data',d=>logs+=d);const output=await mkdtemp(path.join(os.tmpdir(),'godoy-pack-ui-'));
try{
 for(let n=0;n<100;n++){try{if((await fetch(`http://127.0.0.1:${port}`)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));if(n===99)throw Error(logs);}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1700,height:1050},acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.goto(`http://127.0.0.1:${port}`);
 const upload=(name,bytes)=>({name,mimeType:'application/octet-stream',buffer:Buffer.from(bytes)});
 await page.locator('#pack-files').setInputFiles([upload('jbib_041_u.ydd',makeYdd()),upload('jbib_diff_041_a_uni.ytd',makeYtd()),upload('p_head_007.ydd',makeYdd()),upload('p_head_diff_007_a.ytd',makeYtd())]);
 await page.locator('[data-piece]').filter({hasText:'jbib_041_u'}).click();await page.locator('#variant-copy').click();await page.locator('#variant-grid button').nth(1).waitFor();
 await page.locator('#variant-label').fill('Pintura nova');await page.locator('#piece-group').fill('Polícia');await page.locator('#piece-tags').fill('VIP, azul');await page.locator('#piece-label').click();
 await page.locator('#variant-edit').click();const clothing=page.frameLocator('#clothing iframe');await clothing.locator('#texture-name').filter({hasText:'cloth_diffuse'}).waitFor();
 await clothing.locator('#toast').filter({hasText:'Variação do pack aberta'}).waitFor();await clothing.locator('#color').fill('#00ff00');await clothing.locator('#color').dispatchEvent('input');
 await clothing.locator('#tab-uv').click();const map=await clothing.locator('#uv-view').boundingBox();await page.mouse.click(map.x+map.width/2,map.y+map.height/2);const paintPending=page.waitForEvent('download');await clothing.locator('#export-native').click();await paintPending;
 await page.locator('#pack-status').filter({hasText:'Variação atualizada'}).waitFor({state:'attached'});await page.locator('[data-tab=pack]').click();
 await page.locator('#pack-ped-file').setInputFiles('tests/fixtures/native-clothing.ydd');await page.locator('#pack-ped-status').filter({hasText:'Ped local carregado'}).waitFor();await page.locator('#pack-frame').click();
 await page.locator('#pack-name').fill('pack_ui');const saving=page.waitForEvent('download');await page.locator('#save-pack-project').click();const saved=await saving,savedPath=path.join(output,'project.godoypack');await saved.saveAs(savedPath);
 const zipped=unzipSync(await readFile(savedPath)),project=JSON.parse(new TextDecoder().decode(zipped['project.json'])),body=project.items.find(i=>i.component==='jbib');assert.equal(body.textures.length,2);assert.deepEqual(body.tags,['VIP','azul']);assert.equal(body.group,'Polícia');
 const pixels=v=>{const a=project.assets.find(a=>a.id===v.asset);return parseYtd(zipped[a.path]).textures[0].decode();};assert.notDeepEqual(pixels(body.textures[0]),pixels(body.textures[1]),'editing duplicated variation must not overwrite the original');
 const packPending=page.waitForEvent('download');await page.locator('#build-pack').click();const pack=await packPending,packPath=path.join(output,'pack.zip');await pack.saveAs(packPath);const files=unzipSync(await readFile(packPath));assert(files['stream/[male]/p_head/mp_m_freemode_01_p_pack_ui^p_head_diff_000_a.ytd']);const metadata=inspectYmt(files['stream/mp_m_freemode_01_pack_ui.ymt']);assert.equal(metadata.props.length,1);assert.equal(metadata.components[0].drawables[0].textures.length,2);
 await page.locator('#new-pack').click();assert.equal(await page.locator('[data-piece]').count(),0);await page.locator('#pack-project-file').setInputFiles(savedPath);await page.locator('[data-piece]').nth(1).waitFor();assert.equal(await page.locator('#pack-name').inputValue(),'pack_ui');
 await page.locator('[data-piece]').filter({hasText:'jbib'}).click();await page.locator('#pack-delete').click();assert.equal(await page.locator('[data-piece]').count(),1);await page.keyboard.press('Control+z');assert.equal(await page.locator('[data-piece]').count(),2);await page.keyboard.press('Control+y');assert.equal(await page.locator('[data-piece]').count(),1);await page.keyboard.press('Control+z');
 await page.locator('#pack-group-filter').selectOption('Polícia');assert.equal(await page.locator('[data-piece]').count(),1);await page.locator('#pack-group-filter').selectOption('');
 await mkdir('.test-output',{recursive:true});await page.screenshot({path:'.test-output/pack-manager.png',fullPage:true});assert.deepEqual(errors,[]);await writeFile('.test-output/pack-browser-results.json',JSON.stringify({status:'passed',output,checks:['project round trip','independent variation painting','props YMT/filenames','reindex','local ped','groups/tags','undo/redo']},null,2));console.log('Pack browser: project, independent variants, painting, props, export, local ped, grouping and undo/redo PASS');
}finally{await browser?.close();server.kill();}
