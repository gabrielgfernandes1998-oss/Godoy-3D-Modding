import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {parseYdd} from '../modules/vehicles/src/formats/ydd.js';
import {parseYft} from '../modules/vehicles/src/formats/yft.js';
import {mergeStaticMeshes} from './mesh-core.js';
import {rememberPed,readPed,forgetPed,rememberPedSkeleton,readPedSkeleton,forgetPedSkeleton} from './ped-library.js';
import {SceneHistory,snapshotTransform,applyTransform,sameTransform} from './scene-history.js';
import {nativeMatrix,sourceUnchanged,previewBindMatrix} from './ydd-export.js';
import {visibleBounds,placePivot,pivotDelta,frameScene,placeImportedObj,moveToContext} from './scene-placement.js';
import {serializeAdditions,joinToYdd} from './ydd-additions.js';
import {parseYtd} from '../modules/vehicles/src/formats/ytd.js';
import {zipSync,strToU8} from 'fflate';
import './mesh.css';
const $=s=>document.querySelector(s);
$('#app').innerHTML=`<aside><h1>Malhas e objetos</h1><p>Roupa inteira sobre o ped · exportação YDD</p><button id="open-mesh">Importar YDD / YFT / GLB</button><button id="open-ped">Importar ped de referência</button><button id="open-obj">Adicionar objeto OBJ</button><input id="mesh-file" type="file" accept=".ydd,.yft,.glb" hidden><input id="ped-file" type="file" accept=".ydd,.glb" hidden><input id="obj-file" type="file" accept=".obj" hidden><div class="history-actions"><button id="undo" disabled>Desfazer · Ctrl+Z</button><button id="redo" disabled>Refazer · Ctrl+Y</button></div><button id="fit-scene">Enquadrar cena inteira</button><h2>Peças na cena</h2><div id="tree"></div><h2>Transformação</h2><div class="modes"><button data-mode="translate" class="active">Mover</button><button data-mode="rotate">Girar</button><button data-mode="scale">Escala</button></div><label>Espaço<select id="space"><option value="local">Local</option><option value="world">Global</option></select></label><div id="fields"></div><button id="apply-transform">Aplicar valores</button><button id="focus">Enquadrar peça + referência</button><button id="align-selection">Trazer seleção para a referência</button><label>Vínculo ao ped<select id="attachment-bone"><option value="preserve">Manter pesos e ossos originais</option><option value="pelvis">Cintura · SKEL_Pelvis (acessório rígido)</option><option value="head">Cabeça · SKEL_Head (acessório rígido)</option><option value="spine">Tronco · SKEL_Spine0 (acessório rígido)</option></select></label><h2>Incorporar objeto à peça</h2><label>Peça de destino<select id="merge-target"></select></label><label>Objeto a incorporar<select id="merge-source"><option value="">Selecione um OBJ</option></select></label><button id="merge">Unir OBJ à peça</button><p class="hint">A união mantém a posição e herda os pesos da região mais próxima. Com o YTD associado, a exportação reúne a textura original e os UVs do OBJ em um atlas único. Ctrl+Z desfaz.</p><button id="open-ytd">Associar YTD original para gerar UV</button><input id="ytd-file" type="file" accept=".ytd" hidden><p id="ytd-status" class="hint">Associe o YTD da peça antes de exportar um OBJ com textura própria.</p><label>Resolução do atlas<select id="atlas-resolution"><option value="4096">Ajustar até 4096 · pode reduzir detalhes</option><option value="2048">Ajustar até 2048 · menor arquivo</option><option value="1024">Ajustar até 1024 · menor resolução</option><option value="0">Preservar resolução original</option></select></label><button id="plan-atlas">Calcular tamanho do atlas</button><p id="atlas-plan" class="hint" role="status">Texturas iguais compartilham uma área. Se necessário, a opção Ajustar reduz a resolução da roupa.</p><button id="export-ydd" class="accent">Exportar peça YDD</button><p class="hint">Mova, gire e ajuste a peça inteira sobre o ped. Para prender um boné ao cinto, escolha Cintura antes de exportar. Com OBJ incorporado, use o YTD atualizado que acompanha o YDD no ZIP.</p><details id="advanced-mesh"><summary>OBJ e cópia GLB</summary><button id="export-glb" >Exportar cópia GLB</button><p class="hint">O GLB é uma cópia estática da cena. Para usar a peça com os objetos incorporados no FiveM, use Exportar peça YDD.</p><p class="hint">Sem OBJ, a edição YDD mantém materiais, UVs e LODs originais; com OBJ, os UVs são reorganizados no atlas. O OBJ incorporado acompanha a exportação YDD. O UV automático separa os triângulos do OBJ na área extra do atlas. Essa área começa cinza; materiais MTL e imagens do OBJ não são importados.</p></details></aside><main><div id="viewport"></div><div id="status" role="status">Importe um modelo para começar.</div></main>`;
for(const type of ['position','rotation','scale']) {
  const group=document.createElement('fieldset'),legend=document.createElement('legend');
  legend.textContent={position:'Posição',rotation:'Rotação (graus)',scale:'Escala'}[type];group.append(legend);
  for(const axis of ['x','y','z']) {
    const label=document.createElement('label');label.textContent=axis.toUpperCase();
    const input=document.createElement('input');input.id=`${type}-${axis}`;input.type='number';input.step=type==='rotation'?'1':'0.01';input.value=type==='scale'?'1':'0';label.append(input);group.append(label);
  }
  $('#fields').append(group);
}
const container=$('#viewport'),renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x17151a);container.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.01,10000);
camera.position.set(3,2,4);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(0,1,0);
scene.add(new THREE.HemisphereLight(0xffffff,0x45404d,2.5));
const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,6,5);scene.add(light);
const grid=new THREE.GridHelper(10,20,0x634250,0x302831);scene.add(grid);
const content=new THREE.Group();content.name='GodoyScene';scene.add(content);
const reference=new THREE.Group();reference.name='PedReference';scene.add(reference);
const pedPanel=document.createElement('section');pedPanel.id='ped-library';
pedPanel.innerHTML='<h2>Ped de referência</h2><label>Personagem<select id="ped-gender"><option value="male">Masculino · mp_m_freemode_01</option><option value="female">Feminino · mp_f_freemode_01</option></select></label><p id="ped-status" class="hint" role="status">Consultando biblioteca local…</p><label><input id="ped-visible" type="checkbox" checked> Mostrar ped (transparente)</label><button id="forget-ped">Remover ped salvo deste gênero</button><p class="hint">Importe uma vez um YDD ou GLB autorizado; ele será lembrado neste computador. A referência não entra na exportação GLB.</p>';
$('#open-ped').after(pedPanel);
const pivot=new THREE.Group();pivot.name='SelectionPivot';scene.add(pivot);
const transform=new TransformControls(camera,renderer.domElement);scene.add(transform.getHelper());
transform.addEventListener('dragging-changed',e=>orbit.enabled=!e.value);
transform.addEventListener('objectChange',()=>{if(dragStart){pivotDelta(dragStart.object,pivot,dragStart.anchor,dragStart.world);dirty=true;sync();}});
let selection=null,dirty=false,dragStart=null;
const resources=new Set();
const sourceFiles=new WeakMap();
const history=new SceneHistory({onChange:()=> {
  dirty=history.dirty;refreshTree();sync();
  $('#undo').disabled=!history.undoStack.length;$('#redo').disabled=!history.redoStack.length;
  releaseUnusedResources();
}});
transform.addEventListener('mouseDown',()=>{if(selection)dragStart={object:selection,before:snapshotTransform(selection),anchor:pivot.matrixWorld.clone(),world:selection.matrixWorld.clone()};});
transform.addEventListener('mouseUp',()=> {
  if(!dragStart)return;
  const {object,before}=dragStart;dragStart=null;const after=snapshotTransform(object);
  if(!sameTransform(before,after))recordTransform(object,before,after);
});
function recordTransform(object,before,after) {
  history.execute({label:'Transformação',objects:[object],redo:()=>{applyTransform(object,after);select(object);},undo:()=>{applyTransform(object,before);select(object);}});
}
function collectResources(object,into) {
  object.traverse(item=> {
    if(item.geometry)into.add(item.geometry);
    if(item.material)for(const material of (Array.isArray(item.material)?item.material:[item.material])) {
      into.add(material);for(const value of Object.values(material))if(value?.isTexture)into.add(value);
    }
  });
}
function releaseUnusedResources() {
  const retained=new Set();collectResources(content,retained);
  for(const command of history.commands) {
    for(const object of command.objects??[])collectResources(object,retained);
    for(const geometry of command.geometries??[])retained.add(geometry);
  }
  for(const resource of resources)if(!retained.has(resource)){resource.dispose();resources.delete(resource);}
}
function restoreSelection(object) {
  let parent=object;while(parent&&parent!==content)parent=parent.parent;
  if(parent===content)select(object);else {selection=null;transform.detach();refreshTree();}
}
function addObject(object,{isObj=false}={}) {
  const prior=selection,wasEmpty=!content.children.length&&!reference.children.length;
  object.userData.godoyObj=isObj;collectResources(object,resources);
  history.execute({label:isObj?'Adicionar OBJ':'Importar modelo',objects:[object],
    redo:()=>{content.add(object);select(object);},undo:()=>{object.removeFromParent();restoreSelection(prior);}});
  if(wasEmpty)focus(object);
}
$('#undo').onclick=()=>history.undo();$('#redo').onclick=()=>history.redo();
$('#fit-scene').onclick=()=>focus(scene);
function historyShortcut(event) {
  if(!(event.ctrlKey||event.metaKey)||event.altKey||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)||event.target.isContentEditable)return;
  const key=event.key.toLowerCase();if(!['z','y'].includes(key))return;
  event.preventDefault();event.stopPropagation();
  if(transform.dragging)return;
  (key==='y'||event.shiftKey)?history.redo():history.undo();
}
window.addEventListener('keydown',historyShortcut);
window.addEventListener('message',event=> {
  if(event.source!==window.parent||event.origin!==location.origin||event.data?.type!=='godoy-mesh-history'||transform.dragging)return;
  if(event.data.action==='undo')history.undo();else if(event.data.action==='redo')history.redo();
});
const status=message=>$('#status').textContent=message;
const resize=()=> {const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();};
new ResizeObserver(resize).observe(container);resize();
renderer.setAnimationLoop(()=>{orbit.update();renderer.render(scene,camera);});
function sync() {
  if(!selection) return;
  $('#attachment-bone').value=selection.userData.attachmentBone??'preserve';
  for(const type of ['position','rotation','scale']) for(const axis of ['x','y','z']) $(`#${type}-${axis}`).value=(selection[type][axis]*(type==='rotation'?180/Math.PI:1)).toFixed(4);
}
function select(object) {while(object.parent&&object.parent!==content)object=object.parent;const changedSelection=selection!==object;selection=object;if(changedSelection)$('#atlas-plan').textContent='Clique Calcular tamanho do atlas para ver a resolução desta peça.';$('#export-ydd').textContent=sourceFiles.get(object)?.additions?.length?'Exportar YDD + atlas UV':'Exportar peça YDD';const ytd=sourceFiles.get(object)?.ytd;$('#ytd-status').textContent=ytd?`YTD associado à peça: ${ytd.name}`:'Associe o YTD da peça antes de exportar um OBJ com textura própria.';if(placePivot(pivot,object))transform.attach(pivot);else transform.detach();sync();refreshTree();}
function refreshTree() {
  $('#tree').replaceChildren();
  for(const object of content.children) {
    const button=document.createElement('button');button.textContent=object.name||'Peça';button.classList.toggle('selected',object===selection);button.onclick=()=>select(object);$('#tree').append(button);
  }
  const sourceValue=selection?.userData.godoyObj?selection.uuid:$('#merge-source').value,targetValue=sourceFiles.has(selection)?selection.uuid:$('#merge-target').value;
  $('#merge-source').replaceChildren(new Option('Selecione um OBJ',''));
  content.children.filter(a=>a.userData.godoyObj).forEach(a=>$('#merge-source').append(new Option(a.name,a.uuid)));
  if([...$('#merge-source').options].some(o=>o.value===sourceValue))$('#merge-source').value=sourceValue;
  $('#merge-target').replaceChildren();content.children.filter(a=>!a.userData.godoyObj).forEach(a=>$('#merge-target').append(new Option(a.name,a.uuid)));
  if([...$('#merge-target').options].some(o=>o.value===targetValue))$('#merge-target').value=targetValue;

}
function contextBounds(exclude=null) {
  const box=new THREE.Box3();
  for(const object of content.children)if(object!==exclude&&!object.userData.godoyObj)box.union(visibleBounds(object));
  if(reference.visible)box.union(visibleBounds(reference));return box;
}
function focus(object=selection??content) {
  const box=object===scene?visibleBounds(content).union(visibleBounds(reference)):visibleBounds(object);
  if(object!==scene&&object!==content)box.union(contextBounds(object));
  frameScene(camera,orbit,box);
}
const ray=new THREE.Raycaster();let down=null;
renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
renderer.domElement.addEventListener('pointerup',e=> {
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>3||transform.dragging||transform.axis) return;
  const box=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-box.left)/box.width*2-1,-(e.clientY-box.top)/box.height*2+1),camera);
  const hit=ray.intersectObject(content,true)[0];if(hit) select(hit.object);
});
async function load(file,isPed=false,expectedSequence=null,prepareOnly=false) {
  if(!file) return;if(file.size>80*1024*1024) throw Error('Limite de 80 MB por arquivo.');
  const buffer=await file.arrayBuffer();let group;
  if(/\.glb$/i.test(file.name)) group=(await new GLTFLoader().parseAsync(buffer,'')).scene;
  else {
    const doc=/\.yft$/i.test(file.name)?parseYft(buffer):parseYdd(buffer);group=new THREE.Group();
    for(const d of doc.drawables) {
      const drawable=new THREE.Group();drawable.name=d.name;group.add(drawable);
      for(let lod=0;lod<d.lods.length;lod++) {
        const lodGroup=new THREE.Group();lodGroup.name=`LOD ${d.lods[lod]}`;lodGroup.visible=lod===0;drawable.add(lodGroup);
        d.readLod(lod).forEach((data,i)=> {
          const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(data.positions,3));g.setAttribute('uv',new THREE.BufferAttribute(data.uvs,2));g.setIndex(new THREE.BufferAttribute(data.indices,1));
          if(data.normals)g.setAttribute('normal',new THREE.BufferAttribute(data.normals,3));else g.computeVertexNormals();
          if(!data.hasSkin&&d.skeletonPointer!=null)g.applyMatrix4(previewBindMatrix(doc.resource,d.skeletonPointer,data.boneIndex));
          const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:isPed?0x708497:0xd07186,roughness:.8,side:THREE.DoubleSide}));
          mesh.name=`mesh_${i} · ${d.shaders[data.shaderIndex]?.diffuseName||'material '+data.shaderIndex}`;lodGroup.add(mesh);
        });
      }
    }
  }
  group.name=(isPed?'Ped · ':'')+file.name;
  if(prepareOnly)return group;
  if(isPed) {
    if(expectedSequence!==null&&expectedSequence!==restoreSequence) {disposeGroup(group);return false;}
    installPed(group);
    $('#ped-status').textContent=`Ped carregado: ${file.name}`;return true;
  }
  if(/\.ydd$/i.test(file.name)) {
    const geometries=new Map();group.traverse(o=>{if(o.isMesh)geometries.set(o,o.geometry);});
    sourceFiles.set(group,{bytes:new Uint8Array(buffer),name:file.name,geometries});
  }
  addObject(group);
  const gender=/mp_f_freemode/i.test(file.name)?'female':/mp_m_freemode/i.test(file.name)?'male':$('#ped-gender').value;
  if(gender!==$('#ped-gender').value) {$('#ped-gender').value=gender;await restorePed();}
  status(`${file.name} carregado. Peça inteira selecionada. Ajuste sobre o ped e exporte em YDD.`);
}
function installPed(group) {
  clearReference();group.traverse(object=> {
    if(!object.isMesh)return;
    for(const material of (Array.isArray(object.material)?object.material:[object.material])) {
      material.transparent=true;material.opacity=.4;material.depthWrite=false;
    }
  });reference.add(group);reference.visible=$('#ped-visible').checked;focus(scene);
}
function disposeGroup(group) {
  group.traverse(object=> {
    object.geometry?.dispose();
    if(object.material)for(const material of (Array.isArray(object.material)?object.material:[object.material])) {
      for(const value of Object.values(material))if(value?.isTexture)value.dispose();
      material.dispose();
    }
  });
}
function clearReference() {disposeGroup(reference);reference.clear();}
let restoreSequence=0;
async function restorePed() {
  const sequence=++restoreSequence,gender=$('#ped-gender').value;
  const file=await readPed(gender);if(sequence!==restoreSequence)return;
  if(file)await load(file,true,sequence);
  else {clearReference();$('#ped-status').textContent='Nenhum ped salvo para este gênero. Use Importar ped de referência.';}
}
const guard=fn=>async(...args)=>{try{await fn(...args);}catch(e){status(e.message);}};
$('#open-mesh').onclick=()=>$('#mesh-file').click();$('#open-ped').onclick=()=>$('#ped-file').click();$('#open-obj').onclick=()=>$('#obj-file').click();
$('#mesh-file').onchange=e=>{const file=e.target.files[0];e.target.value='';guard(()=>load(file))();};
$('#ped-file').onchange=e=>guard(async()=> {
  const file=e.target.files[0];if(!file)return;
  const sequence=++restoreSequence,gender=$('#ped-gender').value;
  if(!await load(file,true,sequence))return;
  try {await rememberPed(gender,file);if(/\.ydd$/i.test(file.name))await rememberPedSkeleton(gender,new Uint8Array(await file.arrayBuffer()));else await forgetPedSkeleton(gender);$('#ped-status').textContent=`Ped salvo e carregado: ${file.name}`;}
  catch(error) {$('#ped-status').textContent=`Ped carregado, mas não salvo: ${error.message}`;}
  finally {e.target.value='';}
})();
$('#ped-gender').onchange=guard(restorePed);
$('#ped-visible').onchange=e=>reference.visible=e.target.checked;
$('#forget-ped').onclick=guard(async()=> {++restoreSequence;await forgetPed($('#ped-gender').value);await forgetPedSkeleton($('#ped-gender').value);clearReference();$('#ped-status').textContent='Ped removido da biblioteca local. O arquivo original foi preservado.';});
restorePed().catch(error=>$('#ped-status').textContent=`Biblioteca local indisponível: ${error.message}`);
$('#obj-file').onchange=e=>guard(async()=> {
  const file=e.target.files[0];if(!file)return;if(file.size>20*1024*1024)throw Error('OBJ acima de 20 MB.');
  const object=new OBJLoader().parse(await file.text());let vertices=0;
  object.traverse(m=>{if(m.isMesh){vertices+=m.geometry.attributes.position.count;m.material=new THREE.MeshStandardMaterial({color:0xdca05c,side:THREE.DoubleSide});}});
  if(!vertices||vertices>1000000)throw Error('OBJ vazio ou acima de 1 milhão de vértices.');
  object.name=file.name;const placement=placeImportedObj(object,contextBounds());addObject(object,{isObj:true});if(placement.adjusted)focus(object);e.target.value='';
  status(placement.adjusted?`OBJ adicionado perto da referência; origem distante/unidades ajustadas (escala ×${placement.factor.toPrecision(4)}). O arquivo original foi preservado. Ctrl+Z desfaz a importação.`:'OBJ adicionado. O gizmo acompanha o centro da peça. Enquadrar peça + referência mantém o YDD e o ped na vista.');
})();
document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=> {
  transform.setMode(button.dataset.mode);document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b===button));
});
$('#space').onchange=e=>transform.setSpace(e.target.value);
$('#apply-transform').onclick=guard(()=> {
  if(!selection)throw Error('Selecione uma peça na cena.');
  const values={};for(const type of ['position','rotation','scale']) {
    values[type]=['x','y','z'].map(axis=>Number($(`#${type}-${axis}`).value));
    if(values[type].some(v=>!Number.isFinite(v)||Math.abs(v)>100000||(type==='scale'&&v<=0)))throw Error('Use valores finitos e escala positiva até 100000.');
  }
  const object=selection,before=snapshotTransform(object);object.position.fromArray(values.position);object.rotation.set(...values.rotation.map(v=>v*Math.PI/180));object.scale.fromArray(values.scale);const after=snapshotTransform(object);if(!sameTransform(before,after))recordTransform(object,before,after);sync();status('Transformação aplicada. Ctrl+Z desfaz.');
});
$('#focus').onclick=()=>focus();
$('#align-selection').onclick=guard(()=> {
  if(!selection)throw Error('Selecione o OBJ ou a peça a reposicionar.');
  const object=selection,before=snapshotTransform(object);moveToContext(object,contextBounds(object));const after=snapshotTransform(object);
  if(!sameTransform(before,after))recordTransform(object,before,after);focus(object);status('Seleção trazida para a referência. Ctrl+Z restaura a posição anterior.');
});
$('#merge').onclick=guard(()=> {
  const source=content.children.find(a=>a.userData.godoyObj&&a.uuid===$('#merge-source').value);
  const destination=content.children.find(o=>o.uuid===$('#merge-target').value);
  if(!source||!destination||source===destination)throw Error('Escolha um OBJ e uma peça de destino diferentes.');
  const record=sourceFiles.get(destination);
  if(record){
    serializeAdditions(destination,[...(record.additions??[]),source]);
    joinToYdd(content,destination,source,record,history,select);
    status('OBJ incorporado à peça. Mova o conjunto e use Exportar peça YDD. O objeto usa o material/YTD da região mais próxima. Ctrl+Z desfaz.');return;
  }
  let target=null;destination?.traverse(o=>{if(!target&&o.isMesh)target=o;});
  if(!target||!source)throw Error('Selecione a peça de destino e escolha um OBJ.');
  let ancestor=destination;while(ancestor){if(ancestor===source)throw Error('O destino precisa estar fora do OBJ escolhido.');ancestor=ancestor.parent;}
  const old=target.geometry,geometry=mergeStaticMeshes(target,source),index=content.children.indexOf(source);resources.add(geometry);
  history.execute({label:'Unir geometria',objects:[target,source],geometries:[old,geometry],
    redo:()=>{target.geometry=geometry;source.removeFromParent();select(target);},
    undo:()=>{target.geometry=old;content.add(source);content.children.splice(content.children.indexOf(source),1);content.children.splice(index,0,source);select(target);}});
  status('Geometria unida. Ctrl+Z restaura a malha e o OBJ separados. Exporte em GLB.');
});
$('#attachment-bone').onchange=()=> {
  if(!selection)return;
  const object=selection,before=object.userData.attachmentBone??'preserve',after=$('#attachment-bone').value;
  if(before!==after)history.execute({label:'Vínculo ao ped',objects:[object],redo:()=>{object.userData.attachmentBone=after;select(object);},undo:()=>{object.userData.attachmentBone=before;select(object);}});
};
$('#open-ytd').onclick=()=>$('#ytd-file').click();
$('#ytd-file').onchange=guard(async event=> {
  const file=event.target.files[0];event.target.value='';if(!file)return;
  const source=sourceFiles.get(selection);if(!source)throw Error('Selecione a peça YDD que receberá este YTD.');
  const bytes=new Uint8Array(await file.arrayBuffer());parseYtd(bytes);
  source.ytd={name:file.name,bytes};
  $('#atlas-plan').textContent='YTD alterado. Clique Calcular tamanho do atlas para ver a resolução final.';
  $('#ytd-status').textContent=`YTD associado à peça: ${file.name}`;
  status('YTD associado. O conjunto será exportado em ZIP com YDD, YTD atualizado e mapas UV PNG.');
});
function showAtlasPlan(plan) {
  const text=`Atlas ${plan.width} × ${plan.height} · ${plan.regions} área(s) de textura para ${plan.materials} material(is). `+(plan.reduced?`A textura da roupa será reduzida para 1/${plan.divisor} da resolução em cada eixo.`:'Resolução da roupa preservada.')+(plan.auxiliaryResolution>0&&plan.auxiliaryResolution<plan.width?` Mapas normal/brilho limitados a ${plan.auxiliaryResolution} × ${plan.auxiliaryResolution} para caber no YDD.`:'');
  $('#atlas-plan').textContent=text+(plan.fits?'':' Excede o limite: escolha Ajustar até 4096.');
  return text;
}
$('#atlas-resolution').onchange=()=>$('#atlas-plan').textContent='Opção alterada. Clique Calcular tamanho do atlas para ver a resolução final.';
$('#plan-atlas').onclick=guard(async()=> {
  const object=selection,source=sourceFiles.get(object);
  if(!source?.ytd||!source.additions?.length)throw Error('Una o OBJ ao YDD e associe o YTD antes de calcular o atlas.');
  if(!native?.exportYdd)throw Error('O cálculo requer o portable Windows atualizado.');
  $('#plan-atlas').disabled=true;$('#export-ydd').disabled=true;$('#atlas-plan').textContent='Calculando áreas e resolução…';
  try {
    const additions=serializeAdditions(object,source.additions,{texturePrefix:'godoy_obj_plan'});
    const plan=await native.exportYdd({bytes:source.bytes,ytdBytes:source.ytd.bytes,additions,matrix:nativeMatrix(object),bone:'preserve',atlas:true,atlasPlan:true,atlasMaxResolution:Number($('#atlas-resolution').value)});
    showAtlasPlan(plan);
  } finally {$('#plan-atlas').disabled=false;$('#export-ydd').disabled=false;}
});
async function atlasImages(parsed,entry) {
  const canvas=document.createElement('canvas');canvas.width=entry.width;canvas.height=entry.height;
  const ctx=canvas.getContext('2d');
  const png=async()=>{const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));return new Uint8Array(await blob.arrayBuffer());};
  ctx.putImageData(new ImageData(entry.decode(),entry.width,entry.height),0,0);const texture=await png();
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#202020';ctx.lineWidth=1;
  for(const drawable of parsed.drawables)for(const mesh of drawable.readLod(0)) {
    const {indices,uvs}=mesh;
    for(let f=0;f<indices.length;f+=3){ctx.beginPath();for(let c=0;c<3;c++){const i=indices[f+c],x=uvs[i*2]*canvas.width,y=(1-uvs[i*2+1])*canvas.height;c?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.stroke();}
  }
  return {texture,uv:await png()};
}
$('#export-ydd').onclick=guard(async()=> {
  const object=selection,source=sourceFiles.get(object);
  if(!source)throw Error('Una o OBJ à peça de destino e selecione o conjunto YDD para exportar.');
  if(!native?.exportYdd)throw Error('A exportação YDD requer o portable Windows atualizado.');
  if(!sourceUnchanged(object,source))throw Error('A geometria original foi alterada por uma operação incompatível. Desfaça essa alteração.');
  if(source.additions?.length&&!source.ytd)throw Error('Associe o YTD original desta peça para gerar o UV e a textura do OBJ.');
  const textured=!!source.additions?.length;
  const prefix=`godoy_obj_${crypto.randomUUID().replaceAll('-','').slice(0,12)}`;
  const additions=serializeAdditions(object,source.additions,textured?{texturePrefix:prefix}:{});
  $('#export-ydd').disabled=true;$('#plan-atlas').disabled=true;status('Gravando YDD, UV e texturas nativas; verificando o conjunto…');
  try {
    const request={bytes:source.bytes,additions,matrix:nativeMatrix(object),bone:object.userData.attachmentBone??'preserve',...(textured?{ytdBytes:source.ytd.bytes,atlas:true,atlasMaxResolution:Number($('#atlas-resolution').value)}:{})};
    let plan=null;
    if(textured) {
      plan=await native.exportYdd({...request,atlasPlan:true});showAtlasPlan(plan);
      if(!plan.fits)throw Error('Preservar resolução exigiria atlas grande demais. Escolha Ajustar até 4096 e exporte novamente.');
      status(`Gerando atlas ${plan.width} × ${plan.height}…${plan.reduced?' Redução de resolução selecionada: 1/'+plan.divisor+' por eixo.':''}`);
    }
    const result=await native.exportYdd({...request,pedBytes:await readPedSkeleton($('#ped-gender').value)});
    const bytes=textured?result.ydd:result;
    const parsed=parseYdd(bytes);if(!parsed.drawables.length)throw Error('YDD exportado inválido.');
    let output=bytes,name=source.name;
    if(textured) {
      const dictionary=parseYtd(result.ytd);
      if(dictionary.textures.length!==1)throw Error('O atlas precisa conter uma única diffuse no YTD.');
      const files={[source.name]:bytes,[source.ytd.name]:result.ytd};
      const images=await atlasImages(parsed,dictionary.textures[0]);
      files['UV/atlas-uv.png']=images.uv;files['UV/atlas-textura.png']=images.texture;
      files['atlas-info.json']=strToU8(JSON.stringify(plan,null,2));
      files['LEIA-ME.txt']=strToU8('Abra o YDD e o YTD deste ZIP juntos em Pintura de roupas. A textura principal contém a roupa na região esquerda e o OBJ na direita. Use Mapa UV para pintar cada área. Exporte o YTD editado e use o par YDD/YTD no FiveM. UV/atlas-uv.png é o guia transparente; UV/atlas-textura.png é a imagem final do atlas. Os UVs da roupa foram remapeados na região esquerda. O arquivo atlas-info.json informa a resolução final e eventual redução selecionada. As ilhas do OBJ ocupam a região direita, inicialmente cinza. Os mapas auxiliares disponíveis foram reorganizados e incorporados no YDD. Teste as animações no jogo.');
      output=zipSync(files);name=source.name.replace(/\.ydd$/i,'')+'-YDD-YTD-UV.zip';
    }
    const url=URL.createObjectURL(new Blob([output],{type:textured?'application/zip':'application/octet-stream'}));
    const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
    if(content.children.length===1)history.markSaved();
    status(textured?'Conjunto exportado. Extraia o ZIP, abra YDD + YTD em Pintura de roupas e edite o atlas único: roupa à esquerda e OBJ à direita.':'YDD exportado e reaberto para verificação. Use com o YTD original no recurso FiveM e teste as animações no jogo.');
  } finally {$('#export-ydd').disabled=false;$('#plan-atlas').disabled=false;}
});
$('#export-glb').onclick=guard(async()=> {
  if(!content.children.length)throw Error('A cena está vazia.');
  const buffer=await new GLTFExporter().parseAsync(content,{binary:true,onlyVisible:false});
  const url=URL.createObjectURL(new Blob([buffer],{type:'model/gltf-binary'}));const link=document.createElement('a');link.href=url;link.download='godoy-scene.glb';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);history.markSaved();status('GLB exportado com todos os objetos e LODs. Este arquivo não é um recurso nativo FiveM.');
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});

