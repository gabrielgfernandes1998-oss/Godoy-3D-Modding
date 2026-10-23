import {attachAssetBatch} from '../../../src/asset-batch.js';
import "./style.css";
import { LayerDocument } from "./editor/layers.js";
import {
  WorkspaceEditor,
  layerPanels,
  propertyPanels,
} from "./editor/workspace.js";
import { island as uvIsland, topology, uvFace } from "./editor/uv-islands.js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { parseYdd } from "./formats/ydd.js";
import { parseYtd, writeYtd, canWriteTexture } from "./formats/ytd.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  createIcons,
  Save,
  Download,
  Shirt,
  FolderOpen,
  ImagePlus,
  Eye,
  Images,
  Plus,
  Sparkles,
  Box,
  Scan,
  MousePointer2,
  Paintbrush,
  Eraser,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Focus,
  SlidersHorizontal,
  Ellipsis,
  Check,
  Maximize2,
  Rotate3d,
  Type,
  Move,
  Slash,
  RectangleHorizontal,
  Circle,
  PenTool,
  PaintBucket,
  Pipette,
  LassoSelect,
} from "lucide";
const icons = {
  Save,
  Download,
  Shirt,
  FolderOpen,
  ImagePlus,
  Eye,
  Images,
  Plus,
  Sparkles,
  Box,
  Scan,
  MousePointer2,
  Paintbrush,
  Eraser,
  Image: ImageIcon,
  Undo2,
  Redo2,
  Focus,
  SlidersHorizontal,
  Ellipsis,
  Check,
  Maximize2,
  Rotate3d,
  Type,
  Move,
  Slash,
  RectangleHorizontal,
  Circle,
  PenTool,
  PaintBucket,
  Pipette,
  LassoSelect,
};
const icon = (name) => `<i data-lucide="${name}"></i>`;
document.querySelector("#app").innerHTML = `
<header><div class="brand"><img src="../../branding/icon.png" alt="" class="app-symbol"><span>Godoy Cloth <em>Fivem</em></span></div><div class="header-divider"></div><div class="project-title">Studio de roupas <small>Editor 3D · Camadas não destrutivas</small></div><div class="header-actions"><button id="open-model-fast" title="Abrir modelo YDD, GLB ou projeto">${icon("folder-open")}<span>Abrir</span></button><button id="open-ytd-fast" title="Abrir dicionário YTD">${icon("shirt")}<span>YTD</span></button><button id="save-project">${icon("save")}<span>Salvar projeto</span></button><button id="export" class="accent">${icon("download")}<span>Exportar textura</span></button><div class="avatar">GG</div></div></header>
<div class="workspace"><aside class="left"><div class="studio-brand"><img src="../../branding/logo.png" alt="Godoy Cloth Fivem"><small>Developed by Gabriel Godoy</small></div>${layerPanels}<div class="panel-head"><span class="eyebrow">EXPLORADOR</span><span class="count">01</span></div><div class="asset"><div class="asset-icon">${icon("shirt")}</div><div><strong id="asset-name">Camiseta studio</strong><small id="asset-type">MODELO DE DEMONSTRAÇÃO</small></div><div class="dot"></div></div><div class="section"><button class="upload" id="import-model">${icon("folder-open")} Importar modelo</button><p class="file-note">YDD / GLB / GLTF · Projeto .godoycloth<br>YDD / YTD nativos · GTA V Legacy / FiveM</p></div><div id="native-model-controls" class="section hidden"><label class="section-title" for="drawable-select">MODELO NO YDD</label><select id="drawable-select" class="full"></select><label class="section-title" for="lod-select" style="margin-top:14px">NÍVEL DE DETALHE</label><select id="lod-select" class="full"></select></div><div class="panel-head"><span class="eyebrow">TEXTURA</span><span class="count">01</span></div><div class="section" style="padding-top:0"><div class="layer active"><div class="layer-preview"></div><span><span id="texture-name">Diffuse texture</span><small id="texture-dimensions">Canvas editável · 2048 × 2048</small></span>${icon("eye")}</div><button class="upload" id="import-ytd">${icon("folder-open")} Abrir dicionário YTD</button><div id="native-texture-controls" class="hidden"><label class="section-title" for="texture-select" style="margin-top:15px">TEXTURAS DO DICIONÁRIO</label><select id="texture-select" class="full"></select><p id="native-texture-info" class="help"></p><label class="section-title" for="material-select">APLICAR NA ROUPA</label><select id="material-select" class="full"><option value="all">Todas as superfícies</option></select><button id="bind-texture" class="full" style="margin-top:8px">Vincular textura selecionada</button><button id="export-native" class="accent full" style="margin-top:10px">Exportar YTD editado</button><p class="file-note">Salva uma cópia e atualiza o Pack de roupas no studio. O arquivo original é preservado.</p></div><button class="upload" id="import-texture" style="margin-top:10px">${icon("image-plus")} Abrir textura PNG / JPG</button></div><div class="panel-head"><span class="eyebrow">BIBLIOTECA</span>${icon("images")}</div><div class="section" style="padding-top:0"><button class="upload" id="import-image">${icon("plus")} Adicionar imagem</button><p class="file-note">Aplique uma arte na roupa e ajuste sua posição diretamente no modelo.</p></div><div class="info-card"><strong>${icon("sparkles")} Sua ideia. Na superfície.</strong><p>Pinte no 3D e acompanhe cada alteração no mapa de textura, em tempo real.</p></div></aside>
<main class="center"><div class="viewbar"><div class="tabs"><button id="tab-3d" class="active">${icon("box")} Editor 3D</button><button id="tab-uv">${icon("scan")} Mapa UV</button></div><div class="view-options"><select id="camera-view" aria-label="Visão da câmera"><option value="perspective">Perspectiva</option><option value="front">Frente · ortográfica</option><option value="back">Trás · ortográfica</option><option value="left">Esquerda · ortográfica</option><option value="right">Direita · ortográfica</option><option value="top">Topo · ortográfica</option></select><select id="lighting" aria-label="Iluminação"><option value="studio">Studio</option><option value="day">Dia</option><option value="night">Noite</option></select></div></div><div class="viewport"><canvas id="scene"></canvas><canvas id="uv-view" width="2048" height="2048"></canvas><div class="viewport-label"><strong id="view-name">PERSPECTIVA</strong><p>MATERIAL PREVIEW · STUDIO LIGHT</p></div><div class="tools" aria-label="Ferramentas">
<button data-tool="orbit" title="Navegar (V)">${icon("mouse-pointer-2")}</button><button data-tool="move" title="Mover / editar objeto (G)">${icon("move")}</button>
<button data-tool="brush" class="active" title="Pincel (B)">${icon("paintbrush")}</button><button data-tool="erase" title="Borracha da camada (E)">${icon("eraser")}</button>
<button data-tool="text" title="Adicionar texto (T)">${icon("type")}</button><button data-tool="decal" title="Adicionar imagem (I)">${icon("image")}</button>
<button data-tool="line" title="Linha reta (L)">${icon("slash")}</button><button data-tool="rectangle" title="Retângulo (R)">${icon("rectangle-horizontal")}</button>
<button data-tool="ellipse" title="Círculo / elipse (O)">${icon("circle")}</button><button data-tool="pen" title="Pen Tool / Bézier (P)">${icon("pen-tool")}</button>
<button data-tool="bucket" title="Lata de tinta (F)">${icon("paint-bucket")}</button><button data-tool="eyedropper" title="Conta-gotas (C)">${icon("pipette")}</button>
<button data-tool="island" title="Selecionar ilha UV (U)">${icon("lasso-select")}</button><button id="undo" title="Desfazer (Ctrl+Z)">${icon("undo-2")}</button><button id="redo" title="Refazer (Ctrl+Shift+Z)">${icon("redo-2")}</button></div>
<div class="view-hint"><kbd>W A S D</kbd> panorâmica &nbsp;·&nbsp; <kbd>Direito</kbd> orbitar &nbsp;·&nbsp; <kbd>Scroll</kbd> zoom</div><div class="axis"><b>Y</b><i>X</i><span>Z</span></div></div><div class="view-bottom"><span>${icon("shirt")}<span id="mesh-info">Camiseta · frente e verso</span></span><button id="reset-view">${icon("focus")} Centralizar</button><span class="badge">● TEXTURA CONECTADA</span></div></main>
<aside class="right"><div class="panel-head"><span class="prop-title">${icon("sliders-horizontal")} Propriedades</span>${icon("ellipsis")}</div><div class="section"><div class="section-title">FERRAMENTA ATIVA <span class="mini-tag" id="tool-tag">PINCEL</span></div><div class="brush-only"><div class="label-row"><label for="size">Tamanho do pincel</label><output class="value" id="size-out">32 px</output></div><input id="size" type="range" min="2" max="180" value="32"><div class="label-row"><label for="opacity">Opacidade</label><output class="value" id="opacity-out">100%</output></div><input id="opacity" type="range" min="1" max="100" value="100"><div class="label-row"><label for="softness">Suavidade</label><output class="value" id="softness-out">25%</output></div><input id="softness" type="range" min="0" max="95" value="25"></div><div class="decal-controls hidden"><p class="help">A imagem permanece em uma camada editável. Use Mover e os controles de objeto para reposicionar.</p><button id="apply-decal" class="accent full">${icon("check")} Concluir posicionamento</button><button id="cancel-decal" class="full" style="margin-top:8px">Cancelar ferramenta</button></div></div><div class="section brush-only"><div class="section-title">COR DO PINCEL</div><div class="colors">${["#ef4444", "#ffffff", "#17191d", "#f59e0b", "#2563eb", "#22c55e"].map((c) => `<button class="swatch" data-color="${c}" style="background:${c}" aria-label="Cor ${c}"></button>`).join("")}</div><div class="color-entry"><input id="color" type="color" value="#ef4444" aria-label="Cor personalizada"><span id="color-hex">#EF4444</span></div></div><div class="section"><div class="section-title">MAPA DE TEXTURA <span style="margin-left:auto">${icon("maximize-2")}</span></div><canvas class="map" id="map" width="320" height="320"></canvas><div class="map-footer"><span>DIFFUSE / BASE COLOR</span><span id="map-size">2048²</span></div><p class="help">Abra o YDD da roupa e seu YTD. Selecione a textura para pintar e exporte uma cópia do dicionário editado ou o PNG.</p></div>${propertyPanels}<div class="section"><div class="section-title">VISUALIZAÇÃO</div><button id="back-view" class="full">${icon("rotate-3d")} Alternar frente / verso</button><div class="label-row" style="margin-top:18px"><label for="wireframe">Exibir malha</label><input id="wireframe" type="checkbox"></div></div></aside></div><footer class="footer"><span><span class="green-dot"></span><b id="status">Pronto para criar</b></span><span>GODOY CLOTH FIVEM <span> / </span> LOCAL WORKSPACE <span> / </span> v0.3</span></footer><div id="toast" role="status"></div><input type="file" id="model-file" accept=".glb,.gltf,.godoycloth,.paintfive,.ydd,.ytd" hidden><input type="file" id="ytd-file" accept=".ytd" hidden><input type="file" id="texture-file" accept="image/png,image/jpeg,image/webp" hidden><input type="file" id="image-file" accept="image/png,image/jpeg,image/webp" hidden>`;
createIcons({ icons });
const $ = (s) => document.querySelector(s);
let toastTimer;
let packEditToken=null;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("#toast").style.display = "none"), 5000);
}
let size = 2048,
  textureHeight = 2048;
