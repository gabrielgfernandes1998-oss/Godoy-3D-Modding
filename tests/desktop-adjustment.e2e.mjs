import {_electron} from 'playwright';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
import {exerciseSelectionAdjustment} from './selection-adjustment-flow.mjs';
const executablePath=process.env.GODOY_DESKTOP_EXE;
if(!executablePath||!existsSync(executablePath))throw Error('Informe GODOY_DESKTOP_EXE com o portable.');
const output=await mkdtemp(path.join(os.tmpdir(),'godoy-adjustment-desktop-'));
const args=['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',`--user-data-dir=${path.join(output,'profile')}`];
if(process.platform==='linux')args.push('--no-sandbox');
if(process.env.GODOY_HEADLESS)args.push('--ozone-platform=headless');
if(process.env.GODOY_DESKTOP_APP)args.push(process.env.GODOY_DESKTOP_APP);
let desktop,page,failed=false;
try{
 desktop=await _electron.launch({executablePath,args,acceptDownloads:true,timeout:30000});
 if(!process.env.GODOY_DESKTOP_APP)assert.equal(await desktop.evaluate(({app})=>app.isPackaged),true);
 page=await desktop.firstWindow({timeout:20000});page.setDefaultTimeout(20000);
 page.on('dialog',d=>d.accept().catch(()=>{}));const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>requests.push(r.url()));
 await page.locator('#build-pack').waitFor();assert.equal(page.url(),'godoy://app/index.html');
 await exerciseSelectionAdjustment(page,output);
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 await mkdir('.test-output',{recursive:true});
 await page.screenshot({path:'.test-output/desktop-adjustment-passed.png',timeout:5000});
 await writeFile('.test-output/desktop-adjustment-result.json',JSON.stringify({status:'passed',platform:process.platform,executable:executablePath,output,checks:['actual packaged executable','fresh isolated profile','selection/preview/cancel','editable masked layer','undo/redo','project reload','exact protected YTD pixels, transparency and detail']},null,2));
 console.log('PASS: actual desktop selection adjustment, independent profile, exact native YTD checks');
}catch(error){
 failed=true;
 if(process.env.GITHUB_ACTIONS)console.error('::error title=Packaged adjustment regression::'+String(error.stack??error.message).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A'));
 await mkdir('.test-output',{recursive:true});
 await page?.screenshot({path:'.test-output/desktop-adjustment-failed.png',timeout:5000}).catch(()=>{});
 await writeFile('.test-output/desktop-adjustment-result.json',JSON.stringify({status:'failed',error:String(error.stack??error.message),output},null,2));throw error;
}finally{
 if(desktop){
  const bounded=async(task,ms)=>{let timer;try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Desktop cleanup timed out')),ms);})]);}finally{clearTimeout(timer);}};
  await bounded(desktop.evaluate(({dialog})=>{dialog.showMessageBoxSync=()=>1;}),2000).catch(()=>{});
  try{await bounded(desktop.close(),8000);}catch(error){desktop.process().kill();if(!failed)throw error;}
 }
}
