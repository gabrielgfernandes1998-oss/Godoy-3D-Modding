// Independent serializer for Legacy CPedVariationInfo components and props.
// Does not use or redistribute CodeWalker. Experimental until verified in FiveM.
import { deflateSync } from 'fflate';
import { openResource } from '../modules/vehicles/src/formats/resource.js';

export const COMPONENTS = ['head', 'berd', 'hair', 'uppr', 'lowr', 'hand', 'feet', 'teef', 'accs', 'task', 'decl', 'jbib'];
export const PROPS=['p_head','p_eyes','p_ears','p_mouth','p_lhand','p_rhand','p_lwrist','p_rwrist','p_hip','p_lfoot','p_rfoot','p_ph_l_hand','p_ph_r_hand'];
export const PACK_TYPES=[...COMPONENTS,...PROPS];
export function hashName(text, lowercase = false) {
  let h = 0;
  for (const byte of new TextEncoder().encode(lowercase ? text.toLowerCase() : text)) {
    h = (h + byte) >>> 0; h = (h + (h << 10)) >>> 0; h ^= h >>> 6;
  }
  h = (h + (h << 3)) >>> 0; h ^= h >>> 11;
  return (h + (h << 15)) >>> 0;
}
const field = (name, offset, type, index = 0, key = 0) => [name, offset, type, index, key];
const arrayInfo = name => field(0x100, 0, 5, 0, name);
const schema = [
  ['CPedPropMetaData',2029738350,768,56,[field('audioId',0,0x4a),field(0x100,0,0x21),field('expressionMods',4,0x50,1,5),arrayInfo('CPedPropTexData'),field('texData',24,0x52,3),field('renderFlags',40,0x63,3,'ePropRenderFlags'),field('propFlags',44,0x15),field('flags',48,0x13),field('anchorId',50,0x11),field('propId',51,0x11),field(2894625425,52,0x11)]],
  ['CPedPropTexData',2767296137,512,12,[field('inclusions',0,0x65,32),field('exclusions',4,0x65,32),field('texId',8,0x11),field('inclusionId',9,0x11),field('exclusionId',10,0x11),field('distribution',11,0x11)]],
  ['CAnchorProps',403574180,768,24,[field(0x100,0,0x11),field('props',0,0x52),field('anchor',16,0x62,0,'eAnchorPoints')]],
  ['CPedVariationInfo', 4030871161, 768, 112, [
    field('bHasTexVariations',0,1), field('bHasDrawblVariations',1,1),
    field('bHasLowLODs',2,1), field('bIsSuperLOD',3,1), field(0x100,0,0x11),
    field('availComp',4,0x50,4,12), arrayInfo('CPVComponentData'),
    field('aComponentData3',16,0x52,6), arrayInfo('CPedSelectionSet'),
    field('aSelectionSets',32,0x52,8), arrayInfo('CComponentInfo'),
    field('compInfos',48,0x52,10), field('propInfo',64,5,0,'CPedPropInfo'),
    field('dlcName',104,0x4a)]],
  ['CPVComponentData',2024084511,768,24,[field('numAvailTex',0,0x11),arrayInfo('CPVDrawblData'),field('aDrawblData3',8,0x52,1)]],
  ['CPVDrawblData',124073662,768,48,[field('propMask',0,0x11),field('numAlternatives',1,0x11),arrayInfo('CPVTextureData'),field('aTexData',8,0x52,2),field('clothData',24,5,0,'CPVDrawblData__CPVClothComponentData')]],
  ['CPVTextureData',4272717794,0,3,[field('texId',0,0x11),field('distribution',1,0x11)]],
  ['CPVDrawblData__CPVClothComponentData',508935687,0,24,[field('ownsCloth',0,1)]],
  ['CPedPropInfo',1792487819,768,40,[field('numAvailProps',0,0x11),arrayInfo('CPedPropMetaData'),field('aPropMetaData',8,0x52,1),arrayInfo('CAnchorProps'),field('aAnchors',24,0x52,3)]],
  ['CComponentInfo',3693847250,512,48,[
    field('pedXml_audioID',0,0x4a),field('pedXml_audioID2',4,0x4a),field(0x100,0,0x21),
    field('pedXml_expressionMods',8,0x50,0,5),field('flags',28,0x15),
    field('inclusions',32,0x65,32),field('exclusions',36,0x65,32),
    field('pedXml_vfxComps',40,0x64,16,'ePedVarComp'),field('pedXml_flags',42,0x13),
    field('pedXml_compIdx',44,0x11),field('pedXml_drawblIdx',45,0x11)]],
];
const enums=[
  ['ePedVarComp',3472084374,['INVALID',...COMPONENTS.map(n=>n.toUpperCase()),'MAX'].map((n,i)=>['PV_COMP_'+n,i-1])],
  ['ePropRenderFlags',1551913633,['ALPHA','DECAL','CUTOUT'].map((n,i)=>['PRF_'+n,i])],
  ['eAnchorPoints',1309372691,['HEAD','EYES','EARS','MOUTH','LEFT_HAND','RIGHT_HAND','LEFT_WRIST','RIGHT_WRIST','HIP','LEFT_FOOT','RIGHT_FOOT','PH_L_HAND','PH_R_HAND'].map((n,i)=>['ANCHOR_'+n,i]).concat([['NUM_ANCHORS',13]])],
];
const hash = value => typeof value === 'number' ? value : hashName(value);
const aligned = n => Math.ceil(n / 16) * 16;

