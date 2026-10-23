import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,Matrix4,Vector3} from 'three';
import {SceneHistory} from '../src/scene-history.js';
import {sourceUnchanged,nativeMatrix} from '../src/ydd-export.js';
import {joinToYdd,serializeAdditions} from '../src/ydd-additions.js';
test('OBJ joins a nonuniformly scaled YDD without moving; undo/redo and native export preserve coordinates',()=>{
 const content=new Group(),target=new Group(),object=new Group(),base=new Mesh(new BoxGeometry()),addition=new Mesh(new BoxGeometry());
 target.add(base);object.add(addition);content.add(target,object);target.position.set(.2,1,.3);target.rotation.set(.1,.3,.2);target.scale.set(1,2,.8);object.position.set(.4,1.2,.8);object.rotation.y=.7;object.scale.set(.1,.2,.3);content.updateMatrixWorld(true);
 const original=addition.matrixWorld.clone(),record={geometries:new Map([[base,base.geometry]])},history=new SceneHistory();let selected;
 joinToYdd(content,target,object,record,history,o=>selected=o);
 assert.equal(selected,target);assert.equal(content.children.length,1);assert.equal(sourceUnchanged(target,record),true);
 assert.ok(addition.matrixWorld.elements.every((n,i)=>Math.abs(n-original.elements[i])<1e-10));
 const payload=serializeAdditions(target,record.additions);assert.equal(payload.length,1);
 const p=new Vector3(...payload[0].positions.slice(0,3)).applyMatrix4(new Matrix4().fromArray(nativeMatrix(target)));
 const world=new Vector3().fromBufferAttribute(addition.geometry.attributes.position,0).applyMatrix4(addition.matrixWorld);
 assert.ok(p.distanceTo(new Vector3(world.x,-world.z,world.y))<1e-6);
 history.undo();assert.equal(content.children.length,2);assert.equal(record.additions.length,0);assert.equal(sourceUnchanged(target,record),true);
 assert.ok(addition.matrixWorld.elements.every((n,i)=>Math.abs(n-original.elements[i])<1e-10));
 history.redo();assert.equal(content.children.length,1);assert.equal(serializeAdditions(target,record.additions).length,1);
});
test('OBJ without UV receives finite planar UV; source geometry stays untouched',()=>{
 const root=new Group(),object=new Group(),mesh=new Mesh(new BoxGeometry());mesh.geometry.deleteAttribute('uv');object.add(mesh);root.add(object);
 const source=mesh.geometry.attributes.position.array.slice(),parts=serializeAdditions(root,[object]);
 assert.ok(parts[0].uvs.every(Number.isFinite));assert.equal(parts[0].uvs.length,mesh.geometry.attributes.position.count*2);
 assert.equal(mesh.geometry.attributes.uv,undefined);assert.deepEqual(mesh.geometry.attributes.position.array,source);
});