const textureCanvas = document.createElement("canvas");
textureCanvas.width = size;
textureCanvas.height = textureHeight;
const ctx = textureCanvas.getContext("2d", { willReadFrequently: true });
const base = document.createElement("canvas");
base.width = size;
base.height = textureHeight;
const baseCtx = base.getContext("2d");
baseCtx.fillStyle = "#d9d4c7";
baseCtx.fillRect(0, 0, size, size);
// A subtle, deterministic woven material; the export remains an ordinary diffuse map.
for (let y = 0; y < size; y += 4) {
  baseCtx.fillStyle = y % 8 ? "#ffffff06" : "#00000005";
  baseCtx.fillRect(0, y, size, 1);
}
ctx.drawImage(base, 0, 0);
const texture = new THREE.CanvasTexture(textureCanvas);
texture.colorSpace = THREE.SRGBColorSpace;
texture.anisotropy = 8;
texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
const scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(36, 1, 0.01, 100);
camera.position.set(0, 0.3, 5.8);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas: $("#scene"),
    antialias: true,
    alpha: true,
  });
} catch (e) {
  toast("WebGL indisponível: abra em um navegador com aceleração gráfica.");
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
const hemisphere = new THREE.HemisphereLight(0xe8efff, 0x6e6657, 2.2);
scene.add(hemisphere);
const key = new THREE.DirectionalLight(0xfff3df, 3.5);
key.position.set(2, 4, 5);
scene.add(key);
const rim = new THREE.DirectionalLight(0xa0b5dd, 2);
rim.position.set(-4, 2, -2);
scene.add(rim);
let controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.05, 0);
controls.enableDamping = true;
controls.minDistance = 1.5;
controls.maxDistance = 10;
controls.mouseButtons = {
  LEFT: null,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE,
};
const material = new THREE.MeshStandardMaterial({
  map: texture,
  roughness: 0.93,
  metalness: 0,
  side: THREE.DoubleSide,
  alphaTest: 0.05,
});
const shape = new THREE.Shape();
shape.moveTo(-0.62, -1);
shape.lineTo(0.62, -1);
shape.lineTo(0.64, 0.37);
shape.lineTo(0.95, 0.12);
shape.lineTo(1.22, 0.65);
shape.lineTo(0.65, 1.02);
shape.lineTo(0.29, 1.1);
shape.bezierCurveTo(0.23, 0.78, -0.23, 0.78, -0.29, 1.1);
shape.lineTo(-0.65, 1.02);
shape.lineTo(-1.22, 0.65);
shape.lineTo(-0.95, 0.12);
shape.lineTo(-0.64, 0.37);
shape.closePath();
const geo = new THREE.ExtrudeGeometry(shape, {
  depth: 0.28,
  bevelEnabled: true,
  bevelSegments: 5,
  steps: 1,
  bevelSize: 0.065,
  bevelThickness: 0.09,
  curveSegments: 28,
});
geo.translate(0, 0, -0.14);
const positions = geo.attributes.position,
  normals = geo.attributes.normal,
  uvs = geo.attributes.uv;
