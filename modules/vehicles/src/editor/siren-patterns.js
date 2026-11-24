const children = (node, tag) => [...(node?.children ?? [])].filter((el) => el.localName === tag);
const child = (node, tag) => children(node, tag)[0];
const value = (node, tag) => child(node, tag)?.getAttribute("value");
const enabled = (node, tag) => /^(true|1)$/i.test(value(node, tag) ?? "");

export function parseSirenPatterns(xml) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const profiles = children(child(doc.documentElement, "Sirens"), "Item")
    .flatMap((item) => {
      const id = value(item, "id");
      const bpm = Number(value(item, "sequencerBpm"));
      const channels = children(child(item, "sirens"), "Item").slice(0, 99).map((light) => {
        const flashiness = child(light, "flashiness");
        const color = value(light, "color");
        return {
          color: color === null || color === undefined ? null : Number(color) & 0xffffff,
          flash: enabled(light, "flash"),
          sequence: Number(value(flashiness, "sequencer")) >>> 0,
          multiples: Math.max(1, Number(value(flashiness, "multiples")) || 1),
          rate: enabled(flashiness, "syncToBpm") ? null : Number(value(flashiness, "speed")),
        };
      });
      if (id === null || id === undefined || !Number.isFinite(bpm) || bpm <= 0 || !channels.length)
        return [];
      return [{ id, bpm, channels, name: child(item, "name")?.textContent.trim() }];
    });
  if (doc.querySelector("parsererror") || !profiles.length)
    throw Error("O arquivo precisa conter perfis válidos em Sirens (carcols.meta em XML).");
  return profiles;
}

export function sirenIsOn(profile, channel, elapsed) {
  if (!profile) return Math.floor(elapsed / 0.16) % 2 === (channel - 1) % 2;
  const light = profile.channels[channel - 1];
  if (!light) return false;
  if (!light.flash) return true;
  const rate = light.rate > 0 ? light.rate : profile.bpm / 60;
  const bit = Math.floor(elapsed * rate * light.multiples) % 32;
  return Boolean((light.sequence >>> (31 - bit)) & 1);
}

export function findVehicleSirenId(xml, filename) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const name = filename.toLowerCase().replace(/(?:_hi)?\.yft$/, "");
  const item = children(child(doc.documentElement, "variationData"), "Item").find(
    (entry) => child(entry, "modelName")?.textContent.trim().toLowerCase() === name,
  );
  return value(item, "sirenSettings");
}