export function validateComponents(components) {
  if (!Array.isArray(components) || !components.length || components.length > 25) throw Error('Selecione componentes de roupas.');
  const seen = new Set();
  for (const c of components) {
    if (!PACK_TYPES.includes(c.name) || seen.has(c.name)) throw Error('Componente inválido ou duplicado.');
    seen.add(c.name);
    if (!Array.isArray(c.drawables) || !c.drawables.length || c.drawables.length > 128) throw Error('Use de 1 a 128 drawables por componente.');
    let total = 0;
    for (const d of c.drawables) {
      if (!Number.isInteger(d.textures) || d.textures < 1 || d.textures > 26) throw Error('Cada drawable exige 1–26 texturas consecutivas.');
      if(!Number.isInteger(d.flags??0)||(d.flags??0)<0||(d.flags??0)>0xffffffff||!Number.isFinite(d.heel??0)||Math.abs(d.heel??0)>1||!Number.isFinite(d.hairScale??0)||(d.hairScale??0)<0||(d.hairScale??0)>1)throw Error('Flags/altura/cabelo fora dos limites.');
      if (!['u','r'].includes(d.kind) || !['uni','whi'].includes(d.skin)) throw Error('Convenção de drawable/textura não suportada.');
      if ((d.kind === 'r') !== (d.skin === 'whi')) throw Error('Use _u/uni ou _r/whi.');
      total += d.textures;
    }
    if (total > 255) throw Error('Máximo de 255 texturas por componente nesta versão.');
  }
}

