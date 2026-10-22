import { zipSync, strToU8 } from 'fflate';
import { parseYdd } from '../modules/vehicles/src/formats/ydd.js';
import { parseYtd } from '../modules/vehicles/src/formats/ytd.js';
import { COMPONENTS, createYmt, inspectYmt, hashName } from './ymt.js';

export function createClothingPack({pack,gender,files}) {
  if(!/^[a-z][a-z0-9_]{0,31}$/.test(pack)) throw Error('Nome: 1–32 caracteres a-z, 0-9 e _, começando por letra.');
  if(!['male','female'].includes(gender)) throw Error('Selecione masculino ou feminino.');
  if(!Array.isArray(files)||!files.length||files.length>1024) throw Error('Selecione até 1024 arquivos.');
  const ped=gender==='male'?'mp_m_freemode_01':'mp_f_freemode_01', collection=`${ped}_${pack}`;
  const groups=new Map(), names=new Set(), warnings=[], archive={};
  let total=0;
  for(const file of files) {
    if(!/\.(ydd|ytd)$/i.test(file.name)) continue;
    if(!(file.bytes instanceof Uint8Array)||!file.bytes.length||file.bytes.length>80*1024*1024) throw Error('Cada arquivo deve ter entre 1 byte e 80 MB.');
    total+=file.bytes.length; if(total>256*1024*1024) throw Error('Divida o pack: limite de 256 MB por exportação.');
    const name=file.name.split('^').at(-1);
    const match=/^([a-z]{4})_(?:(\d{3})_([ur])\.ydd|diff_(\d{3})_([a-z])_(uni|whi)\.ytd)$/.exec(name);
    if(!match||!COMPONENTS.includes(match[1])) throw Error(`Nome não suportado: ${file.name}. Use nomes FiveM de componentes.`);
    if(names.has(name)) throw Error(`Arquivo duplicado: ${name}`); names.add(name);
    const [,component,drawIndex,kind,textureIndex,letter,skin]=match;
    const index=Number(drawIndex??textureIndex), key=`${component}:${index}`;
    if(!groups.has(key)) groups.set(key,{component,index,textures:[]});
    const group=groups.get(key);
    if(drawIndex!==undefined) {
      if(group.model) throw Error(`Dois YDD para ${key}.`);
      const doc=parseYdd(file.bytes);
      for(const drawable of doc.drawables) for(let lod=0;lod<drawable.lods.length;lod++) drawable.readLod(lod);
      group.model={file,name,kind,doc};
    } else {
      group.textures.push({file,name,letter,skin,doc:parseYtd(file.bytes)});
    }
  }
  if(!groups.size) throw Error('Nenhum YDD/YTD selecionado.');
  const components=[];
  for(const component of COMPONENTS) {
    const list=[...groups.values()].filter(g=>g.component===component).sort((a,b)=>a.index-b.index);
    if(!list.length) continue;
    const drawables=[];
    list.forEach((g,index)=> {
      if(g.index!==index) throw Error(`${component}: os índices devem ser consecutivos desde 000. Não renomeie sem preparar os nomes internos.`);
      if(!g.model||!g.textures.length) throw Error(`${component} ${index}: YDD ou YTD correspondente ausente.`);
      g.textures.sort((a,b)=>a.letter.localeCompare(b.letter));
      const skin=g.textures[0].skin;
      g.textures.forEach((t,i)=> {
        if(t.letter!==String.fromCharCode(97+i)||t.skin!==skin) throw Error(`${component} ${index}: texturas devem começar em a, sem lacunas e com o mesmo sufixo.`);
        const referenced=g.model.doc.drawables.flatMap(d=>d.shaders.flatMap(s=>s.textures.map(t=>t.name.toLowerCase())));
        const available=new Set(t.doc.textures.map(t=>t.name.toLowerCase()));
        const missing=[...new Set(referenced.filter(n=>!available.has(n)))];
        if(missing.length) warnings.push(`${t.name}: referências externas/ausentes: ${missing.join(', ')}`);
      });
      drawables.push({textures:g.textures.length,kind:g.model.kind,skin,lowLods:g.model.doc.drawables.some(d=>d.lods.some(l=>['Low','Very Low'].includes(l)))});
      for(const entry of [g.model,...g.textures]) archive[`stream/[${gender}]/${component}/${collection}^${entry.name}`]=entry.file.bytes;
    });
    components.push({name:component,drawables});
  }
  const ymt=createYmt(pack,components), decoded=inspectYmt(ymt);
  if(decoded.dlcHash!==hashName(pack,true)) throw Error('Falha ao conferir a coleção gerada.');
  archive[`stream/${collection}.ymt`]=ymt;
  const character=gender==='male'?'SCR_CHAR_MULTIPLAYER':'SCR_CHAR_MULTIPLAYER_F';
  archive[`${collection}.meta`]=strToU8(`<?xml version="1.0" encoding="UTF-8"?>\n<ShopPedApparel>\n  <pedName>${ped}</pedName>\n  <dlcName>${pack}</dlcName>\n  <fullDlcName>${collection}</fullDlcName>\n  <eCharacter>${character}</eCharacter>\n  <creatureMetaData>MP_CreatureMetadata</creatureMetaData>\n  <pedOutfits />\n  <pedComponents />\n  <pedProps />\n</ShopPedApparel>\n`);
  archive['fxmanifest.lua']=strToU8(`fx_version 'cerulean'\ngame 'gta5'\n\nfiles { '${collection}.meta' }\ndata_file 'SHOP_PED_APPAREL_META_FILE' '${collection}.meta'\n`);
  archive['export-report.json']=strToU8(JSON.stringify({version:1,collection,gender,components,warnings,validation:'Structural checks only; validate on a FiveM Legacy server before use.'},null,2));
  return {archive,collection,warnings,components};
}

export const zipPack = result => zipSync(result.archive,{level:6});
