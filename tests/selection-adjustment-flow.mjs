import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {makeResource,makeYdd} from '../modules/vehicles/tests/fixtures.js';
import {openResource,jenkins} from '../modules/vehicles/src/formats/resource.js';
import {parseYtd} from '../modules/vehicles/src/formats/ytd.js';

// Original tiny fixtures: two disconnected UV triangles and a lossless image
// containing lighter cloth, dark engraved lines and a translucent selected pixel.
function fixtures(){
 const dimension=32,rgba=new Uint8Array(dimension*dimension*4);
 for(let y=0;y<dimension;y++)for(let x=0;x<dimension;x++){
  const dark=x%8===3||x%8===4,shade=(y%4)*2;
  rgba.set(dark?[95+shade,80+shade,60+shade,255]:[190+shade,165+shade,125+shade,255],(y*dimension+x)*4);
 }
 rgba[(10*dimension+6)*4+3]=128;
 rgba.fill(0,(dimension*dimension-1)*4);
 const ytd=makeResource(13,({data,u8,u16,u32,ptr,text,systemSize})=>{
  ptr(0x20,0x100);u16(0x28,1);u16(0x2a,1);u32(0x100,jenkins('cloth_diffuse'));
  ptr(0x30,0x180);u16(0x38,1);u16(0x3a,1);ptr(0x180,0x200);
  ptr(0x228,0x800);text(0x800,'cloth_diffuse');u16(0x250,dimension);u16(0x252,dimension);u16(0x254,1);u16(0x256,dimension*4);u32(0x258,21);u8(0x25d,1);ptr(0x270,0,true);
  for(let i=0;i<rgba.length;i+=4)data.set([rgba[i+2],rgba[i+1],rgba[i],rgba[i+3]],systemSize+i);
 });
 const source=openResource(makeYdd(),165);
 const ydd=makeResource(165,({data,u16,u32,f32,systemSize})=>{
  data.set(source.data);
  u32(0x458,6);u32(0x45c,2);u16(0x460,6);u32(0x518,6);u32(0x588,6);
  const vertices=[[-1,0,0,0,-1,0,0,0],[-.1,0,0,0,-1,0,.48,0],[-1,0,2,0,-1,0,0,1],[.1,0,0,0,-1,0,.6,0],[1,0,0,0,-1,0,1,0],[1,0,2,0,-1,0,1,1]];
  vertices.forEach((v,i)=>v.forEach((n,j)=>f32(systemSize+i*32+j*4,n)));for(let i=0;i<6;i++)u16(systemSize+0x100+i*2,i);
 });
 return {ydd,ytd,rgba,dimension};
}

