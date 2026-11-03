import test from 'node:test';
import assert from 'node:assert/strict';
import {initialLayout,validLayout,automaticLayout,additionGroups} from '../src/atlas-layout.js';
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
test('GLB shares its region between chunks and cannot overwrite the clothing texture',()=>{
 const parts=[{textureIndex:0},{textureIndex:0},{},{textureIndex:1}],plan={width:2048,regions:1,columns:1,sourceWidth:512,sourceHeight:512,divisor:1,additionRegions:[0,0,1,2]};
 const groups=additionGroups(plan,parts);assert.equal(groups.length,3);assert.equal(groups[0].parts.length,2);
 const layout=automaticLayout(plan,groups.length);assert(validLayout(layout,{separate:true}));
 layout.sources[0]={x:0,y:0,width:2048,height:2048};assert(!validLayout(layout,{separate:true}));assert(validLayout(layout),'legacy manual OBJ mode retains deliberate overwrite');
});