const native=window.parent.godoyNative??window.godoyNative;
const nativePanel=document.createElement('section');nativePanel.id='native-ped-panel';
nativePanel.innerHTML='<h2>CodeWalker · ped do GTA</h2><button id="configure-native">Selecionar diretório do GTA V</button><button id="load-native-ped">Carregar ped deste gênero do GTA</button><p id="native-status" class="hint" role="status">Procurando GTA V Legacy nas bibliotecas Steam… O preview usa os componentes base em pose estática.</p>';
$('#ped-library').append(nativePanel);
if(!native) {
  $('#configure-native').disabled=true;$('#load-native-ped').disabled=true;
  $('#native-status').textContent='A integração CodeWalker está disponível no portable Windows. No navegador, importe um YDD/GLB.';
} else {
  $('#load-native-ped').disabled=true;
  native.status().then(value=> {
    if(!value.available){$('#configure-native').disabled=true;$('#load-native-ped').disabled=true;$('#native-status').textContent='A ponte CodeWalker requer o portable Windows.';return;}
    $('#load-native-ped').disabled=!value.configured;$('#configure-native').hidden=value.configured;$('#native-status').textContent=value.configured?'GTA V Legacy encontrado. Selecione o gênero e carregue o ped.':value.coreAvailable?'GTA V Legacy não encontrado. Selecione o diretório do jogo.':'Núcleo CodeWalker ausente. Extraia o portable completo.';
  }).catch(error=>$('#native-status').textContent=error.message);
  $('#configure-native').onclick=guard(async()=> {
    $('#configure-native').disabled=true;
    try {const result=await native.configure();if(!result.canceled){$('#load-native-ped').disabled=false;$('#configure-native').hidden=true;$('#native-status').textContent=`CodeWalker ${result.version} conectado. Selecione o gênero e carregue o ped.`;}}
    catch(error){$('#native-status').textContent=error.message;}
    finally{$('#configure-native').disabled=false;}
  });
  $('#load-native-ped').onclick=guard(async()=> {
    $('#load-native-ped').disabled=true;$('#configure-native').disabled=true;
    $('#native-status').textContent='Lendo os componentes base em x64v.rpf. Aguarde; a instalação do jogo não será alterada…';
    const gender=$('#ped-gender').value,sequence=++restoreSequence,group=new THREE.Group();
    try {
      const result=await native.loadPed(gender);
      for(const asset of result.assets)group.add(await load(new File([asset.bytes],asset.name),true,null,true));
      group.name=`Ped · ${result.ped}`;
      if(sequence!==restoreSequence){disposeGroup(group);return;}
      await rememberPedSkeleton(gender,result.assets[0].bytes);
      installPed(group);$('#ped-status').textContent=`Ped do GTA carregado: ${result.ped}`;
      $('#native-status').textContent='Ped base carregado via CodeWalker. Pose estática; roupas da cena preservadas.'+(result.missing.length?' Componentes ausentes: '+result.missing.join(', '):'');
      try {
        const data=await new GLTFExporter().parseAsync(group,{binary:true,onlyVisible:false});
        await rememberPed(gender,new File([data],result.ped+'.glb'));
      }catch(error){$('#native-status').textContent+=' Não foi possível guardar a cópia local: '+error.message;}
    } catch(error) {if(!group.parent)disposeGroup(group);$('#native-status').textContent=error.message;}
    finally{$('#load-native-ped').disabled=false;$('#configure-native').disabled=false;}
  });
}
