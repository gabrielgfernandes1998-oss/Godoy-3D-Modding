import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,Vector3,Matrix4} from 'three';
import {nativeMatrix,sourceUnchanged} from '../src/ydd-export.js';
test('native export converts translation, scale and rotation between preview and GTA axes',()=>{
 const g=new Group();g.position.set(1,2,3);g.scale.set(2,3,4);g.rotation.y=.6;
 const values=nativeMatrix(g);assert.deepEqual(values.slice(12,15),[1,-3,2]);
 const gta=new Vector3(.2,.5,1).applyMatrix4(new Matrix4().fromArray(values));
 const preview=new Vector3(.2,1,-.5).applyMatrix4(g.matrix);
 assert.ok(gta.distanceTo(new Vector3(preview.x,-preview.z,preview.y))<1e-10);
 g.scale.x=0;assert.throws(()=>nativeMatrix(g),/escala positiva/);
});
test('native export detects topology replacement instead of silently exporting stale source',()=>{
 const root=new Group(),mesh=new Mesh(new BoxGeometry());root.add(mesh);
 const source={geometries:new Map([[mesh,mesh.geometry]])};
 assert.equal(sourceUnchanged(root,source),true);mesh.geometry=new BoxGeometry();assert.equal(sourceUnchanged(root,source),false);
});
test('rigid preview follows the original head bone before user transforms',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {parseYdd}=await import('../modules/vehicles/src/formats/ydd.js');
 const {previewBindMatrix}=await import('../src/ydd-export.js');
 const doc=parseYdd(await readFile(new URL('./fixtures/native-rigid.ydd',import.meta.url)));
 const drawable=doc.drawables[0],data=drawable.readLod(0)[0];
 assert.equal(data.hasSkin,false);assert.equal(data.boneIndex,2);
 const position=new Vector3().fromArray(data.positions).applyMatrix4(previewBindMatrix(doc.resource,drawable.skeletonPointer,data.boneIndex));
 assert.ok(position.distanceTo(new Vector3(0,4,0))<1e-6);
});
