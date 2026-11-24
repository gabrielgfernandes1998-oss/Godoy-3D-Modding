import { setSirenBpm, setSirenChannel } from "./siren-patterns.js";

export function attachVehicleSetup(panel, section, inspector, markChanged, download) {
  const tabs = document.createElement("div");
  tabs.className = "vehicle-tabs";
  tabs.innerHTML = `<button id="vehicle-paint-tab" type="button" aria-pressed="true">Pintura</button>
    <button id="vehicle-setup-tab" type="button" aria-pressed="false">Assentos e giroflex</button>`;
  panel.querySelector(".panel-head").after(tabs);
  const switchTab = (setup) => {
    panel.classList.toggle("vehicle-setup-active", setup);
    tabs.querySelector("#vehicle-paint-tab").setAttribute("aria-pressed", String(!setup));
    tabs.querySelector("#vehicle-setup-tab").setAttribute("aria-pressed", String(setup));
  };
  tabs.querySelector("#vehicle-paint-tab").onclick = () => switchTab(false);
  tabs.querySelector("#vehicle-setup-tab").onclick = () => {
    switchTab(true);
    inspector.show3D();
  };

  section.insertAdjacentHTML("beforeend", `
    <fieldset class="vehicle-editor" id="seat-editor">
      <legend>Planejar assentos</legend>
      <label>Nome<input id="seat-name" type="text" maxlength="48" value="Passageiro"></label>
      <div class="transform-grid">
        <label>X (lateral)<input id="seat-x" type="number" min="-100" max="100" step="0.05" value="0"></label>
        <label>Y (altura)<input id="seat-y" type="number" min="-100" max="100" step="0.05" value="0"></label>
        <label>Z (longitudinal)<input id="seat-z" type="number" min="-100" max="100" step="0.05" value="0"></label>
      </div>
      <button id="seat-add" type="button" class="full">Adicionar ponto de assento</button>
      <label>Pontos do projeto<select id="seat-plan" class="full"></select></label>
      <div class="layer-actions"><button id="seat-update" type="button">Aplicar posição</button><button id="seat-remove" type="button">Remover ponto</button></div>
      <p class="help">Pontos salvos no .paintfive. Para ocupação no jogo, o assento precisa constar no esqueleto e no layout do veículo.</p>
    </fieldset>
    <fieldset class="vehicle-editor" id="siren-editor">
      <legend>Editar giroflex</legend>
      <label>Velocidade (BPM)<input id="siren-bpm" type="number" min="1" max="1200" step="1"></label>
      <label>Canal (siren)<input id="siren-channel" type="number" min="1" max="99" step="1" value="1"></label>
      <label>Cor<input id="siren-color" type="color" value="#ff454f"></label>
      <label class="label-row">Piscar<input id="siren-flash" type="checkbox" checked></label>
      <label>Padrão rápido<select id="siren-preset" class="full">
        <option value="">Personalizado</option>
        <option value="10101010101010101010101010101010">Alternado</option>
        <option value="01010101010101010101010101010101">Alternado invertido</option>
        <option value="11001100110011001100110011001100">Pulso longo</option>
        <option value="10100000101000001010000010100000">Duplo pulso</option>
      </select></label>
      <label>Sequência de 32 passos<input id="siren-sequence" type="text" maxlength="32" inputmode="numeric" pattern="[01]{32}" value="10101010101010101010101010101010"></label>
      <p class="help">1 acende, 0 apaga. O canal corresponde ao ponto siren do modelo. O BPM afeta os canais sincronizados.</p>
      <button id="siren-apply" type="button" class="full">Adicionar ou aplicar canal</button>
      <button id="siren-remove" type="button" class="full">Desativar canal</button>
      <button id="siren-export" type="button" class="full">Exportar carcols.meta</button>
    </fieldset>
    <p class="help" id="vehicle-edit-status" role="status"></p>`);

  const $ = (id) => section.querySelector("#" + id);
  const axes = ["seat-x", "seat-y", "seat-z"];
  const seatList = $("seat-plan");
  const selectedSeat = () => seatList.value === "" ? -1 : Number(seatList.value);
  const currentProfile = () => inspector.profiles[inspector.profileSelect.value];
  const integer = (id) => {
    const input = $(id);
    if (!input.value || !input.checkValidity()) throw Error("Confira os valores do giroflex.");
    return input.valueAsNumber;
  };
  const syncPreset = () => {
    const select = $("siren-preset");
    select.value = $("siren-sequence").value;
    if (select.selectedIndex < 0) select.value = "";
  };
  const updateControls = () => {
    const profile = currentProfile();
    $("siren-editor").disabled = !profile;
    $("seat-editor").disabled = !inspector.root;
    if (!profile) return;
    $("siren-bpm").value = profile.bpm;
    const channel = profile.channels[$("siren-channel").valueAsNumber - 1];
    $("siren-color").value = channel?.color == null ? "#ff454f" : "#" + channel.color.toString(16).padStart(6, "0");
    $("siren-flash").checked = channel?.flash ?? true;
    $("siren-sequence").value = channel ? channel.sequence.toString(2).padStart(32, "0") : "10".repeat(16);
    syncPreset();
    $("siren-remove").disabled = !channel;
  };
  const syncSeats = (selection = selectedSeat()) => {
    seatList.replaceChildren(new Option("Selecionar ponto…", ""), ...inspector.seatPlan.map(({ label }, i) => new Option(label, i)));
    seatList.value = inspector.seatPlan[selection] ? String(selection) : "";
    $("seat-update").disabled = $("seat-remove").disabled = seatList.value === "";
  };
  seatList.onchange = () => {
    const seat = inspector.seatPlan[selectedSeat()];
    if (seat) {
      $("seat-name").value = seat.label;
      axes.forEach((id, i) => { $(id).value = seat.position[i]; });
    }
    syncSeats();
  };
  const seatFromFields = () => {
    const label = $("seat-name").value.trim();
    const position = axes.map((id) => $(id).valueAsNumber);
    if (!label || position.some((n) => !Number.isFinite(n) || Math.abs(n) > 100))
      throw Error("Informe o nome e as três coordenadas do assento.");
    return { label, position };
  };
  const action = (id, apply) => {
    $(id).onclick = () => {
      try {
        $("vehicle-edit-status").textContent = "";
        apply();
      } catch (error) {
        $("vehicle-edit-status").textContent = error.message;
      }
    };
  };
  const updateSeats = (selection) => {
    inspector.refreshMarkers();
    inspector.seats.checked = true;
    syncSeats(selection);
    markChanged();
  };
  action("seat-add", () => {
    if (inspector.seatPlan.length >= 32) throw Error("Limite de 32 pontos de assento no projeto.");
    inspector.seatPlan.push(seatFromFields());
    updateSeats(inspector.seatPlan.length - 1);
  });
  action("seat-update", () => {
    const index = selectedSeat();
    inspector.seatPlan[index] = seatFromFields();
    updateSeats(index);
  });
  action("seat-remove", () => {
    inspector.seatPlan.splice(selectedSeat(), 1);
    updateSeats(-1);
  });

  $("siren-channel").oninput = updateControls;
  $("siren-sequence").oninput = syncPreset;
  $("siren-preset").onchange = () => {
    if ($("siren-preset").value) {
      $("siren-sequence").value = $("siren-preset").value;
      $("siren-flash").checked = true;
    }
  };
  action("siren-apply", () => {
    const number = integer("siren-channel");
    const bpm = integer("siren-bpm");
    const text = $("siren-sequence").value;
    if (!/^[01]{32}$/.test(text)) throw Error("A sequência precisa de 32 dígitos, usando 0 ou 1.");
    const profile = currentProfile();
    setSirenChannel(profile, number, {
      color: parseInt($("siren-color").value.slice(1), 16),
      flash: $("siren-flash").checked,
      sequence: parseInt(text, 2),
    });
    setSirenBpm(profile, bpm);
    inspector.refreshSirenPreview();
    if (!inspector.markers.some(({ channel }) => channel === number))
      $("vehicle-edit-status").textContent = "O canal foi gravado no perfil. O modelo precisa do ponto siren correspondente para exibi-lo.";
    markChanged();
  });
  action("siren-remove", () => {
    const profile = currentProfile();
    const number = integer("siren-channel");
    if (!profile.channels[number - 1]) throw Error("Este canal ainda não existe no perfil.");
    setSirenChannel(profile, number, {
      color: profile.channels[number - 1].color ?? 0xff454f, flash: true, sequence: 0,
    });
    inspector.refreshSirenPreview();
    markChanged();
  });
  action("siren-export", () => {
    const doc = currentProfile().element.ownerDocument;
    download("carcols.meta", new Blob([new XMLSerializer().serializeToString(doc)], { type: "application/xml" }));
  });
  inspector.onProfileChange = updateControls;
  inspector.onModelChange = () => { syncSeats(-1); updateControls(); };
  updateControls();
  syncSeats(-1);
}
