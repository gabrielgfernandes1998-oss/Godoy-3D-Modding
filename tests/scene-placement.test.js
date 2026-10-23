import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,Box3,Vector3,Matrix4,PerspectiveCamera} from 'three';
import {visibleBounds,placePivot,pivotDelta,frameScene,placeImportedObj,moveToContext} from '../src/scene-placement.js';
const near=(a,b)=>assert.ok(a.distanceTo(b)<1e-7,`${a.toArray()} != ${b.toArray()}`);
test('gizmo follows visible geometry with a remote OBJ origin; translate and scale preserve source vertices',()=>{
 const scene=new Group(),object=new Group(),mesh=new Mesh(new BoxGeometry());mesh.geometry.translate(1000,-370,-473);object.add(mesh);object.position.set(-999,370,473);scene.add(object);
 const anchor=new Group();scene.add(anchor);const source=mesh.geometry.attributes.position.array.slice();
 placePivot(anchor,object);near(anchor.position,new Vector3(1,0,0));
 const oldAnchor=anchor.matrixWorld.clone(),oldObject=object.matrixWorld.clone();
 anchor.position.y+=.5;pivotDelta(object,anchor,oldAnchor,oldObject);near(visibleBounds(object).getCenter(new Vector3()),new Vector3(1,.5,0));
 placePivot(anchor,object);const secondAnchor=anchor.matrixWorld.clone(),secondObject=object.matrixWorld.clone();anchor.scale.set(2,2,2);pivotDelta(object,anchor,secondAnchor,secondObject);
 near(visibleBounds(object).getCenter(new Vector3()),new Vector3(1,.5,0));near(visibleBounds(object).getSize(new Vector3()),new Vector3(2,2,2));
 assert.deepEqual(mesh.geometry.attributes.position.array,source);
});
test('hidden LOD does not move gizmo; outlier OBJ is placed next to reference with units adjusted',()=>{
 const object=new Group(),visible=new Mesh(new BoxGeometry()),hidden=new Mesh(new BoxGeometry());hidden.geometry.translate(5000,5000,5000);hidden.visible=false;object.add(visible,hidden);
 near(visibleBounds(object).getCenter(new Vector3()),new Vector3());
 const obj=new Group(),geometry=new BoxGeometry(1000,2000,1000);geometry.translate(10000,10000,10000);obj.add(new Mesh(geometry));const source=geometry.attributes.position.array.slice();
 const context=new Box3(new Vector3(-.5,0,-.5),new Vector3(.5,2,.5));
 const result=placeImportedObj(obj,context);assert.equal(result.adjusted,true);assert.equal(result.factor,.0005);
 assert.ok(visibleBounds(obj).getCenter(new Vector3()).distanceTo(context.getCenter(new Vector3()))<2);
 assert.deepEqual(geometry.attributes.position.array,source);
 moveToContext(obj,context);near(visibleBounds(obj).getCenter(new Vector3()),context.getCenter(new Vector3()));
});
test('context framing fits both YDD and OBJ for portrait and landscape viewports',()=>{
 const box=new Box3(new Vector3(-2,-1,-1),new Vector3(3,2,1));
 for(const aspect of [.5,2]) {
  const camera=new PerspectiveCamera(45,aspect,.01,10000);camera.position.set(3,2,4);
  const orbit={target:new Vector3(),update(){camera.lookAt(this.target);camera.updateMatrixWorld(true);}};
  frameScene(camera,orbit,box);
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
   const p=new Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z>-1&&p.z<1);
  }
 }
});
