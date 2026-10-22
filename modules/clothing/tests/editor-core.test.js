import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  floodRegion,
  validatePolygons,
  LayerDocument,
} from "../src/editor/layers.js";
import { island, uvFace } from "../src/editor/uv-islands.js";

test("bucket fill respects closed boundaries, alpha, tolerance and selection masks", () => {
  const w = 7,
    h = 5,
    rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) rgba.set([255, 255, 255, 255], i * 4);
  for (let y = 0; y < h; y++) rgba.set([0, 0, 0, 255], (y * w + 3) * 4);
  const region = floodRegion(rgba, w, h, 1, 2, 0);
  assert.equal(
    region.reduce((a, b) => a + b, 0),
    15,
  );
  for (let y = 0; y < h; y++)
    for (let x = 3; x < w; x++) assert.equal(region[y * w + x], 0);
  const allowed = new Uint8Array(w * h);
  allowed.fill(1, 0, w * 2);
  const clipped = floodRegion(rgba, w, h, 1, 1, 0, allowed);
  assert.equal(
    clipped.reduce((a, b) => a + b, 0),
    6,
  );
  rgba.set([250, 250, 250, 255], (w + 1) * 4);
  assert.equal(
    floodRegion(rgba, w, h, 1, 1, 6).reduce((a, b) => a + b, 0),
    15,
  );
  assert.equal(
    floodRegion(rgba, w, h, 1, 1, 0).reduce((a, b) => a + b, 0),
    1,
  );
  assert.equal(floodRegion(rgba, w, h, -1, 0).some(Boolean), false);
});
test("UV island selection joins shared UV edges across duplicated vertices, excludes separate islands", () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Array(27).fill(0), 3),
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(
      [
        0, 0, 0.4, 0, 0, 0.4, 0.4, 0, 0.4, 0.4, 0, 0.4, 0.7, 0.7, 0.9, 0.7, 0.8,
        0.9,
      ],
      2,
    ),
  );
  const polygons = island(geometry, 0);
  assert.equal(polygons.length, 2);
  assert.equal(island(geometry, 2).length, 1);
  assert.equal(island(geometry, 99).length, 0);
  assert.ok(uvFace(geometry, 0.1, 0.8) >= 0);
  assert.equal(uvFace(geometry, 0.5, 0.5), -1);
  geometry.dispose();
});
test("invalid layer documents, masks and nonfinite geometry are rejected", async () => {
  assert.throws(() => new LayerDocument(0, 128), /Dimensões/);
  assert.throws(() => new LayerDocument(8192, 8192), /Dimensões/);
  assert.throws(
    () => validatePolygons([[0, 1, 2, 3, 4, Infinity]]),
    /Coordenadas/,
  );
  await assert.rejects(
    () =>
      LayerDocument.deserialize({
        version: 1,
        width: 32,
        height: 32,
        layers: [{ id: "x", type: "script" }],
      }),
    /Camada/,
  );
  await assert.rejects(
    () =>
      LayerDocument.deserialize({
        version: 1,
        width: 32,
        height: 32,
        layers: [{ id: "a", type: "text", anchors: [{ x: NaN }] }],
      }),
    /Bézier/,
  );
});
