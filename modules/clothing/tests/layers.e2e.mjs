import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { makeYdd, makeResource } from "./fixtures.js";
import { openResource } from "../src/formats/resource.js";
const output = await mkdtemp(path.join(tmpdir(), "godoy-layers-"));
const port = 4198,
  server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
let logs = "",
  browser;
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));
async function ready() {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error(logs);
    try {
      if ((await fetch(`http://127.0.0.1:${port}`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Preview timeout " + logs);
}
function assertColor(actual, expected, tolerance = 2) {
  assert.equal(actual.length, 4);
  expected.forEach((n, i) =>
    assert.ok(
      Math.abs(actual[i] - n) <= tolerance,
      `channel ${i}: ${actual} != ${expected}`,
    ),
  );
}
function fontFile(directory = "/usr/share/fonts") {
  if (!fs.existsSync(directory)) return null;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isFile() && /sans.*\.ttf$/i.test(entry.name)) return full;
    if (entry.isDirectory()) {
      const match = fontFile(full);
      if (match) return match;
    }
  }
  return null;
}
try {
  await ready();
  browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (!process.env.CI && fs.existsSync("/usr/bin/chromium")
        ? "/usr/bin/chromium"
        : undefined),
    headless: true,
    args: [
      "--no-sandbox",
      "--enable-unsafe-swiftshader",
      "--use-gl=angle",
      "--use-angle=swiftshader",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1550, height: 1080 },
    acceptDownloads: true,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(`http://127.0.0.1:${port}`);
  await page.locator("#layer-list .layer-row").first().waitFor();
  const set = async (id, value) =>
    page.locator(id).evaluate((el, v) => {
      if (el.type === "checkbox") el.checked = !!v;
      else el.value = String(v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  const uvPoint = async (u, v) =>
    page.locator("#uv-view").evaluate(
      (c, { u, v }) => {
        const r = c.getBoundingClientRect(),
          fit = Math.min(r.width / c.width, r.height / c.height);
        return {
          x: r.left + (r.width - c.width * fit) / 2 + u * c.width * fit,
          y: r.top + (r.height - c.height * fit) / 2 + v * c.height * fit,
        };
      },
      { u, v },
    );
  const clickUV = async (u, v) => {
    const p = await uvPoint(u, v);
    await page.mouse.click(p.x, p.y);
  };
  const dragUV = async (a, b) => {
    const x = await uvPoint(...a),
      y = await uvPoint(...b);
    await page.mouse.move(x.x, x.y);
    await page.mouse.down();
    await page.mouse.move(y.x, y.y, { steps: 5 });
    await page.mouse.up();
  };
  const pixel = async (u, v) =>
    page.locator("#map").evaluate(
      (c, { u, v }) => {
        const r = c
          .getContext("2d")
          .getImageData(
            Math.floor(u * c.width),
            Math.floor(v * c.height),
            1,
            1,
          ).data;
        return Array.from(r);
      },
      { u, v },
    );
  const save = async (name) => {
    const waiting = page.waitForEvent("download");
    await page.click("#save-project");
    const file = path.join(output, name);
    await (await waiting).saveAs(file);
    return { file, project: JSON.parse(fs.readFileSync(file, "utf8")) };
  };
  const image = async (width, height, kind = "base") =>
    Buffer.from(
      await page.evaluate(
        ({ width, height, kind }) => {
          const c = document.createElement("canvas");
          c.width = width;
          c.height = height;
          const ctx = c.getContext("2d");
          ctx.fillStyle =
            kind === "base"
              ? "rgb(200,100,50)"
              : kind === "boundary"
                ? "white"
                : "#2244ff";
          ctx.fillRect(0, 0, width, height);
          if (kind === "boundary") {
            ctx.fillStyle = "black";
            ctx.fillRect(Math.floor(width / 2), 0, 1, height);
          }
          return c.toDataURL("image/png").split(",")[1];
        },
        { width, height, kind },
      ),
      "base64",
    );
  assert.equal(await page.title(), "Godoy Cloth Fivem");
  assert.equal(
    await page.locator(".studio-brand small").textContent(),
    "Developed by Gabriel Godoy",
  );
  assert.ok(
    await page
      .locator(".studio-brand img")
      .evaluate((i) => i.complete && i.naturalWidth > 0),
  );
  await page.locator("#texture-file").setInputFiles({
    name: "base.png",
    mimeType: "image/png",
    buffer: await image(128, 128),
  });
  await page.click("#tab-uv");
  await set("#size", 28);
  await set("#softness", 0);
  await set("#color", "#6496c8");
  await clickUV(0.5, 0.5);
  assertColor(await pixel(0.5, 0.5), [100, 150, 200, 255]);
  await set("#layer-opacity", 50);
  assertColor(await pixel(0.5, 0.5), [150, 125, 125, 255]);
  await set("#layer-opacity", 100);
  await set("#layer-blend", "multiply");
  assertColor(await pixel(0.5, 0.5), [78, 59, 39, 255]);
  await set("#layer-blend", "screen");
  assertColor(await pixel(0.5, 0.5), [222, 191, 211, 255]);
  await set("#layer-blend", "overlay");
  assertColor(await pixel(0.5, 0.5), [188, 118, 78, 255]);
  await set("#layer-blend", "source-over");
  await set("#layer-brightness", 150);
  assertColor(await pixel(0.5, 0.5), [150, 225, 255, 255]);
  await set("#layer-brightness", 100);
  await set("#layer-contrast", 200);
  assertColor(await pixel(0.5, 0.5), [73, 173, 255, 255], 4);
  await set("#layer-contrast", 100);
  await page.locator(".layer-row.selected>button").first().click();
  assertColor(await pixel(0.5, 0.5), [200, 100, 50, 255]);
  await page.locator(".layer-row.selected>button").first().click();
  await page.click("#duplicate-layer");
  assert.equal(await page.locator(".layer-row").count(), 3);
  await page.click("#delete-layer");
  assert.equal(await page.locator(".layer-row").count(), 2);
  console.log(
    "PASS: raster layers, opacity, Multiply/Screen/Overlay, brightness/contrast, visibility, duplicate/delete",
  );
  await page.click("#add-text");
  await page.fill("#text-content", "POLÍCIA");
  await set("#font-size", 18);
  const font = fontFile();
  assert.ok(font, "Install a local Sans TTF font to run the custom-font test");
  await page.locator("#font-file").setInputFiles(font);
  await page.waitForFunction(() =>
    document.querySelector("#font-family").value.startsWith("GodoyFont"),
  );
  await clickUV(0.35, 0.25);
  await page.fill("#text-content", "SAMU 192");
  await set("#text-stroke", 3);
  await set("#shadow-blur", 5);
  await set("#shadow-x", 4);
  await set("#object-color", "#ffffff");
  await dragUV([0.35, 0.25], [0.55, 0.35]);
  assert.ok(Math.abs(Number(await page.inputValue("#object-x")) - 70) < 2);
  await set("#scale", 130);
  await set("#rotation", 20);
  await page.locator("#image-file").setInputFiles({
    name: "patch.png",
    mimeType: "image/png",
    buffer: await image(24, 24, "patch"),
  });
  await clickUV(0.75, 0.75);
  await set("#scale", 80);
  await set("#rotation", -20);
  assert.equal(await page.locator(".layer-row").count(), 4);
  for (const [tool, a, b] of [
    ["line", [0.1, 0.7], [0.3, 0.8]],
    ["rectangle", [0.05, 0.05], [0.2, 0.15]],
    ["ellipse", [0.65, 0.05], [0.85, 0.15]],
  ]) {
    await page.click(`[data-tool="${tool}"]`);
    await dragUV(a, b);
  }
  await set("#object-width", 28);
  await set("#object-height", 12);
  await page.click('[data-tool="pen"]');
  await set("#shape-stroke", 3);
  await dragUV([0.15, 0.5], [0.22, 0.44]);
  await dragUV([0.4, 0.55], [0.45, 0.65]);
  await dragUV([0.65, 0.4], [0.7, 0.34]);
  await page.keyboard.press("Enter");
  await page.click('[data-tool="move"]');
  await dragUV([0.22, 0.44], [0.25, 0.4]);
  const advanced = await save("advanced.godoycloth");
  const layers = advanced.project.layers.layers,
    text = layers.find((l) => l.type === "text"),
    art = layers.find((l) => l.type === "image"),
    curve = layers.find((l) => l.type === "path");
  assert.equal(text.text, "SAMU 192");
  assert.equal(text.strokeWidth, 3);
  assert.equal(text.shadowBlur, 5);
  assert.equal(text.rotation, 20);
  assert.equal(art.rotation, -20);
  assert.equal(curve.anchors.length, 3);
  assert.ok(Math.abs(curve.anchors[0].outX - 12.8) < 2);
  assert.equal(advanced.project.fonts.length, 1);
  assert.equal(text.fontFamily, advanced.project.fonts[0].family);
  assert.equal(layers.filter((l) => l.type === "shape").length, 3);
  const savedMap = await page.locator("#map").evaluate((c) => c.toDataURL());
  console.log(
    "PASS: editable text, local font, stroke/shadow, image transforms, lines/rectangles/circles, editable Bézier tangents",
  );
  await page.click('[data-tool="eyedropper"]');
  await clickUV(0.98, 0.98);
  assert.equal(await page.inputValue("#color"), "#c86432");
  await page.locator("#texture-file").setInputFiles({
    name: "boundary.png",
    mimeType: "image/png",
    buffer: await image(32, 32, "boundary"),
  });
  await page.click('[data-tool="bucket"]');
  await set("#color", "#00ff00");
  await set("#fill-mode", "contiguous");
  await clickUV(0.2, 0.5);
  assertColor(await pixel(0.2, 0.5), [0, 255, 0, 255]);
  assertColor(await pixel(0.8, 0.5), [255, 255, 255, 255]);
  await page.click("#undo");
  await page.waitForTimeout(200);
  assertColor(await pixel(0.2, 0.5), [255, 255, 255, 255]);
  await page.click("#redo");
  await page.waitForTimeout(200);
  assertColor(await pixel(0.2, 0.5), [0, 255, 0, 255]);
  console.log("PASS: eyedropper, bounded flood fill, undo/redo");
  const r = openResource(makeYdd(), 165),
    dv = new DataView(r.data.buffer);
  dv.setUint32(0x518, 6, true);
  dv.setUint32(0x588, 6, true);
  dv.setUint32(0x458, 6, true);
  dv.setUint32(0x45c, 2, true);
  dv.setUint16(0x460, 6, true);
  const verts = [
    [-1, 0, 0, 0, -1, 0, 0.05, 0.9],
    [-0.1, 0, 0, 0, -1, 0, 0.45, 0.9],
    [-0.55, 0, 2, 0, -1, 0, 0.25, 0.1],
    [0.1, 0, 0, 0, -1, 0, 0.55, 0.9],
    [1, 0, 0, 0, -1, 0, 0.95, 0.9],
    [0.55, 0, 2, 0, -1, 0, 0.75, 0.1],
  ];
  verts.forEach((v, i) =>
    v.forEach((n, j) => dv.setFloat32(r.systemSize + i * 32 + j * 4, n, true)),
  );
  for (let i = 0; i < 6; i++)
    dv.setUint16(r.systemSize + 0x100 + i * 2, i, true);
  const ytd = makeResource(
    13,
    ({ u8, u16, u32, ptr, text, data, systemSize }) => {
      ptr(0x30, 0x100);
      u16(0x38, 1);
      u16(0x3a, 1);
      ptr(0x100, 0x200);
      ptr(0x228, 0x400);
      text(0x400, "cloth_diffuse");
      u16(0x250, 64);
      u16(0x252, 32);
      u16(0x254, 1);
      u16(0x256, 256);
      u32(0x258, 21);
      u8(0x25d, 1);
      ptr(0x270, 0, true);
      data.fill(255, systemSize);
    },
  );
  await page.locator("#model-file").setInputFiles({
    name: "islands.ydd",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(r.pack()),
  });
  await page.locator("#ytd-file").setInputFiles({
    name: "islands.ytd",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(ytd),
  });
  await page.click('[data-tool="island"]');
  await clickUV(0.25, 0.5);
  assert.match(
    await page.locator("#selection-info").textContent(),
    /1 triângulos/,
  );
  await page.click('[data-tool="brush"]');
  await set("#size", 180);
  await set("#softness", 0);
  await set("#color", "#2244ff");
  await clickUV(0.25, 0.5);
  assertColor(await pixel(0.25, 0.5), [34, 68, 255, 255]);
  assertColor(await pixel(0.75, 0.5), [255, 255, 255, 255]);
  await page.click("#mask-layer");
  await page.click("#unmask-layer");
  await page.click('[data-tool="bucket"]');
  await set("#fill-mode", "selection");
  await set("#color", "#00ff00");
  await clickUV(0.25, 0.5);
  assertColor(await pixel(0.25, 0.5), [0, 255, 0, 255]);
  assertColor(await pixel(0.75, 0.5), [255, 255, 255, 255]);
  await page.click("#clear-selection");
  await set("#fill-mode", "material");
  await set("#color", "#ff00ff");
  await clickUV(0.25, 0.5);
  assertColor(await pixel(0.75, 0.5), [255, 0, 255, 255]);
  console.log(
    "PASS: disconnected UV island selection, masked brush, mask controls, selection fill, material fill",
  );
  await page.reload();
  await page.locator("#model-file").setInputFiles(advanced.file);
  await page.waitForFunction(
    () =>
      document.querySelector("#toast").textContent === "Projeto restaurado.",
  );
  assert.equal(
    await page.locator("#map").evaluate((c) => c.toDataURL()),
    savedMap,
  );
  assert.equal(await page.locator("#font-family option").count(), 6);
  await page.locator(`[data-layer-id="${text.id}"] .layer-select`).click();
  assert.equal(await page.inputValue("#text-content"), "SAMU 192");
  assert.equal(await page.inputValue("#font-family"), text.fontFamily);
  await page.fill("#text-content", "EDITADO DEPOIS");
  const restored = await save("reopened.godoycloth");
  assert.equal(
    restored.project.layers.layers.find((l) => l.id === text.id).text,
    "EDITADO DEPOIS",
  );
  assert.equal(
    restored.project.layers.layers.find((l) => l.id === curve.id).anchors
      .length,
    3,
  );
  assert.equal(restored.project.fonts.length, 1);
  await page.click("#tab-3d");
  await page.selectOption("#camera-view", "front");
  assert.match(await page.locator("#view-name").textContent(), /ORTOGRÁFICA/);
  await page.locator(".viewbar").click({ position: { x: 4, y: 4 } });
  const beforePan = await page.locator("#scene").screenshot();
  await page.keyboard.down("w");
  await page.waitForTimeout(300);
  await page.keyboard.up("w");
  const afterPan = await page.locator("#scene").screenshot();
  assert.ok(!beforePan.equals(afterPan), "W must pan the actual camera");
  const toolTag = await page.locator("#tool-tag").textContent();
  await page.keyboard.down("d");
  await page.waitForTimeout(100);
  await page.keyboard.up("d");
  assert.equal(
    await page.locator("#tool-tag").textContent(),
    toolTag,
    "D must pan without selecting image tool",
  );
  for (const direction of ["back", "left", "right", "top"])
    await page.selectOption("#camera-view", direction);
  await page.selectOption("#camera-view", "front");
  await page.selectOption("#lighting", "day");
  const day = await page.locator("#scene").screenshot();
  await page.selectOption("#lighting", "night");
  const night = await page.locator("#scene").screenshot();
  assert.ok(!day.equals(night), "Lighting must affect the actual 3D render");
  await page.selectOption("#lighting", "studio");
  await page.screenshot({ path: path.join(output, "godoy-studio.png") });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: project round-trip retains editable objects and custom font; orthographic views, WASD camera pan, studio/day/night rendering; no JavaScript errors",
  );
  console.log("Artifacts:", output);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
}
