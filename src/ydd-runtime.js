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

// Validate the serialized converter output, independently of conversao.json.
export function assertConverterBone(doc,tag){
 const r=doc.resource;
 if(doc.drawables.length!==1||!Number.isInteger(tag)||tag<0||tag>65535)throw Error('Conversão sem vínculo de osso válido.');
 const skeleton=doc.drawables[0].skeletonPointer;
 if(skeleton==null)throw Error('Conversão sem esqueleto.');
 const count=r.u16(skeleton+0x5e),bones=r.ptr(skeleton+0x20,count*80,false);
 if(!count||count>255)throw Error('Esqueleto incompatível com os índices de skin.');
 let selected;
 for(let i=0;i<count;i++){
  const b=bones+i*80,index=r.u16(b+0x42);
  if(index!==i)throw Error('Ordem de ossos incompatível com o vínculo exportado.');
  if(r.u16(b+0x44)===tag)selected={name:r.stringAtPointer(b+0x38)||`Osso ${index}`,tag,index,boneCount:count};
 }
 if(!selected)throw Error('O osso escolhido está ausente no YDD exportado.');
 const streams=new Set();let geometries=0;
 for(const drawable of r.list(0x30,512).filter(p=>p!==null))for(const offset of [0x50,0x58,0x60,0x68]){
  const list=r.ptr(drawable+offset,16);if(list==null)continue;
  for(const model of r.list(list,1024).filter(p=>p!==null)){
   if(r.u8(model+0x29)!==1||(r.u8(model+0x2d)&1)===0||r.u8(model+0x28)!==count)throw Error('Vínculo de skin local antigo. Atualize o portable e repare ou reconverta o YDD.');
   for(const g of r.list(model+8,65535).filter(p=>p!==null)){
    geometries++;
    if(r.u16(g+0x72)!==count)throw Error('Tabela de ossos local antiga. Atualize o portable e repare ou reconverta o YDD.');
    const palette=r.ptr(g+0x68,count*2,false);
    for(let i=0;i<count;i++)if(r.u16(palette+i*2)!==i)throw Error('Tabela de ossos não corresponde ao esqueleto exportado.');
    const vb=r.ptr(g+0x18,128,false),stride=r.u16(vb+8),n=r.u32(vb+0x18),info=r.ptr(vb+0x30,16,false);
    if(stride!==48||r.u32(info)!==127)throw Error('Layout de skin inesperado no conversor.');
    const vertices=r.ptr(vb+0x10,n*stride)??r.ptr(vb+0x20,n*stride,false),key=`${vertices}/${n}/${stride}`;
    if(streams.has(key))continue;streams.add(key);r.range(vertices,n*stride);
    for(let i=0;i<n;i++){
     const p=vertices+i*stride,data=r.data;
     if(data[p+12]!==255||data[p+13]!==0||data[p+14]!==0||data[p+15]!==0||data[p+16]!==selected.index)throw Error('Os vértices exportados não apontam para o osso escolhido.');
    }
   }
  }
 }
 if(!geometries)throw Error('Conversão sem geometria vinculada.');
 return selected;
}