for (let i = 0; i < positions.count; i++) {
  const x = positions.getX(i),
    y = positions.getY(i),
    z = positions.getZ(i);
  const back = normals.getZ(i) < 0;
  uvs.setXY(
    i,
    (back ? 0.5 : 0) + (0.045 + ((back ? -x : x) / 2.6) * 0.41 + 0.205),
    0.08 + ((y + 1.08) / 2.3) * 0.84,
  );
  positions.setZ(i, z);
}
geo.computeVertexNormals();
const demoGeometry = geo.clone();
let model = new THREE.Group();
model.add(new THREE.Mesh(geo, material));
scene.add(model);
const grid = new THREE.GridHelper(20, 40, 0x44484a, 0x303438);
grid.position.y = -1.2;
grid.material.transparent = true;
grid.material.opacity = 0.4;
scene.add(grid);
const raycaster = new THREE.Raycaster(),
  pointer = new THREE.Vector2();
let editor = null,
  changed = false,
  showUV = false,
  backView = false,
  modelSource = null,
  modelFilename = null;
function refresh() {
  texture.needsUpdate = true;
  for (const selector of ["#map", "#uv-view"]) {
    const c = $(selector),
      cctx = c.getContext("2d");
    cctx.clearRect(0, 0, c.width, c.height);
    const scale = Math.min(
        c.width / textureCanvas.width,
        c.height / textureCanvas.height,
      ),
      w = textureCanvas.width * scale,
      h = textureCanvas.height * scale;
    cctx.drawImage(textureCanvas, (c.width - w) / 2, (c.height - h) / 2, w, h);
  }
  const uvCtx=$("#uv-view").getContext("2d");
  uvCtx.strokeStyle="rgba(255,255,255,.45)";uvCtx.lineWidth=.6;
  model.traverse(mesh=> {
    if(!mesh.isMesh||mesh.userData.editorHelper||mesh.material.map!==texture)return;
    const uv=mesh.geometry.attributes.uv;if(!uv)return;
    const index=mesh.geometry.index,count=index?index.count:uv.count;
    for(let f=0;f<count;f+=3){uvCtx.beginPath();for(let c=0;c<3;c++){const i=index?index.getX(f+c):f+c,x=uv.getX(i)*size,y=(1-uv.getY(i))*textureHeight;c?uvCtx.lineTo(x,y):uvCtx.moveTo(x,y);}uvCtx.closePath();uvCtx.stroke();}
  });
  editor?.drawOverlay(uvCtx);
  $("#status").textContent = "Alterações locais · textura atualizada";
}
function updateHistory() {
  editor?.sync();
}
function cancelDecal() {
  editor?.cancelGesture();
  editor?.finishPath();
}
function stageHit(event) {
  if (showUV) {
    const rect = $("#uv-view").getBoundingClientRect(),
      fit = Math.min(rect.width / size, rect.height / textureHeight),
      w = size * fit,
      h = textureHeight * fit,
      x = (event.clientX - rect.left - (rect.width - w) / 2) / fit,
      y = (event.clientY - rect.top - (rect.height - h) / 2) / fit;
    if (x < 0 || y < 0 || x >= size || y >= textureHeight) return null;
    let match = null;
    model.traverse((mesh) => {
      if (
        match ||
        !mesh.isMesh ||
        mesh.userData.editorHelper ||
        mesh.material.map !== texture
      )
        return;
      const f = uvFace(mesh.geometry, x / size, y / textureHeight);
      if (f >= 0) match = { mesh, faceIndex: f };
    });
    return { x, y, ...match };
  }
  const rect = $("#scene").getBoundingClientRect();
  pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    (-(event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster
    .intersectObject(model, true)
    .find((h) => h.uv && !h.object.userData.editorHelper);
  if (!hit || hit.object.material.map !== texture) return null;
  return {
    x: THREE.MathUtils.euclideanModulo(hit.uv.x, 1) * size,
    y: THREE.MathUtils.euclideanModulo(1 - hit.uv.y, 1) * textureHeight,
    mesh: hit.object,
    faceIndex: hit.faceIndex,
  };
}
let islandHighlight = null;
function showIsland(polygons, hit) {
  if (islandHighlight) {
    islandHighlight.removeFromParent();
    islandHighlight.geometry.dispose();
    islandHighlight.material.dispose();
    islandHighlight = null;
  }
  if (!hit?.mesh || !polygons) return;
  const data = topology(hit.mesh.geometry),
    positions = hit.mesh.geometry.attributes.position,
    index = hit.mesh.geometry.index,
    chosen = new Set(polygons.map((p) => p.join(","))),
    out = [];
  for (let f = 0; f < data.triangles.length; f++)
    if (chosen.has(data.triangles[f].join(",")))
      for (let v = 0; v < 3; v++) {
        const i = index ? index.getX(f * 3 + v) : f * 3 + v;
        out.push(positions.getX(i), positions.getY(i), positions.getZ(i));
      }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  islandHighlight = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  islandHighlight.userData.editorHelper = true;
  hit.mesh.add(islandHighlight);
}
const readImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file),
      image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(Error("Imagem inválida ou formato não suportado."));
    };
    image.src = url;
  });
