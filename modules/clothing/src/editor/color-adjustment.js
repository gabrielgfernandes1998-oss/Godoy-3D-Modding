const DEFAULT_COLOR = "#556b2f";
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const luminance = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
function bounded(value, fallback, min, max) {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && !value.trim())
  ) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? clamp(number, min, max) : fallback;
}

export function normalizeAdjustment(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    colorize: source.colorize !== false,
    color: typeof source.color === "string" && /^#[0-9a-f]{6}$/i.test(source.color)
      ? source.color.toLowerCase()
      : DEFAULT_COLOR,
    strength: bounded(source.strength, 100, 0, 100),
    saturation: bounded(source.saturation, 100, 0, 200),
    brightness: bounded(source.brightness, 0, -100, 100),
    contrast: bounded(source.contrast, 0, -100, 100),
  };
}

// Photoshop-style Color blending: replace the chroma while retaining the
// source's weighted luminance (engraving, highlights and fabric detail).
// Compress out-of-gamut chroma toward grey at the same luminance, rather than
// clipping RGB channels independently and changing those light/dark details.
// All arithmetic uses the editor's unpremultiplied sRGB byte values; this is
// an editing effect, not a conversion between colour profiles.
export function adjustRgba(data, raw) {
  if (
    !(data instanceof Uint8ClampedArray || data instanceof Uint8Array) ||
    data.length % 4 !== 0
  ) throw Error("Pixels RGBA inválidos para ajuste de cor.");
  const settings = normalizeAdjustment(raw);
  const strength = settings.strength / 100;
  if (!strength || (
    !settings.colorize && settings.saturation === 100 &&
    settings.brightness === 0 && settings.contrast === 0
  )) return data;

  const target = [1, 3, 5].map(i => parseInt(settings.color.slice(i, i + 2), 16) / 255);
  const targetLight = luminance(...target);
  const targetChroma = target.map(channel => channel - targetLight);
  const saturation = settings.saturation / 100;
  const contrast = settings.contrast === 100
    ? 1e6
    : (100 + settings.contrast) / (100 - settings.contrast);
  const brightness = settings.brightness / 100;
  const keep = 1 - strength, gain = 255 * strength;

  for (let i = 0; i < data.length; i += 4) {
    // Hidden RGB under fully transparent pixels is retained byte for byte.
    if (!data[i + 3]) continue;
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const sourceLight = luminance(r, g, b);
    const light = clamp((sourceLight - 0.5) * contrast + 0.5 + brightness, 0, 1);
    const scale = saturation * contrast;
    const cr = (settings.colorize ? targetChroma[0] : r - sourceLight) * scale;
    const cg = (settings.colorize ? targetChroma[1] : g - sourceLight) * scale;
    const cb = (settings.colorize ? targetChroma[2] : b - sourceLight) * scale;
    const low = Math.min(cr, cg, cb), high = Math.max(cr, cg, cb);
    let gamut = 1;
    if (low < 0) gamut = Math.min(gamut, light / -low);
    if (high > 0) gamut = Math.min(gamut, (1 - light) / high);
    data[i] = Math.round(clamp(data[i] * keep + (light + cr * gamut) * gain, 0, 255));
    data[i + 1] = Math.round(clamp(data[i + 1] * keep + (light + cg * gamut) * gain, 0, 255));
    data[i + 2] = Math.round(clamp(data[i + 2] * keep + (light + cb * gamut) * gain, 0, 255));
  }
  return data;
}
