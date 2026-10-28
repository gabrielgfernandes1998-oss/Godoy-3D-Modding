// RAGE fixes these headers in place. Each geometry needs independent pointer slots.
export function assertYddRuntimeHeaders(doc,name='YDD'){
 const r=doc.resource,models=new Set(),geometries=new Set(),vertices=new Set(),indices=new Set();
 const unique=(set,p)=>{if(set.has(p))throw Error(`${name}: cabeçalhos de malha compartilhados podem causar Invalid fixup. Use Compactar YDD nas abas 03/05 na versão atualizada e use o novo YDD com seu YTD.`);set.add(p);};
 for(const drawable of r.list(0x30,512).filter(p=>p!==null))for(const offset of [0x50,0x58,0x60,0x68]){
  const list=r.ptr(drawable+offset,16);if(list==null)continue;
  for(const model of r.list(list,1024)){
   if(model==null||models.has(model))continue;models.add(model);
   for(const geometry of r.list(model+8,65535)){
    if(geometry==null||geometries.has(geometry))continue;geometries.add(geometry);
    unique(vertices,r.ptr(geometry+0x18,128,false));unique(indices,r.ptr(geometry+0x38,96,false));
   }
  }
 }
 return doc;
}

// The preview walks model lists directly; RAGE also consumes the LOD count byte.
export function assertYddLodCounts(doc,name='YDD'){
 const r=doc.resource;
 for(const drawable of r.list(0x30,512).filter(p=>p!==null))for(const [i,offset] of [0x50,0x58,0x60,0x68].entries()){
  const list=r.ptr(drawable+offset,16);if(list==null)continue;
  if(r.list(list,1024).some(p=>p!==null)&&r.u8(drawable+0x80+i*4)===0)throw Error(`${name}: LOD com modelos presentes e contagem de renderização zero. Use Compactar YDD nas abas 03/05 na versão atualizada.`);
 }
 return doc;
}