editor = new WorkspaceEditor({
  output: textureCanvas,
  sceneCanvas: $("#scene"),
  uvCanvas: $("#uv-view"),
  readImage,
  toast,
  hit: stageHit,
  refresh,
  changed: () => {
    markTextureDirty();
    changed = true;
  },
  navigation: (enabled) => (controls.enabled = enabled),
  tool: (tool) => {
    controls.mouseButtons.LEFT = tool === "orbit" ? THREE.MOUSE.ROTATE : null;
  },
  island: (p) => (p.mesh ? uvIsland(p.mesh.geometry, p.faceIndex) : []),
  material: (p) => {
    const polygons = [];
    model.traverse((mesh) => {
      if (
        !mesh.isMesh ||
        mesh.userData.editorHelper ||
        mesh.material.map !== texture
      )
        return;
      if (
        p.mesh &&
        mesh !== p.mesh &&
        mesh.userData.shaderIndex !== p.mesh.userData.shaderIndex
      )
        return;
      polygons.push(...topology(mesh.geometry).triangles);
    });
    return polygons;
  },
  selection: showIsland,
});
editor.setDocument(LayerDocument.fromCanvas(base));
changed = false;
$("#status").textContent = "Pronto para criar";
function view(uv) {
  showUV = uv;
  $("#uv-view").style.display = uv ? "block" : "none";
  $("#scene").style.visibility = uv ? "hidden" : "visible";
  $("#tab-uv").classList.toggle("active", uv);
  $("#tab-3d").classList.toggle("active", !uv);
  $("#view-name").textContent = uv
    ? `MAPA UV · ${size} × ${textureHeight}`
    : camera.isOrthographicCamera
      ? "ORTOGRÁFICA"
      : "PERSPECTIVA";
  refresh();
}
$("#tab-3d").onclick = () => view(false);
$("#tab-uv").onclick = () => view(true);
$("#map").onclick = () => view(true);
function configureControls() {
  controls.enableDamping = true;
  controls.minDistance = 1.5;
  controls.maxDistance = 20;
  controls.minZoom = 0.25;
  controls.maxZoom = 25;
  controls.mouseButtons = {
    LEFT: editor?.tool === "orbit" ? THREE.MOUSE.ROTATE : null,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.ROTATE,
  };
}
configureControls();
function cameraView(name) {
  const target = new THREE.Vector3(0, 0.05, 0),
    rect = $(".viewport").getBoundingClientRect(),
    aspect = rect.width / rect.height;
  controls.dispose();
  if (name === "perspective") {
    camera = new THREE.PerspectiveCamera(36, aspect, 0.01, 100);
    camera.position.set(0, 0.3, 5.8);
  } else {
    const h = 1.55;
    camera = new THREE.OrthographicCamera(
      -h * aspect,
      h * aspect,
      h,
      -h,
      0.01,
      100,
    );
    const offsets = {
      front: [0, 0, 6],
      back: [0, 0, -6],
      left: [-6, 0, 0],
      right: [6, 0, 0],
      top: [0, 6, 0],
    };
    camera.position
      .copy(target)
      .add(new THREE.Vector3(...(offsets[name] || offsets.front)));
    if (name === "top") camera.up.set(0, 0, -1);
  }
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target);
  configureControls();
  controls.update();
  $("#camera-view").value = name;
  $("#view-name").textContent = showUV
    ? `MAPA UV · ${size} × ${textureHeight}`
    : name === "perspective"
      ? "PERSPECTIVA"
      : {
          front: "FRENTE",
          back: "TRÁS",
          left: "ESQUERDA",
          right: "DIREITA",
          top: "TOPO",
        }[name] + " · ORTOGRÁFICA";
}
$("#camera-view").onchange = (e) => cameraView(e.target.value);
$("#reset-view").onclick = () => {
  cameraView("perspective");
  backView = false;
};
$("#back-view").onclick = () => {
  backView = !backView;
  cameraView(backView ? "back" : "front");
};
$("#lighting").onchange = (e) => {
  const mode = e.target.value;
  $(".viewport").dataset.lighting = mode;
  if (mode === "day") {
    hemisphere.color.set(0xc8e5ff);
    hemisphere.groundColor.set(0xb69c78);
    hemisphere.intensity = 2.4;
    key.color.set(0xfff1d1);
    key.intensity = 4.2;
    key.position.set(3, 6, 2);
    rim.color.set(0xffffff);
    rim.intensity = 1;
    renderer.toneMappingExposure = 1.3;
  } else if (mode === "night") {
    hemisphere.color.set(0x61799e);
    hemisphere.groundColor.set(0x191e2b);
    hemisphere.intensity = 0.65;
    key.color.set(0xacc8ff);
    key.intensity = 1.3;
    key.position.set(-2, 4, -2);
    rim.color.set(0xffd1b3);
    rim.intensity = 1.4;
    renderer.toneMappingExposure = 0.8;
  } else {
    hemisphere.color.set(0xe8efff);
    hemisphere.groundColor.set(0x6e6657);
    hemisphere.intensity = 2.2;
    key.color.set(0xfff3df);
    key.intensity = 3.5;
    key.position.set(2, 4, 5);
    rim.color.set(0xa0b5dd);
    rim.intensity = 2;
    renderer.toneMappingExposure = 1.25;
  }
};
$("#wireframe").onchange = (e) =>
  model.traverse((m) => {
    if (m.isMesh && !m.userData.editorHelper)
      m.material.wireframe = e.target.checked;
  });
const download = (name, blob) => {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("#export").onclick = () => {
  editor.finishPath();
  textureCanvas.toBlob(
    (blob) =>
      download(
        (activeEntry()?.name || "godoy_diffuse").replace(
          /[^a-zA-Z0-9_-]/g,
          "_",
        ) + ".png",
        blob,
      ),
    "image/png",
  );
  toast(
    `PNG exportado em ${size} × ${textureHeight}. As camadas editáveis são preservadas ao salvar o projeto.`,
  );
};
$("#import-ytd").onclick = () => $("#ytd-file").click();
$("#import-image").onclick = () => $("#image-file").click();
$("#import-texture").onclick = () => $("#texture-file").click();
$("#import-model").onclick = () => $("#model-file").click();
$("#open-model-fast").onclick = () => $("#model-file").click();
$("#open-ytd-fast").onclick = () => $("#ytd-file").click();
$("#image-file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    await editor.addImage(file);
  } catch (error) {
    toast(error.message);
  } finally {
    e.target.value = "";
  }
};
$("#texture-file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const image = await readImage(file);
    if (image.width * image.height > 16777216)
      throw Error("Imagem maior que 16 megapixels.");
    if (
      changed &&
      (editor.doc.history.length || editor.doc.layers.length > 2) &&
      !confirm(
        "Abrir uma nova textura substitui as camadas atuais. Salve o projeto antes de continuar. Deseja abrir?",
      )
    )
      return;
    cancelDecal();
    if (!nativeTextures) resizeTexture(image.width, image.height);
    baseCtx.clearRect(0, 0, size, textureHeight);
    baseCtx.drawImage(image, 0, 0, size, textureHeight);
    editor.setDocument(LayerDocument.fromCanvas(base));
    markTextureDirty();
    changed = true;
    toast("Textura aberta como base de um novo conjunto de camadas.");
  } catch (error) {
    toast(error.message);
  } finally {
    e.target.value = "";
  }
};
function installModel(imported, name, native = false) {
  showIsland(null, null);
  const bounds = new THREE.Box3().setFromObject(imported),
    center = bounds.getCenter(new THREE.Vector3()),
    extent = bounds.getSize(new THREE.Vector3()),
    max = Math.max(extent.x, extent.y, extent.z);
  if (!Number.isFinite(max) || max <= 0)
    throw Error("Modelo sem dimensões válidas.");
  imported.position.sub(center);
  const group = new THREE.Group();
  group.add(imported);
  group.scale.setScalar(2.2 / max);
  scene.remove(model);
  model.traverse((m) => {
    if (m.isMesh) {
      m.geometry.dispose();
      if (m.material !== material) m.material.dispose();
    }
  });
  model = group;
  scene.add(model);
  $("#asset-name").textContent = name;
  $("#asset-type").textContent = native
    ? "YDD NATIVO · UV ATIVO"
    : "MODELO IMPORTADO · UV ATIVO";
  $("#mesh-info").textContent = name;
  $("#wireframe").checked = false;
  material.wireframe = false;
  $("#reset-view").click();
}
function loadModel(buffer, name) {
  return new Promise((resolve, reject) =>
    new GLTFLoader().parse(
      buffer,
      "",
      (gltf) => {
        try {
          let count = 0,
            missing = false;
          gltf.scene.traverse((m) => {
            if (m.isMesh) {
              count++;
              if (!m.geometry.attributes.uv) missing = true;
              m.material = material;
            }
          });
          if (!count || missing)
            throw Error("O modelo precisa conter malhas com coordenadas UV.");
          installModel(gltf.scene, name);
          resolve();
        } catch (err) {
          reject(err);
        }
      },
      reject,
    ),
  );
}
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let result = "";
  for (let i = 0; i < bytes.length; i += 32768)
    result += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(result);
}
// Native format session: source bytes remain immutable; canvas edits are kept separately.
let nativeModel = null,
  nativeModelIndex = 0,
  nativeLodIndex = 0,
  nativeTextures = null,
  nativeTextureName = "",
  nativeTextureBuffer = null,
  activeKey = null;
