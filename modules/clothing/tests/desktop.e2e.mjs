import { _electron as electron } from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
const executablePath = process.env.GODOY_DESKTOP_EXE;
if (!executablePath || !fs.existsSync(executablePath))
  throw Error(
    "Defina GODOY_DESKTOP_EXE com o caminho do executável compilado.",
  );
let desktop;
const args = [
  "--enable-unsafe-swiftshader",
  "--use-gl=angle",
  "--use-angle=swiftshader",
];
if (process.platform === "linux") args.push("--no-sandbox");
if (process.env.GODOY_HEADLESS) args.push("--ozone-platform=headless");
if (process.env.GODOY_DESKTOP_APP) args.push(process.env.GODOY_DESKTOP_APP);
async function launch() {
  const app = await electron.launch({ executablePath, args, timeout: 60000 });
  const page = await app.firstWindow();
  await page
    .locator("#layer-list .layer-row")
    .first()
    .waitFor({ timeout: 30000 });
  return { app, page };
}
try {
  let started = await launch();
  desktop = started.app;
  assert.equal(await started.page.title(), "Godoy Cloth Fivem");
  assert.equal(
    await desktop.evaluate(({ app }) => app.getName()),
    "Godoy Cloth Fivem",
  );
  assert.ok(
    await started.page
      .locator(".studio-brand img")
      .evaluate((i) => i.complete && i.naturalWidth > 0),
  );
  let closing = desktop.waitForEvent("close", { timeout: 15000 });
  await desktop.evaluate(({ BrowserWindow }) => {
    setTimeout(() => BrowserWindow.getAllWindows()[0].close(), 20);
  });
  await closing;
  desktop = null;
  console.log("PASS: desktop branding and clean window close");
  started = await launch();
  desktop = started.app;
  const page = started.page;
  const before = await page.locator("#map").evaluate((c) => c.toDataURL());
  const box = await page.locator("#scene").boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  assert.notEqual(
    await page.locator("#map").evaluate((c) => c.toDataURL()),
    before,
    "The desktop renderer must paint the actual 3D model",
  );
  await desktop.evaluate(({ dialog, BrowserWindow }) => {
    globalThis.closePrompts = 0;
    dialog.showMessageBoxSync = (_window, options) => {
      globalThis.closePrompts++;
      globalThis.closeButtons = options.buttons;
      return 0;
    };
    BrowserWindow.getAllWindows()[0].close();
  });
  let prompts = 0;
  for (let i = 0; i < 100; i++) {
    prompts = await desktop.evaluate(() => globalThis.closePrompts);
    if (prompts) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.equal(
    prompts,
    1,
    "Dirty close must show a confirmation instead of silently refusing to close",
  );
  assert.deepEqual(await desktop.evaluate(() => globalThis.closeButtons), [
    "Continuar editando",
    "Descartar e sair",
  ]);
  assert.equal(
    await desktop.evaluate(
      ({ BrowserWindow }) => BrowserWindow.getAllWindows().length,
    ),
    1,
    "Cancel must keep the editor open",
  );
  closing = desktop.waitForEvent("close", { timeout: 15000 });
  await desktop.evaluate(({ dialog, BrowserWindow }) => {
    dialog.showMessageBoxSync = () => 1;
    setTimeout(() => BrowserWindow.getAllWindows()[0].close(), 20);
  });
  await closing;
  desktop = null;
  console.log(
    "PASS: dirty close invokes the real Electron unload event; cancel keeps the editor open; discard exits",
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await desktop?.close();
}