async function thumbnail(frame){return frame.locator('#map').evaluate(c=>({width:c.width,height:c.height,pixels:Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data),visibility:document.visibilityState}));}
function thumbnailDifference(actual,expected){
 if(!actual)return {actual:'unavailable',expectedSize:[expected.width,expected.height]};
 let changedChannels=0,significantChangedChannels=0,toleratedChannels=0,maxDelta=0,firstDifference=null;
 if(actual.width===expected.width&&actual.height===expected.height)for(let i=0;i<actual.pixels.length;i++){
  const delta=Math.abs(actual.pixels[i]-expected.pixels[i]);if(!delta)continue;
  changedChannels++;maxDelta=Math.max(maxDelta,delta);
  const alphaIndex=i-i%4+3,alpha=expected.pixels[alphaIndex];
  // Chromium and Electron reproduced 7/409600 one-level RGB differences when
  // magnifying our translucent source pixel. Only that resampling case is
  // tolerated: opaque RGB, thumbnail alpha and native YTD checks stay exact.
  const tolerated=i%4!==3&&alpha>0&&alpha<255&&actual.pixels[alphaIndex]===alpha&&delta<=1;
  if(tolerated)toleratedChannels++;else significantChangedChannels++;
  firstDifference??={x:Math.floor(i/4)%actual.width,y:Math.floor(i/4/actual.width),channel:i%4,actual:actual.pixels[i],expected:expected.pixels[i],actualRgba:actual.pixels.slice(i-i%4,i-i%4+4),expectedRgba:expected.pixels.slice(i-i%4,i-i%4+4)};
 }
 return {actualSize:[actual.width,actual.height],expectedSize:[expected.width,expected.height],visibility:actual.visibility,changedChannels,significantChangedChannels,toleratedChannels,maxDelta,firstDifference};
}
async function waitThumbnail(frame,expected,different=false){
 // Poll from Node instead of placing the deadline inside requestAnimationFrame:
 // Electron can throttle an iframe's animation callbacks while a dialog closes.
 // Compare actual pixels, not PNG encodings; see the narrow translucent-only
 // thumbnail allowance above. All final native texture assertions are exact.
 const deadline=Date.now()+8000;let actual=null,lastError=null;
 while(Date.now()<deadline){
  let timer;
  try{
   actual=await Promise.race([thumbnail(frame),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Canvas read did not respond within 2 seconds')),2000);})]);
   lastError=null;
   const difference=thumbnailDifference(actual,expected),match=actual.width===expected.width&&actual.height===expected.height&&difference.significantChangedChannels===0;
   if(different?!match:match)return;
  }catch(error){lastError=error.message;}finally{clearTimeout(timer);}
  await new Promise(resolve=>setTimeout(resolve,80));
 }
 throw Error((different?'Adjustment preview did not change the texture':'Adjustment did not restore the expected texture')+': '+JSON.stringify({...thumbnailDifference(actual,expected),lastError}));
}
async function setRange(frame,id,value){await frame.locator(id).fill(String(value));await frame.locator(id).dispatchEvent('input');}

export async function exerciseSelectionAdjustment(page,output){
 const own=fixtures(),upload=(name,bytes)=>({name,mimeType:'application/octet-stream',buffer:Buffer.from(bytes)});
 await page.locator('[data-tab=clothing]').click();const f=page.frameLocator('#clothing iframe');
 await f.locator('#batch-files').setInputFiles([upload('accs_000_u.ydd',own.ydd),upload('accs_diff_000_a_uni.ytd',own.ytd)]);
 await f.locator('#batch-status').filter({hasText:'YTD associado'}).waitFor();await f.locator('#texture-name').filter({hasText:'cloth_diffuse'}).waitFor();
 assert.equal(await f.locator('#adjust-selection').isDisabled(),true,'an adjustment requires an explicit UV island');
 const saveProject=async name=>{const pending=page.waitForEvent('download');await f.locator('#save-project').click();const file=path.join(output,name);await (await pending).saveAs(file);return {file,project:JSON.parse(await readFile(file,'utf8'))};};
 const beforeProject=await saveProject('selection-adjustment-before.godoycloth'),before=await thumbnail(f);
 await f.locator('#tab-uv').click();await f.locator('[data-tool=island]').click();
 const box=await f.locator('#uv-view').boundingBox(),side=Math.min(box.width,box.height);
 await page.mouse.click(box.x+(box.width-side)/2+side*.12,box.y+(box.height-side)/2+side*.2);
 await f.locator('#selection-info').filter({hasText:'selecionad'}).waitFor();assert.equal(await f.locator('#adjust-selection').isDisabled(),false);

 await f.locator('#adjust-selection').click();await f.locator('#selection-adjustment-dialog').waitFor();
 await f.locator('#adjust-color').fill('#2f5c30');await f.locator('#adjust-color').dispatchEvent('input');
 await setRange(f,'#adjust-brightness',-8);await setRange(f,'#adjust-contrast',12);
 await waitThumbnail(f,before,true);
 await f.locator('#adjust-preview').uncheck();await waitThumbnail(f,before);
 await f.locator('#adjust-preview').check();await waitThumbnail(f,before,true);
 await f.locator('#adjust-cancel').click();await f.locator('#selection-adjustment-dialog').waitFor({state:'detached'});await waitThumbnail(f,before);

 await f.locator('#adjust-selection').click();await f.locator('#adjust-color').fill('#2f5c30');await f.locator('#adjust-color').dispatchEvent('input');
 await setRange(f,'#adjust-brightness',-8);await setRange(f,'#adjust-contrast',12);await f.locator('#adjust-apply').click();
 await f.locator('#selection-adjustment-dialog').waitFor({state:'detached'});await waitThumbnail(f,before,true);const applied=await thumbnail(f);
 await f.locator('#undo').click();await waitThumbnail(f,before);await f.locator('#redo').click();await waitThumbnail(f,applied);
 // The adjustment keeps its own selected island after the current selection is cleared.
 await f.locator('#clear-selection').click();assert.equal(await f.locator('#adjust-selection').isDisabled(),true);assert.equal(await f.locator('#edit-adjustment').isDisabled(),false);
 await f.locator('#edit-adjustment').click();assert.equal(await f.locator('#adjust-color').inputValue(),'#2f5c30');assert.equal(await f.locator('#adjust-brightness').inputValue(),'-8');
 await f.locator('#adjust-color').fill('#2039a5');await f.locator('#adjust-color').dispatchEvent('input');await waitThumbnail(f,applied,true);
 await f.locator('#adjust-cancel').click();await waitThumbnail(f,applied);

 const saved=await saveProject('selection-adjustment.godoycloth'),adjustments=saved.project.layers.layers.filter(l=>l.type==='adjustment');
 assert.equal(adjustments.length,1);assert.equal(adjustments[0].adjustment.color,'#2f5c30');assert.equal(adjustments[0].adjustment.brightness,-8);assert.equal(adjustments[0].adjustment.contrast,12);assert.ok(adjustments[0].clip?.length);
 assert.equal(saved.project.layers.layers[0].data,beforeProject.project.layers.layers[0].data,'base texture pixels remain intact under the adjustment');
 assert.equal(saved.project.layers.layers[0].locked,true,'base stays locked');
 await f.locator('#model-file').setInputFiles(saved.file);await f.locator('#toast').filter({hasText:'Projeto restaurado'}).waitFor();await waitThumbnail(f,applied);
 await f.locator('#edit-adjustment').click();assert.equal(await f.locator('#adjust-color').inputValue(),'#2f5c30');await f.locator('#adjust-cancel').click();

 const pending=page.waitForEvent('download');await f.locator('#export-native').click();const target=path.join(output,'selection-adjusted.ytd');await (await pending).saveAs(target);
 const after=parseYtd(await readFile(target)).textures[0].decode(),original=own.rgba,w=own.dimension;
 let changed=0;
 for(let y=0;y<w;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4;assert.equal(after[i+3],original[i+3],'the adjustment preserves texture transparency');
  if(x>=17)assert.deepEqual(Array.from(after.slice(i,i+4)),Array.from(original.slice(i,i+4)),'other UV island and all pixels on the right stay unchanged');
  if(after[i]!==original[i]||after[i+1]!==original[i+1]||after[i+2]!==original[i+2])changed++;
 }
 assert.ok(changed>40,'selected UV island is recoloured');
 const pixel=(x,y)=>Array.from(after.slice((y*w+x)*4,(y*w+x)*4+4)),light=pixel(7,8),engraving=pixel(3,8);
 assert.ok(light[1]>light[0]&&engraving[1]>engraving[0],'new green hue appears on light and engraved surfaces');
 assert.ok(light[0]+light[1]+light[2]>engraving[0]+engraving[1]+engraving[2]+80,'dark engraved drawing remains darker than cloth');
 await page.screenshot({path:'.test-output/selection-adjustment.png',fullPage:true});
 console.log('Selected UV adjustment: live comparison/cancel, editable masked layer, undo/redo, project reload and lossless YTD export with protected other island/detail/alpha PASS');
}