export function createYmt(dlcName, input) {
  if (!/^[a-z][a-z0-9_]{0,31}$/.test(dlcName)) throw Error('Nome da coleção inválido.');
  validateComponents(input);
  const props=input.filter(c=>PROPS.includes(c.name));
  if(props.reduce((n,c)=>n+c.drawables.length,0)>255)throw Error('Máximo de 255 props por coleção.');
  const components = input.filter(c=>COMPONENTS.includes(c.name)).sort((a,b) => COMPONENTS.indexOf(a.name)-COMPONENTS.indexOf(b.name));
  const blocks = [];
  function block(name, size) {
    const bytes = new Uint8Array(size);
    const result = {name, bytes, view:new DataView(bytes.buffer), id:blocks.length+1};
    blocks.push(result); return result;
  }
  function array(target, offset, source, count, itemOffset = 0) {
    target.view.setUint32(offset, (itemOffset * 4096 + source.id) >>> 0, true);
    target.view.setUint16(offset+8,count,true); target.view.setUint16(offset+10,count,true);
  }
  const root = block('CPedVariationInfo',112);
  root.bytes.set([1,1,0,0]); root.bytes.fill(255,4,16);
  root.bytes[2]=components.some(c=>c.drawables.some(d=>d.lowLods))?1:0;
  root.view.setUint32(104,hashName(dlcName,true),true);
  const componentBlock = block('CPVComponentData',components.length*24);
  const totalDrawables = components.reduce((n,c)=>n+c.drawables.length,0);
  const drawBlock = block('CPVDrawblData',totalDrawables*48);
  const texBlock = block('CPVTextureData',components.reduce((n,c)=>n+c.drawables.reduce((s,d)=>s+d.textures,0),0)*3);
  const infoBlock = block('CComponentInfo',totalDrawables*48);
  array(root,16,componentBlock,components.length); array(root,48,infoBlock,totalDrawables);
  let drawIndex = 0, texIndex = 0;
  components.forEach((c,componentIndex)=> {
    const slot = COMPONENTS.indexOf(c.name);
    root.bytes[4+slot] = componentIndex;
    componentBlock.bytes[componentIndex*24] = c.drawables.reduce((n,d)=>n+d.textures,0);
    array(componentBlock,componentIndex*24+8,drawBlock,c.drawables.length,drawIndex*48);
    c.drawables.forEach((d,localIndex)=> {
      // Low nibble identifies drawable flags; high nibble selects _u/_r.
      drawBlock.bytes[drawIndex*48] = (d.kind === 'r' ? 16 : 0) | 1;
      array(drawBlock,drawIndex*48+8,texBlock,d.textures,texIndex*3);
      for (let t=0;t<d.textures;t++) { texBlock.bytes.set([d.skin==='whi'?1:0,255,0],texIndex++*3); }
      infoBlock.bytes[drawIndex*48+44] = slot; infoBlock.bytes[drawIndex*48+45] = localIndex;
      infoBlock.view.setUint32(drawIndex*48,hashName(d.audio||'none',true),true);
      infoBlock.view.setUint32(drawIndex*48+4,hashName('none',true),true);
      infoBlock.view.setFloat32(drawIndex*48+24,d.heel??0,true);
      infoBlock.view.setUint32(drawIndex*48+28,d.flags??0,true);
      drawIndex++;
    });
  });
  if(props.length) {
    const items=props.flatMap(c=>c.drawables.map((d,i)=>({d,anchor:PROPS.indexOf(c.name),index:i})));
    const propBlock=block('CPedPropMetaData',items.length*56),propTex=block('CPedPropTexData',items.reduce((n,p)=>n+p.d.textures,0)*12),anchorBlock=block('CAnchorProps',props.length*24);
    root.bytes[64]=items.length;array(root,72,propBlock,items.length);array(root,88,anchorBlock,props.length);
    let texture=0;
    items.forEach(({d,anchor,index},i)=> {
      const p=i*56;propBlock.view.setUint32(p,hashName(d.audio||'none',true),true);propBlock.view.setFloat32(p+4,-(d.hairScale??0),true);
      array(propBlock,p+24,propTex,d.textures,texture*12);propBlock.view.setUint32(p+40,d.renderFlags??0,true);propBlock.view.setUint32(p+44,d.flags??0,true);propBlock.bytes[p+50]=anchor;propBlock.bytes[p+51]=index;
      for(let t=0;t<d.textures;t++){propTex.bytes[texture*12+8]=t;propTex.bytes[texture*12+11]=255;texture++;}
    });
    props.forEach((c,i)=> {const counts=block('BYTE',c.drawables.length);counts.bytes.set(c.drawables.map(d=>d.textures));array(anchorBlock,i*24,counts,c.drawables.length);anchorBlock.view.setUint32(i*24+16,PROPS.indexOf(c.name),true);});
  }
  // A single power-of-two system page; all pointers stay inside that page.
  let cursor = 112;
  const reserve = n => { const offset=cursor; cursor=aligned(cursor+n); return offset; };
  const pages = reserve(24), structures = reserve(schema.length*32), dataTable = reserve(blocks.length*16), enumTable=reserve(enums.length*24),enumEntries=enums.map(e=>reserve(e[2].length*8));
  const nameBytes = new TextEncoder().encode(dlcName+'\0'), name = reserve(nameBytes.length);
  const fields = schema.map(s=>reserve(s[4].length*16));
  const offsets = blocks.map(b=>reserve(b.bytes.length));
  let shift=4; while(512*2**shift<cursor) shift++;
  if (shift>15) throw Error('Metadados acima do limite.');
  const bytes = new Uint8Array(512*2**shift), view = new DataView(bytes.buffer);
  const u16=(o,n)=>view.setUint16(o,n,true), u32=(o,n)=>view.setUint32(o,n>>>0,true);
  const pointer=(o,p)=>u32(o,0x50000000+p);
  u32(0,0x405bc808); u32(4,1); pointer(8,pages);
  u32(16,0x50524430); u16(20,0x79); u32(28,1);
  pointer(32,structures);pointer(40,enumTable);u16(74,enums.length); pointer(48,dataTable); pointer(56,name);
  u16(72,schema.length); u16(76,blocks.length); bytes[pages+8]=1;
  bytes.set(nameBytes,name);
  schema.forEach((s,i)=> {
    const p=structures+i*32;
    u32(p,hashName(s[0])); u32(p+4,s[1]); u32(p+8,s[2]); pointer(p+16,fields[i]);
    u32(p+24,s[3]); u16(p+30,s[4].length);
    s[4].forEach((f,j)=> {
      const o=fields[i]+j*16;
      u32(o,hash(f[0])); u32(o+4,f[1]); bytes[o+8]=f[2]; u16(o+10,f[3]); u32(o+12,hash(f[4]));
    });
  });
  enums.forEach((e,i)=>{const p=enumTable+i*24;u32(p,hashName(e[0]));u32(p+4,e[1]);pointer(p+8,enumEntries[i]);u32(p+16,e[2].length);e[2].forEach(([name,value],j)=>{u32(enumEntries[i]+j*8,hashName(name));u32(enumEntries[i]+j*8+4,value);});});
  blocks.forEach((b,i)=> {
    const p=dataTable+i*16; u32(p,hashName(b.name)); u32(p+4,b.bytes.length); pointer(p+8,offsets[i]); bytes.set(b.bytes,offsets[i]);
  });
  const compressed=deflateSync(bytes), result=new Uint8Array(16+compressed.length), header=new DataView(result.buffer);
  header.setUint32(0,0x37435352,true); header.setUint32(4,2,true);
  header.setUint32(8,0x08000000|shift,true); header.setUint32(12,0x20000000,true);
  result.set(compressed,16); return result;
}

