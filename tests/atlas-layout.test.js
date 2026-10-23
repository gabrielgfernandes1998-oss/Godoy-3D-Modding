import test from 'node:test';
import assert from 'node:assert/strict';
import {initialLayout,validLayout} from '../src/atlas-layout.js';
test('manual atlas starts with full clothing resolution and a small accessory region',()=>{
 const layout=initialLayout({width:4096,regions:1},1);
 assert.deepEqual(layout.sources,[{x:0,y:0,width:4096,height:4096}]);
 assert.equal(layout.additions[0].width,512);assert(validLayout(layout));
});
test('manual atlas rejects out-of-bounds, noninteger and overlapping accessory areas',()=>{
 const layout=initialLayout({width:2048,regions:1},2);assert(validLayout(layout));
 layout.additions[1]={...layout.additions[0]};assert(!validLayout(layout));
 layout.additions.pop();layout.additions[0].x=2048;assert(!validLayout(layout));
 layout.additions[0].x=.5;assert(!validLayout(layout));
});

test('initial manual canvas matches original resolution instead of doubling it for OBJ',()=>{
 const layout=initialLayout({width:4096,regions:1,sourceWidth:2048,sourceHeight:2048,limit:4096},1);
 assert.equal(layout.size,2048);assert.equal(layout.sources[0].width,2048);
});