const textureStates = new Map(),
  materialBindings = new Map();
function copyCanvas(canvas) {
  const copy = document.createElement("canvas");
  copy.width = canvas.width;
  copy.height = canvas.height;
  copy.getContext("2d").drawImage(canvas, 0, 0);
  return copy;
}
function resizeTexture(width, height) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 8192 ||
    height > 8192 ||
    width * height > 16777216
  )
    throw Error("Textura inválida: limite de 8192 por lado e 16 megapixels.");
  size = width;
  textureHeight = height;
  textureCanvas.width = base.width = width;
  textureCanvas.height = base.height = height;
  $("#uv-view").width = width;
  $("#uv-view").height = height;
  $("#texture-dimensions").textContent =
    `Canvas editável · ${width} × ${height}`;
  $("#map-size").textContent = `${width} × ${height}`;
  texture.dispose();
  texture.image = textureCanvas;
  texture.needsUpdate = true;
}
function markTextureDirty() {
  const state = textureStates.get(activeKey);
  if (state) state.dirty = true;
}
function activeEntry() {
  return nativeTextures?.textures.find((t) => t.key === activeKey);
}
function flushTexture() {
  const state = textureStates.get(activeKey);
  if (state) {
    state.canvas.getContext("2d").clearRect(0, 0, size, textureHeight);
    state.canvas.getContext("2d").drawImage(textureCanvas, 0, 0);
    state.base = copyCanvas(base);
    state.document = editor.doc;
    state.map.needsUpdate = true;
  }
}
function textureState(entry) {
  if (textureStates.has(entry.key)) return textureStates.get(entry.key);
  const pixelsInCache = [...textureStates.values()].reduce(
    (n, s) => n + s.canvas.width * s.canvas.height,
    0,
  );
  if (pixelsInCache + entry.width * entry.height > 33554432)
    throw Error(
      "Limite de memória de texturas atingido (32 megapixels). Salve o projeto e reabra o dicionário.",
    );
  const canvas = document.createElement("canvas");
  canvas.width = entry.width;
  canvas.height = entry.height;
  canvas
    .getContext("2d")
    .putImageData(
      new ImageData(entry.decode(), entry.width, entry.height),
      0,
      0,
    );
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const state = {
    canvas,
    base: copyCanvas(canvas),
    map,
    dirty: false,
    document: null,
  };
  textureStates.set(entry.key, state);
  return state;
}
function disposeTextureStates() {
  for (const state of textureStates.values()) state.map.dispose();
  textureStates.clear();
  activeKey = null;
}
function updateNativeMaterials() {
  if (!nativeModel) {
    material.map = texture;
    material.needsUpdate = true;
    return;
  }
  model.traverse((mesh) => {
    if (!mesh.isMesh || mesh.userData.editorHelper) return;
    const shader = mesh.userData.shaderIndex,
      name = mesh.userData.diffuseName?.toLowerCase();
    let key = materialBindings.get(`${nativeModelIndex}:${shader}`);
    if (!key && nativeTextures) {
      const match = nativeTextures.textures.find(
        (t) => t.supported && t.name.toLowerCase() === name,
      );
      key = match?.key;
      if (
        !key &&
        nativeTextures.textures.length === 1 &&
        nativeTextures.textures[0].supported
      )
        key = nativeTextures.textures[0].key;
    }
    const entry = nativeTextures?.textures.find(
      (t) => t.key === key && t.supported,
    );
    mesh.material.map = entry
      ? entry.key === activeKey
        ? texture
        : textureState(entry).map
      : nativeTextures
        ? null
        : texture;
    mesh.material.color.set(entry || !nativeTextures ? 0xffffff : 0xd9d4c7);
    mesh.material.needsUpdate = true;
  });
}
function selectTexture(key, { flush = true } = {}) {
  const entry = nativeTextures?.textures.find((t) => t.key === key);
  if (!entry?.supported)
    throw Error("Esta textura ainda não tem um decodificador disponível.");
  const state = textureState(entry);
  cancelDecal();
  if (flush) flushTexture();
  activeKey = key;
  resizeTexture(entry.width, entry.height);
  ctx.drawImage(state.canvas, 0, 0);
  baseCtx.drawImage(state.base, 0, 0);
  editor.setDocument(state.document || LayerDocument.fromCanvas(state.canvas));
  state.document = editor.doc;
  updateHistory();
  $("#texture-select").value = key;
  $("#texture-name").textContent = entry.name;
  $("#native-texture-info").textContent =
    `${entry.formatName} · ${entry.width} × ${entry.height} · ${entry.levels} mipmap(s). O histórico é separado a cada troca de textura.`;
  $("#export-native").disabled = false;
  updateNativeMaterials();
  refresh();
}
function resetMaterialOptions() {
  const select = $("#material-select");
  select.replaceChildren(new Option("Todas as superfícies", "all"));
  if (nativeModel) {
    const drawable = nativeModel.drawables[nativeModelIndex],
      seen = new Set();
    model.traverse((mesh) => {
      if (
        !mesh.isMesh ||
        mesh.userData.editorHelper ||
        seen.has(mesh.userData.shaderIndex)
      )
        return;
      const id = mesh.userData.shaderIndex;
      seen.add(id);
      select.add(
        new Option(
          `Material ${id} · ${drawable.shaders[id]?.diffuseName || "sem diffuse"}`,
          String(id),
        ),
      );
    });
  }
}
function setTextureDictionary(doc, buffer, name) {
  packEditToken=null;
  const supported = doc.textures.find((t) => t.supported);
  if (!supported)
    throw Error(
      "Nenhuma textura deste dicionário é suportada. BC7 e formatos desconhecidos ainda não estão disponíveis.",
    );
  // Decode the first entry before replacing the current session.
  supported.decode();
  cancelDecal();
  disposeTextureStates();
  nativeTextures = doc;
  nativeTextureBuffer = buffer;
  nativeTextureName = name;
  materialBindings.clear();
  const select = $("#texture-select");
  select.replaceChildren();
  for (const entry of doc.textures) {
    const option = new Option(
      `${entry.name} · ${entry.formatName}${entry.supported ? "" : " · não suportado"}`,
      entry.key,
    );
    option.disabled = !entry.supported;
    select.add(option);
  }
  $("#native-texture-controls").classList.remove("hidden");
  $("#export-native").textContent = doc.embedded
    ? "Exportar YDD editado"
    : "Exportar YTD editado";
  selectTexture(supported.key, { flush: false });
  resetMaterialOptions();
}
function buildNativeModel(
  doc,
  drawableIndex = 0,
  lodIndex = 0,
  name = modelFilename,
) {
  const drawable = doc.drawables[drawableIndex];
  if (!drawable) throw Error("Drawable não encontrado.");
  const geometries = drawable.readLod(lodIndex),
    group = new THREE.Group();
  for (const data of geometries) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(data.positions, 3),
    );
    geometry.setAttribute("uv", new THREE.BufferAttribute(data.uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
    if (data.normals)
      geometry.setAttribute(
        "normal",
        new THREE.BufferAttribute(data.normals, 3),
      );
    else geometry.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.93,
      side: THREE.DoubleSide,
      alphaTest: 0.05,
    });
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.userData = {
      shaderIndex: data.shaderIndex,
      diffuseName: drawable.shaders[data.shaderIndex]?.diffuseName || "",
    };
    group.add(mesh);
  }
  installModel(group, name, true);
  nativeModel = doc;
  nativeModelIndex = drawableIndex;
  nativeLodIndex = lodIndex;
  $("#native-model-controls").classList.remove("hidden");
  const ds = $("#drawable-select");
  ds.replaceChildren(
    ...doc.drawables.map((d, i) => new Option(d.name, String(i))),
  );
  ds.value = String(drawableIndex);
  const ls = $("#lod-select");
  ls.replaceChildren(...drawable.lods.map((l, i) => new Option(l, String(i))));
  ls.value = String(lodIndex);
  const vertices = geometries.reduce((n, g) => n + g.vertexCount, 0),
    triangles = geometries.reduce((n, g) => n + g.triangleCount, 0);
  $("#mesh-info").textContent =
    `${drawable.name} · ${vertices.toLocaleString("pt-BR")} vértices · ${triangles.toLocaleString("pt-BR")} triângulos`;
  resetMaterialOptions();
  updateNativeMaterials();
}
$("#texture-select").onchange = (e) => {
  try {
    selectTexture(e.target.value);
    changed = true;
  } catch (err) {
    $("#texture-select").value = activeKey;
    toast(err.message);
  }
};
$("#bind-texture").onclick = () => {
  if (!activeKey) return;
  const target = $("#material-select").value;
  model.traverse((m) => {
    if (
      !m.userData.editorHelper &&
      m.isMesh &&
      (target === "all" || String(m.userData.shaderIndex) === target)
    )
      materialBindings.set(
        `${nativeModelIndex}:${m.userData.shaderIndex}`,
        activeKey,
      );
  });
  updateNativeMaterials();
  changed = true;
  toast(
    "Textura vinculada. Pinte sobre as superfícies que usam a textura selecionada.",
  );
};
$("#drawable-select").onchange = (e) => {
  try {
    cancelDecal();
    buildNativeModel(nativeModel, Number(e.target.value), 0);
    changed = true;
  } catch (err) {
    e.target.value = String(nativeModelIndex);
    toast(err.message);
  }
};
$("#lod-select").onchange = (e) => {
  try {
    cancelDecal();
    buildNativeModel(nativeModel, nativeModelIndex, Number(e.target.value));
    changed = true;
  } catch (err) {
    e.target.value = String(nativeLodIndex);
    toast(err.message);
  }
};
$("#ytd-file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (
      changed &&
      (nativeTextures ||
        editor.doc.history.length ||
        editor.doc.layers.length > 2) &&
      !confirm(
        "Abrir outro dicionário? Salve o projeto ou exporte o YTD atual para preservar suas edições.",
      )
    )
      return;
    const bytes = await file.arrayBuffer(),
      doc = parseYtd(bytes);
    setTextureDictionary(doc, bytes, file.name);
    changed = true;
    toast(
      "YTD aberto. Se a roupa estiver sem textura, use Vincular textura selecionada.",
    );
  } catch (err) {
    toast(err.message);
  } finally {
    e.target.value = "";
  }
};
function mipPixels(canvas, entry) {
  const levels = [];
  let source = canvas;
  for (const mip of entry.mipmaps) {
    const dest = document.createElement("canvas");
    dest.width = mip.width;
    dest.height = mip.height;
    const c = dest.getContext("2d");
    c.drawImage(source, 0, 0, mip.width, mip.height);
    levels.push(c.getImageData(0, 0, mip.width, mip.height).data);
    source = dest;
  }
  return levels;
}
$("#export-native").onclick = async () => {
  editor.finishPath();
  if (!nativeTextures || editor.hasPending)
    return toast("Conclua a operação atual antes de exportar.");
  const button = $("#export-native");
  button.disabled = true;
  button.textContent = "Preparando arquivo…";
  try {
    await new Promise((resolve) => setTimeout(resolve, 40));
    flushTexture();
    const edits = new Map();
    for (const [key, state] of textureStates) {
      if (!state.dirty) continue;
      const entry = nativeTextures.textures.find((t) => t.key === key),
        pixels = state.canvas
          .getContext("2d")
          .getImageData(0, 0, entry.width, entry.height).data,
        originalCanvas = document.createElement("canvas");
      originalCanvas.width = entry.width;
      originalCanvas.height = entry.height;
      const originalContext = originalCanvas.getContext("2d");
      originalContext.putImageData(
        new ImageData(entry.decode(), entry.width, entry.height),
        0,
        0,
      );
      const original = originalContext.getImageData(
        0,
        0,
        entry.width,
        entry.height,
      ).data;
      let edited = false;
      for (let i = 0; i < pixels.length; i++)
        if (pixels[i] !== original[i]) {
          edited = true;
          break;
        }
      if (edited) {
        if (!canWriteTexture(entry))
          throw Error(
            `A textura ${entry.name} (${entry.formatName}) pode ser aberta, mas ainda não pode ser gravada. Exporte PNG.`,
          );
        edits.set(key, mipPixels(state.canvas, entry));
      }
    }
    const data = writeYtd(nativeTextures, edits),
      extension = nativeTextures.embedded ? "ydd" : "ytd";
    if (window.parent !== window && !nativeTextures.embedded) {
      window.parent.postMessage({type:'godoy-edited-assets',packToken:packEditToken,files:[{name:nativeTextureName,bytes:data},{name:modelFilename,bytes:new Uint8Array(modelSource)}]},location.origin === 'null' ? '*' : location.origin);
    }
    download(
      nativeTextureName.replace(/\.(ydd|ytd)$/i, "") + "_editado." + extension,
      new Blob([data], { type: "application/octet-stream" }),
    );
    toast(
      `Cópia ${extension.toUpperCase()} exportada. ${edits.size} textura(s) alterada(s); demais recursos preservados. DXT usa compressão com perda.`,
    );
  } catch (err) {
    toast(err.message);
  } finally {
    button.disabled = false;
    button.textContent = nativeTextures?.embedded
      ? "Exportar YDD editado"
      : "Exportar YTD editado";
  }
};
$("#save-project").onclick = () => {
  editor.finishPath();
  flushTexture();
  const project = {
    format: "godoy-cloth",
    version: 3,
    layers: editor.doc.serialize(),
    fonts: editor.serializeFonts(),
    texture: textureCanvas.toDataURL("image/png"),
    base: base.toDataURL("image/png"),
    model: modelSource ? bufferToBase64(modelSource) : null,
    modelName: modelFilename,
    modelFormat: nativeModel ? "ydd" : "gltf",
    drawableIndex: nativeModelIndex,
    lodIndex: nativeLodIndex,
    nativeTexture: nativeTextureBuffer
      ? bufferToBase64(nativeTextureBuffer)
      : null,
    nativeTextureName,
    nativeEmbedded: !!nativeTextures?.embedded,
    activeTexture: activeKey,
    bindings: [...materialBindings],
    textureEdits: [...textureStates]
      .filter(([, s]) => s.dirty)
      .map(([key, s]) => ({
        key,
        texture: s.canvas.toDataURL("image/png"),
        base: s.base.toDataURL("image/png"),
        layers: s.document?.serialize(),
      })),
  };
  const projectFile = new Blob([JSON.stringify(project)], {
    type: "application/json",
  });
  if (projectFile.size > 80 * 1024 * 1024)
    return toast(
      "O projeto excede 80 MB. Exporte os dicionários e texturas separadamente; este projeto não pode ser salvo neste formato.",
    );
  download("projeto.godoycloth", projectFile);
  changed = false;
  toast("Projeto salvo com arquivos nativos, vínculos e texturas.");
};
function base64Buffer(value) {
  if (
    typeof value !== "string" ||
    value.length > 112000000 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(value)
  )
    throw Error("Dados binários inválidos no projeto.");
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0)).buffer;
}
async function projectImage(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("data:image/png;base64,") ||
    value.length > 112000000
  )
    throw Error("Imagem inválida no projeto.");
  return readImage(await (await fetch(value)).blob());
}
async function restoreProject(p) {
  if (
    !["paintfive", "godoy-cloth"].includes(p.format) ||
    ![1, 2, 3].includes(p.version)
  )
    throw Error("Projeto inválido ou versão não suportada.");
  await editor.loadFonts(p.fonts || []);
  const [image, baseImage] = await Promise.all([
    projectImage(p.texture),
    projectImage(p.base),
  ]);
  if (image.width !== baseImage.width || image.height !== baseImage.height)
    throw Error("Dimensões inconsistentes no projeto.");
  const modelBuffer = p.model ? base64Buffer(p.model) : null,
    modelDoc =
      modelBuffer && p.modelFormat === "ydd" ? parseYdd(modelBuffer) : null;
  const textureBuffer = p.nativeTexture ? base64Buffer(p.nativeTexture) : null,
    textureDoc = textureBuffer
      ? p.nativeEmbedded
        ? {
            resource: modelDoc?.resource,
            textures: modelDoc?.drawables
              .flatMap((d) => d.textures)
              .filter(
                (t, i, a) => a.findIndex((v) => v.pointer === t.pointer) === i,
              ),
            embedded: true,
          }
        : parseYtd(textureBuffer)
      : null;
  if (textureDoc && !textureDoc.resource)
    throw Error("Projeto com texturas embutidas sem YDD.");
  const activeLayers = p.layers
    ? await LayerDocument.deserialize(p.layers)
    : null;
  if (
    activeLayers &&
    (activeLayers.width !== image.width || activeLayers.height !== image.height)
  )
    throw Error("Camadas incompatíveis com a imagem do projeto.");
  const restored = [];
  for (const edit of p.textureEdits || []) {
    const entry = textureDoc?.textures.find((t) => t.key === edit.key);
    if (!entry) throw Error("Textura de projeto não encontrada no dicionário.");
    const [a, b] = await Promise.all([
      projectImage(edit.texture),
      projectImage(edit.base),
    ]);
    if (
      a.width !== entry.width ||
      a.height !== entry.height ||
      b.width !== entry.width ||
      b.height !== entry.height
    )
      throw Error("Dimensões editadas incompatíveis com o recurso.");
    const layers = edit.layers
      ? await LayerDocument.deserialize(edit.layers)
      : null;
    if (
      layers &&
      (layers.width !== entry.width || layers.height !== entry.height)
    )
      throw Error("Camadas incompatíveis com a textura nativa.");
    restored.push({ key: edit.key, a, b, layers });
  }
  if (modelDoc)
    buildNativeModel(
      modelDoc,
      p.drawableIndex || 0,
      p.lodIndex || 0,
      p.modelName || "Modelo YDD",
    );
  else if (modelBuffer) {
    await loadModel(modelBuffer, p.modelName || "Modelo importado");
    nativeModel = null;
    $("#native-model-controls").classList.add("hidden");
  } else {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(demoGeometry.clone(), material));
    installModel(group, "Camiseta studio");
    nativeModel = null;
    $("#native-model-controls").classList.add("hidden");
  }
  cancelDecal();
  disposeTextureStates();
  nativeTextures = null;
  nativeTextureBuffer = null;
  nativeTextureName = "";
  materialBindings.clear();
  $("#native-texture-controls").classList.add("hidden");
  modelSource = modelBuffer;
  modelFilename = p.modelName || null;
  if (textureDoc) {
    setTextureDictionary(
      textureDoc,
      textureBuffer,
      p.nativeTextureName || "texturas.ytd",
    );
    for (const item of restored) {
      const state = textureState(
        textureDoc.textures.find((t) => t.key === item.key),
      );
      state.canvas
        .getContext("2d")
        .clearRect(0, 0, item.a.width, item.a.height);
      state.canvas.getContext("2d").drawImage(item.a, 0, 0);
      state.base.getContext("2d").clearRect(0, 0, item.b.width, item.b.height);
      state.base.getContext("2d").drawImage(item.b, 0, 0);
      state.map.needsUpdate = true;
      state.dirty = true;
      state.document = item.layers || LayerDocument.fromCanvas(state.canvas);
    }
    for (const [slot, key] of p.bindings || [])
      if (
        typeof slot === "string" &&
        textureDoc.textures.some((t) => t.key === key)
      )
        materialBindings.set(slot, key);
    selectTexture(
      p.activeTexture || textureDoc.textures.find((t) => t.supported).key,
      { flush: false },
    );
  } else {
    resizeTexture(image.width, image.height);
    ctx.drawImage(image, 0, 0);
    baseCtx.drawImage(baseImage, 0, 0);
    $("#texture-name").textContent = "Diffuse texture";
    editor.setDocument(activeLayers || LayerDocument.fromCanvas(textureCanvas));
    updateNativeMaterials();
  }
  editor.sync();
  updateHistory();
  refresh();
  changed = false;
}
$("#model-file").onchange = async (e) => {
  packEditToken=null;
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 80 * 1024 * 1024)
      throw Error("O arquivo excede o limite de 80 MB.");
    if (/\.ytd$/i.test(file.name)) {
      if (
        changed &&
        (nativeTextures ||
          editor.doc.history.length ||
          editor.doc.layers.length > 2) &&
        !confirm(
          "Abrir outro YTD e substituir as texturas atuais? Salve seu trabalho antes de continuar.",
        )
      )
        return;
      const buffer = await file.arrayBuffer();
      setTextureDictionary(parseYtd(buffer), buffer, file.name);
      changed = true;
      toast("YTD carregado.");
      return;
    }
    if (
      changed &&
      !confirm(
        "Substituir o modelo/projeto? Salve seu trabalho antes de continuar.",
      )
    )
      return;
    if (/\.(paintfive|godoycloth)$/i.test(file.name)) {
      await restoreProject(JSON.parse(await file.text()));
      toast("Projeto restaurado.");
      return;
    }
    const buffer = await file.arrayBuffer();
    if (/\.ydd$/i.test(file.name)) {
      const doc = parseYdd(buffer);
      doc.drawables[0].readLod();
      if (nativeTextures?.embedded) {
        disposeTextureStates();
        nativeTextures = null;
        nativeTextureBuffer = null;
        $("#native-texture-controls").classList.add("hidden");
      }
      materialBindings.clear();
      buildNativeModel(doc, 0, 0, file.name);
      modelSource = buffer;
      modelFilename = file.name;
      const embedded = doc.drawables
        .flatMap((d) => d.textures)
        .filter((t, i, a) => a.findIndex((v) => v.pointer === t.pointer) === i);
      if (!nativeTextures && embedded.some((t) => t.supported))
        setTextureDictionary(
          { resource: doc.resource, textures: embedded, embedded: true },
          buffer,
          file.name,
        );
      toast(
        "YDD aberto diretamente. Abra o YTD correspondente para aplicar as texturas.",
      );
    } else {
      await loadModel(buffer, file.name);
      nativeModel = null;
      $("#native-model-controls").classList.add("hidden");
      modelSource = buffer;
      modelFilename = file.name;
      updateNativeMaterials();
      toast(
        "Modelo carregado. Use uma textura correspondente ao UV dessa roupa.",
      );
    }
    changed = true;
  } catch (err) {
    toast(err.message || "Não foi possível abrir o arquivo.");
  } finally {
    e.target.value = "";
  }
};
const panKeys = new Set();
window.addEventListener("keydown", (e) => {
  if (
    /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) ||
    e.target.isContentEditable
  )
    return;
  if (
    !e.ctrlKey &&
    !e.metaKey &&
    ["w", "a", "s", "d"].includes(e.key.toLowerCase())
  ) {
    e.preventDefault();
    panKeys.add(e.key.toLowerCase());
    return;
  }
  editor.key(e);
});
window.addEventListener("keyup", (e) => panKeys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => panKeys.clear());
document.addEventListener("visibilitychange", () => panKeys.clear());
window.addEventListener("beforeunload", (e) => {
  if (changed || editor.hasPending) {
    e.preventDefault();
    e.returnValue = "";
  }
});
const resize = new ResizeObserver(() => {
  const rect = $(".viewport").getBoundingClientRect(),
    aspect = rect.width / rect.height;
  renderer.setSize(rect.width, rect.height, false);
  if (camera.isOrthographicCamera) {
    camera.left = -1.55 * aspect;
    camera.right = 1.55 * aspect;
    camera.top = 1.55;
    camera.bottom = -1.55;
  } else camera.aspect = aspect;
  camera.updateProjectionMatrix();
});
resize.observe($(".viewport"));
let lastFrame = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now(),
    delta = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (panKeys.size && !showUV) {
    camera.updateMatrixWorld();
    const right = new THREE.Vector3().setFromMatrixColumn(
        camera.matrixWorld,
        0,
      ),
      up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1),
      speed =
        (camera.isOrthographicCamera
          ? 3.1 / camera.zoom
          : camera.position.distanceTo(controls.target)) *
        0.65 *
        delta,
      dx = (panKeys.has("d") ? 1 : 0) - (panKeys.has("a") ? 1 : 0),
      dy = (panKeys.has("w") ? 1 : 0) - (panKeys.has("s") ? 1 : 0),
      move = right
        .multiplyScalar(dx * speed)
        .add(up.multiplyScalar(dy * speed));
    camera.position.add(move);
    controls.target.add(move);
  }
  controls.update();
  renderer.render(scene, camera);
});