// Reader independently follows data table pointers and array references.
export function inspectYmt(input) {
  const r=openResource(input,2);
  if(r.u32(16)!==0x50524430) throw Error('YMT não contém metadados PRD0.');
  const count=r.u16(76), table=r.ptr(48,count*16,false), rootIndex=r.u32(28)-1;
  if(count<1||count>4096||rootIndex>=count) throw Error('Tabela YMT inválida.');
  const blocks=Array.from({length:count},(_,i)=> {
    const p=table+i*16,size=r.u32(p+4); return {hash:r.u32(p),offset:r.ptr(p+8,size,false),size};
  });
  const root=blocks[rootIndex];
  if(root.hash!==hashName('CPedVariationInfo')||root.size<112) throw Error('YMT não é de roupas.');
  function array(o, type, stride) {
    const ref=r.u32(o), id=(ref&4095)-1, offset=ref>>>12, length=r.u16(o+8);
    if(!length) return [];
    const block=blocks[id];
    if(!block||block.hash!==hashName(type)||offset+length*stride>block.size) throw Error('Referência YMT inválida.');
    return Array.from({length},(_,i)=>block.offset+offset+i*stride);
  }
  const comps=array(root.offset+16,'CPVComponentData',24);
  const components=[];
  COMPONENTS.forEach((name,i)=> {
    const index=r.u8(root.offset+4+i); if(index===255) return;
    if(!comps[index]) throw Error('Índice de componente YMT inválido.');
    const draws=array(comps[index]+8,'CPVDrawblData',48).map(p=> {
      const textures=array(p+8,'CPVTextureData',3).map(t=>({id:r.u8(t),distribution:r.u8(t+1)}));
      return {kind:((r.u8(p)>>>4)&3)===0?'u':'r', textures};
    });
    components.push({name,drawables:draws});
  });
  const props=array(root.offset+72,'CPedPropMetaData',56).map(p=>({anchor:r.u8(p+50),index:r.u8(p+51),flags:r.u32(p+44),hairScale:-new DataView(r.data.buffer,r.data.byteOffset,r.data.byteLength).getFloat32(p+4,true),textures:array(p+24,'CPedPropTexData',12).map(t=>({id:r.u8(t+8),distribution:r.u8(t+11)}))}));
  return {dlcHash:r.u32(root.offset+104),components,props};
}
