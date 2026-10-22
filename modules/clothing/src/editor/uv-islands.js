const cache = new WeakMap();
export function topology(geometry) {
  if (cache.has(geometry)) return cache.get(geometry);
  const uv = geometry.attributes.uv,
    index = geometry.index;
  if (!uv) return null;
  const count = Math.floor((index ? index.count : uv.count) / 3),
    triangles = [],
    neighbors = Array.from({ length: count }, () => []),
    edges = new Map();
  const vertex = (i) => (index ? index.getX(i) : i);
  for (let f = 0; f < count; f++) {
    const ids = [vertex(f * 3), vertex(f * 3 + 1), vertex(f * 3 + 2)],
      coords = ids.flatMap((i) => [uv.getX(i), 1 - uv.getY(i)]);
    triangles.push(coords);
    for (let e = 0; e < 3; e++) {
      const a = ids[e],
        b = ids[(e + 1) % 3],
        ka = `${Math.round(uv.getX(a) * 100000)},${Math.round(uv.getY(a) * 100000)}`,
        kb = `${Math.round(uv.getX(b) * 100000)},${Math.round(uv.getY(b) * 100000)}`,
        key = ka < kb ? ka + "|" + kb : kb + "|" + ka;
      if (ka === kb) continue;
      const linked = edges.get(key) || [];
      for (const other of linked) {
        neighbors[f].push(other);
        neighbors[other].push(f);
      }
      linked.push(f);
      edges.set(key, linked);
    }
  }
  const data = { triangles, neighbors };
  cache.set(geometry, data);
  return data;
}
export function island(geometry, faceIndex) {
  const t = topology(geometry);
  if (!t || faceIndex < 0 || faceIndex >= t.triangles.length) return [];
  const visited = new Set([faceIndex]),
    todo = [faceIndex];
  while (todo.length) {
    const f = todo.pop();
    for (const n of t.neighbors[f])
      if (!visited.has(n)) {
        visited.add(n);
        todo.push(n);
      }
  }
  return [...visited].map((i) => t.triangles[i]);
}
function contains(p, x, y) {
  const [ax, ay, bx, by, cx, cy] = p,
    den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  if (Math.abs(den) < 1e-12) return false;
  const a = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den,
    b = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den;
  return a >= -1e-6 && b >= -1e-6 && a + b <= 1 + 1e-6;
}
export function uvFace(geometry, u, v) {
  const t = topology(geometry);
  if (!t) return -1;
  for (let f = 0; f < t.triangles.length; f++) {
    const p = t.triangles[f],
      cu = (p[0] + p[2] + p[4]) / 3,
      cv = (p[1] + p[3] + p[5]) / 3;
    for (let du = Math.floor(cu) - 1; du <= Math.floor(cu) + 1; du++)
      for (let dv = Math.floor(cv) - 1; dv <= Math.floor(cv) + 1; dv++)
        if (contains(p, u + du, v + dv)) return f;
  }
  return -1;
}
