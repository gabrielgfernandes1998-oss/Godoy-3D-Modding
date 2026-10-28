import {parseYdd} from '../modules/vehicles/src/formats/ydd.js';
import {assertYddRuntimeHeaders,assertYddLodCounts} from './ydd-runtime.js';
import {zipSync,strToU8} from 'fflate';
import {assertFiveMBudget} from './resource-budget.js';
export function mountYddCompactor({native,container,status}){
 const section=document.createElement('details');section.id='ydd-compactor';section.innerHTML='<summary>Compactar YDD já exportado</summary><p class="hint">Compartilha buffers de geometria idênticos entre os LODs e reorganiza as páginas para reduzir a memória reservada. Repara contagens de LOD zeradas e o perfil de material das conversões antigas. Mantém triângulos, posição, escala, UVs, ossos e texturas. Use seu YTD atual. Se o arquivo ainda exceder o orçamento do FiveM, será necessário reduzir a malha na origem.</p><button id="compact-ydd">Escolher YDD e compactar sem perda</button><input id="compact-ydd-file" type="file" accept=".ydd" hidden><p id="compact-ydd-result" class="hint" role="status"></p>';
 container.append(section);const input=section.querySelector('input'),button=section.querySelector('button'),result=section.querySelector('p[role=status]');
 button.onclick=()=>{if(!native?.compactYdd){status('A compactação requer o portable Windows atualizado.');return;}input.click();};
 input.onchange=async()=>{
  const file=input.files[0];input.value='';if(!file)return;button.disabled=true;
  try{
   if(!/\.ydd$/i.test(file.name)||file.size>256*1024*1024)throw Error('Selecione um YDD de até 256 MB.');
   result.textContent='Otimizando buffers e páginas; verificando todos os LODs…';status(result.textContent);
   const output=await native.compactYdd({name:file.name,bytes:new Uint8Array(await file.arrayBuffer())});assertFiveMBudget(output.bytes,file.name);const doc=parseYdd(output.bytes,{maxInputBytes:256*1024*1024});assertYddRuntimeHeaders(doc,file.name);assertYddLodCounts(doc,file.name);
   const archive={[file.name]:output.bytes,'relatorio-ydd.json':strToU8(JSON.stringify(output.report,null,2))},url=URL.createObjectURL(new Blob([zipSync(archive)])),link=document.createElement('a');link.href=url;link.download=file.name.replace(/\.ydd$/i,'')+'-compactado.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
   const r=output.report;result.textContent=`Arquivo ${(r.beforeBytes/1e6).toFixed(2)} → ${(r.afterBytes/1e6).toFixed(2)} MB · sistema ${(r.beforeSystem/1e6).toFixed(2)} → ${(r.afterSystem/1e6).toFixed(2)} MB. Use o YTD original.`;status('YDD compactado exportado. Malha e texturas preservadas.');
  }catch(error){result.textContent=error.message;status(error.message);}finally{button.disabled=false;}
 };
}
