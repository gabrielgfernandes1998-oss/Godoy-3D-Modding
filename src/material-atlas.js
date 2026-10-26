// Coordinates are native top-left UVs; preview coordinates are Y-flipped.
export function atlasLayout(materials,size){
 if(![512,1024,2048,4096].includes(size))throw Error('Resolução do atlas inválida.');
 const pad=Math.max(4,Math.round(size/512));
 const dims=materials.map((m,i)=>({i,w:m.paintWidth??(m.image?Math.max(4,Math.ceil(m.image.width*(m.bounds[2]-m.bounds[0]))):1024),h:m.paintHeight??(m.image?Math.max(4,Math.ceil(m.image.height*(m.bounds[3]-m.bounds[1]))):1024)}));
 function pack(scale){const rows=[],rects=[];let bottom=0;for(const d of [...dims].sort((a,b)=>b.h-a.h||b.w-a.w||a.i-b.i)){const w=Math.max(4,Math.floor(d.w*scale)),h=Math.max(4,Math.floor(d.h*scale)),outerW=w+pad*2,outerH=h+pad*2;if(outerW>size)return null;let row=rows.filter(r=>r.height>=outerH&&r.x+outerW<=size).sort((a,b)=>(size-a.x-outerW)-(size-b.x-outerW))[0];if(!row){if(bottom+outerH>size)return null;row={x:0,y:bottom,height:outerH};rows.push(row);bottom+=outerH;}rects[d.i]={x:row.x+pad,y:row.y+pad,width:w,height:h,padding:pad};row.x+=outerW;}return rects;}

 let scale=1,rects=pack(scale);if(!rects){let lo=0,hi=1;for(let i=0;i<25;i++){const mid=(lo+hi)/2;if(pack(mid))lo=mid;else hi=mid;}scale=lo;rects=pack(scale);}if(!rects)throw Error('Os materiais não cabem neste atlas. Use uma resolução maior.');
 return {size,rects,reduced:scale<.999,scale};
}
export function recommendedAtlasSize(materials){for(const size of [512,1024,2048,4096])if(!atlasLayout(materials,size).reduced)return size;return 4096;}
export function applyAtlasUv(object,layout,mode='materials'){
 const materials=object.userData.materialAtlas.materials,counters=new Map();let face=0;const grid=Math.ceil(Math.sqrt(object.userData.converter.triangles));
 object.traverse(mesh=>{if(!mesh.isMesh)return;const id=mesh.userData.converterMaterial,m=materials[id],rect=layout.rects[id],base=mesh.userData.converterOriginalUv,count=mesh.geometry.attributes.position.count,uv=new Float32Array(count*2),localGrid=Math.ceil(Math.sqrt(m.triangles));let local=counters.get(id)??0;
  for(let i=0;i<count;i+=3,face++,local++)for(let c=0;c<3;c++){
   let u,v;if(mode==='triangles'||m.flat||!m.image){const corners=[[.08,.08],[.92,.08],[.08,.92]],f=mode==='triangles'?face:local,g=mode==='triangles'?grid:localGrid;u=(f%g+corners[c][0])/g;v=(Math.floor(f/g)+corners[c][1])/g;if(mode==='triangles'){uv[(i+c)*2]=u;uv[(i+c)*2+1]=1-v;continue;}}
   else{u=(base.getX(i+c)-m.bounds[0])/(m.bounds[2]-m.bounds[0]);v=(1-base.getY(i+c)-m.bounds[1])/(m.bounds[3]-m.bounds[1]);}
   uv[(i+c)*2]=(rect.x+u*rect.width)/layout.size;uv[(i+c)*2+1]=1-(rect.y+v*rect.height)/layout.size;
  }counters.set(id,local);const Attribute=mesh.geometry.attributes.position.constructor; // Float32 attributes have the standard constructor.
  mesh.geometry.setAttribute('uv',new Attribute(uv,2));
 });
}
const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const srgb=v=>v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055;
function wrap(v,mode){if(mode===1001)return Math.max(0,Math.min(1,v));if(mode===1002){v=((v%2)+2)%2;return v>1?2-v:v;}return ((v%1)+1)%1;}
export function materialSampler(material){
 const factor=material.color??[1,1,1,1],luts=[0,1,2].map(c=>Uint8Array.from({length:256},(_,i)=>Math.round(Math.max(0,Math.min(1,srgb(linear(i/255)*factor[c])))*255)));
 const solid=factor.map((v,i)=>Math.round(Math.max(0,Math.min(1,i===3?v:srgb(v)))*255));if(material.opaque)solid[3]=255;
 return (u,v,target,offset)=>{const image=material.image;if(!image){target.set(solid,offset);return;}u=wrap(u,material.wrapS);v=wrap(v,material.wrapT);const x=Math.min(image.width-1,Math.floor(u*image.width)),y=Math.min(image.height-1,Math.floor(v*image.height)),p=(y*image.width+x)*4;for(let c=0;c<3;c++)target[offset+c]=luts[c][image.data[p+c]];target[offset+3]=material.opaque?255:Math.round(image.data[p+3]*factor[3]);};
}
export function bakeMaterialAtlas(materials,size,{mode='materials',meshes=[]}={}){
 const layout=mode==='materials'?atlasLayout(materials,size):{size,rects:[],reduced:true,scale:1},pixels=new Uint8ClampedArray(size*size*4),samplers=materials.map(materialSampler);for(let i=3;i<pixels.length;i+=4)pixels[i]=255;
 if(mode==='materials')materials.forEach((m,id)=>{const r=layout.rects[id];for(let y=-r.padding;y<r.height+r.padding;y++)for(let x=-r.padding;x<r.width+r.padding;x++){const u=(x+.5)/r.width,v=(y+.5)/r.height;samplers[id](m.bounds[0]+u*(m.bounds[2]-m.bounds[0]),m.bounds[1]+v*(m.bounds[3]-m.bounds[1]),pixels,((r.y+y)*size+r.x+x)*4);}});
 else {
  const faces=meshes.reduce((n,m)=>n+m.uvs.length/6,0),grid=Math.ceil(Math.sqrt(faces));let face=0;
  for(const mesh of meshes)for(let f=0;f<mesh.uvs.length;f+=6,face++){
   const left=face%grid*size/grid,top=Math.floor(face/grid)*size/grid,cell=size/grid;
   for(let y=Math.floor(top);y<Math.min(size,Math.ceil(top+cell));y++)for(let x=Math.floor(left);x<Math.min(size,Math.ceil(left+cell));x++){
    let b=Math.max(0,((x+.5-left)/cell-.08)/.84),c=Math.max(0,((y+.5-top)/cell-.08)/.84);if(b+c>1){const sum=b+c;b/=sum;c/=sum;}const a=1-b-c;
    const u=a*mesh.uvs[f]+b*mesh.uvs[f+2]+c*mesh.uvs[f+4],v=a*(1-mesh.uvs[f+1])+b*(1-mesh.uvs[f+3])+c*(1-mesh.uvs[f+5]);samplers[mesh.material](u,v,pixels,(y*size+x)*4);
   }
  }
 }
 return {layout,pixels};
}
