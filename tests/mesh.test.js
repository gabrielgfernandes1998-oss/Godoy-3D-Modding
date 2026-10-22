import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mergeStaticMeshes} from '../src/mesh-core.js';
test('mesh union bakes world transforms and retains UVs',()=> {
  const target=new THREE.Mesh(new THREE.BoxGeometry()),source=new THREE.Group(),part=new THREE.Mesh(new THREE.BoxGeometry());
  target.position.x=2;part.position.x=5;source.add(part);
  const merged=mergeStaticMeshes(target,source);
  assert.equal(merged.attributes.position.count,72);assert.equal(merged.attributes.uv.count,72);
  assert.equal(merged.boundingBox.max.x,3.5);assert.equal(merged.boundingBox.min.x,-.5);
  assert.equal(target.geometry.attributes.position.count,24);
});
test('mesh union rejects absent UVs and skinned targets',()=> {
  const target=new THREE.Mesh(new THREE.BoxGeometry()),source=new THREE.Mesh(new THREE.BoxGeometry());source.geometry.deleteAttribute('uv');
  assert.throws(()=>mergeStaticMeshes(target,source),/UV/);
  assert.throws(()=>mergeStaticMeshes(new THREE.SkinnedMesh(new THREE.BoxGeometry()),target),/rigging/);
});
