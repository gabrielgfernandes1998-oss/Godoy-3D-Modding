import {normalizeAdjustment} from './color-adjustment.js';

export function openSelectionAdjustment(editor,{edit=false}={}) {
  if(editor.adjustmentDialog)return;
  editor.finishPath();editor.cancelGesture();
  const doc=editor.doc,existing=edit?doc?.active:null;
  if(!doc)throw Error('Abra uma textura primeiro.');
  if(edit&&(existing?.type!=='adjustment'||existing.locked))throw Error('Selecione uma camada de ajuste desbloqueada.');
  const clip=structuredClone(edit?existing.clip:doc.selection);
  if(!clip?.length)throw Error('Use Ilha UV para selecionar a região que deseja ajustar.');
  const dialog=document.createElement('dialog');dialog.id='selection-adjustment-dialog';dialog.className='selection-adjustment-dialog';
  dialog.innerHTML=`<h2>Ajustar cor da seleção UV</h2><p>Mude a cor mantendo os desenhos, as sombras e a textura. O ajuste fica em uma camada editável, limitado à área selecionada. Use Brilho para escurecer ou clarear.</p><label class="checks"><input id="adjust-colorize" type="checkbox"> Colorir preservando luz e sombra</label><label class="field">Nova cor<input id="adjust-color" type="color"></label>${[['strength','Intensidade',0,100],['saturation','Saturação',0,200],['brightness','Brilho',-100,100],['contrast','Contraste',-100,100]].map(([id,label,min,max])=>`<label class="field">${label}<output id="adjust-${id}-out"></output><input id="adjust-${id}" type="range" min="${min}" max="${max}"></label>`).join('')}<label class="checks"><input id="adjust-preview" type="checkbox" checked> Prévia no modelo e no mapa UV</label><p id="adjust-error" role="alert"></p><footer><button id="adjust-reset">Restaurar valores neutros</button><button id="adjust-cancel">Cancelar</button><button id="adjust-apply" class="accent">Aplicar ajuste</button></footer>`;
  document.body.append(dialog);editor.adjustmentDialog=dialog;
  const $=s=>dialog.querySelector(s),fields=['colorize','color','strength','saturation','brightness','contrast'];let scheduled=null,closed=false;
  const values=()=>normalizeAdjustment(Object.fromEntries(fields.map(k=>[k,k==='colorize'?$('#adjust-'+k).checked:$('#adjust-'+k).value])));
  function populate(value){const settings=normalizeAdjustment(value);for(const key of fields){const el=$('#adjust-'+key);if(key==='colorize')el.checked=settings[key];else el.value=settings[key];}}
  function preview(){
    if(closed)return;scheduled=null;const settings=values();
    for(const key of fields.filter(k=>!['colorize','color'].includes(k)))$('#adjust-'+key+'-out').textContent=settings[key]+'%';
    $('#adjust-color').disabled=!settings.colorize;
    editor.adjustmentPreview=$('#adjust-preview').checked?{id:existing?.id,layer:{...(existing??{}),type:'adjustment',visible:existing?.visible??true,opacity:existing?.opacity??100,clip,adjustment:settings}}:null;
    editor.render();
  }
  function schedule(){if(scheduled!==null)cancelAnimationFrame(scheduled);scheduled=requestAnimationFrame(()=>editor.safe(preview));}
  function finish(apply){
    if(closed)return;if(scheduled!==null)cancelAnimationFrame(scheduled);
    const previous=editor.adjustmentPreview;editor.adjustmentPreview=null;
    if(apply){try{if(existing){doc.activeId=existing.id;doc.update({adjustment:values()});}else doc.add('adjustment',{name:'Ajuste de cor UV',clip,adjustment:values()});}catch(e){editor.adjustmentPreview=previous;$('#adjust-error').textContent=e.message;editor.render();return;}}
    closed=true;editor.adjustmentDialog=null;editor.cancelAdjustment=null;dialog.close();dialog.remove();editor.render();
    if(apply)editor.o.toast('Ajuste aplicado à seleção UV. Edite a camada para mudar os valores; Ctrl+Z desfaz.');
  }
  populate(existing?.adjustment);for(const key of fields)$('#adjust-'+key).addEventListener('input',schedule);
  editor.cancelAdjustment=()=>finish(false);
  $('#adjust-preview').onchange=schedule;
  $('#adjust-reset').onclick=()=>{populate({colorize:false});schedule();};
  $('#adjust-cancel').onclick=()=>finish(false);$('#adjust-apply').onclick=()=>finish(true);
  dialog.addEventListener('keydown',e=>e.stopPropagation());dialog.oncancel=e=>{e.preventDefault();finish(false);};
  dialog.addEventListener('close',()=>{if(!closed)finish(false);});
  dialog.showModal();editor.safe(preview);
}
