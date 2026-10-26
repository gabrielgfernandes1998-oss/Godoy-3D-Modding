const cache=new WeakMap();
export function uvRegionBounds(geometry,width,height){
 const uv=geometry.attributes?.uv;if(!uv)return null;let entry=cache.get(geometry);
 if(!entry||entry.uv!==uv||entry.version!==uv.version){let minU=1,minV=1,maxU=0,maxV=0,valid=true;for(let i=0;i<uv.count;i++){const u=uv.getX(i),v=uv.getY(i);if(!Number.isFinite(u)||!Number.isFinite(v)||u<0||u>1||v<0||v>1){valid=false;break;}minU=Math.min(minU,u);minV=Math.min(minV,v);maxU=Math.max(maxU,u);maxV=Math.max(maxV,v);}entry={uv,version:uv.version,bounds:valid&&maxU>minU&&maxV>minV?[minU,1-maxV,maxU-minU,maxV-minV]:null};cache.set(geometry,entry);}
 return entry.bounds?{x:entry.bounds[0]*width,y:entry.bounds[1]*height,width:entry.bounds[2]*width,height:entry.bounds[3]*height}:null;
}
