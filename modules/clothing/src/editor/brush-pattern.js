// Seamless, deterministic diffuse patterns; coordinates stay anchored in texture space.
export function patternPixels(kind, color, size=64, strength=45) {
  const data=new Uint8ClampedArray(size*size*4),rgb=color.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16));
  const noise=(x,y)=>{let n=Math.imul(x+31,374761393)^Math.imul(y+73,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const grain=noise(x,y)-.5;let relief=0;
    if(kind==='leather') relief=grain*.45+Math.sin(x*Math.PI*2/size*8+Math.sin(y*Math.PI*2/size*5)*2)*.12;
    if(kind==='fabric'||kind==='ripstop') relief=(Math.cos(x*Math.PI/2)+Math.cos(y*Math.PI/2))*.12+grain*.16;
    if(kind==='ripstop') relief+=(x%32<2||y%32<2)?-.35:(x%32===2||y%32===2)?.2:0;
    const i=(y*size+x)*4,amount=strength/100;
    for(let c=0;c<3;c++)data[i+c]=Math.max(0,Math.min(255,rgb[c]+relief*150*amount));data[i+3]=255;
  }
  return data;
}
