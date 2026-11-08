import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAdjustment,adjustRgba} from '../modules/clothing/src/editor/color-adjustment.js';

const light = (bytes, i = 0) => .2126 * bytes[i] + .7152 * bytes[i + 1] + .0722 * bytes[i + 2];
const apply = (bytes, settings) => adjustRgba(new Uint8ClampedArray(bytes), settings);

test('colour adjustment normalizes saved/UI settings without mutating the input', () => {
  assert.deepEqual(normalizeAdjustment(), {colorize:true,color:'#556b2f',strength:100,saturation:100,brightness:0,contrast:0});
  const source={colorize:false,color:'#A1B2C3',strength:500,saturation:-1,brightness:'25',contrast:Infinity};
  assert.deepEqual(normalizeAdjustment(source), {colorize:false,color:'#a1b2c3',strength:100,saturation:0,brightness:25,contrast:0});
  assert.equal(source.color,'#A1B2C3');
  assert.deepEqual(normalizeAdjustment(null),normalizeAdjustment());
  assert.equal(normalizeAdjustment({brightness:null}).brightness,0);
  assert.equal(normalizeAdjustment({strength:''}).strength,100);
  assert.equal(normalizeAdjustment({color:'url(example)'}).color,'#556b2f');
});

test('zero strength and neutral non-colourized adjustments retain every RGBA byte', () => {
  const original=new Uint8ClampedArray([19,144,251,100,255,255,255,255,0,0,0,17,87,54,32,0]);
  assert.deepEqual(apply(original,{strength:0,brightness:100,contrast:-100,saturation:200}),original);
  assert.deepEqual(apply(original,{colorize:false}),original);
  const input=original.slice();assert.equal(adjustRgba(input,{strength:0}),input,'the function edits the provided buffer in place');
  assert.throws(()=>adjustRgba([1,2,3,4]),/RGBA/);
  assert.throws(()=>adjustRgba(new Uint8ClampedArray(3)),/RGBA/);
});

test('colourizing preserves the engraving and cloth gradient, luminance ordering, and alpha', () => {
  const values=[0,15,35,65,100,145,190,225,250,255];
  const source=new Uint8ClampedArray(values.flatMap((v,i)=>[v,v,v,i===0?128:255]));
  const result=apply(source,{color:'#556b2f'});
  assert.ok(result[4+1]>result[4]&&result[4]>result[4+2],'olive hue is present in the coloured shading');
  const distinct=new Set();
  for(let i=0;i<result.length;i+=4){
    assert.ok(Math.abs(light(result,i)-values[i/4])<=1,'a chosen dark colour retains the source light/dark detail');
    if(i)assert.ok(light(result,i)>light(result,i-4),'engraving and highlights retain their order');
    assert.equal(result[i+3],source[i+3]);distinct.add([...result.slice(i,i+3)].join(','));
  }
  assert.equal(distinct.size,values.length,'the effect is not a solid fill');
  assert.deepEqual([...result.slice(0,3)],[0,0,0]);assert.deepEqual([...result.slice(-4,-1)],[255,255,255]);
});

test('colourization keeps coloured source luminance, gamut and hidden alpha data intact', () => {
  const source=new Uint8ClampedArray([200,40,20,255,15,180,230,81,200,210,20,1,99,17,242,0]);
  for(const color of ['#ff0000','#00ff00','#0000ff','#000000','#ffffff']){
    const result=apply(source,{color,saturation:200});
    for(let i=0;i<12;i+=4){assert.ok(Math.abs(light(result,i)-light(source,i))<=1);assert.equal(result[i+3],source[i+3]);}
    assert.deepEqual(result.slice(12),source.slice(12));
  }
});

test('brightness, contrast and saturation adjust detail independently of the chosen hue', () => {
  const source=[70,70,70,255,130,130,130,255,190,190,190,255];
  const bright=apply(source,{colorize:false,brightness:20}),dark=apply(source,{colorize:false,brightness:-20});
  assert.ok(light(bright)>70&&light(dark)<70);
  const strong=apply(source,{colorize:false,contrast:50}),soft=apply(source,{colorize:false,contrast:-50});
  assert.ok(light(strong,8)-light(strong)>120);assert.ok(light(soft,8)-light(soft)<120);
  const flat=apply([190,40,70,255,15,210,65,82],{color:'#556b2f',contrast:-100});
  assert.deepEqual([...flat.slice(0,3)],[128,128,128]);assert.deepEqual([...flat.slice(4,7)],[128,128,128]);assert.equal(flat[7],82);
  assert.deepEqual([...apply([90,170,210,255],{color:'#556b2f',saturation:0}).slice(0,3)].filter((v,_,a)=>v!==a[0]),[]);
  assert.deepEqual([...apply(source,{brightness:100})].filter((_,i)=>i%4!==3),Array(9).fill(255));
  assert.deepEqual([...apply(source,{brightness:-100})].filter((_,i)=>i%4!==3),Array(9).fill(0));
});
