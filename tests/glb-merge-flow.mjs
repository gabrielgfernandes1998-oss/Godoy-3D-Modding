import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {unzipSync} from 'fflate';
import {parseYdd} from '../modules/vehicles/src/formats/ydd.js';
import {parseYtd} from '../modules/vehicles/src/formats/ytd.js';
import {assertYddRuntimeHeaders,assertYddLodCounts} from '../src/ydd-runtime.js';
export async function exerciseGlbMerge(page,output,{stub=false,desktop=null}={}){
 await page.locator('[data-tab=mesh]').click();await page.frameLocator('#mesh iframe').locator('#obj-file').waitFor({state:'attached'});
 if(stub)await page.evaluate(()=>{window.godoyNative.exportYdd=async request=>({width:2048,height:2048,regions:1,materials:1,columns:1,divisor:1,sourceWidth:4,sourceHeight:4,sourceNames:['original_diffuse'],reduced:false,fits:true,limit:4096,additionRegions:request.additions.map(()=>0)});});
 const frame=page.frames().find(f=>f.url().endsWith('/mesh.html'));
 // The previous mesh test intentionally leaves an edited scene. Electron uses
 // a native dialog here, which page.on('dialog') cannot accept. Discard only
 // this isolated test scene, and restore the real dialog before the new flow.
 if(desktop)await desktop.evaluate(({dialog})=>{globalThis.__glbMergeDialog=dialog.showMessageBoxSync;dialog.showMessageBoxSync=()=>1;});
 try{await frame.goto(frame.url());}finally{if(desktop)await desktop.evaluate(({dialog})=>{dialog.showMessageBoxSync=globalThis.__glbMergeDialog;delete globalThis.__glbMergeDialog;});}
 const f=page.frameLocator('#mesh iframe');
 assert.match(await f.locator('#obj-file').getAttribute('accept'),/\.glb/);
 await f.locator('#mesh-file').setInputFiles('tests/fixtures/native-clothing.ydd');await f.locator('#status').filter({hasText:'native-clothing.ydd carregado'}).waitFor();
 await f.locator('#obj-file').setInputFiles('tests/fixtures/merge-materials.glb');await f.locator('#status').filter({hasText:'GLB com materiais importado'}).waitFor({timeout:120000});
 await f.locator('#merge-target').selectOption({label:'native-clothing.ydd'});await f.locator('#merge-source').selectOption({label:'merge-materials.glb'});await f.locator('#merge').click();
 await f.locator('#tree button').filter({hasText:'merge-materials.glb'}).waitFor({state:'detached'});
 await f.locator('#undo').click();await f.locator('#tree button').filter({hasText:'merge-materials.glb'}).waitFor();await f.locator('#redo').click();await f.locator('#tree button').filter({hasText:'merge-materials.glb'}).waitFor({state:'detached'});
 await f.locator('#ytd-file').setInputFiles('tests/fixtures/native-clothing.ytd');await f.locator('#ytd-status').filter({hasText:'native-clothing.ytd'}).waitFor();
 await f.locator('#export-ydd').click();await f.locator('#uv-layout-canvas').waitFor({timeout:120000});
 assert.equal(await f.locator('#uv-region option').count(),2,'all GLB chunks share one region');assert.match(await f.locator('#uv-region option').nth(1).textContent(),/GLB/);
 assert.equal(await f.locator('#uv-confirm').isDisabled(),false);assert.equal(await f.locator('#uv-original').isDisabled(),true);
 const colors=await f.locator('#uv-layout-canvas').evaluate(c=>{const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data,counts=[0,0,0];for(let i=0;i<pixels.length;i+=4)for(let k=0;k<3;k++)if(pixels[i+k]>180&&pixels[i+(k+1)%3]<70&&pixels[i+(k+2)%3]<70)counts[k]++;return counts;});
 await page.screenshot({path:'.test-output/glb-merge-atlas.png',fullPage:true});assert.ok(colors.every(n=>n>5),'atlas preview contains the GLB red, green and blue materials: '+JSON.stringify(colors));
 const originalX=await f.locator('#uv-x').inputValue(),originalY=await f.locator('#uv-y').inputValue();for(const axis of ['x','y']){await f.locator('#uv-'+axis).fill('0');await f.locator('#uv-'+axis).dispatchEvent('change');}assert.equal(await f.locator('#uv-confirm').isDisabled(),true,'GLB cannot overwrite the clothing region');await f.locator('#uv-x').fill(originalX);await f.locator('#uv-x').dispatchEvent('change');await f.locator('#uv-y').fill(originalY);await f.locator('#uv-y').dispatchEvent('change');
 await page.screenshot({path:'.test-output/glb-merge-atlas.png',fullPage:true});
 if(stub){await f.locator('#uv-cancel').click();return;}
 const pending=page.waitForEvent('download',{timeout:240000});await f.locator('#uv-confirm').click();const download=await pending,target=path.join(output,'glb-merged.zip');await download.saveAs(target);
 const files=unzipSync(await readFile(target)),doc=parseYdd(files['native-clothing.ydd']),dictionary=parseYtd(files['native-clothing.ytd']),plan=JSON.parse(new TextDecoder().decode(files['atlas-info.json']));
 assertYddRuntimeHeaders(doc);assertYddLodCounts(doc);assert.equal(dictionary.textures.length,1);assert.equal(doc.drawables[0].shaders[0].diffuseName,dictionary.textures[0].name);assert.equal(plan.additionRects.length,1);assert.deepEqual(plan.additionRegions,[0,0,0]);
 const texture=dictionary.textures[0],pixels=texture.decode(),counts=[0,0,0],r=plan.additionRects[0];
 for(let y=r.y;y<r.y+r.height;y++)for(let x=r.x;x<r.x+r.width;x++){const i=(y*texture.width+x)*4;for(let k=0;k<3;k++)if(pixels[i+k]>180&&pixels[i+(k+1)%3]<70&&pixels[i+(k+2)%3]<70)counts[k]++;}
 assert.ok(counts.every(n=>n>10),'final YTD retains GLB red, green and blue');
 const original=parseYdd(await readFile('tests/fixtures/native-clothing.ydd'));
 for(let lod=0;lod<doc.drawables[0].lods.length;lod++){
  const gs=doc.drawables[0].readLod(lod);assert.equal(gs.length,4,'original plus three GLB geometries present in every LOD');assert.deepEqual(gs[0].positions,original.drawables[0].readLod(lod)[0].positions);
  for(const g of gs.slice(1))for(let i=0;i<g.uvs.length;i+=2){const x=g.uvs[i]*texture.width,y=(1-g.uvs[i+1])*texture.height;assert.ok(x>=r.x-.01&&x<=r.x+r.width+.01&&y>=r.y-.01&&y<=r.y+r.height+.01);}
 }
 console.log('GLB mesh union: imported textures, undo/redo, separate shared UV area and real native YDD+YTD export PASS');
}
