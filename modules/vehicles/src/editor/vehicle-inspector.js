import { Vector3 } from "three";
import { vehiclePoint } from "../formats/vehicle-points.js";
import { attachVehicleSetup } from "./vehicle-setup.js";
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
  constructor(panel, viewport, show3D, markChanged, download) {
    this.show3D = show3D;
    this.markers = [];
    this.profiles = [];
    this.seatPlan = [];
    this.screen = new Vector3();
    this.overlay = document.createElement("div");
    this.overlay.className = "vehicle-point-overlay";
    this.seatEditing = false;
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
      this.onProfileChange?.();
    };
    const fileInput = find("siren-pattern-file");
    find("load-siren-patterns").onclick = () => fileInput.click();
    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        if (file.size > 5 * 1024 * 1024) throw Error("Use um carcols.meta de até 5 MB.");
        this.setSirenProfiles(parseSirenPatterns(await file.text()));
        markChanged();
      } catch (error) {
        this.sirenSummary.textContent = error.message;
      } finally {
        fileInput.value = "";
      }
    };
    this.setModel(null, []);
    attachVehicleSetup(panel, section, this, markChanged, download);
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
  setModel(root, points, name) {
    if (this.modelName !== name) this.resetEdits();
    this.modelName = name;
    this.root = root;
    this.points = points;
    this.refreshMarkers();
    this.onModelChange?.();
  }
  resetEdits() {
    this.seatPlan = [];
    this.setSirenProfiles([]);
  }
  refreshMarkers() {
    this.seatDrag = null;
    const planned = this.seatPlan.map((point, seatIndex) => ({ ...point, kind: "seat", planned: true, seatIndex }));
    this.markers = [...this.points, ...planned].map((point) => {
      const element = document.createElement(point.planned ? "button" : "span");
      element.className = "vehicle-point vehicle-point-" + point.kind;
      element.hidden = true;
      if (point.planned) {
        element.type = "button";
        element.classList.add("vehicle-point-planned");
        element.disabled = !this.seatEditing;
        element.title = "Arrastar para mover o assento";
      } else element.setAttribute("aria-hidden", "true");
      if (point.kind === "seat") element.textContent = point.planned ? point.label + " · projeto" : point.label;
      else element.textContent = point.channel;
      const marker = { ...point, element, position: new Vector3(...point.position) };
      if (point.planned) this.bindSeatMarker(marker);
      return marker;
    });
    this.overlay.replaceChildren(...this.markers.map(({ element }) => element));
    this.updateSummary();
  }
  setSeatEditing(enabled) {
    this.seatEditing = enabled;
    if (enabled && this.seatPlan.length) this.seats.checked = true;
    this.overlay.classList.toggle("edit-seats", enabled);
    for (const marker of this.markers)
      if (marker.planned) marker.element.disabled = !enabled;
  }
  selectSeat(index) {
    for (const marker of this.markers)
      if (marker.planned) marker.element.setAttribute("aria-pressed", String(marker.seatIndex === index));
  }
  bindSeatMarker(marker) {
    const { element, seatIndex, position } = marker;
    element.onclick = () => this.onSeatSelect?.(seatIndex);
    element.onpointerdown = (event) => {
      if (!this.seatEditing || !this.camera || event.button !== 0 || this.seatDrag) return;
      this.onSeatSelect?.(seatIndex);
      const rect = this.overlay.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      this.root.updateWorldMatrix(true, false);
      const camera = this.camera.clone();
      const world = position.clone().applyMatrix4(this.root.matrixWorld);
      const projected = world.clone().project(camera);
      const startX = event.clientX, startY = event.clientY;
      const inverse = this.root.matrixWorld.clone().invert();
      this.seatDrag = { marker, pointer: event.pointerId };
      element.setPointerCapture(event.pointerId);
      event.preventDefault();
      element.onpointermove = (move) => {
        const drag = this.seatDrag;
        if (drag?.marker !== marker || drag.pointer !== move.pointerId) return;
        const dx = move.clientX - startX, dy = move.clientY - startY;
        if (!drag.moved && Math.hypot(dx, dy) < 3) return;
        drag.moved = true;
        position.set(projected.x + 2 * dx / rect.width, projected.y - 2 * dy / rect.height, projected.z)
          .unproject(camera).applyMatrix4(inverse).clampScalar(-100, 100);
        const coordinates = position.toArray().map((value) => Math.round(value * 1000) / 1000);
        position.fromArray(coordinates);
        this.seatPlan[seatIndex].position = coordinates;
        this.onSeatMove?.(seatIndex);
      };
    };
    element.onlostpointercapture = (event) => {
      const drag = this.seatDrag;
      if (drag?.marker !== marker || drag.pointer !== event.pointerId) return;
      this.seatDrag = null;
      if (drag.moved) this.onSeatMoveEnd?.();
    };
  }
  refreshSirenPreview() {
    this.sirens.checked = true;
    this.started = performance.now();
    this.updateSummary();
    this.onProfileChange?.();
  }
  snapshot() {
    const docs = new Set(this.profiles.map(({ element }) => element.ownerDocument));
    return {
      seats: this.seatPlan,
      carcols: [...docs].map((doc) => new XMLSerializer().serializeToString(doc)),
      sirenId: this.profiles[this.profileSelect.value]?.id ?? null,
    };
  }
  restore(snapshot) {
    this.seatPlan = Array.isArray(snapshot?.seats) ? snapshot.seats.slice(0, 32).filter(
      (point) => typeof point?.label === "string" && point.label.trim() && point.label.length <= 48 &&
        Array.isArray(point.position) && point.position.length === 3 &&
        point.position.every((n) => Number.isFinite(n) && Math.abs(n) <= 100),
    ) : [];
    const files = Array.isArray(snapshot?.carcols) ? snapshot.carcols.slice(0, 128) : [];
    this.setSirenProfiles(files.flatMap((xml) => {
      if (typeof xml !== "string" || xml.length > 5 * 1024 * 1024) return [];
      try { return parseSirenPatterns(xml); } catch { return []; }
    }), snapshot?.sirenId);
    if (snapshot?.sirenId === null) {
      this.profileSelect.selectedIndex = 0;
      this.profileSelect.onchange();
    }
    this.refreshMarkers();
    if (this.seatEditing && this.seatPlan.length) this.seats.checked = true;
    this.onModelChange?.();
  }
  updateSummary() {
    const seats = this.markers.filter(({ kind, planned }) => kind === "seat" && !planned).length;
    const sirens = this.markers.filter(({ kind }) => kind === "siren").length;
    const profile = this.profiles[this.profileSelect.value];
    this.seats.disabled = !seats && !this.seatPlan.length;
    this.sirens.disabled = !sirens;
    this.seatSummary.textContent = seats
      ? `${seats} ${seats === 1 ? "assento identificado" : "assentos identificados"} no modelo.`
      : "Nenhum ponto de assento identificado no modelo.";
    if (this.seatPlan.length) this.seatSummary.textContent += ` ${this.seatPlan.length} ponto(s) no projeto.`;
    this.sirenSummary.textContent = sirens
      ? profile
        ? `${sirens} pontos · perfil ${profile.id} · ${profile.bpm} BPM.`
        : `${sirens} pontos · alternância demonstrativa. Abra o carcols.meta para escolher um perfil.`
      : "Nenhum ponto de giroflex identificado no modelo.";
  }
  render(camera, time, visible) {
    this.camera = camera;
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
