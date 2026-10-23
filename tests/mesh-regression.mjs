import assert from 'node:assert/strict';
export async function exerciseMeshHistory(page,mesh) {
  const coloredPixels=()=>mesh.locator('#viewport canvas').evaluate(canvas=>new Promise(resolve=>requestAnimationFrame(()=> {
    const gl=canvas.getContext('webgl2'),pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
    gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    let count=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+2]>pixels[i+1]*1.03&&Math.max(pixels[i],pixels[i+2])>160&&Math.min(pixels[i],pixels[i+2])>100)count++;
    resolve(count);
  })));
  const before=await coloredPixels();assert.ok(before>20,'Existing ped/model must be visible before OBJ import');
  await mesh.locator('#obj-file').setInputFiles({name:'regression.obj',mimeType:'text/plain',buffer:Buffer.from('o FarObject\nv 1000 -370 -473\nv 1001 -370 -473\nv 1000 -369 -473\nvt 0 0\nvt 1 0\nvt 0 1\nf 1/1 2/2 3/3\n')});
  await mesh.locator('#status').filter({hasText:'OBJ adicionado'}).waitFor();
  const after=await coloredPixels();assert.ok(after>20,`YDD/ped must remain visible after remote-origin OBJ placement (${before} -> ${after})`);
  const obj=mesh.locator('#tree button').filter({hasText:'regression.obj'});
  await page.click('[data-tab=mesh]');await page.keyboard.press('Control+z');await obj.waitFor({state:'detached'});
  assert.ok(await mesh.locator('#tree button').filter({hasText:'jbib_000_u.ydd'}).count());
  await page.keyboard.press('Control+y');await obj.waitFor();
  await obj.click();await mesh.locator('#focus').click();
  assert.ok(await coloredPixels()>20,'Context focus must retain YDD/ped');
  const initialX=Number(await mesh.locator('#position-x').inputValue()),initialY=Number(await mesh.locator('#position-y').inputValue());
  await dragGizmo(page,mesh);
  assert.ok(await coloredPixels()>20,'Dragging OBJ must keep the YDD/ped visible');
  await page.click('[data-tab=mesh]');await page.keyboard.press('Control+z');
  await waitForValue(mesh.locator('#position-y'),initialY);
  await mesh.locator('#align-selection').click();
  await page.click('[data-tab=mesh]');await page.keyboard.press('Control+z');
  await waitForValue(mesh.locator('#position-x'),initialX);
  const changedX=Number((initialX+.2).toFixed(4));
  await mesh.locator('#position-x').fill(String(changedX));await mesh.locator('#apply-transform').click();
  assert.equal(Number(await mesh.locator('#position-x').inputValue()),changedX);
  await page.keyboard.press('Control+z');await waitForValue(mesh.locator('#position-x'),initialX);
  await page.keyboard.press('Control+Shift+z');await waitForValue(mesh.locator('#position-x'),changedX);
  await mesh.locator('#tree button').filter({hasText:'jbib_000_u.ydd'}).first().click();
  await mesh.locator('#advanced-mesh').evaluate(e=>e.open=true);
  await mesh.locator('#merge-source').selectOption({label:'regression.obj'});await mesh.locator('#merge').click();await obj.waitFor({state:'detached'});
  await page.keyboard.press('Control+z');await obj.waitFor();
  await page.keyboard.press('Control+y');await obj.waitFor({state:'detached'});
  // Restore the original scene so the rest of the suite can use it.
  await page.keyboard.press('Control+z');await page.keyboard.press('Control+z');await page.keyboard.press('Control+z');await obj.waitFor({state:'detached'});
  await mesh.locator('#attachment-bone').selectOption('pelvis');
  await page.click('[data-tab=mesh]');await page.keyboard.press('Control+z');
  await mesh.locator('#attachment-bone option[value=preserve]:checked').waitFor({state:'attached'});
  await page.keyboard.press('Control+y');
  await mesh.locator('#attachment-bone option[value=pelvis]:checked').waitFor({state:'attached'});
  await page.keyboard.press('Control+z');
  await mesh.locator('#attachment-bone option[value=preserve]:checked').waitFor({state:'attached'});

}

async function waitForValue(locator,value) {
 await locator.evaluate((input,value)=>new Promise((resolve,reject)=>{
  const deadline=performance.now()+5000;
  const tick=()=>{if(Math.abs(Number(input.value)-value)<1e-4)resolve();else if(performance.now()>deadline)reject(Error('Transform undo did not restore the original value'));else requestAnimationFrame(tick);};tick();
 }),value);
}
async function dragGizmo(page,mesh) {
 const before=await mesh.locator('#position-y').inputValue();
 const handle=await mesh.locator('#viewport canvas').evaluate(canvas=>new Promise(resolve=>requestAnimationFrame(()=>{
  const gl=canvas.getContext('webgl2'),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,pixels=new Uint8Array(w*h*4),points=[];
  gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(pixels[i+1]>150&&pixels[i+1]>pixels[i]*1.8&&pixels[i+1]>pixels[i+2]*1.8)points.push([x,h-1-y]);}
  if(!points.length){resolve(null);return;}
  const top=Math.min(...points.map(p=>p[1])),bottom=Math.max(...points.map(p=>p[1]));
  const tip=points.filter(p=>p[1]>=top+2&&p[1]<=top+Math.max(5,(bottom-top)*.2));
  const box=canvas.getBoundingClientRect();resolve({x:tip.reduce((s,p)=>s+p[0],0)/tip.length*box.width/w,y:tip.reduce((s,p)=>s+p[1],0)/tip.length*box.height/h});
 })));
 assert.ok(handle&&Number.isFinite(handle.x),'OBJ gizmo must be visible beside the YDD');
 const canvas=await mesh.locator('#viewport canvas').boundingBox();handle.x+=canvas.x;handle.y+=canvas.y;
 await page.mouse.move(handle.x,handle.y);await page.mouse.down();await page.mouse.move(handle.x,handle.y-45,{steps:12});await page.mouse.up();
 assert.notEqual(await mesh.locator('#position-y').inputValue(),before,'Dragging the visible OBJ gizmo must change its position');
}
