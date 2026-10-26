const MAX_LAYERS = 48;
const MAX_PIXELS = 64 * 1024 * 1024;
export function canvas(width, height) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}
export function cloneCanvas(source) {
  const c = canvas(source.width, source.height);
  c.getContext("2d").drawImage(source, 0, 0);
  return c;
}
export async function loadImage(src) {
  if (
    typeof src !== "string" ||
    !/^data:image\/(png|jpeg|webp);base64,/.test(src) ||
    src.length > 90 * 1024 * 1024
  )
    throw Error("Imagem de camada inválida.");
  const image = new Image();
  image.src = src;
  await image.decode();
  if (image.width * image.height > 16777216)
    throw Error("Imagem maior que 16 megapixels.");
  return image;
}
export function traceMask(ctx, polygons, width, height) {
  ctx.beginPath();
  for (const points of polygons || []) {
    if (points.length !== 6) continue;
    const us = [points[0], points[2], points[4]],
      vs = [points[1], points[3], points[5]];
    if (
      (us[1] - us[0]) * (vs[2] - vs[0]) - (us[2] - us[0]) * (vs[1] - vs[0]) <
      0
    ) {
      [us[1], us[2]] = [us[2], us[1]];
      [vs[1], vs[2]] = [vs[2], vs[1]];
    }
    const minU = Math.floor(Math.min(...us)),
      maxU = Math.floor(Math.max(...us)),
      minV = Math.floor(Math.min(...vs)),
      maxV = Math.floor(Math.max(...vs));
    if (maxU - minU > 4 || maxV - minV > 4) continue;
    for (let du = minU; du <= maxU; du++)
      for (let dv = minV; dv <= maxV; dv++) {
        ctx.moveTo((us[0] - du) * width, (vs[0] - dv) * height);
        ctx.lineTo((us[1] - du) * width, (vs[1] - dv) * height);
        ctx.lineTo((us[2] - du) * width, (vs[2] - dv) * height);
        ctx.closePath();
      }
  }
}
const number = (value, fallback, min, max) =>
  Number.isFinite(Number(value))
    ? Math.max(min, Math.min(max, Number(value)))
    : fallback;
const color = (value, fallback) =>
  /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
