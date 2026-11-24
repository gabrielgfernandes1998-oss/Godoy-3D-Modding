import { Matrix4, Quaternion, Vector3 } from "three";

export function vehiclePoint(name) {
  const seat = /^seat_(dside|pside)_([fmr])(\d*)$/i.exec(name);
  if (seat) {
    const [, side, row, index] = seat;
    const label = row.toLowerCase() === "f" && side.toLowerCase() === "dside" && !index
      ? "Motorista"
      : `Passageiro · ${{ f: "frente", m: "meio", r: "trás" }[row.toLowerCase()]} ${side.toLowerCase() === "dside" ? "esquerda" : "direita"}${index ? " " + index : ""}`;
    return { kind: "seat", label };
  }
  const siren = /^siren_?(\d{1,2})$/i.exec(name);
  if (siren && Number(siren[1]) > 0)
    return { kind: "siren", channel: Number(siren[1]) };
  return null;
}

export function readVehiclePoints(resource, drawable) {
  const skeleton = resource.ptr(drawable + 0x18, 112);
  if (skeleton === null) return [];
  const count = resource.u16(skeleton + 0x5e);
  if (!count || count > 2048) return [];
  const start = resource.ptr(skeleton + 0x20, count * 80, false);
  const vector = (offset) => new Vector3(
    resource.f32(offset), resource.f32(offset + 4), resource.f32(offset + 8),
  );
  const bones = Array.from({ length: count }, (_, i) => {
    const offset = start + i * 80;
    const parent = resource.u16(offset + 0x32);
    const rotation = new Quaternion(
      resource.f32(offset), resource.f32(offset + 4),
      resource.f32(offset + 8), resource.f32(offset + 12),
    ).normalize();
    return {
      parent: parent === 65535 ? -1 : parent,
      name: resource.stringAtPointer(offset + 0x38),
      local: new Matrix4().compose(vector(offset + 0x10), rotation, vector(offset + 0x20)),
    };
  });
  return bones.flatMap(({ name }, index) => {
    const point = vehiclePoint(name);
    if (!point) return [];
    const transform = new Matrix4();
    const visited = new Set();
    while (index !== -1) {
      if (!bones[index] || visited.has(index)) return [];
      visited.add(index);
      transform.premultiply(bones[index].local);
      index = bones[index].parent;
    }
    const { x, y, z } = new Vector3().setFromMatrixPosition(transform);
    return [{ ...point, name, position: [x, z, -y] }];
  });
}
