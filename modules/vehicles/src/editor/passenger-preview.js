import {
  AnimationMixer, Box3, Group, LoadingManager, Mesh, MeshStandardMaterial, SphereGeometry,
  CapsuleGeometry, Vector3, MathUtils,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const modes = ["seated", "hanging", "glb"];
const defaults = { mode: "seated", offset: [0, 0, 0], angles: [0, 0, 0], clip: "" };

function settings(seat) {
  const stored = seat?.preview;
  const vector = (value, limit) => [0, 1, 2].map((i) =>
    Number.isFinite(value?.[i]) ? MathUtils.clamp(value[i], -limit, limit) : 0,
  );
  return {
    mode: modes.includes(stored?.mode) ? stored.mode : defaults.mode,
    offset: vector(stored?.offset, 10),
    angles: vector(stored?.angles, 360),
    clip: typeof stored?.clip === "string" ? stored.clip : "",
  };
}

// The origin of the reference figure is the pelvis, like the seat marker.
function mannequin(hanging) {
  const figure = new Group();
  const body = new MeshStandardMaterial({ color: "#67af79", roughness: 0.75 });
  const joints = new MeshStandardMaterial({ color: "#dae5e2", roughness: 0.65 });
  const up = new Vector3(0, 1, 0);
  function segment(a, b, radius, material = body) {
    const from = new Vector3(...a), to = new Vector3(...b);
    const direction = to.clone().sub(from);
    const mesh = new Mesh(new CapsuleGeometry(radius, Math.max(0.01, direction.length() - radius * 2), 4, 8), material);
    mesh.position.copy(from).lerp(to, 0.5);
    mesh.quaternion.setFromUnitVectors(up, direction.normalize());
    figure.add(mesh);
  }
  const neck = hanging ? [0, .51, -.06] : [0, .51, .02];
  segment([0, -.1, 0], neck, .14);
  const head = new Mesh(new SphereGeometry(.105, 12, 8), joints);
  head.position.set(0, .57, neck[2] - .025);
  head.scale.set(.88, 1.2, 1);
  figure.add(head);
  for (const side of [-1, 1]) {
    const hip = [side * .09, 0, 0];
    const knee = hanging ? [side * .13, -.35, -.12] : [side * .14, -.10, -.43];
    const ankle = hanging ? [side * .15, -.76, -.19] : [side * .16, -.51, -.46];
    const shoulder = [side * .17, .43, neck[2]];
    const elbow = hanging ? [side * .26, .52, -.27] : [side * .24, .18, -.17];
    const hand = hanging ? [side * .25, .69, -.46] : [side * .18, .05, -.38];
    segment(hip, knee, .077);
    segment(knee, ankle, .061);
    segment(ankle, [ankle[0], ankle[1] - .025, ankle[2] - .14], .051, joints);
    segment(shoulder, elbow, .052);
    segment(elbow, hand, .042);
    segment(hand, [hand[0], hand[1] + .025, hand[2] - .045], .038, joints);
  }
  return figure;
}

function dispose(root) {
  const textures = new Set(), materials = new Set(), geometries = new Set();
  root.traverse((part) => {
    if (part.geometry) geometries.add(part.geometry);
    for (const material of [part.material].flat().filter(Boolean)) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
    part.skeleton?.dispose();
  });
  for (const resource of [...textures, ...materials, ...geometries]) resource.dispose();
}

export function attachPassengerPreview(scene, inspector, markChanged) {
  const panel = document.createElement("fieldset");
  panel.className = "vehicle-editor";
  panel.innerHTML = `
    <legend>Prévia do personagem</legend>
    <label class="label-row">Mostrar no assento selecionado<input id="ped-preview-show" type="checkbox"></label>
    <label>Pose de referência<select id="ped-preview-mode" class="full">
      <option value="seated">Sentado</option>
      <option value="hanging">Pendurado · mãos à frente</option>
      <option value="glb">Personagem GLB</option>
    </select></label>
    <div id="ped-preview-import" hidden>
      <button id="ped-preview-open" type="button" class="full">Abrir personagem GLB</button>
      <input id="ped-preview-file" type="file" accept=".glb" hidden>
      <label>Animação do GLB<select id="ped-preview-clip" class="full"></select></label>
    </div>
    <div class="transform-grid">
      <label>Deslocamento X<input id="ped-preview-x" type="number" min="-10" max="10" step=".01"></label>
      <label>Deslocamento Y<input id="ped-preview-y" type="number" min="-10" max="10" step=".01"></label>
      <label>Deslocamento Z<input id="ped-preview-z" type="number" min="-10" max="10" step=".01"></label>
      <label>Inclinação X (°)<input id="ped-preview-rx" type="number" min="-360" max="360" step="1"></label>
      <label>Giro Y (°)<input id="ped-preview-ry" type="number" min="-360" max="360" step="1"></label>
      <label>Inclinação Z (°)<input id="ped-preview-rz" type="number" min="-360" max="360" step="1"></label>
    </div>
    <button id="ped-preview-reset" type="button" class="full">Zerar ajuste da prévia</button>
    <p class="help">Os ajustes da prévia ficam no projeto. Reabra o GLB para recuperar suas animações. A posição exportada do assento é a do marcador no 3D.</p>
    <p class="help" id="ped-preview-status" role="status"></p>`;
  const seatPanel = document.querySelector("#seat-editor");
  seatPanel.after(panel);
  const $ = (id) => panel.querySelector("#ped-preview-" + id);
  const show = $("show"), mode = $("mode"), clip = $("clip");
  const fieldGroups = [["x", "y", "z"], ["rx", "ry", "rz"]];
  const seatList = seatPanel.querySelector("#seat-plan");
  const anchor = new Group(), pose = new Group();
  anchor.matrixAutoUpdate = false;
  anchor.visible = false;
  anchor.add(pose);
  scene.add(anchor);
  const seated = mannequin(false), hanging = mannequin(true);
  let asset, mixer, clips = [], activeClip = "", activeSeat, importNumber = 0;
  clip.replaceChildren(new Option("Pose do modelo", ""));
  function selected() {
    return seatList.value === "" ? null : inspector.seatPlan[Number(seatList.value)];
  }
  function sync() {
    const seat = selected();
    const config = settings(seat);
    activeSeat = seat;
    panel.disabled = !seat;
    mode.value = config.mode;
    $("import").hidden = config.mode !== "glb";
    clip.value = clips.some(({ id }) => id === config.clip) ? config.clip : "";
    fieldGroups.forEach((fields, group) => fields.forEach((id, axis) => {
      $(id).value = (group ? config.angles : config.offset)[axis];
    }));
  }
  function save(patch) {
    const seat = selected();
    if (!seat) return;
    seat.preview = { ...settings(seat), ...patch };
    markChanged();
  }
  mode.onchange = () => { save({ mode: mode.value }); sync(); };
  clip.onchange = () => save({ clip: clip.value });
  fieldGroups.forEach((fields, group) => fields.forEach((id, index) => {
    $(id).oninput = () => {
      const seat = selected(), value = $(id).valueAsNumber;
      if (!seat || !Number.isFinite(value) || value < Number($(id).min) || value > Number($(id).max)) return;
      const key = group ? "angles" : "offset";
      const values = settings(seat)[key];
      values[index] = value;
      save({ [key]: values });
    };
  }));
  $("reset").onclick = () => { save({ offset: [0, 0, 0], angles: [0, 0, 0] }); sync(); };
  $("open").onclick = () => $("file").click();
  $("file").onchange = async ({ target }) => {
    const file = target.files[0];
    target.value = "";
    if (!file) return;
    const request = ++importNumber;
    let imported;
    try {
      if (file.size > 32 * 1024 * 1024) throw Error("Use um GLB de até 32 MB.");
      const manager = new LoadingManager();
      manager.setURLModifier((url) => {
        if (!/^(blob|data):/i.test(url)) throw Error("Use um GLB com texturas incorporadas.");
        return url;
      });
      const gltf = await new GLTFLoader(manager).parseAsync(await file.arrayBuffer(), "");
      imported = gltf.scene;
      if (request !== importNumber) return;
      const bounds = new Box3().setFromObject(imported);
      const size = bounds.getSize(new Vector3());
      if (bounds.isEmpty() || !Number.isFinite(size.length()) || size.y < .001)
        throw Error("O GLB precisa conter um personagem com altura válida.");
      const center = bounds.getCenter(new Vector3());
      const container = new Group();
      container.scale.setScalar(1.75 / size.y);
      container.position.set(-center.x, -bounds.min.y - size.y * .52, -center.z).multiplyScalar(container.scale.x);
      container.add(imported);
      if (asset) {
        mixer.stopAllAction();
        mixer.uncacheRoot(asset.children[0]);
        asset.removeFromParent();
        dispose(asset);
      }
      asset = container;
      imported = null;
      mixer = new AnimationMixer(gltf.scene);
      activeClip = "";
      clips = gltf.animations.map((animation, index) => ({ id: `${file.name}:${index}`, animation }));
      clip.replaceChildren(new Option("Pose do modelo", ""), ...clips.map(({ id, animation }, index) =>
        new Option(animation.name || `Animação ${index + 1}`, id),
      ));
      $("status").textContent = `${file.name} · ${clips.length} animação(ões)`;
      sync();
    } catch (error) {
      if (request === importNumber) $("status").textContent = error.message;
    } finally {
      if (imported) dispose(imported);
    }
  };
  sync();
  return {
    render(delta, show3D) {
      const seat = selected();
      if (activeSeat !== seat) sync();
      anchor.visible = Boolean(show3D && inspector.seatEditing && inspector.root && show.checked && seat);
      if (!anchor.visible) return;
      const config = settings(seat);
      const figure = config.mode === "glb" ? asset : config.mode === "hanging" ? hanging : seated;
      if (!figure) { pose.clear(); return; }
      if (pose.children[0] !== figure) pose.clear().add(figure);
      inspector.root.updateWorldMatrix(true, false);
      anchor.matrix.copy(inspector.root.matrixWorld);
      anchor.matrixWorldNeedsUpdate = true;
      pose.position.set(...seat.position).add(new Vector3(...config.offset));
      pose.rotation.set(...config.angles.map(MathUtils.degToRad), "YXZ");
      if (figure === asset) {
        const next = clips.find(({ id }) => id === config.clip);
        if ((next?.id ?? "") !== activeClip) {
          mixer.stopAllAction();
          if (next) mixer.clipAction(next.animation).play();
          activeClip = next?.id ?? "";
        }
        mixer.update(Math.min(delta, .05));
      }
    },
  };
}
