import './app.css';
import metadata from '../package.json';
import {startPackBuilder} from './pack-builder.js';
const $=s=>document.querySelector(s);
$('#app').innerHTML=`<header class="shell-header"><div class="wordmark">G<span>3D</span></div><div><h1>Godoy 3D Modding</h1><p>Developed by Gabriel Godoy <span class="badge">${metadata.version} beta · Legacy</span></p></div><button id="about">Sobre esta versão</button></header>
<nav aria-label="Módulos"><button data-tab="pack" class="selected">01 <span>Pack de roupas</span></button><button data-tab="clothing">02 <span>Pintura de roupas</span></button><button data-tab="mesh">03 <span>Malhas e objetos</span></button><button data-tab="vehicles">04 <span>Pintura de veículos</span></button><button data-tab="converter">05 <span>Converter OBJ em YDD</span></button></nav>
<main id="pack" class="tab active"></main>
<section id="converter" class="tab editor-tab"></section><section id="clothing" class="tab editor-tab"></section><section id="mesh" class="tab editor-tab"></section><section id="vehicles" class="tab editor-tab"></section>
<dialog id="about-dialog"><h2>Godoy 3D Modding · ${metadata.version} beta</h2><p>Studio local e portable. Seus arquivos são processados neste computador.</p><ul><li>Roupas: pintura 3D/UV e exportação YTD, baseada no PAINTFIVE.</li><li>Pack: projetos, componentes e props, variações, preview no ped e coleções FiveM.</li><li>Malhas: ajuste da peça inteira sobre o ped, exportação YDD e ferramentas OBJ.</li><li>Conversor: cria YDD + YTD a partir de OBJ, com UV e vínculo rígido ao ped.</li><li>Veículos: visualização YFT e edição YTD baseada no Godoy-Paint-Car.</li></ul><p>YDD aceita ajuste e incorporação de OBJ. Veículos ainda não exportam novas geometrias YFT, física/damage ou novos _hi.yft. Nenhum ped original GTA é incluído; importe uma cópia autorizada.</p><button id="close-about">Fechar</button></dialog>`;
const pages={clothing:'modules/clothing/index.html',vehicles:'modules/vehicles/index.html',mesh:'mesh.html',converter:'mesh.html?mode=converter'};
document.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=> {
  document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('selected',b===button));
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.id===button.dataset.tab));
  const tab=button.dataset.tab;
  if(pages[tab]&&!$(`#${tab} iframe`)) {
    const frame=document.createElement('iframe'); frame.src=pages[tab]; frame.title=button.textContent;
    $(`#${tab}`).append(frame);
  }
});
$('#about').onclick=()=>$('#about-dialog').showModal(); $('#close-about').onclick=()=>$('#about-dialog').close();
const packBuilder=startPackBuilder($('#pack'),{editTexture:async payload=>{
  document.querySelector('[data-tab="clothing"]').click();
  const frame=$('#clothing iframe');
  if(!frame.contentDocument?.querySelector('#model-file'))await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('O editor demorou para carregar.')),30000);frame.addEventListener('load',()=>{clearTimeout(timeout);resolve();},{once:true});});
  frame.contentWindow.postMessage({type:'godoy-pack-edit',...payload},location.origin);
}});
window.addEventListener('message',event=> {
  const frame=$('#clothing iframe');
  if(!frame||event.source!==frame.contentWindow||event.origin!==location.origin||event.data?.type!=='godoy-edited-assets')return;
  const files=event.data.files;
  if(!Array.isArray(files)||files.length>2||files.some(f=>typeof f.name!=='string'||f.name.length>255||/[\\/\0]/.test(f.name)||!(/\.(ydd|ytd)$/i.test(f.name))||!(f.bytes instanceof Uint8Array)||!f.bytes.length||f.bytes.length>80*1024*1024))return;
  try{packBuilder.edited(event.data);}catch(e){$('#pack-status').textContent=e.message;}
});

window.addEventListener('keydown',event=> {
  if(!document.querySelector('#mesh.active, #converter.active')||!(event.ctrlKey||event.metaKey)||event.altKey||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)||event.target.isContentEditable)return;
  const key=event.key.toLowerCase();if(!['z','y'].includes(key))return;
  const frame=document.querySelector('.tab.active iframe');if(!frame)return;
  event.preventDefault();frame.contentWindow.postMessage({type:'godoy-mesh-history',action:key==='y'||event.shiftKey?'redo':'undo'},location.origin);
});
