import test from 'node:test';
import assert from 'node:assert/strict';
import {RepeatWrapping,SRGBColorSpace} from 'three';
import {previewDiffuse,previewTexture} from '../src/preview-textures.js';

test('preview selects the variation dictionary before the embedded source',()=>{
 const embedded={name:'original',supported:true},variation={name:'hand_diff_006_b_uni',supported:true};
 const drawable={shaders:[{diffuseName:'ORIGINAL'}],textures:[embedded]};
 assert.equal(previewDiffuse(drawable,0,{textures:[variation]}),variation);
 assert.equal(previewDiffuse(drawable,0,null),embedded);
 assert.equal(previewDiffuse(drawable,0,{textures:[variation,{name:'original',supported:true}]}).name,'original');
});
test('preview repeats out-of-range UVs instead of stretching edge pixels',()=>{
 const oldDocument=globalThis.document,oldImageData=globalThis.ImageData;
 try {
 globalThis.document={createElement:()=>({getContext:()=>({putImageData(){}})})};
 globalThis.ImageData=class {constructor(data,width,height){Object.assign(this,{data,width,height});}};
 const map=previewTexture({supported:true,width:1,height:1,decode:()=>new Uint8ClampedArray([20,40,60,255])});
 assert.equal(map.wrapS,RepeatWrapping);assert.equal(map.wrapT,RepeatWrapping);assert.equal(map.colorSpace,SRGBColorSpace);map.dispose();
 }finally{globalThis.document=oldDocument;globalThis.ImageData=oldImageData;}
});
