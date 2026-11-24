import { Vector3 } from "three";
import { vehiclePoint } from "../formats/vehicle-points.js";
import { parseSirenPatterns, sirenIsOn } from "./siren-patterns.js";

export function pointsFromScene(root) {
  root.updateMatrixWorld(true);
  const points = [];
  root.traverse((node) => {
    const point = vehiclePoint(node.name);
    if (!point) return;
    const position = root.worldToLocal(node.getWorldPosition(new Vector3()));
    points.push({ ...point, position: position.toArray() });
  });
  return points;
}

export class VehicleInspector {
  constructor(panel, viewport, show3D) {
    this.show3D = show3D;
    this.markers = [];
    this.profiles = [];
    this.screen = new Vector3();
    this.overlay = document.createElement("div");
    this.overlay.className = "vehicle-point-overlay";
    this.overlay.setAttribute("aria-hidden", "true");
    viewport.append(this.overlay);
    const section = document.createElement("div");
    section.className = "section vehicle-inspector";
    section.innerHTML = `
      <div class="section-title">INSPEÇÃO DA VIATURA</div>
      <label class="label-row">Mostrar assentos<input id="show-seats" type="checkbox"></label>
      <p class="help" id="seat-summary"></p>
      <label class="label-row">Prévia do giroflex<input id="show-sirens" type="checkbox"></label>
      <p class="help" id="siren-summary" role="status"></p>
      <button type="button" id="load-siren-patterns" class="full">Abrir carcols.meta</button>
      <input id="siren-pattern-file" type="file" accept=".meta,.xml" hidden>
      <label class="control-label" for="siren-profile">Perfil do giroflex</label>
      <select id="siren-profile" class="full"><option value="">Alternância demonstrativa</option></select>`;
    panel.append(section);
    const find = (id) => section.querySelector("#" + id);
    this.seats = find("show-seats");
    this.sirens = find("show-sirens");
    this.seatSummary = find("seat-summary");
    this.sirenSummary = find("siren-summary");
    this.profileSelect = find("siren-profile");
    this.seats.onchange = () => { if (this.seats.checked) this.show3D(); };
    this.sirens.onchange = () => {
      this.started = performance.now();
      if (this.sirens.checked) this.show3D();
    };
    this.profileSelect.onchange = () => {
      this.started = performance.now();
      this.updateSummary();
    };
    const fileInput = find("siren-pattern-file");
    find("load-siren-patterns").onclick = () => fileInput.click();
    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        if (file.size > 5 * 1024 * 1024) throw Error("Use um carcols.meta de até 5 MB.");
        this.setSirenProfiles(parseSirenPatterns(await file.text()));
      } catch (error) {
        this.sirenSummary.textContent = error.message;
      } finally {
        fileInput.value = "";
      }
    };
    this.setModel(null, []);
  }
  setSirenProfiles(profiles, preferredId) {
    this.profiles = profiles;
    this.profileSelect.length = 1;
    for (const [index, profile] of profiles.entries()) {
      this.profileSelect.add(new Option(
        `ID ${profile.id}${profile.name ? " · " + profile.name : ""}`,
        index,
      ));
    }
    const preferred = profiles.findIndex(({ id }) => id === preferredId);
    this.profileSelect.selectedIndex = profiles.length ? (preferred >= 0 ? preferred + 1 : 1) : 0;
    this.profileSelect.onchange();
  }
  setModel(root, points) {
    this.root = root;
    this.markers = points.map((point) => {
      const element = document.createElement("span");
      element.className = "vehicle-point vehicle-point-" + point.kind;
      element.hidden = true;
      if (point.kind === "seat") element.textContent = point.label;
      else element.textContent = point.channel;
      return { ...point, element, position: new Vector3(...point.position) };
    });
    this.overlay.replaceChildren(...this.markers.map(({ element }) => element));
    this.updateSummary();
  }
  updateSummary() {
    const seats = this.markers.filter(({ kind }) => kind === "seat").length;
    const sirens = this.markers.filter(({ kind }) => kind === "siren").length;
    const profile = this.profiles[this.profileSelect.value];
    this.seats.disabled = !seats;
    this.sirens.disabled = !sirens;
    this.seatSummary.textContent = seats
      ? `${seats} ${seats === 1 ? "assento identificado" : "assentos identificados"} no modelo.`
      : "Nenhum ponto de assento identificado no modelo.";
    this.sirenSummary.textContent = sirens
      ? profile
        ? `${sirens} pontos · perfil ${profile.id} · ${profile.bpm} BPM.`
        : `${sirens} pontos · alternância demonstrativa. Abra o carcols.meta para escolher um perfil.`
      : "Nenhum ponto de giroflex identificado no modelo.";
  }
  render(camera, time, visible) {
    this.overlay.hidden = !visible || !this.root || (!this.seats.checked && !this.sirens.checked);
    if (this.overlay.hidden) return;
    const profile = this.profiles[this.profileSelect.value];
    const elapsed = Math.max(0, (time - (this.started ?? time)) / 1000);
    const screen = this.screen;
    this.root.updateWorldMatrix(true, false);
    camera.updateMatrixWorld();
    for (const { kind, channel, element, position } of this.markers) {
      const seat = kind === "seat";
      screen.copy(position).applyMatrix4(this.root.matrixWorld).project(camera);
      element.hidden = !(seat ? this.seats.checked : this.sirens.checked) ||
        Math.abs(screen.x) > 1 || Math.abs(screen.y) > 1 || Math.abs(screen.z) > 1;
      if (element.hidden) continue;
      element.style.left = `${(screen.x + 1) * 50}%`;
      element.style.top = `${(1 - screen.y) * 50}%`;
      if (!seat) {
        const color = profile?.channels[channel - 1]?.color;
        element.style.setProperty("--siren-color",
          color == null ? (channel % 2 ? "#ff454f" : "#509aff") : `#${color.toString(16).padStart(6, "0")}`,
        );
        element.classList.toggle("lit", sirenIsOn(profile, channel, elapsed));
      }
    }
  }
}
