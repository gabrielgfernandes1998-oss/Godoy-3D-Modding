import {chromium} from 'playwright';import {createServer} from 'vite';import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:4264,strictPort:true}});await server.listen();let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage();await page.goto('http://127.0.0.1:4264/modules/clothing/index.html');
 const checks=await page.evaluate(async()=>{
  const {LayerDocument,canvas}=await import('/modules/clothing/src/editor/layers.js');
  const assert=(value,message)=>{if(!value)throw Error(message);},source=canvas(32,16),s=source.getContext('2d'),rgba=s.createImageData(32,16);
  for(let y=0;y<16;y++)for(let x=0;x<32;x++)rgba.data.set([80+x*4,65+x*3,50+x*2,y<8?255:128],(y*32+x)*4);
  s.putImageData(rgba,0,0);const d=LayerDocument.fromCanvas(source),out=canvas(32,16),clip=[[0,0,.5,0,0,1],[.5,0,.5,1,0,1]],settings={colorize:true,color:'#556b2f',strength:100,saturation:100,brightness:-10,contrast:15};
  const read=()=>{d.renderTo(out);return out.getContext('2d').getImageData(0,0,32,16).data;},original=read(),state=JSON.stringify(d.serialize());
  d.renderTo(out,{layer:{type:'adjustment',visible:true,opacity:100,clip,adjustment:settings}});
  const preview=out.getContext('2d').getImageData(0,0,32,16).data;assert(JSON.stringify(d.serialize())===state,'preview must not change document/history');
  for(let y=0;y<16;y++)for(let x=0;x<32;x++){let i=(y*32+x)*4;assert(preview[i+3]===original[i+3],'adjustment preserves semitransparent alpha');if(x>=16)for(let c=0;c<4;c++)assert(preview[i+c]===original[i+c],'unselected pixels remain exact');}
  const layer=d.add('adjustment',{clip,adjustment:settings});const applied=read();assert(applied.some((v,i)=>v!==original[i]),'real adjustment changes selected composite');assert(applied.every((v,i)=>v===preview[i]),'applied result equals preview');
  const baseBefore=d.layers[0].bitmap.toDataURL();assert(baseBefore===source.toDataURL(),'locked base image remains intact');
  const saved=d.serialize(),restored=await LayerDocument.deserialize(saved);restored.renderTo(out);assert(out.getContext('2d').getImageData(0,0,32,16).data.every((v,i)=>v===applied[i]),'saved adjustment renders identically');
  await d.undo();assert(read().every((v,i)=>v===original[i]),'one undo removes full adjustment');await d.redo();assert(read().every((v,i)=>v===applied[i]),'redo restores full adjustment');
  d.layers[0].bitmap.getContext('2d').fillStyle='#e0c090';d.layers[0].bitmap.getContext('2d').fillRect(0,0,8,8);d.changed(d.layers[0]);const updated=read();assert(updated[0]!==applied[0]||updated[1]!==applied[1],'adjustment responds to changes in layers below');
  d.activeId=d.layers.at(-1).id;d.update({visible:false});const hidden=read();assert(hidden[0]===224&&hidden[1]===192,'hiding adjustment reveals edited base');
  const invalid=structuredClone(saved);invalid.layers.at(-1).clip=null;let rejected=false;try{await LayerDocument.deserialize(invalid);}catch{rejected=true;}assert(rejected,'adjustment without UV mask rejected on project load');
  return ['preview isolation','outside UV pixel identity','alpha preservation','base unchanged','parameter persistence','undo/redo','dynamic lower layers','visibility toggle','mask validation'];
 });assert.equal(checks.length,9);console.log('PASS layer adjustment:',checks.join(', '));
}finally{await browser?.close();await server.close();}process.exit();
