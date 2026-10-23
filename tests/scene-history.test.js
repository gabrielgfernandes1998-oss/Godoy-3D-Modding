import test from 'node:test';
import assert from 'node:assert/strict';
import {SceneHistory,snapshotTransform,applyTransform,sameTransform} from '../src/scene-history.js';
import * as THREE from 'three';
test('history restores additions, transform, merge and saved state across undo/redo',()=> {
  const scene=new THREE.Group(),object=new THREE.Mesh(new THREE.BoxGeometry());
  const history=new SceneHistory();
  history.execute({redo:()=>scene.add(object),undo:()=>object.removeFromParent()});
  history.markSaved();assert.equal(history.dirty,false);
  const before=snapshotTransform(object);object.position.x=4;const after=snapshotTransform(object);
  history.execute({redo:()=>applyTransform(object,after),undo:()=>applyTransform(object,before)});
  assert.equal(history.dirty,true);history.undo();assert.equal(object.position.x,0);assert.equal(history.dirty,false);
  history.redo();assert.equal(object.position.x,4);
  const old=object.geometry,merged=new THREE.SphereGeometry();
  history.execute({redo:()=>object.geometry=merged,undo:()=>object.geometry=old});
  history.undo();assert.equal(object.geometry,old);history.redo();assert.equal(object.geometry,merged);
  history.undo();history.undo();history.undo();assert.equal(scene.children.length,0);
  history.redo();assert.equal(scene.children[0],object);
});
test('history discards redo after a new edit, limits retention, and does not mark a different branch saved',()=> {
  const history=new SceneHistory({limit:2});let value=0;
  const set=n=>{const prior=value;history.execute({redo:()=>value=n,undo:()=>value=prior});};
  set(1);set(2);history.markSaved();history.undo();set(3);
  assert.equal(history.dirty,true);assert.equal(history.redo(),false);
  set(4);assert.equal(history.undoStack.length,2);history.undo();history.undo();assert.equal(value,1);assert.equal(history.undo(),false);
});
test('transform snapshots preserve rotation and scale without sharing mutable arrays',()=> {
  const object=new THREE.Object3D();const before=snapshotTransform(object);
  object.rotation.z=1;object.scale.set(2,3,4);const after=snapshotTransform(object);
  assert.equal(sameTransform(before,after),false);applyTransform(object,before);
  assert.ok(Math.abs(object.rotation.z)<1e-10);assert.deepEqual(object.scale.toArray(),[1,1,1]);
});
