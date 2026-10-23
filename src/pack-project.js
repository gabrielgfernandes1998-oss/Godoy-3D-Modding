import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import {PACK_TYPES,PROPS} from './ymt.js';
import {createClothingPack} from './pack.js';
import {parseYdd} from '../modules/vehicles/src/formats/ydd.js';
import {parseYtd} from '../modules/vehicles/src/formats/ytd.js';
export const TYPE_LABELS=['Cabeças','Máscaras / barba','Cabelos','Braços / tronco','Calças','Bolsas / paraquedas','Calçados','Acessórios dentais','Acessórios','Coletes','Decalques','Tops / jaquetas','Chapéus','Óculos','Orelhas','Boca','Mão esquerda','Mão direita','Pulso esquerdo','Pulso direito','Quadril','Pé esquerdo','Pé direito','Mão física E','Mão física D'];
const id=()=>crypto.randomUUID();
export const newPackProject=()=>({version:1,name:'godoy_pack',gender:'male',assets:[],items:[]});
export function assetInfo(name) {
 const leaf=name.split('^').at(-1).toLowerCase(),match=/^([a-z]{4}|p_[a-z_]+?)_(?:(\d{3})(?:_([ur]))?\.ydd|(?:diff_)?(\d{3})_([a-z])(?:_(uni|whi))?\.ytd)$/.exec(leaf);
 if(!match||!PACK_TYPES.includes(match[1]))return null;
 return {component:match[1],index:Number(match[2]??match[4]),model:match[2]!==undefined,kind:match[3]??(match[6]==='whi'?'r':'u'),letter:match[5]??'a',gender:name.includes('mp_f_freemode')?'female':name.includes('mp_m_freemode')?'male':null,prefix:name.includes('^')?name.split('^')[0]:''};
}
export function validateProject(p) {
 if(p?.version!==1||!/^[a-z][a-z0-9_]{0,31}$/.test(p.name)||!['male','female'].includes(p.gender)||!Array.isArray(p.assets)||p.assets.length>2048||!Array.isArray(p.items)||p.items.length>1024)throw Error('Projeto inválido ou acima dos limites.');
 const ids=new Set();let bytes=0;
 for(const a of p.assets){if(typeof a.id!=='string'||!(/^[a-z0-9-]{1,64}$/i.test(a.id))||ids.has(a.id)||(a.importGender!==undefined&&!['male','female'].includes(a.importGender))||typeof a.name!=='string'||a.name.length>255||/[\\/\0]/.test(a.name)||!(/\.(ydd|ytd)$/i.test(a.name))||!(a.bytes instanceof Uint8Array)||!a.bytes.length||a.bytes.length>80*1024*1024)throw Error('Asset inválido no projeto.');ids.add(a.id);bytes+=a.bytes.length;}
 if(bytes>256*1024*1024)throw Error('Projeto acima de 256 MB.');
 const items=new Set(),variants=new Set();
 for(const item of p.items){if(typeof item.id!=='string'||!(/^[a-z0-9-]{1,64}$/i.test(item.id))||items.has(item.id)||!ids.has(item.asset)||!PACK_TYPES.includes(item.component)||!['male','female'].includes(item.gender)||!['u','r'].includes(item.kind)||!Array.isArray(item.textures)||item.textures.length>26||typeof item.label!=='string'||item.label.length>150||typeof item.group!=='string'||item.group.length>100||!Array.isArray(item.tags)||item.tags.length>20||item.tags.some(t=>typeof t!=='string'||t.length>40))throw Error('Peça inválida no projeto.');if(!Number.isInteger(item.flags??0)||(item.flags??0)<0||(item.flags??0)>0xffffffff||!Number.isInteger(item.renderFlags??0)||(item.renderFlags??0)<0||(item.renderFlags??0)>15||!Number.isFinite(item.heel??0)||(item.heel??0)<0||(item.heel??0)>1||!Number.isFinite(item.hairScale??0)||(item.hairScale??0)<0||(item.hairScale??0)>1||typeof(item.audio??'none')!=='string'||(item.audio??'none').length>64)throw Error('Configuração da peça fora dos limites.');items.add(item.id);
  for(const v of item.textures){if(typeof v.id!=='string'||!(/^[a-z0-9-]{1,64}$/i.test(v.id))||variants.has(v.id)||!ids.has(v.asset)||typeof v.label!=='string'||v.label.length>150)throw Error('Variação inválida.');variants.add(v.id);}
 }
 return p;
}
export function importPackAssets(project,files,defaultComponent='jbib') {
 const next={...project,assets:[...project.assets],items:structuredClone(project.items)},warnings=[],newAssets=[];
 for(const file of files){if(!/\.(ydd|ytd)$/i.test(file.name))continue;const importGender=assetInfo(file.name)?.gender??project.gender;if(next.assets.some(a=>a.name===file.name&&(a.importGender??project.gender)===importGender)){warnings.push('Já importado: '+file.name);continue;}
  if(!(file.bytes instanceof Uint8Array)||!file.bytes.length||file.bytes.length>80*1024*1024)throw Error('Arquivo vazio ou acima de 80 MB.');
  const a={id:id(),name:file.name,bytes:file.bytes,importGender};newAssets.push(a);next.assets.push(a);
 }
 // Associate YTDs by collection/component/index, including later imports.
 for(const a of newAssets.filter(a=>/\.ydd$/i.test(a.name))){parseYdd(a.bytes);const info=assetInfo(a.name);next.items.push({id:id(),asset:a.id,label:a.name.replace(/\.ydd$/i,'').slice(0,150),component:info?.component??defaultComponent,gender:info?.gender??project.gender,kind:info?.kind??'u',group:'',tags:[],textures:[],flags:0,heel:0,hairScale:0,audio:'none',renderFlags:0});}
 for(const item of next.items){const source=assetInfo(next.assets.find(a=>a.id===item.asset).name);if(!source)continue;
  for(const a of next.assets.filter(a=>/\.ytd$/i.test(a.name))){const info=assetInfo(a.name);if(!info||(a.importGender??info.gender??project.gender)!==item.gender||info.component!==source.component||info.index!==source.index||info.prefix!==source.prefix||item.textures.some(v=>v.asset===a.id))continue;
   // Never steal a dictionary explicitly assigned to another piece.
   if(next.items.some(i=>i!==item&&i.textures.some(v=>v.asset===a.id)))continue;
   parseYtd(a.bytes);item.textures.push({id:id(),asset:a.id,label:'Variação '+info.letter.toUpperCase()});
  }
  item.textures.sort((a,b)=>(assetInfo(next.assets.find(t=>t.id===a.asset).name)?.letter??'').localeCompare(assetInfo(next.assets.find(t=>t.id===b.asset).name)?.letter??''));
 }
 return {project:validateProject(next),warnings};
}
export function buildManagedPack(project) {
 validateProject(project);if(!project.items.length)throw Error('Adicione pelo menos uma peça.');
 const archive={},reports=[],warnings=[];let collections=0,total=0;
 for(const gender of ['male','female']){
  const chunks=[];let current=[],counts=new Map(),textures=new Map(),props=0;
  const flush=()=>{if(current.length)chunks.push(current);current=[];counts=new Map();textures=new Map();props=0;};
  for(const item of project.items.filter(i=>i.gender===gender)){
   if(!item.textures.length)throw Error(`${item.label}: adicione uma variação YTD.`);
   const key=item.component;
   if((counts.get(key)??0)>=128||(textures.get(key)??0)+item.textures.length>255||(PROPS.includes(key)&&props>=255))flush();
   current.push(item);counts.set(key,(counts.get(key)??0)+1);textures.set(key,(textures.get(key)??0)+item.textures.length);if(PROPS.includes(key))props++;
  }flush();
  chunks.forEach((items,chunk)=>{
   const name=chunks.length===1?project.name:project.name.slice(0,28)+'_'+String(chunk+1).padStart(3,'0'),files=[],settings={},indices=new Map(),mapping=[];
   for(const item of items){const index=indices.get(item.component)??0;indices.set(item.component,index+1);const n=String(index).padStart(3,'0'),prop=PROPS.includes(item.component),stem=item.component+'_'+n;
    const add=(asset,name)=>{const a=project.assets.find(a=>a.id===asset);if(!a)throw Error('Asset ausente.');total+=a.bytes.length;if(total>256*1024*1024)throw Error('Exportação acima de 256 MB; divida o projeto.');files.push({name,bytes:a.bytes});};
    add(item.asset,stem+(prop?'':'_'+item.kind)+'.ydd');
    item.textures.forEach((v,t)=>add(v.asset,prop?`${item.component}_diff_${n}_${String.fromCharCode(97+t)}.ytd`:`${item.component}_diff_${n}_${String.fromCharCode(97+t)}_${item.kind==='r'?'whi':'uni'}.ytd`));
    settings[`${item.component}:${index}`]={flags:item.flags??0,heel:item.heel??0,hairScale:item.hairScale??0,renderFlags:item.renderFlags??0,audio:item.audio||'none'};
    mapping.push({id:item.id,label:item.label,component:item.component,index,group:item.group,tags:item.tags,variants:item.textures.map(v=>v.label)});
   }
   const result=createClothingPack({pack:name,gender,files,settings});collections++;warnings.push(...result.warnings);reports.push({collection:result.collection,gender,items:mapping});
   for(const [path,bytes] of Object.entries(result.archive)){if(['fxmanifest.lua','export-report.json'].includes(path))continue;if(archive[path])throw Error('Colisão de nomes de coleção.');archive[path]=bytes;}
  });
 }
 const metas=Object.keys(archive).filter(p=>p.endsWith('.meta'));
 archive['fxmanifest.lua']=strToU8(`fx_version 'cerulean'\ngame 'gta5'\n\nfiles {\n${metas.map(n=>`  '${n}',`).join('\n')}\n}\n${metas.map(n=>`data_file 'SHOP_PED_APPAREL_META_FILE' '${n}'`).join('\n')}\n`);
 archive['export-report.json']=strToU8(JSON.stringify({version:2,project:project.name,collections:reports,warnings,validation:'Estrutura validada; teste visual/animação no FiveM Legacy.'},null,2));
 return {archive,collections,reports,warnings};
}
export function savePackProject(project){validateProject(project);const manifest={...project,assets:project.assets.map(a=>({id:a.id,name:a.name,path:'assets/'+a.id+'.bin'}))};const files={'project.json':strToU8(JSON.stringify(manifest))};for(const a of project.assets)files['assets/'+a.id+'.bin']=a.bytes;return zipSync(files);}
export function loadPackProject(bytes){if(bytes.length>280*1024*1024)throw Error('Projeto compactado acima do limite.');let size=0;const files=unzipSync(bytes,{filter:file=>{size+=file.originalSize;if(size>260*1024*1024||file.originalSize>80*1024*1024)throw Error('Projeto descomprimido acima do limite.');return true;}});if(!files['project.json']||files['project.json'].length>2*1024*1024)throw Error('Manifesto de projeto inválido.');const p=JSON.parse(strFromU8(files['project.json']));p.assets=p.assets.map(a=>({...a,bytes:files[a.path]}));return validateProject(p);}
export async function packAutosave(value){const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('godoy-pack-project',1);r.onupgradeneeded=()=>r.result.createObjectStore('projects');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{return await new Promise((resolve,reject)=>{const tx=db.transaction('projects',value?'readwrite':'readonly'),store=tx.objectStore('projects'),r=value?store.put(value,'current'):store.get('current');tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