attachAssetBatch({host:document.querySelector('aside.left'),readModel:()=>nativeModel,parseTexture:parseYtd,setTextures:setTextureDictionary,notify:toast,openModel:async file=>{const previous=modelSource;await $("#model-file").onchange({target:{files:[file],value:''}});return modelSource!==previous;}});

window.addEventListener('message',async event=>{
  if(event.source!==window.parent||event.origin!==location.origin||event.data?.type!=='godoy-pack-edit')return;
  try {
    const {model,texture,token}=event.data;
    if(typeof token!=='string'||token.length>64||[model,texture].some(a=>typeof a?.name!=='string'||!(a.bytes instanceof Uint8Array)||!a.bytes.length||a.bytes.length>80*1024*1024))throw Error('Variação recebida inválida.');
    const bytes=model.bytes,buffer=texture.bytes.buffer.slice(texture.bytes.byteOffset,texture.bytes.byteOffset+texture.bytes.byteLength);
    parseYdd(bytes);const dictionary=parseYtd(buffer);
    await $('#model-file').onchange({target:{files:[new File([bytes],model.name)],value:''}});
    setTextureDictionary(dictionary,buffer,texture.name);packEditToken=token;
    toast('Variação do pack aberta. Exportar YTD atualiza somente esta variação.');
  }catch(error){toast(error.message);}
});
