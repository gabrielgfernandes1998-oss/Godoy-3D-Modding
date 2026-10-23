import assert from 'node:assert/strict';
export async function exerciseMeshHistory(page,mesh) {
  const coloredPixels=()=>mesh.locator('#viewport canvas').evaluate(canvas=>new Promise(resolve=>requestAnimationFrame(()=> {
    const gl=canvas.getContext('webgl2'),pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
    gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    let count=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+2]>pixels[i+1]*1.03&&Math.max(pixels[i],pixels[i+2])>160&&Math.min(pixels[i],pixels[i+2])>100)count++;
    resolve(count);
  })));
  const before=await coloredPixels();assert.ok(before>20,'Existing ped/model must be visible before OBJ import');
  await mesh.locator('#obj-file').setInputFiles({name:'regression.obj',mimeType:'text/plain',buffer:Buffer.from('o FarObject\nv 100 0 0\nv 101 0 0\nv 100 1 0\nvt 0 0\nvt 1 0\nvt 0 1\nf 1/1 2/2 3/3\n')});
  await mesh.locator('#status').filter({hasText:'OBJ adicionado'}).waitFor();
  const after=await coloredPixels();assert.ok(after>=before*.5,`OBJ import must preserve the visible scene (${before} -> ${after} colored pixels)`);
  const obj=mesh.locator('#tree button').filter({hasText:'regression.obj'});
  await page.click('[data-tab=mesh]');await page.keyboard.press('Control+z');await obj.waitFor({state:'detached'});
  assert.ok(await mesh.locator('#tree button').filter({hasText:'jbib_000_u.ydd'}).count());
  await page.keyboard.press('Control+y');await obj.waitFor();
  await obj.click();await mesh.locator('#position-x').fill('2');await mesh.locator('#apply-transform').click();
  assert.equal(Number(await mesh.locator('#position-x').inputValue()),2);
  await page.keyboard.press('Control+z');assert.equal(Number(await mesh.locator('#position-x').inputValue()),0);
  await page.keyboard.press('Control+Shift+z');assert.equal(Number(await mesh.locator('#position-x').inputValue()),2);
  await mesh.locator('#tree button').filter({hasText:'jbib_000_u.ydd'}).first().click();
  await mesh.locator('#advanced-mesh').evaluate(e=>e.open=true);
  await mesh.locator('#merge-source').selectOption({label:'regression.obj'});await mesh.locator('#merge').click();await obj.waitFor({state:'detached'});
  await page.keyboard.press('Control+z');await obj.waitFor();
  await page.keyboard.press('Control+y');await obj.waitFor({state:'detached'});
  // Restore the original scene so the rest of the suite can use it.
  await page.keyboard.press('Control+z');await page.keyboard.press('Control+z');await page.keyboard.press('Control+z');await obj.waitFor({state:'detached'});
}
