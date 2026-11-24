import { MAX_RESOURCE_BYTES, Resource, jenkins, pageSize } from "./resource.js";
import { encodePixels } from "./pixels.js";

const align = (offset) => Math.ceil(offset / 16) * 16;
const pagesInfoSize = 20 + 256 * 16;

function singlePageFlags(bytes) {
  const exponent = Math.max(0, Math.ceil(Math.log2(bytes / 512)));
  const shift = Math.max(0, exponent - 8);
  const flagsByWeight = [27, 26, 25, 24, 17, 11, 7, 5, 4];
  return (1 << flagsByWeight[exponent - shift]) | shift;
}

export function liveryFamily(name) {
  const match = /^(.*_)(\d+)$/.exec(name);
  return match && { prefix: match[1].toLowerCase(), index: Number(match[2]), digits: match[2].length };
}

// Repack an external Legacy dictionary. Retained textures keep their raw mip data
// and texture metadata, including formats that the editor cannot decode.
export function repackLiveryDictionary(document, entries) {
  if (document.embedded || !entries.length || entries.length > 2048)
    throw Error("A lista precisa conter de 1 a 2048 texturas em um YTD externo.");

  const source = document.resource;
  const textures = entries.map(({ entry, name, pixels }) => ({
    entry, name, pixels, hash: jenkins(name), nameBytes: new TextEncoder().encode(name),
  })).sort((a, b) => a.hash - b.hash);
  if (new Set(textures.map(({ hash }) => hash)).size !== textures.length)
    throw Error("O YTD contém nomes de textura iguais ou com o mesmo hash.");

  const pages = 64;
  const hashes = align(pages + pagesInfoSize);
  const pointers = align(hashes + textures.length * 4);
  const headers = align(pointers + textures.length * 8);
  let systemUsed = headers + textures.length * 144;
  let graphicsUsed = 0;
  for (const item of textures) {
    item.nameOffset = systemUsed;
    systemUsed += item.nameBytes.length + 1;
    item.graphicsOffset = graphicsUsed;
    const { entry, pixels } = item;
    const byteLength = pixels ? entry.width * entry.height * 4 : entry.byteLength;
    graphicsUsed = align(graphicsUsed + byteLength);
  }
  const systemFlags = singlePageFlags(systemUsed);
  const graphicsFlags = singlePageFlags(graphicsUsed);
  const systemSize = pageSize(systemFlags);
  const graphicsSize = pageSize(graphicsFlags);
  if (systemSize + graphicsSize > MAX_RESOURCE_BYTES)
    throw Error("O YTD reempacotado excederia 256 MB.");

  const data = new Uint8Array(systemSize + graphicsSize);
  const view = new DataView(data.buffer);
  const u16 = (at, value) => view.setUint16(at, value, true);
  const u32 = (at, value) => view.setUint32(at, value, true);
  const ptr = (at, offset, region = 0x50000000) => {
    u32(at, region + offset);
    u32(at + 4, 0);
  };

  data.set(source.data.subarray(0, 64));
  ptr(8, pages);
  data[pages + 8] = 1;
  data[pages + 9] = 1;
  ptr(0x20, hashes);
  ptr(0x30, pointers);
  for (const offset of [0x28, 0x2a, 0x38, 0x3a]) u16(offset, textures.length);
  textures.forEach(({ entry, nameBytes, nameOffset, graphicsOffset, hash, pixels }, i) => {
    const at = headers + i * 144;
    data.set(source.data.subarray(entry.pointer, entry.pointer + 144), at);
    data.set(nameBytes, nameOffset);
    u32(hashes + i * 4, hash);
    ptr(pointers + i * 8, at);
    ptr(at + 0x28, nameOffset);
    ptr(at + 0x70, graphicsOffset, 0x60000000);
    let encoded = source.data.subarray(entry.dataOffset, entry.dataOffset + entry.byteLength);
    if (pixels) {
      const stride = entry.width * 4;
      u16(at + 0x56, stride);
      u32(at + 0x58, 21);
      data[at + 0x5d] = 1;
      encoded = encodePixels(pixels, entry.width, entry.height, 21, stride);
    }
    data.set(encoded, systemSize + graphicsOffset);
  });

  const header = source.header.slice();
  const headerView = new DataView(header.buffer);
  headerView.setUint32(8, systemFlags, true);
  headerView.setUint32(12, (13 << 28) | graphicsFlags, true);
  return new Resource(data, systemSize, graphicsSize, header).pack();
}
