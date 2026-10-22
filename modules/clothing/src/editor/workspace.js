import {
  LayerDocument,
  canvas,
  cloneCanvas,
  loadImage,
  traceMask,
  floodRegion,
} from "./layers.js";
const $ = (s) => document.querySelector(s);
export const layerPanels = `
<section class="section layer-section"><div class="section-title">CAMADAS <span id="layer-count" class="count">2</span></div><div class="layer-actions"><button id="add-layer" title="Nova camada de pintura">＋ Pintura</button><button id="add-text" title="Adicionar texto">T Texto</button><button id="duplicate-layer" title="Duplicar camada">Duplicar</button></div><div id="layer-list" class="layer-list"></div><div class="layer-actions"><button id="layer-up" title="Subir camada">↑</button><button id="layer-down" title="Descer camada">↓</button><button id="lock-layer">Bloquear</button><button id="delete-layer" title="Excluir camada">Excluir</button></div><label class="field">Nome da camada<input id="layer-name" maxlength="120"></label><label class="field">Mesclagem<select id="layer-blend"><option value="source-over">Normal</option><option value="multiply">Multiply · Multiplicar</option><option value="overlay">Overlay · Sobrepor</option><option value="screen">Screen · Tela</option></select></label><label class="field">Opacidade <output id="layer-opacity-out">100%</output><input id="layer-opacity" type="range" min="0" max="100" value="100"></label><label class="field">Brilho <output id="layer-brightness-out">100%</output><input id="layer-brightness" type="range" min="0" max="300" value="100"></label><label class="field">Contraste <output id="layer-contrast-out">100%</output><input id="layer-contrast" type="range" min="0" max="300" value="100"></label></section>`;
export const propertyPanels = `
<section class="section"><div class="section-title">SELEÇÃO / MÁSCARA UV</div><p class="help" id="selection-info">Sem restrição. Use a ferramenta Ilha UV para selecionar uma região.</p><div class="layer-actions"><button id="clear-selection">Limpar seleção</button><button id="mask-layer">Mascarar camada</button><button id="unmask-layer">Remover máscara</button></div></section>
<section class="section" id="transform-panel"><div class="section-title">OBJETO EDITÁVEL</div><p class="help">Selecione o texto, imagem ou forma na lista. Arraste com Mover no 3D ou no mapa UV.</p><div class="field-grid"><label class="field">Posição X<input id="object-x" type="number" step="1"></label><label class="field">Posição Y<input id="object-y" type="number" step="1"></label></div><div class="field-grid object-size"><label class="field">Largura (px)<input id="object-width" type="number" min="1" max="81920"></label><label class="field">Altura (px)<input id="object-height" type="number" min="1" max="81920"></label></div><label class="field">Escala <output id="scale-out">100%</output><input id="scale" type="range" min="2" max="500" value="100"></label><label class="field">Rotação <output id="rotation-out">0°</output><input id="rotation" type="range" min="-180" max="180" value="0"></label><label class="field">Cor do objeto<input id="object-color" type="color" value="#ef4444"></label></section>
<section class="section" id="text-panel"><div class="section-title">TEXTO EDITÁVEL</div><label class="field">Conteúdo<textarea id="text-content" rows="3" maxlength="5000">SEU TEXTO</textarea></label><label class="field">Fonte<select id="font-family"><option>Arial</option><option>Impact</option><option>Georgia</option><option>Courier New</option><option>Verdana</option></select></label><button id="import-font" class="full">Carregar fonte .TTF / .OTF</button><div class="field-grid"><label class="field">Tamanho (px)<input id="font-size" type="number" min="4" max="2000" value="110"></label><label class="field">Alinhamento<select id="text-align"><option value="center">Centro</option><option value="left">Esquerda</option><option value="right">Direita</option></select></label></div><div class="checks"><label><input id="text-bold" type="checkbox" checked> Negrito</label><label><input id="text-italic" type="checkbox"> Itálico</label></div><div class="field-grid"><label class="field">Contorno (px)<input id="text-stroke" type="number" min="0" max="300" value="2"></label><label class="field">Cor do contorno<input id="text-stroke-color" type="color" value="#ffffff"></label></div><div class="field-grid"><label class="field">Sombra: blur<input id="shadow-blur" type="number" min="0" max="300" value="0"></label><label class="field">Cor da sombra<input id="shadow-color" type="color" value="#000000"></label><label class="field">Sombra X<input id="shadow-x" type="number" min="-500" max="500" value="3"></label><label class="field">Sombra Y<input id="shadow-y" type="number" min="-500" max="500" value="3"></label></div></section>
<section class="section" id="shape-panel"><div class="section-title">FORMAS / BÉZIER</div><label class="field">Espessura da linha (px)<input id="shape-stroke" type="number" min="1" max="300" value="8"></label><label class="field">Cor da linha<input id="shape-stroke-color" type="color" value="#ef4444"></label><div class="checks"><label><input id="shape-fill" type="checkbox" checked> Preenchimento</label><label><input id="path-closed" type="checkbox"> Fechar curva</label></div><button id="finish-path" class="full">Concluir curva (Enter)</button><p class="help">Pen: clique para criar pontos; arraste ao criar para definir as tangentes. Enter conclui. Para reeditar, selecione a curva, ative Mover e arraste os pontos/alças no mapa UV. Alt permite alças independentes.</p></section>
<section class="section" id="bucket-panel"><div class="section-title">PREENCHIMENTO</div><label class="field">Região<select id="fill-mode"><option value="contiguous">Área de cor conectada</option><option value="selection">Seleção UV inteira</option><option value="material">Material da superfície</option></select></label><label class="field">Tolerância<input id="fill-tolerance" type="range" min="0" max="100" value="24"></label></section>
<input id="font-file" type="file" accept=".ttf,.otf" hidden>`;
const clamp = (v, min, max) => Math.max(min, Math.min(max, Number(v) || 0));
const editable = (l) => l && l.type !== "raster";
export class WorkspaceEditor {
  constructor(options) {
    this.o = options;
    this.doc = null;
    this.tool = "brush";
    this.gesture = null;
    this.pendingImage = null;
    this.pendingPath = null;
    this.fonts = [];
    this.busy = false;
    this.propertyEdit = null;
    this.bindUI();
    for (const stage of [options.sceneCanvas, options.uvCanvas]) {
      stage.addEventListener("pointerdown", (e) =>
        this.safe(() => this.down(e)),
      );
      stage.addEventListener("pointermove", (e) =>
        this.safe(() => this.move(e)),
      );
      stage.addEventListener("pointerup", (e) => this.safe(() => this.up(e)));
      stage.addEventListener("pointercancel", () => this.cancelGesture());
      stage.addEventListener("lostpointercapture", () => {
        if (this.gesture) this.up();
      });
      stage.addEventListener("contextmenu", (e) => e.preventDefault());
    }
  }
  safe(fn) {
    try {
      const result = fn();
      if (result?.catch) result.catch((e) => this.o.toast(e.message));
      return result;
    } catch (e) {
      this.o.toast(e.message);
      if (this.gesture) {
        this.gesture = null;
        this.o.navigation(true);
      }
    }
  }
  setDocument(doc) {
    this.cancelGesture();
    this.pendingPath = null;
    this.pendingImage = null;
    this.doc = doc;
    doc.onChange = () => this.o.changed();
    doc.onRender = () => this.render();
    this.o.selection?.(doc.selection, null);
    this.render();
    this.sync();
  }
  get hasPending() {
    return !!this.gesture || !!this.pendingPath;
  }
  render() {
    if (!this.doc) return;
    this.doc.renderTo(this.o.output);
    this.o.refresh();
    this.sync();
  }
  bindUI() {
    const click = (id, fn) =>
      $(id).addEventListener("click", () => this.safe(fn));
    document
      .querySelectorAll("[data-tool]")
      .forEach(
        (button) =>
          (button.onclick = () =>
            this.safe(() => this.setTool(button.dataset.tool))),
      );
    click("#add-layer", () => {
      this.doc.add("raster", {
        name:
          "Pintura " +
          this.doc.layers.filter((l) => l.type === "raster").length,
      });
      this.setTool("brush");
    });
    click("#add-text", () => this.setTool("text"));
    click("#duplicate-layer", () => this.doc.duplicate());
    click("#delete-layer", () => this.doc.remove());
    click("#layer-up", () => this.doc.reorder(1));
    click("#layer-down", () => this.doc.reorder(-1));
    click("#lock-layer", () =>
      this.doc.update({ locked: !this.doc.active?.locked }),
    );
    click("#undo", () => this.undo());
    click("#redo", () => this.redo());
    click("#apply-decal", () => {
      this.finishPath();
      this.setTool("move");
    });
    click("#cancel-decal", () => {
      this.pendingImage = null;
      this.cancelGesture();
      this.setTool("move");
    });
    click("#clear-selection", () => {
      this.doc.checkpoint();
      this.doc.selection = null;
      this.o.selection?.(null, null);
      this.doc.changed(null);
    });
    click("#mask-layer", () => {
      if (!this.doc.selection) throw Error("Selecione uma ilha UV primeiro.");
      this.doc.update({ clip: structuredClone(this.doc.selection) });
    });
    click("#unmask-layer", () => this.doc.update({ clip: null }));
    click("#finish-path", () => this.finishPath());
    click("#import-font", () => $("#font-file").click());
    $("#font-file").onchange = (e) =>
      this.safe(async () => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          if (!/\.(ttf|otf)$/i.test(file.name) || file.size > 10 * 1024 * 1024)
            throw Error("Use uma fonte TTF/OTF de até 10 MB.");
          const data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const font = {
            family: "GodoyFont" + Date.now().toString(36),
            label: file.name,
            data,
          };
          await this.loadFonts([font]);
          $("#font-family").value = font.family;
          if (this.doc.active?.type === "text")
            this.doc.update({ fontFamily: font.family });
          else this.o.changed();
          this.o.toast("Fonte local carregada e incluída ao salvar o projeto.");
        } finally {
          e.target.value = "";
        }
      });
    const fields = {
      "#layer-name": ["name", (v) => v],
      "#layer-blend": ["blend", (v) => v],
      "#layer-opacity": ["opacity", (v) => clamp(v, 0, 100)],
      "#layer-brightness": ["brightness", (v) => clamp(v, 0, 300)],
      "#layer-contrast": ["contrast", (v) => clamp(v, 0, 300)],
      "#object-x": ["x", (v) => clamp(v, -65536, 65536)],
      "#object-y": ["y", (v) => clamp(v, -65536, 65536)],
      "#scale": ["scale", (v) => clamp(v, 2, 500) / 100],
      "#rotation": ["rotation", (v) => clamp(v, -180, 180)],
      "#object-color": ["color", (v) => v],
      "#object-width": ["width", (v) => clamp(v, 1, this.doc.width * 10)],
      "#object-height": ["height", (v) => clamp(v, 1, this.doc.height * 10)],
      "#text-content": ["text", (v) => v],
      "#font-family": ["fontFamily", (v) => v],
      "#font-size": ["fontSize", (v) => clamp(v, 4, 2000)],
      "#text-align": ["align", (v) => v],
      "#text-bold": ["bold", (v) => v],
      "#text-italic": ["italic", (v) => v],
      "#text-stroke": ["strokeWidth", (v) => clamp(v, 0, 300)],
      "#text-stroke-color": ["strokeColor", (v) => v],
      "#shadow-blur": ["shadowBlur", (v) => clamp(v, 0, 300)],
      "#shadow-color": ["shadowColor", (v) => v],
      "#shadow-x": ["shadowX", (v) => clamp(v, -500, 500)],
      "#shadow-y": ["shadowY", (v) => clamp(v, -500, 500)],
      "#shape-stroke": ["strokeWidth", (v) => clamp(v, 1, 300)],
      "#shape-stroke-color": ["strokeColor", (v) => v],
      "#shape-fill": ["fill", (v) => v],
      "#path-closed": ["closed", (v) => v],
    };
    for (const [id, [prop, convert]] of Object.entries(fields)) {
      const el = $(id);
      el.addEventListener("input", () =>
        this.safe(() => {
          const l = this.doc?.active;
          if (!l || l.locked) return;
          if (
            id.startsWith("#text") ||
            id.startsWith("#font") ||
            id.startsWith("#shadow")
          ) {
            if (l.type !== "text") return;
          }
          if (id.startsWith("#shape") || id === "#path-closed") {
            if (!["shape", "path"].includes(l.type)) return;
          }
          if (
            id.startsWith("#object") ||
            ["#scale", "#rotation"].includes(id)
          ) {
            if (!editable(l)) return;
          }
          if (this.propertyEdit !== el) {
            this.doc.checkpoint();
            this.propertyEdit = el;
          }
          this.doc.update(
            { [prop]: convert(el.type === "checkbox" ? el.checked : el.value) },
            false,
          );
        }),
      );
      el.addEventListener("change", () => {
        this.propertyEdit = null;
      });
      el.addEventListener("blur", () => {
        this.propertyEdit = null;
      });
    }
    for (const id of ["size", "opacity", "softness"])
      $("#" + id).oninput = (e) =>
        ($("#" + id + "-out").textContent =
          e.target.value + (id === "size" ? " px" : "%"));
    $("#color").oninput = (e) =>
      ($("#color-hex").textContent = e.target.value.toUpperCase());
    document.querySelectorAll("[data-color]").forEach(
      (b) =>
        (b.onclick = () => {
          $("#color").value = b.dataset.color;
          $("#color").dispatchEvent(new Event("input"));
        }),
    );
  }
  async loadFonts(fonts) {
    if (!Array.isArray(fonts) || fonts.length > 24)
      throw Error("Lista de fontes inválida no projeto.");
    for (const font of fonts || []) {
      if (this.fonts.some((f) => f.family === font.family)) continue;
      if (
        this.fonts.length >= 24 ||
        typeof font.family !== "string" ||
        !/^GodoyFont[a-z0-9]+$/i.test(font.family) ||
        typeof font.data !== "string" ||
        !/^data:[a-zA-Z0-9/+.\-]*;base64,[A-Za-z0-9+/]*={0,2}$/.test(
          font.data,
        ) ||
        font.data.length > 14 * 1024 * 1024
      )
        throw Error("Fonte inválida no projeto.");
      const face = new FontFace(font.family, `url("${font.data}")`);
      await face.load();
      document.fonts.add(face);
      this.fonts.push({ ...font, face });
      $("#font-family").add(
        new Option(String(font.label).slice(0, 120), font.family),
      );
    }
  }
  serializeFonts() {
    return this.fonts.map(({ face, ...font }) => font);
  }
  setTool(tool) {
    if (this.pendingPath && tool !== "pen") this.finishPath();
    this.tool = tool;
    document
      .querySelectorAll("[data-tool]")
      .forEach((b) => b.classList.toggle("active", b.dataset.tool === tool));
    $("#tool-tag").textContent =
      {
        brush: "PINCEL",
        erase: "BORRACHA",
        orbit: "NAVEGAR",
        move: "MOVER",
        decal: "IMAGEM",
        text: "TEXTO",
        line: "LINHA",
        rectangle: "RETÂNGULO",
        ellipse: "CÍRCULO",
        pen: "BÉZIER",
        bucket: "PREENCHER",
        eyedropper: "CONTA-GOTAS",
        island: "ILHA UV",
      }[tool] || tool;
    this.o.tool(tool);
    for (const c of [this.o.sceneCanvas, this.o.uvCanvas])
      c.style.cursor =
        tool === "orbit" ? "grab" : tool === "move" ? "move" : "crosshair";
    this.sync();
    const panel =
      tool === "text"
        ? "#text-panel"
        : ["line", "rectangle", "ellipse", "pen"].includes(tool)
          ? "#shape-panel"
          : tool === "bucket"
            ? "#bucket-panel"
            : tool === "move" && editable(this.doc?.active)
              ? "#transform-panel"
              : null;
    if (panel) $(panel).scrollIntoView({ block: "nearest" });
    else if (["brush", "erase", "eyedropper"].includes(tool))
      $(".right").scrollTop = 0;
    if (
      tool === "decal" &&
      !this.pendingImage &&
      this.doc.active?.type !== "image"
    )
      $("#image-file").click();
  }
  async addImage(file) {
    if (file.size > 20 * 1024 * 1024) throw Error("Imagem maior que 20 MB.");
    const image = await this.o.readImage(file);
    if (image.width * image.height > 16777216)
      throw Error("Imagem maior que 16 megapixels.");
    const c = canvas(image.width, image.height);
    c.getContext("2d").drawImage(image, 0, 0);
    this.pendingImage = {
      image,
      source: c.toDataURL("image/png"),
      name: file.name,
    };
    this.setTool("decal");
    this.o.toast(
      "Clique e arraste no 3D ou no mapa UV para posicionar. A imagem continuará editável como camada.",
    );
  }
  style(type) {
    const common = {
      color: $("#color").value,
      clip: this.doc.selection ? structuredClone(this.doc.selection) : null,
    };
    if (type === "text")
      return {
        ...common,
        name: $("#text-content").value.slice(0, 28) || "Texto",
        text: $("#text-content").value,
        fontSize: clamp($("#font-size").value, 4, 2000),
        fontFamily: $("#font-family").value,
        bold: $("#text-bold").checked,
        italic: $("#text-italic").checked,
        align: $("#text-align").value,
        strokeWidth: clamp($("#text-stroke").value, 0, 300),
        strokeColor: $("#text-stroke-color").value,
        shadowBlur: clamp($("#shadow-blur").value, 0, 300),
        shadowColor: $("#shadow-color").value,
        shadowX: clamp($("#shadow-x").value, -500, 500),
        shadowY: clamp($("#shadow-y").value, -500, 500),
      };
    return {
      ...common,
      strokeWidth: clamp($("#shape-stroke").value, 1, 300),
      strokeColor: $("#shape-stroke-color").value,
      fill: $("#shape-fill").checked,
      closed: $("#path-closed").checked,
    };
  }
  down(event) {
    if (event.button !== 0 || this.tool === "orbit" || this.busy || !this.doc)
      return;
    const p = this.o.hit(event);
    if (!p) return;
    event.preventDefault();
    const { x, y } = p;
    if (this.tool === "eyedropper") {
      const rgba = this.o.output
        .getContext("2d", { willReadFrequently: true })
        .getImageData(
          Math.min(this.doc.width - 1, Math.floor(x)),
          Math.min(this.doc.height - 1, Math.floor(y)),
          1,
          1,
        ).data;
      $("#color").value =
        "#" +
        Array.from(rgba.slice(0, 3), (n) =>
          n.toString(16).padStart(2, "0"),
        ).join("");
      $("#color").dispatchEvent(new Event("input"));
      this.o.toast("Cor capturada: " + $("#color").value.toUpperCase());
      return;
    }
    if (this.tool === "island") {
      const polygons = this.o.island(p);
      if (!polygons?.length)
        throw Error("Clique em uma ilha do modelo ou do mapa UV.");
      this.doc.checkpoint();
      this.doc.selection = polygons;
      this.o.selection?.(polygons, p);
      this.doc.changed(null);
      return;
    }
    if (this.tool === "bucket") {
      this.fill(p);
      return;
    }
    if (this.tool === "move") {
      const l = this.doc.active;
      const handle =
        event.currentTarget === this.o.uvCanvas ? this.pathHandle(x, y) : null;
      const picked = handle ? l : this.doc.pick(x, y);
      if (picked) this.doc.activeId = picked.id;
      const selected = this.doc.active;
      if (!editable(selected) || selected.locked) {
        this.sync();
        return;
      }
      this.doc.checkpoint();
      this.gesture = {
        kind: handle ? "handle" : "move",
        layer: selected,
        start: { x, y },
        initial: { x: selected.x, y: selected.y },
        handle,
      };
      this.capture(event);
      this.sync();
      return;
    }
    if (this.tool === "decal" || this.tool === "text") {
      let layer;
      if (this.tool === "decal") {
        if (!this.pendingImage) {
          const active = this.doc.active;
          if (active?.type !== "image") return;
          this.doc.checkpoint();
          layer = active;
        } else {
          const image = this.pendingImage;
          this.doc.checkpoint();
          layer = this.doc.add(
            "image",
            {
              name: image.name,
              image: image.image,
              source: image.source,
              width: this.doc.width * 0.3,
              height:
                (this.doc.width * 0.3 * image.image.height) / image.image.width,
              x,
              y,
              clip: this.doc.selection
                ? structuredClone(this.doc.selection)
                : null,
            },
            false,
          );
          this.pendingImage = null;
        }
      } else {
        this.doc.checkpoint();
        layer = this.doc.add("text", { ...this.style("text"), x, y }, false);
      }
      layer.x = x;
      layer.y = y;
      this.gesture = { kind: "place", layer };
      this.capture(event);
      this.doc.changed(layer);
      return;
    }
    if (["line", "rectangle", "ellipse"].includes(this.tool)) {
      this.doc.checkpoint();
      const layer = this.doc.add(
        "shape",
        {
          ...this.style("shape"),
          shape: this.tool,
          name: { line: "Linha", rectangle: "Retângulo", ellipse: "Círculo" }[
            this.tool
          ],
          x,
          y,
          width: 1,
          height: 1,
        },
        false,
      );
      this.gesture = { kind: "shape", layer, start: { x, y } };
      this.capture(event);
      this.doc.changed(layer);
      return;
    }
    if (this.tool === "pen") {
      let layer = this.doc.layers.find((l) => l.id === this.pendingPath);
      this.doc.checkpoint();
      if (!layer) {
        layer = this.doc.add(
          "path",
          { ...this.style("path"), name: "Curva Bézier", x, y, fill: false },
          false,
        );
        this.pendingPath = layer.id;
      }
      this.doc.activeId = layer.id;
      const local = this.local(layer, x, y),
        anchor = { x: local.x, y: local.y, inX: 0, inY: 0, outX: 0, outY: 0 };
      layer.anchors.push(anchor);
      this.gesture = { kind: "pen", layer, anchor };
      this.capture(event);
      this.doc.changed(layer);
      return;
    }
    if (this.doc.active?.locked)
      throw Error("Desbloqueie a camada para pintar.");
    if (this.tool === "erase" && this.doc.active?.type !== "raster")
      throw Error(
        "A borracha atua em camadas de pintura. Para texto, imagem ou forma, use uma máscara ou edite o objeto.",
      );
    this.doc.checkpoint();
    const layer =
      this.doc.active?.type === "raster"
        ? this.doc.active
        : this.doc.add(
            "raster",
            {
              name:
                "Pintura " +
                this.doc.layers.filter((l) => l.type === "raster").length,
            },
            false,
          );
    this.gesture = {
      kind: "paint",
      layer,
      last: null,
      erase: this.tool === "erase",
    };
    this.capture(event);
    this.stroke(p);
  }
  capture(event) {
    event.currentTarget.setPointerCapture(event.pointerId);
    this.o.navigation(false);
  }
  move(event) {
    if (!this.gesture) return;
    const p = this.o.hit(event);
    if (!p) {
      if (this.gesture.kind === "paint") this.gesture.last = null;
      return;
    }
    const g = this.gesture,
      l = g.layer;
    if (g.kind === "paint") {
      this.stroke(p);
      return;
    }
    if (g.kind === "place") {
      l.x = p.x;
      l.y = p.y;
    }
    if (g.kind === "move") {
      l.x = g.initial.x + p.x - g.start.x;
      l.y = g.initial.y + p.y - g.start.y;
    }
    if (g.kind === "shape") {
      const dx = p.x - g.start.x,
        dy = p.y - g.start.y;
      l.x = (p.x + g.start.x) / 2;
      l.y = (p.y + g.start.y) / 2;
      l.width = Math.max(
        1,
        l.shape === "line" ? Math.hypot(dx, dy) : Math.abs(dx),
      );
      l.height = Math.max(1, Math.abs(dy));
      if (l.shape === "line") l.rotation = (Math.atan2(dy, dx) * 180) / Math.PI;
    }
    if (g.kind === "pen") {
      const local = this.local(l, p.x, p.y);
      g.anchor.outX = local.x - g.anchor.x;
      g.anchor.outY = local.y - g.anchor.y;
      g.anchor.inX = -g.anchor.outX;
      g.anchor.inY = -g.anchor.outY;
    }
    if (g.kind === "handle") {
      const local = this.local(l, p.x, p.y),
        a = l.anchors[g.handle.index];
      if (g.handle.type === "anchor") {
        a.x = local.x;
        a.y = local.y;
      } else {
        const prefix = g.handle.type;
        a[prefix + "X"] = local.x - a.x;
        a[prefix + "Y"] = local.y - a.y;
        if (!event.altKey) {
          const opposite = prefix === "in" ? "out" : "in";
          a[opposite + "X"] = -a[prefix + "X"];
          a[opposite + "Y"] = -a[prefix + "Y"];
        }
      }
    }
    this.doc.changed(l);
  }
  up() {
    if (!this.gesture) return;
    const kind = this.gesture.kind;
    this.gesture = null;
    this.o.navigation(true);
    if (kind === "place") this.setTool("move");
    this.render();
  }
  cancelGesture() {
    if (this.gesture) {
      this.gesture = null;
      this.o.navigation(true);
    }
    return false;
  }
  finishPath() {
    if (!this.pendingPath) return;
    const layer = this.doc.layers.find((l) => l.id === this.pendingPath);
    if (layer && layer.anchors.length < 2) {
      this.doc.layers = this.doc.layers.filter((l) => l !== layer);
      this.doc.activeId = this.doc.layers.at(-1)?.id;
    }
    this.pendingPath = null;
    this.doc?.changed(null);
  }
  stroke(p) {
    const g = this.gesture,
      ctx = g.layer.bitmap.getContext("2d"),
      radius = Number($("#size").value) / 2,
      soft = Number($("#softness").value) / 100,
      color = $("#color").value;
    ctx.save();
    if (this.doc.selection?.length) {
      traceMask(ctx, this.doc.selection, this.doc.width, this.doc.height);
      ctx.clip();
    }
    ctx.globalAlpha = Number($("#opacity").value) / 100;
    ctx.globalCompositeOperation = g.erase ? "destination-out" : "source-over";
    const dab = (x, y) => {
      ctx.fillStyle = color;
      if (soft) {
        const gradient = ctx.createRadialGradient(
          x,
          y,
          Math.max(0.01, radius * (1 - soft)),
          x,
          y,
          radius,
        );
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, color + "00");
        ctx.fillStyle = gradient;
      }
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    };
    if (
      g.last &&
      Math.hypot(p.x - g.last.x, p.y - g.last.y) <
        Math.min(this.doc.width, this.doc.height) * 0.15
    ) {
      const steps = Math.max(
        1,
        Math.ceil(Math.hypot(p.x - g.last.x, p.y - g.last.y) / (radius * 0.35)),
      );
      for (let i = 1; i <= steps; i++)
        dab(
          g.last.x + ((p.x - g.last.x) * i) / steps,
          g.last.y + ((p.y - g.last.y) * i) / steps,
        );
    } else dab(p.x, p.y);
    ctx.restore();
    g.last = p;
    this.doc.changed(g.layer);
  }
  maskPixels(polygons) {
    if (!polygons?.length) return null;
    const c = canvas(this.doc.width, this.doc.height),
      ctx = c.getContext("2d");
    traceMask(ctx, polygons, this.doc.width, this.doc.height);
    ctx.fillStyle = "#fff";
    ctx.fill();
    const rgba = ctx.getImageData(0, 0, c.width, c.height).data;
    return Uint8Array.from({ length: c.width * c.height }, (_, i) =>
      rgba[i * 4 + 3] > 0 ? 1 : 0,
    );
  }
  fill(p) {
    if (this.doc.active?.locked)
      throw Error("Desbloqueie a camada para preencher.");
    const mode = $("#fill-mode").value,
      selected = this.maskPixels(this.doc.selection),
      width = this.doc.width,
      height = this.doc.height;
    let region;
    if (mode === "selection") {
      if (!selected)
        throw Error("Selecione uma ilha UV antes de preencher a seleção.");
      region = selected;
    } else if (mode === "material") {
      const polygons = this.o.material(p);
      if (!polygons?.length) throw Error("Clique sobre um material do modelo.");
      region = this.maskPixels(polygons);
      if (selected)
        for (let i = 0; i < region.length; i++) region[i] &= selected[i];
    } else {
      const source = this.o.output
        .getContext("2d", { willReadFrequently: true })
        .getImageData(0, 0, width, height).data;
      region = floodRegion(
        source,
        width,
        height,
        p.x,
        p.y,
        Number($("#fill-tolerance").value),
        selected,
      );
    }
    if (!region?.some(Boolean)) return;
    this.doc.checkpoint();
    const layer =
        this.doc.active?.type === "raster"
          ? this.doc.active
          : this.doc.add("raster", { name: "Preenchimento" }, false),
      c = canvas(width, height),
      ctx = c.getContext("2d"),
      pixels = ctx.createImageData(width, height),
      hex = $("#color").value,
      rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    for (let i = 0; i < region.length; i++)
      if (region[i]) pixels.data.set([...rgb, 255], i * 4);
    ctx.putImageData(pixels, 0, 0);
    const target = layer.bitmap.getContext("2d");
    target.save();
    target.globalAlpha = Number($("#opacity").value) / 100;
    target.drawImage(c, 0, 0);
    target.restore();
    this.doc.changed(layer);
  }
  local(layer, x, y) {
    const a = (-layer.rotation * Math.PI) / 180,
      dx = (x - layer.x) / layer.scale,
      dy = (y - layer.y) / layer.scale;
    return {
      x: dx * Math.cos(a) - dy * Math.sin(a),
      y: dx * Math.sin(a) + dy * Math.cos(a),
    };
  }
  world(layer, x, y) {
    const a = (layer.rotation * Math.PI) / 180;
    return {
      x: layer.x + (x * Math.cos(a) - y * Math.sin(a)) * layer.scale,
      y: layer.y + (x * Math.sin(a) + y * Math.cos(a)) * layer.scale,
    };
  }
  pathHandle(x, y) {
    const l = this.doc.active;
    if (l?.type !== "path" || l.locked) return null;
    const rect = this.o.uvCanvas.getBoundingClientRect(),
      fit = Math.min(
        rect.width / this.doc.width,
        rect.height / this.doc.height,
      ),
      threshold = 9 / fit;
    for (let i = 0; i < l.anchors.length; i++) {
      const a = l.anchors[i];
      for (const type of ["anchor", "in", "out"]) {
        if (type !== "anchor" && !a[type + "X"] && !a[type + "Y"]) continue;
        const p = this.world(
          l,
          a.x + (type === "anchor" ? 0 : a[type + "X"]),
          a.y + (type === "anchor" ? 0 : a[type + "Y"]),
        );
        if (Math.hypot(p.x - x, p.y - y) < threshold) return { index: i, type };
      }
    }
    return null;
  }
  drawOverlay(ctx) {
    if (!this.doc) return;
    const sx = ctx.canvas.width / this.doc.width,
      sy = ctx.canvas.height / this.doc.height;
    ctx.save();
    ctx.scale(sx, sy);
    if (this.doc.selection?.length) {
      traceMask(ctx, this.doc.selection, this.doc.width, this.doc.height);
      ctx.fillStyle = "#ef44442b";
      ctx.fill();
      ctx.strokeStyle = "#ff8585";
      ctx.lineWidth = Math.max(1, this.doc.width / 1000);
      ctx.stroke();
    }
    const layer = this.doc.active;
    if (editable(layer) && layer.visible) {
      const d = this.doc.dimensions(layer);
      ctx.save();
      ctx.translate(layer.x, layer.y);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.scale(layer.scale, layer.scale);
      ctx.strokeStyle = "#ff6565";
      ctx.lineWidth = Math.max(1, this.doc.width / 650) / layer.scale;
      ctx.setLineDash([8 / layer.scale, 5 / layer.scale]);
      if (layer.type !== "path")
        ctx.strokeRect(-d.width / 2, -d.height / 2, d.width, d.height);
      ctx.restore();
      if (layer.type === "path") {
        ctx.setLineDash([]);
        const r = Math.max(3, this.doc.width / 200);
        for (const a of layer.anchors) {
          const anchor = this.world(layer, a.x, a.y);
          for (const prefix of ["in", "out"]) {
            const end = this.world(
              layer,
              a.x + a[prefix + "X"],
              a.y + a[prefix + "Y"],
            );
            ctx.beginPath();
            ctx.moveTo(anchor.x, anchor.y);
            ctx.lineTo(end.x, end.y);
            ctx.strokeStyle = "#ffa2a2";
            ctx.stroke();
            ctx.fillStyle = "#fda4af";
            ctx.beginPath();
            ctx.arc(end.x, end.y, r * 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#ef4444";
          ctx.fillRect(anchor.x - r, anchor.y - r, r * 2, r * 2);
          ctx.strokeRect(anchor.x - r, anchor.y - r, r * 2, r * 2);
        }
      }
    }
    ctx.restore();
  }
  sync() {
    if (!this.doc) return;
    const l = this.doc.active;
    $("#layer-count").textContent = String(this.doc.layers.length);
    const list = $("#layer-list");
    list.replaceChildren();
    for (const layer of [...this.doc.layers].reverse()) {
      const row = document.createElement("div");
      row.className = "layer-row" + (l === layer ? " selected" : "");
      row.dataset.layerId = layer.id;
      const eye = document.createElement("button");
      eye.type = "button";
      eye.textContent = layer.visible ? "◉" : "○";
      eye.title = layer.visible ? "Ocultar camada" : "Mostrar camada";
      eye.onclick = () =>
        this.safe(() => {
          this.doc.activeId = layer.id;
          this.doc.update({ visible: !layer.visible });
        });
      const name = document.createElement("button");
      name.type = "button";
      name.className = "layer-select";
      const label = document.createElement("strong");
      label.textContent = layer.name;
      const sub = document.createElement("small");
      sub.textContent =
        {
          raster: "Pintura",
          text: "Texto",
          image: "Imagem",
          shape: "Forma",
          path: "Bézier",
        }[layer.type] +
        (layer.locked ? " · bloqueada" : "") +
        (layer.clip ? " · máscara" : "");
      name.append(label, sub);
      name.onclick = () => {
        this.doc.activeId = layer.id;
        this.o.refresh();
        this.sync();
        if (editable(layer))
          $(
            layer.type === "text"
              ? "#text-panel"
              : ["shape", "path"].includes(layer.type)
                ? "#shape-panel"
                : "#transform-panel",
          ).scrollIntoView({ block: "nearest" });
      };
      row.append(eye, name);
      list.append(row);
    }
    const value = (id, v) => {
      const el = $(id);
      if (document.activeElement !== el) el.value = v;
    };
    value("#layer-name", l?.name || "");
    value("#layer-blend", l?.blend || "source-over");
    for (const prop of ["opacity", "brightness", "contrast"]) {
      value("#layer-" + prop, l?.[prop] ?? 100);
      $("#layer-" + prop + "-out").textContent = (l?.[prop] ?? 100) + "%";
    }
    for (const id of [
      "#layer-name",
      "#layer-blend",
      "#layer-opacity",
      "#layer-brightness",
      "#layer-contrast",
    ])
      $(id).disabled = !l || l.locked;
    $("#lock-layer").textContent = l?.locked ? "Desbloquear" : "Bloquear";
    $("#delete-layer").disabled = !l || l.locked;
    $("#undo").disabled = this.busy || !this.doc.history.length;
    $("#redo").disabled = this.busy || !this.doc.future.length;
    $("#selection-info").textContent = this.doc.selection
      ? `${this.doc.selection.length} triângulos selecionados. A pintura fica limitada à seleção.`
      : "Sem restrição. Use Ilha UV para selecionar uma região.";
    const object = editable(l);
    $("#transform-panel").classList.toggle("hidden", !object);
    $("#text-panel").classList.toggle(
      "hidden",
      !(l?.type === "text" || this.tool === "text"),
    );
    $("#shape-panel").classList.toggle(
      "hidden",
      !(
        ["shape", "path"].includes(l?.type) ||
        ["line", "rectangle", "ellipse", "pen"].includes(this.tool)
      ),
    );
    $("#bucket-panel").classList.toggle("hidden", this.tool !== "bucket");
    $(".decal-controls").classList.toggle(
      "hidden",
      !(this.tool === "decal" || l?.type === "image"),
    );
    if (object) {
      value("#object-x", Math.round(l.x));
      value("#object-y", Math.round(l.y));
      value("#scale", Math.round(l.scale * 100));
      value("#rotation", Math.round(l.rotation));
      $("#scale-out").textContent = Math.round(l.scale * 100) + "%";
      $("#rotation-out").textContent = Math.round(l.rotation) + "°";
      value("#object-color", l.color);
      value("#object-width", Math.round(l.width));
      value("#object-height", Math.round(l.height));
      $(".object-size").classList.toggle(
        "hidden",
        !["image", "shape"].includes(l.type),
      );
    }
    if (l?.type === "text") {
      for (const [id, prop] of Object.entries({
        "#text-content": "text",
        "#font-family": "fontFamily",
        "#font-size": "fontSize",
        "#text-align": "align",
        "#text-stroke": "strokeWidth",
        "#text-stroke-color": "strokeColor",
        "#shadow-blur": "shadowBlur",
        "#shadow-color": "shadowColor",
        "#shadow-x": "shadowX",
        "#shadow-y": "shadowY",
      }))
        value(id, l[prop]);
      $("#text-bold").checked = l.bold;
      $("#text-italic").checked = l.italic;
    }
    if (["shape", "path"].includes(l?.type)) {
      value("#shape-stroke", l.strokeWidth);
      value("#shape-stroke-color", l.strokeColor);
      $("#shape-fill").checked = l.fill;
      $("#path-closed").checked = l.closed;
    }
  }
  async undo() {
    if (this.busy) return;
    this.cancelGesture();
    this.pendingPath = null;
    this.busy = true;
    try {
      await this.doc.undo();
    } finally {
      this.busy = false;
      this.render();
    }
  }
  async redo() {
    if (this.busy) return;
    this.cancelGesture();
    this.busy = true;
    try {
      await this.doc.redo();
    } finally {
      this.busy = false;
      this.render();
    }
  }
  key(event) {
    if (
      /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) ||
      event.target.isContentEditable
    )
      return false;
    const k = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && (k === "z" || k === "y")) {
      event.preventDefault();
      this.safe(() =>
        k === "y" || event.shiftKey ? this.redo() : this.undo(),
      );
      return true;
    }
    if (event.key === "Escape") {
      this.cancelGesture();
      if (this.pendingPath) {
        const layer = this.doc.layers.find((l) => l.id === this.pendingPath);
        if (layer) {
          this.doc.activeId = layer.id;
          this.safe(() => this.doc.remove());
        }
        this.pendingPath = null;
      }
      this.pendingImage = null;
      this.setTool("move");
      return true;
    }
    if (event.key === "Enter") {
      this.finishPath();
      return true;
    }
    const map = {
      b: "brush",
      e: "erase",
      v: "orbit",
      g: "move",
      i: "decal",
      t: "text",
      l: "line",
      r: "rectangle",
      o: "ellipse",
      p: "pen",
      f: "bucket",
      c: "eyedropper",
      u: "island",
    };
    if (map[k]) {
      this.safe(() => this.setTool(map[k]));
      return true;
    }
    return false;
  }
}
