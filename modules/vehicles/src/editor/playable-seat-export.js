import { zipSync, strToU8 } from "fflate";
import { parseYft } from "../formats/yft.js";
import { inspectSeatLayout, addPlayableSeatMetadata } from "./playable-seat-layout.js";

export function attachPlayableSeatExport(inspector, getModel, download) {
  const panel = document.createElement("fieldset");
  panel.className = "vehicle-editor";
  panel.innerHTML = `
    <legend>Exportar assento para FiveM</legend>
    <button type="button" class="full" id="playable-seat-import">Abrir metadados e _hi.yft</button>
    <input id="playable-seat-files" type="file" multiple accept=".meta,.xml,.yft" hidden>
    <label>Assento de passageiro base<select id="playable-seat-donor" class="full"></select></label>
    <label>Porta de acesso<select id="playable-seat-door" class="full"></select></label>
    <label>Novo osso<input id="playable-seat-bone" maxlength="25"></label>
    <p class="help">Selecione um ponto do projeto acima para definir a posição. Importe o vehicles.meta e o vehiclelayouts.meta com as definições do layout. Inclua o _hi.yft se o mod usar esse arquivo.</p>
    <button type="button" id="playable-seat-export" class="full">Exportar ZIP do assento</button>
    <p id="playable-seat-status" class="help" role="status"></p>`;
  document.querySelector("#seat-editor").after(panel);
  const $ = (id) => panel.querySelector("#" + id);
  const donor = $("playable-seat-donor"), door = $("playable-seat-door");
  const bone = $("playable-seat-bone"), output = $("playable-seat-export");
  const status = $("playable-seat-status"), input = $("playable-seat-files");
  let files = [], source = null, busy = false;
  const native = window.parent.godoyNative ?? window.godoyNative;
  const available = () => typeof native?.addVehicleSeat === "function";
  const stem = (name) => name.replace(/\.yft$/i, "");
  function setSuggestedBone() {
    const prefix = donor.value.replace(/\d+$/, "");
    const existing = new Set(inspector.points.map(({ name }) => name?.toLowerCase()));
    let suffix = 1;
    while (existing.has((prefix + suffix).toLowerCase())) suffix++;
    bone.value = prefix ? prefix + suffix : "";
  }
  function update() {
    output.disabled = busy || !available() || !source || !donor.value || !door.value;
  }
  function reset() {
    files = [];
    source = null;
    donor.replaceChildren();
    door.replaceChildren();
    bone.value = "";
    status.textContent = available()
      ? "Abra o YFT principal e os metadados do layout."
      : "A exportação nativa do assento está disponível no aplicativo Windows.";
    update();
  }
  async function loadFiles(nextFiles) {
    const model = getModel();
    if (!model || /_hi\.yft$/i.test(model.name)) {
      status.textContent = "Abra o YFT principal do veículo.";
      return;
    }
    const find = (pattern) => nextFiles.find(({ name }) => pattern.test(name));
    const vehicles = find(/^vehicles\.(meta|xml)$/i);
    const layouts = find(/^vehiclelayouts\.(meta|xml)$/i);
    const hi = nextFiles.find(({ name }) => name.toLowerCase() === stem(model.name).toLowerCase() + "_hi.yft");
    files = nextFiles;
    if (!vehicles || !layouts) {
      status.textContent = "Selecione vehicles.meta e vehiclelayouts.meta.";
      return;
    }
    if (vehicles.size > 5 * 1024 * 1024 || layouts.size > 5 * 1024 * 1024 ||
        (hi && hi.size > 80 * 1024 * 1024))
      throw Error("Metadados acima de 5 MB ou YFT acima de 80 MB.");
    const [vehiclesXml, layoutsXml] = await Promise.all([vehicles.text(), layouts.text()]);
    if (getModel()?.bytes !== model.bytes) return;
    const info = inspectSeatLayout(vehiclesXml, layoutsXml, stem(model.name));
    const bones = new Set(model.points.map(({ name }) => name?.toLowerCase()));
    donor.replaceChildren(...info.donors
      .filter(({ bone }) => /^seat_(dside|pside)_[fmr][0-9]{0,5}$/i.test(bone) && bones.has(bone.toLowerCase()))
      .map(({ bone }) => new Option(bone, bone)));
    door.replaceChildren(...info.doors.map(({ id, door }) => new Option(`${door} · ${id}`, id)));
    source = { model, vehiclesXml, layoutsXml, hi };
    setSuggestedBone();
    update();
    status.textContent = !donor.value || !door.value
      ? "O layout importado precisa definir um assento do esqueleto e uma porta com animação."
      : hi ? `Arquivos prontos · ${hi.name} incluído.` : "Arquivos prontos · somente YFT principal.";
  }
  function accept(nextFiles) {
    source = null;
    update();
    return loadFiles(nextFiles).catch((error) => { status.textContent = error.message; });
  }
  $("playable-seat-import").onclick = () => input.click();
  input.onchange = async () => {
    const merged = new Map([...files, ...input.files].map((file) => [file.name.toLowerCase(), file]));
    await accept([...merged.values()]);
    input.value = "";
  };
  donor.onchange = () => { setSuggestedBone(); update(); };
  door.onchange = update;
  output.onclick = async () => {
    if (!source || !available() || busy) return;
    const projectSeat = document.querySelector("#seat-plan").value;
    const seat = projectSeat === "" ? null : inspector.seatPlan[Number(projectSeat)];
    if (!seat) {
      status.textContent = "Escolha um ponto de assento do projeto.";
      return;
    }
    const { model, vehiclesXml, layoutsXml, hi } = source;
    const [donorName, entryId, name] = [donor.value, door.value, bone.value.trim().toLowerCase()];
    busy = true;
    update();
    status.textContent = "Gravando esqueleto e conferindo os arquivos…";
    try {
      if (model.bytes !== getModel()?.bytes) throw Error("O modelo ativo foi alterado. Reimporte os metadados.");
      const metadata = addPlayableSeatMetadata(vehiclesXml, layoutsXml, stem(model.name), donorName, entryId, name);
      const request = { name, donor: donorName, position: seat.position, door: metadata.door };
      const archive = Object.create(null);
      async function exportModel(filename, bytes) {
        const saved = await native.addVehicleSeat({ ...request, bytes: new Uint8Array(bytes) });
        const doc = parseYft(saved);
        if (!doc.drawables[0].vehiclePoints.some((point) => point.name === name))
          throw Error(`O novo assento não foi encontrado em ${filename}.`);
        archive[filename] = saved;
      }
      await exportModel(model.name, model.bytes);
      if (hi) await exportModel(hi.name, await hi.arrayBuffer());
      archive["vehicles.meta"] = strToU8(metadata.vehicles);
      archive["vehiclelayouts.meta"] = strToU8(metadata.layouts);
      download(`${stem(model.name)}-assento.zip`, new Blob([zipSync(archive, { level: 0 })], { type: "application/zip" }));
      status.textContent = "ZIP exportado. Confira entrada, ocupação e saída do assento no FiveM.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      busy = false;
      update();
    }
  };
  reset();
  return { accept, reset };
}
