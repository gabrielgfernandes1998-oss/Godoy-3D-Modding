import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {parseYdd} from '../modules/vehicles/src/formats/ydd.js';
import {parseYft} from '../modules/vehicles/src/formats/yft.js';
import {mergeStaticMeshes} from './mesh-core.js';
import {rememberPed,readPed,forgetPed} from './ped-library.js';
import {SceneHistory,snapshotTransform,applyTransform,sameTransform} from './scene-history.js';
import './mesh.css';
const $=s=>document.querySelector(s);
$('#app').innerHTML=`<aside><h1>Malhas e objetos</h1><p>Ajuste de cena · exportação GLB</p><button id="open-mesh">Importar YDD / YFT / GLB</button><button id="open-ped">Importar ped de referência</button><button id="open-obj">Adicionar objeto OBJ</button><input id="mesh-file" type="file" accept=".ydd,.yft,.glb" hidden><input id="ped-file" type="file" accept=".ydd,.glb" hidden><input id="obj-file" type="file" accept=".obj" hidden><div class="history-actions"><button id="undo" disabled>Desfazer · Ctrl+Z</button><button id="redo" disabled>Refazer · Ctrl+Y</button></div><button id="fit-scene">Enquadrar cena inteira</button><h2>Cena · drawables / LODs / meshes</h2><div id="tree"></div><h2>Transformação</h2><div class="modes"><button data-mode="translate" class="active">Mover</button><button data-mode="rotate">Girar</button><button data-mode="scale">Escala</button></div><label>Espaço<select id="space"><option value="local">Local</option><option value="world">Global</option></select></label><div id="fields"></div><button id="apply-transform">Aplicar valores</button><button id="focus">Centralizar seleção</button><label>Adicionar à malha selecionada<select id="merge-source"><option value="">Selecione um OBJ</option></select></label><button id="merge">Unir geometria + UV</button><button id="export-glb" class="accent">Exportar cena GLB</button><p class="hint">A união usa o material de destino e preserva os UVs existentes. Não cria atlas nem pesos de skinning. O GLB é uma cena estática; não substitui YDD/YFT no FiveM.</p><p class="hint">O ped não acompanha o aplicativo. Importe seu modelo autorizado. A árvore mostra objetos de renderização, não toda a hierarquia física/bones do YFT.</p></aside><main><div id="viewport"></div><div id="status" role="status">Importe um modelo para começar.</div></main>`;
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
const transform=new TransformControls(camera,renderer.domElement);scene.add(transform.getHelper());
transform.addEventListener('dragging-changed',e=>orbit.enabled=!e.value);
transform.addEventListener('objectChange',()=>{dirty=true;sync();});
let selection=null,dirty=false,dragStart=null;
const resources=new Set();
const history=new SceneHistory({onChange:()=> {
  dirty=history.dirty;refreshTree();sync();
  $('#undo').disabled=!history.undoStack.length;$('#redo').disabled=!history.redoStack.length;
  releaseUnusedResources();
}});
transform.addEventListener('mouseDown',()=>{if(selection)dragStart={object:selection,before:snapshotTransform(selection)};});
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
  for(const type of ['position','rotation','scale']) for(const axis of ['x','y','z']) $(`#${type}-${axis}`).value=(selection[type][axis]*(type==='rotation'?180/Math.PI:1)).toFixed(4);
}
function select(object) {selection=object;transform.attach(object);sync();refreshTree();}
function refreshTree() {
  $('#tree').replaceChildren();
  const visit=(object,depth)=> {
    const button=document.createElement('button');button.textContent=`${object.isMesh?'◇':'▸'} ${object.name||object.type}`;button.style.paddingLeft=`${10+depth*12}px`;button.classList.toggle('selected',object===selection);button.onclick=()=>select(object);$('#tree').append(button);
    object.children.forEach(child=>visit(child,depth+1));
  };content.children.forEach(child=>visit(child,0));
  $('#merge-source').replaceChildren(new Option('Selecione um OBJ',''));
  content.children.filter(a=>a.userData.godoyObj).forEach(a=>$('#merge-source').append(new Option(a.name,a.uuid)));
}
function focus(object=selection??content) {
  const box=object===scene?new THREE.Box3().setFromObject(content).union(new THREE.Box3().setFromObject(reference)):new THREE.Box3().setFromObject(object);if(box.isEmpty()) return;
  const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()).length();
  orbit.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(1,.6,1).normalize().multiplyScalar(Math.max(size*1.5,.5)));orbit.update();
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
  addObject(group);
  const gender=/mp_f_freemode/i.test(file.name)?'female':/mp_m_freemode/i.test(file.name)?'male':$('#ped-gender').value;
  if(gender!==$('#ped-gender').value) {$('#ped-gender').value=gender;await restorePed();}
  status(`${file.name} carregado. Cena editável; exportação GLB estática.`);
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
const guard=fn=>async()=>{try{await fn();}catch(e){status(e.message);}};
$('#open-mesh').onclick=()=>$('#mesh-file').click();$('#open-ped').onclick=()=>$('#ped-file').click();$('#open-obj').onclick=()=>$('#obj-file').click();
$('#mesh-file').onchange=e=>{const file=e.target.files[0];e.target.value='';guard(()=>load(file))();};
$('#ped-file').onchange=e=>guard(async()=> {
  const file=e.target.files[0];if(!file)return;
  const sequence=++restoreSequence,gender=$('#ped-gender').value;
  if(!await load(file,true,sequence))return;
  try {await rememberPed(gender,file);$('#ped-status').textContent=`Ped salvo e carregado: ${file.name}`;}
  catch(error) {$('#ped-status').textContent=`Ped carregado, mas não salvo: ${error.message}`;}
  finally {e.target.value='';}
})();
$('#ped-gender').onchange=guard(restorePed);
$('#ped-visible').onchange=e=>reference.visible=e.target.checked;
$('#forget-ped').onclick=guard(async()=> {++restoreSequence;await forgetPed($('#ped-gender').value);clearReference();$('#ped-status').textContent='Ped removido da biblioteca local. O arquivo original foi preservado.';});
restorePed().catch(error=>$('#ped-status').textContent=`Biblioteca local indisponível: ${error.message}`);
$('#obj-file').onchange=e=>guard(async()=> {
  const file=e.target.files[0];if(!file)return;if(file.size>20*1024*1024)throw Error('OBJ acima de 20 MB.');
  const object=new OBJLoader().parse(await file.text());let vertices=0;
  object.traverse(m=>{if(m.isMesh){vertices+=m.geometry.attributes.position.count;m.material=new THREE.MeshStandardMaterial({color:0xdca05c,side:THREE.DoubleSide});}});
  if(!vertices||vertices>1000000)throw Error('OBJ vazio ou acima de 1 milhão de vértices.');
  object.name=file.name;addObject(object,{isObj:true});e.target.value='';
  status('OBJ adicionado sem mudar a câmera. Os modelos e o ped foram preservados. Use Enquadrar cena inteira se precisar.');
})();
document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=> {
  transform.setMode(button.dataset.mode);document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b===button));
});
$('#space').onchange=e=>transform.setSpace(e.target.value);
$('#apply-transform').onclick=guard(()=> {
  if(!selection)throw Error('Selecione um objeto na árvore.');
  const values={};for(const type of ['position','rotation','scale']) {
    values[type]=['x','y','z'].map(axis=>Number($(`#${type}-${axis}`).value));
    if(values[type].some(v=>!Number.isFinite(v)||Math.abs(v)>100000||(type==='scale'&&v<=0)))throw Error('Use valores finitos e escala positiva até 100000.');
  }
  const object=selection,before=snapshotTransform(object);object.position.fromArray(values.position);object.rotation.set(...values.rotation.map(v=>v*Math.PI/180));object.scale.fromArray(values.scale);const after=snapshotTransform(object);if(!sameTransform(before,after))recordTransform(object,before,after);sync();status('Transformação aplicada. Ctrl+Z desfaz.');
});
$('#focus').onclick=()=>focus();
$('#merge').onclick=guard(()=> {
  const source=content.children.find(a=>a.userData.godoyObj&&a.uuid===$('#merge-source').value);
  if(!selection?.isMesh||!source)throw Error('Selecione uma malha na árvore e escolha um OBJ.');
  let ancestor=selection;while(ancestor){if(ancestor===source)throw Error('O destino precisa estar fora do OBJ escolhido.');ancestor=ancestor.parent;}
  const target=selection,old=target.geometry,geometry=mergeStaticMeshes(target,source),index=content.children.indexOf(source);resources.add(geometry);
  history.execute({label:'Unir geometria',objects:[target,source],geometries:[old,geometry],
    redo:()=>{target.geometry=geometry;source.removeFromParent();select(target);},
    undo:()=>{target.geometry=old;content.add(source);content.children.splice(content.children.indexOf(source),1);content.children.splice(index,0,source);select(target);}});
  status('Geometria unida. Ctrl+Z restaura a malha e o OBJ separados. Exporte em GLB.');
});
$('#export-glb').onclick=guard(async()=> {
  if(!content.children.length)throw Error('A cena está vazia.');
  const buffer=await new GLTFExporter().parseAsync(content,{binary:true,onlyVisible:false});
  const url=URL.createObjectURL(new Blob([buffer],{type:'model/gltf-binary'}));const link=document.createElement('a');link.href=url;link.download='godoy-scene.glb';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);history.markSaved();status('GLB exportado com todos os objetos e LODs. Este arquivo não é um recurso nativo FiveM.');
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});