let nextId = 1;
export class LayerDocument {
  constructor(width, height) {
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width > 8192 ||
      height > 8192 ||
      width * height > 16777216
    )
      throw Error("Dimensões de documento inválidas.");
    this.width = width;
    this.height = height;
    this.layers = [];
    this.activeId = null;
    this.history = [];
    this.future = [];
    this.selection = null;
    this.onChange = () => {};
    this.onRender = () => {};
  }
  static fromCanvas(source) {
    const doc = new LayerDocument(source.width, source.height);
    doc.add(
      "raster",
      { name: "Textura base", locked: true, bitmap: cloneCanvas(source) },
      false,
    );
    doc.add("raster", { name: "Pintura 1" }, false);
    return doc;
  }
  get active() {
    return this.layers.find((l) => l.id === this.activeId) || null;
  }
  checkpoint() {
    this.history.push(this.serialize());
    if (this.history.length > 16) this.history.shift();
    while (
      this.history.length > 1 &&
      this.history.reduce((n, s) => n + JSON.stringify(s).length, 0) >
        48 * 1024 * 1024
    )
      this.history.shift();
    this.future.length = 0;
  }
  async undo() {
    if (!this.history.length) return;
    this.future.push(this.serialize());
    const state = this.history.pop();
    await this.restore(state);
    this.onChange();
  }
  async redo() {
    if (!this.future.length) return;
    this.history.push(this.serialize());
    await this.restore(this.future.pop());
    this.onChange();
  }
  changed(layer = this.active) {
    if (layer) {
      layer.revision++;
      layer.cached = null;
      layer.png = null;
    }
    this.onChange();
    this.onRender();
  }
  pixelBudget() {
    return this.layers.reduce(
      (n, l) =>
        n +
        (l.bitmap ? l.bitmap.width * l.bitmap.height : 0) +
        (l.image ? l.image.width * l.image.height : 0),
      0,
    );
  }
  add(type, props = {}, record = true) {
    if (this.layers.length >= MAX_LAYERS)
      throw Error(`Limite de ${MAX_LAYERS} camadas atingido.`);
    if (
      this.pixelBudget() +
        (type === "raster"
          ? this.width * this.height
          : props.image
            ? props.image.width * props.image.height
            : 0) >
      MAX_PIXELS
    )
      throw Error("Limite de memória de camadas atingido.");
    if (record) this.checkpoint();
    const layer = {
      id: "layer-" + nextId++,
      type,
      name:
        {
          raster: "Pintura",
          text: "Texto",
          image: "Imagem",
          shape: "Forma",
          path: "Curva Bézier",
        }[type] || "Camada",
      visible: true,
      locked: false,
      opacity: 100,
      blend: "source-over",
      brightness: 100,
      contrast: 100,
      x: this.width / 2,
      y: this.height / 2,
      scale: 1,
      rotation: 0,
      width: this.width * 0.3,
      height: this.height * 0.18,
      color: "#ef4444",
      strokeColor: "#ffffff",
      strokeWidth: 0,
      shadowColor: "#000000",
      shadowBlur: 0,
      shadowX: 0,
      shadowY: 0,
      fontFamily: "Arial",
      fontSize: Math.max(16, Math.round(this.width * 0.055)),
      bold: true,
      italic: false,
      align: "center",
      text: "SEU TEXTO",
      fill: true,
      shape: "rectangle",
      anchors: [],
      closed: false,
      clip: null,
      revision: 0,
      ...props,
    };
    if (type === "raster" && !layer.bitmap)
      layer.bitmap = canvas(this.width, this.height);
    this.layers.push(layer);
    this.activeId = layer.id;
    if (record) this.changed(layer);
    return layer;
  }
  ensurePaint() {
    const active = this.active;
    if (active?.locked) throw Error("Desbloqueie a camada antes de pintar.");
    if (active?.type === "raster") return active;
    return this.add("raster", {
      name: "Pintura " + this.layers.filter((l) => l.type === "raster").length,
    });
  }
  update(patch, record = true) {
    const layer = this.active;
    if (!layer) return;
    if (
      layer.locked &&
      !Object.keys(patch).every((k) => ["locked", "visible"].includes(k))
    )
      throw Error("Camada bloqueada.");
    if (record) this.checkpoint();
    Object.assign(layer, patch);
    this.changed(layer);
  }
  remove() {
    const layer = this.active;
    if (!layer || layer.locked)
      throw Error("Selecione uma camada desbloqueada.");
    if (this.layers.length <= 1) throw Error("Mantenha ao menos uma camada.");
    this.checkpoint();
    this.layers = this.layers.filter((l) => l !== layer);
    this.activeId = this.layers.at(-1)?.id;
    this.changed(null);
  }
  duplicate() {
    const layer = this.active;
    if (!layer) return;
    this.checkpoint();
    const copy = {
      ...layer,
      id: undefined,
      name: layer.name + " cópia",
      locked: false,
      anchors: structuredClone(layer.anchors),
      clip: layer.clip ? structuredClone(layer.clip) : null,
      bitmap: layer.bitmap ? cloneCanvas(layer.bitmap) : undefined,
      cached: null,
      png: null,
    };
    delete copy.id;
    return (this.add(layer.type, copy, false), this.changed());
  }
  reorder(direction) {
    const i = this.layers.findIndex((l) => l.id === this.activeId),
      j = i + direction;
    if (i < 0 || j < 0 || j >= this.layers.length) return;
    this.checkpoint();
    [this.layers[i], this.layers[j]] = [this.layers[j], this.layers[i]];
    this.changed(null);
  }
  dimensions(layer) {
    if (layer.type === "raster")
      return { width: this.width, height: this.height };
    if (layer.type === "text") {
      const c = canvas(1, 1).getContext("2d");
      c.font = this.font(layer);
      const lines = String(layer.text).split("\n");
      return {
        width:
          Math.max(10, ...lines.map((line) => c.measureText(line).width)) +
          layer.strokeWidth * 2,
        height: Math.max(1, lines.length) * layer.fontSize * 1.2,
      };
    }
    if (layer.type === "path" && layer.anchors.length) {
      const xs = layer.anchors.flatMap((a) => [a.x, a.x + a.inX, a.x + a.outX]),
        ys = layer.anchors.flatMap((a) => [a.y, a.y + a.inY, a.y + a.outY]);
      return {
        width: Math.max(...xs) - Math.min(...xs) + layer.strokeWidth,
        height: Math.max(...ys) - Math.min(...ys) + layer.strokeWidth,
        minX: Math.min(...xs),
        minY: Math.min(...ys),
      };
    }
    return { width: layer.width, height: layer.height };
  }
  font(layer) {
    return `${layer.italic ? "italic " : ""}${layer.bold ? "bold " : ""}${layer.fontSize}px "${layer.fontFamily}", Arial, sans-serif`;
  }
  raw(layer) {
    if (layer.type === "raster" && !layer.clip?.length) return layer.bitmap;
    if (layer.cached) return layer.cached;
    const raw = canvas(this.width, this.height),
      ctx = raw.getContext("2d");
    ctx.save();
    if (layer.clip?.length) {
      traceMask(ctx, layer.clip, this.width, this.height);
      ctx.clip();
    }
    if (layer.type === "raster") {
      ctx.drawImage(layer.bitmap, 0, 0);
    } else {
      ctx.translate(layer.x, layer.y);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.scale(layer.scale * (layer.flipX ? -1 : 1), layer.scale * (layer.flipY ? -1 : 1));
      ctx.fillStyle = layer.color;
      ctx.strokeStyle = layer.strokeColor;
      ctx.lineWidth = layer.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = layer.shadowColor;
      ctx.shadowBlur = layer.shadowBlur;
      ctx.shadowOffsetX = layer.shadowX;
      ctx.shadowOffsetY = layer.shadowY;
      if (layer.type === "text") {
        ctx.font = this.font(layer);
        ctx.textAlign = layer.align;
        ctx.textBaseline = "middle";
        const lines = String(layer.text).split("\n"),
          h = layer.fontSize * 1.2,
          d = this.dimensions(layer),
          x =
            layer.align === "left"
              ? -d.width / 2
              : layer.align === "right"
                ? d.width / 2
                : 0;
        lines.forEach((line, i) => {
          const y = (i - (lines.length - 1) / 2) * h;
          if (layer.strokeWidth > 0) ctx.strokeText(line, x, y);
          ctx.fillText(line, x, y);
        });
      }
      if (layer.type === "image" && layer.image)
        ctx.drawImage(
          layer.image,
          -layer.width / 2,
          -layer.height / 2,
          layer.width,
          layer.height,
        );
      if (layer.type === "shape") {
        ctx.beginPath();
        if (layer.shape === "line") {
          ctx.moveTo(-layer.width / 2, 0);
          ctx.lineTo(layer.width / 2, 0);
        } else if (layer.shape === "ellipse")
          ctx.ellipse(
            0,
            0,
            Math.max(0.1, layer.width / 2),
            Math.max(0.1, layer.height / 2),
            0,
            0,
            Math.PI * 2,
          );
        else
          ctx.rect(
            -layer.width / 2,
            -layer.height / 2,
            layer.width,
            layer.height,
          );
        if (layer.fill && layer.shape !== "line") ctx.fill();
        if (layer.strokeWidth > 0) ctx.stroke();
      }
      if (layer.type === "path" && layer.anchors.length) {
        const a = layer.anchors;
        ctx.beginPath();
        ctx.moveTo(a[0].x, a[0].y);
        for (let i = 1; i < a.length; i++)
          ctx.bezierCurveTo(
            a[i - 1].x + a[i - 1].outX,
            a[i - 1].y + a[i - 1].outY,
            a[i].x + a[i].inX,
            a[i].y + a[i].inY,
            a[i].x,
            a[i].y,
          );
        if (layer.closed && a.length > 2) {
          ctx.bezierCurveTo(
            a.at(-1).x + a.at(-1).outX,
            a.at(-1).y + a.at(-1).outY,
            a[0].x + a[0].inX,
            a[0].y + a[0].inY,
            a[0].x,
            a[0].y,
          );
          ctx.closePath();
        }
        if (layer.fill && layer.closed) ctx.fill();
        if (layer.strokeWidth > 0) ctx.stroke();
      }
    }
    ctx.restore();
    if (this.layers.filter((l) => l.cached).length < 6) layer.cached = raw;
    return raw;
  }
  renderTo(output) {
    const ctx = output.getContext("2d");
    ctx.clearRect(0, 0, this.width, this.height);
    for (const layer of this.layers) {
      if (!layer.visible || layer.opacity <= 0) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;
      ctx.globalCompositeOperation = layer.blend;
      ctx.filter = `brightness(${layer.brightness}%) contrast(${layer.contrast}%)`;
      ctx.drawImage(this.raw(layer), 0, 0);
      ctx.restore();
    }
  }
  pick(x, y) {
    for (const layer of [...this.layers].reverse()) {
      if (layer.locked || !layer.visible || layer.opacity === 0) continue;
      if (
        this.raw(layer)
          .getContext("2d", { willReadFrequently: true })
          .getImageData(Math.floor(x), Math.floor(y), 1, 1).data[3] > 8
      )
        return layer;
    }
    return null;
  }
  serialize() {
    return {
      version: 1,
      width: this.width,
      height: this.height,
      activeId: this.activeId,
      selection: this.selection,
      layers: this.layers.map((layer) => {
        const { bitmap, image, cached, png, revision, ...props } = layer;
        if (bitmap) {
          if (!layer.png) layer.png = bitmap.toDataURL("image/png");
          props.data = layer.png;
        }
        if (image) props.source = layer.source;
        return {
          ...props,
          anchors: structuredClone(props.anchors),
          clip: props.clip ? structuredClone(props.clip) : null,
        };
      }),
    };
  }
  async restore(state) {
    const restored = await LayerDocument.deserialize(state);
    this.width = restored.width;
    this.height = restored.height;
    this.layers = restored.layers;
    this.activeId = restored.activeId;
    this.selection = restored.selection;
    this.onRender();
  }
  static async deserialize(state) {
    if (
      !state ||
      state.version !== 1 ||
      !Array.isArray(state.layers) ||
      !state.layers.length ||
      state.layers.length > MAX_LAYERS
    )
      throw Error("Documento de camadas inválido.");
    const doc = new LayerDocument(state.width, state.height);
    let pixels = 0;
    const ids = new Set();
    for (const p of state.layers) {
      if (
        !["raster", "text", "image", "shape", "path"].includes(p.type) ||
        typeof p.id !== "string" ||
        ids.has(p.id)
      )
        throw Error("Camada inválida no projeto.");
      ids.add(p.id);
      const props = {
        ...p,
        name: String(p.name || "Camada").slice(0, 120),
        opacity: number(p.opacity, 100, 0, 100),
        brightness: number(p.brightness, 100, 0, 300),
        contrast: number(p.contrast, 100, 0, 300),
        blend: ["source-over", "multiply", "screen", "overlay"].includes(
          p.blend,
        )
          ? p.blend
          : "source-over",
        visible: p.visible !== false,
        locked: !!p.locked,
        x: number(p.x, doc.width / 2, -doc.width * 8, doc.width * 8),
        y: number(p.y, doc.height / 2, -doc.height * 8, doc.height * 8),
        scale: number(p.scale, 1, 0.01, 30),
        flipX: !!p.flipX,
        flipY: !!p.flipY,
        rotation: number(p.rotation, 0, -3600, 3600),
        width: number(p.width, doc.width * 0.3, 0.1, doc.width * 10),
        height: number(p.height, doc.height * 0.3, 0.1, doc.height * 10),
        color: color(p.color, "#ef4444"),
        strokeColor: color(p.strokeColor, "#ffffff"),
        shadowColor: color(p.shadowColor, "#000000"),
        fontFamily: String(p.fontFamily || "Arial")
          .replace(/["\\]/g, "")
          .slice(0, 100),
        fontSize: number(p.fontSize, 80, 4, 2000),
        strokeWidth: number(p.strokeWidth, 0, 0, 300),
        shadowBlur: number(p.shadowBlur, 0, 0, 300),
        shadowX: number(p.shadowX, 0, -500, 500),
        shadowY: number(p.shadowY, 0, -500, 500),
        text: String(p.text || "").slice(0, 5000),
        align: ["left", "center", "right"].includes(p.align)
          ? p.align
          : "center",
        shape: ["line", "rectangle", "ellipse"].includes(p.shape)
          ? p.shape
          : "rectangle",
        anchors: validateAnchors(p.anchors || []),
        clip: validatePolygons(p.clip),
      };
      delete props.data;
      if (p.type === "raster") {
        const image = await loadImage(p.data);
        if (image.width !== doc.width || image.height !== doc.height)
          throw Error("Camada raster com dimensões incompatíveis.");
        pixels += image.width * image.height;
        if (pixels > MAX_PIXELS)
          throw Error("Camadas excedem o limite de memória.");
        props.bitmap = canvas(doc.width, doc.height);
        props.bitmap.getContext("2d").drawImage(image, 0, 0);
        props.png = p.data;
      }
      if (p.type === "image") {
        props.image = await loadImage(p.source);
        pixels += props.image.width * props.image.height;
        if (pixels > MAX_PIXELS)
          throw Error("Imagens excedem o limite de memória.");
      }
      const layer = doc.add(p.type, props, false);
      layer.id = p.id;
      const suffix = Number(p.id.split("-").at(-1));
      if (Number.isFinite(suffix)) nextId = Math.max(nextId, suffix + 1);
    }
    doc.activeId = ids.has(state.activeId)
      ? state.activeId
      : doc.layers.at(-1).id;
    doc.selection = validatePolygons(state.selection);
    return doc;
  }
}
export function validatePolygons(value) {
  if (value == null) return null;
  if (!Array.isArray(value) || value.length > 200000)
    throw Error("Máscara de seleção inválida.");
  return value.map((p) => {
    if (
      !Array.isArray(p) ||
      p.length !== 6 ||
      p.some((v) => !Number.isFinite(v) || Math.abs(v) > 100)
    )
      throw Error("Coordenadas de máscara inválidas.");
    return [...p];
  });
}
function validateAnchors(value) {
  if (!Array.isArray(value) || value.length > 10000)
    throw Error("Curva inválida.");
  return value.map((p) => {
    const a = {};
    for (const key of ["x", "y", "inX", "inY", "outX", "outY"]) {
      if (!Number.isFinite(p[key]) || Math.abs(p[key]) > 1000000)
        throw Error("Ponto Bézier inválido.");
      a[key] = p[key];
    }
    return a;
  });
}
export function floodRegion(
  pixels,
  width,
  height,
  x,
  y,
  tolerance = 24,
  allowed = null,
) {
  x = Math.floor(x);
  y = Math.floor(y);
  const start = y * width + x,
    mask = new Uint8Array(width * height);
  if (x < 0 || x >= width || y < 0 || y >= height) return mask;
  const color = Array.from(pixels.subarray(start * 4, start * 4 + 4)),
    matches = (i) =>
      !mask[i] &&
      (!allowed || allowed[i]) &&
      color.every((c, k) => Math.abs(c - pixels[i * 4 + k]) <= tolerance);
  if (!matches(start)) return mask;
  const stack = [start];
  while (stack.length) {
    const seed = stack.pop();
    if (!matches(seed)) continue;
    const row = Math.floor(seed / width);
    let left = seed % width;
    while (left > 0 && matches(row * width + left - 1)) left--;
    let up = false,
      down = false;
    for (let px = left; px < width; px++) {
      const i = row * width + px;
      if (!matches(i)) break;
      mask[i] = 1;
      if (row > 0) {
        const match = matches(i - width);
        if (match && !up) stack.push(i - width);
        up = match;
      }
      if (row < height - 1) {
        const match = matches(i + width);
        if (match && !down) stack.push(i + width);
        down = match;
      }
    }
  }
  return mask;
}
