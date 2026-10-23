import './app.css';
import metadata from '../package.json';
import {createClothingPack, zipPack} from './pack.js';
const $=s=>document.querySelector(s);
$('#app').innerHTML=`<header class="shell-header"><div class="wordmark">G<span>3D</span></div><div><h1>Godoy 3D Modding</h1><p>Developed by Gabriel Godoy <span class="badge">${metadata.version} beta · Legacy</span></p></div><button id="about">Sobre esta versão</button></header>
<nav aria-label="Módulos"><button data-tab="pack" class="selected">01 <span>Pack de roupas</span></button><button data-tab="clothing">02 <span>Pintura de roupas</span></button><button data-tab="mesh">03 <span>Malhas e objetos</span></button><button data-tab="vehicles">04 <span>Pintura de veículos</span></button></nav>
<main id="pack" class="tab active"><section class="intro"><p class="eyebrow">CHARACTER CLOTHING PACK BUILDER</p><h2>Do seu projeto<br>para o FiveM.</h2><p>Reúna os modelos e as texturas, confira as associações e exporte um recurso organizado.</p><div class="workflow"><span>01 Importar</span><span>02 Conferir</span><span>03 Exportar</span></div></section><section class="pack-card"><h3>Configurar coleção</h3><label>Nome do pack<input id="pack-name" value="godoy_pack" maxlength="32" placeholder="minha_colecao" pattern="[a-z][a-z0-9_]{0,31}"></label><label>Personagem<select id="gender"><option value="male">Masculino · mp_m_freemode_01</option><option value="female">Feminino · mp_f_freemode_01</option></select></label><div class="import-actions"><button id="pick-files">Selecionar YDD + YTD</button><button id="pick-folder">Selecionar pasta</button></div><input id="pack-files" type="file" accept=".ydd,.ytd" multiple hidden><input id="pack-folder" type="file" webkitdirectory multiple hidden><p class="hint">Índices desde 000, sem lacunas. Aceita _u/uni e _r/whi. Até 80 MB por arquivo e 256 MB no total.</p><div id="file-list" aria-live="polite">Nenhum arquivo selecionado.</div><button id="build-pack" class="primary" disabled>Gerar recurso FiveM (.zip)</button><pre id="pack-status" role="status"></pre></section><aside class="notice">O YMT e o META são gerados pelo novo compilador de coleções de roupas. A validação estrutural é automática; a compatibilidade no jogo precisa ser conferida em um servidor FiveM Legacy. Props e índices com lacunas ainda não são suportados.</aside></main>
<section id="clothing" class="tab editor-tab"></section><section id="mesh" class="tab editor-tab"></section><section id="vehicles" class="tab editor-tab"></section>
<dialog id="about-dialog"><h2>Godoy 3D Modding · ${metadata.version} beta</h2><p>Studio local e portable. Seus arquivos são processados neste computador.</p><ul><li>Roupas: pintura 3D/UV e exportação YTD, baseada no PAINTFIVE.</li><li>Pack: associação por nomes, geração experimental de YMT/META e ZIP FiveM.</li><li>Malhas: ajuste da peça inteira sobre o ped, exportação YDD e ferramentas OBJ.</li><li>Veículos: visualização YFT e edição YTD baseada no Godoy-Paint-Car.</li></ul><p>A exportação nativa de novas geometrias YDD/YFT, rigging automático, física/damage e criação de _hi.yft ainda não estão implementadas. Nenhum ped original GTA é incluído; importe uma cópia autorizada.</p><button id="close-about">Fechar</button></dialog>`;
const pages={clothing:'modules/clothing/index.html',vehicles:'modules/vehicles/index.html',mesh:'mesh.html'};
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
let selected=[];
function receive(files) {
  selected=[...files].filter(f=>/\.(ydd|ytd)$/i.test(f.name));
  $('#file-list').textContent=selected.length?selected.map(f=>`${f.name} · ${(f.size/1024).toFixed(1)} KB`).join('\n'):'Nenhum YDD/YTD encontrado.';
  $('#build-pack').disabled=!selected.length; $('#pack-status').textContent='';
}
$('#pick-files').onclick=()=>$('#pack-files').click(); $('#pick-folder').onclick=()=>$('#pack-folder').click();
$('#pack-files').onchange=e=>receive(e.target.files); $('#pack-folder').onchange=e=>receive(e.target.files);
window.addEventListener('message',event=> {
  const frame=$('#clothing iframe');
  if(!frame||event.source!==frame.contentWindow||event.origin!==location.origin||event.data?.type!=='godoy-edited-assets')return;
  const files=event.data.files;
  if(!Array.isArray(files)||files.length>2||files.some(f=>typeof f.name!=='string'||!/^[a-z0-9_^.-]+\.(ydd|ytd)$/i.test(f.name)||!(f.bytes instanceof Uint8Array)||!f.bytes.length||f.bytes.length>80*1024*1024))return;
  const updates=new Map(selected.map(f=>[f.name,f]));
  for(const file of files)updates.set(file.name,new File([file.bytes],file.name));
  receive([...updates.values()]);
  $('#pack-status').textContent='Arquivos atualizados pelo editor de roupas. Confira o conjunto antes de gerar o recurso.';
});
$('#build-pack').onclick=async()=> {
  $('#build-pack').disabled=true; $('#pack-status').textContent='Analisando modelos e texturas…';
  try {
    if(selected.length>1024||selected.some(f=>f.size>80*1024*1024)||selected.reduce((n,f)=>n+f.size,0)>256*1024*1024) throw Error('Seleção acima dos limites. Divida o pack.');
    const files=[];
    for(const file of selected) files.push({name:file.name,bytes:new Uint8Array(await file.arrayBuffer())});
    const result=createClothingPack({pack:$('#pack-name').value,gender:$('#gender').value,files});
    const bytes=zipPack(result),url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));
    const link=document.createElement('a');link.href=url;link.download=result.collection+'.zip';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    $('#pack-status').textContent=`Recurso gerado: ${result.collection}\n${Object.keys(result.archive).length} arquivos. Confira no FiveM Legacy antes de distribuir.`+(result.warnings.length?'\n\nAvisos de texturas:\n'+result.warnings.join('\n'):'');
  } catch(error) { $('#pack-status').textContent='Não foi possível exportar: '+error.message; }
  finally { $('#build-pack').disabled=!selected.length; }
};

window.addEventListener('keydown',event=> {
  if(!document.querySelector('#mesh.active')||!(event.ctrlKey||event.metaKey)||event.altKey||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)||event.target.isContentEditable)return;
  const key=event.key.toLowerCase();if(!['z','y'].includes(key))return;
  const frame=document.querySelector('#mesh iframe');if(!frame)return;
  event.preventDefault();frame.contentWindow.postMessage({type:'godoy-mesh-history',action:key==='y'||event.shiftKey?'redo':'undo'},location.origin);
});