const native=window.parent.godoyNative??window.godoyNative;
const nativePanel=document.createElement('section');nativePanel.id='native-ped-panel';
nativePanel.innerHTML='<h2>CodeWalker · ped do GTA</h2><button id="configure-native">Configurar CodeWalker + GTA V</button><button id="load-native-ped">Carregar ped deste gênero do GTA</button><p id="native-status" class="hint" role="status">Selecione a pasta do CodeWalker e uma instalação GTA V Legacy. O preview usa os componentes base em pose estática.</p>';
$('#ped-library').append(nativePanel);
if(!native) {
  $('#configure-native').disabled=true;$('#load-native-ped').disabled=true;
  $('#native-status').textContent='A integração CodeWalker está disponível no portable Windows. No navegador, importe um YDD/GLB.';
} else {
  $('#load-native-ped').disabled=true;
  native.status().then(value=> {
    if(!value.available){$('#configure-native').disabled=true;$('#load-native-ped').disabled=true;$('#native-status').textContent='A ponte CodeWalker requer o portable Windows.';return;}
    $('#load-native-ped').disabled=!value.configured;if(value.configured)$('#native-status').textContent='Pastas configuradas. Pronto para solicitar o ped base.';
  }).catch(error=>$('#native-status').textContent=error.message);
  $('#configure-native').onclick=guard(async()=> {
    $('#configure-native').disabled=true;
    try {const result=await native.configure();if(!result.canceled){$('#load-native-ped').disabled=false;$('#native-status').textContent=`CodeWalker ${result.version} conectado. Selecione o gênero e carregue o ped.`;}}
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
