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
      const channelList = child(item, "sirens");
      const channels = children(channelList, "Item").slice(0, 99).map((light) => {
        const flashiness = child(light, "flashiness");
        const color = value(light, "color");
        return {
          element: light,
          color: color === null || color === undefined ? null : Number(color) & 0xffffff,
          flash: enabled(light, "flash"),
          sequence: Number(value(flashiness, "sequencer")) >>> 0,
          multiples: Math.max(1, Number(value(flashiness, "multiples")) || 1),
          rate: enabled(flashiness, "syncToBpm") ? null : Number(value(flashiness, "speed")),
        };
      });
      if (id === null || id === undefined || !Number.isFinite(bpm) || bpm <= 0 || !channels.length)
        return [];
      return [{ id, bpm, channels, element: item, channelList, name: child(item, "name")?.textContent.trim() }];
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

function setValue(parent, tag, next) {
  let element = child(parent, tag);
  if (!element) {
    element = parent.ownerDocument.createElement(tag);
    parent.append(element);
  }
  element.setAttribute("value", String(next));
}

export function setSirenBpm(profile, bpm) {
  setValue(profile.element, "sequencerBpm", bpm);
  profile.bpm = bpm;
}

export function setSirenChannel(profile, number, properties) {
  if (!Number.isInteger(number) || number < 1 || number > 99)
    throw Error("Use um canal de 1 a 99.");
  const off = { color: 0xff454f, flash: true, sequence: 0 };
  function update(channel, { color, flash, sequence }) {
    const light = channel.element;
    const previous = Number(value(light, "color")) >>> 0;
    const alpha = value(light, "color") == null ? 0xff000000 : previous & 0xff000000;
    setValue(light, "color", "0x" + ((alpha | color) >>> 0).toString(16).padStart(8, "0").toUpperCase());
    setValue(light, "flash", flash);
    let flashiness = child(light, "flashiness");
    if (!flashiness) {
      flashiness = light.ownerDocument.createElement("flashiness");
      light.append(flashiness);
    }
    setValue(flashiness, "sequencer", sequence);
    Object.assign(channel, { color, flash, sequence });
  }
  while (profile.channels.length < number) {
    const template = profile.channels[0];
    const channel = { ...template, element: template.element.cloneNode(true) };
    profile.channelList.append(channel.element);
    profile.channels.push(channel);
    update(channel, off);
  }
  update(profile.channels[number - 1], properties);
}
