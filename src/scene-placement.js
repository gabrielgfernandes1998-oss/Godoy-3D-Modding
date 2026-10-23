import {Box3,Vector3,Matrix4,MathUtils} from 'three';

export function visibleBounds(object) {
  object.updateWorldMatrix(true,true);
  const box=new Box3();
  object.traverseVisible(item=> {
    if(!item.isMesh||!item.geometry?.attributes.position)return;
    if(!item.geometry.boundingBox)item.geometry.computeBoundingBox();
    box.union(item.geometry.boundingBox.clone().applyMatrix4(item.matrixWorld));
  });
  return box;
}
export function placePivot(anchor,object) {
  const box=visibleBounds(object);if(box.isEmpty())return false;
  anchor.position.copy(box.getCenter(new Vector3()));
  object.getWorldQuaternion(anchor.quaternion);anchor.scale.set(1,1,1);anchor.updateMatrixWorld(true);
  return true;
}
export function pivotDelta(object,anchor,anchorBefore,objectBefore) {
  anchor.updateMatrixWorld(true);object.parent?.updateWorldMatrix(true,false);
  const world=new Matrix4().multiplyMatrices(anchor.matrixWorld,anchorBefore.clone().invert()).multiply(objectBefore);
  if(object.parent)world.premultiply(object.parent.matrixWorld.clone().invert());
  world.decompose(object.position,object.quaternion,object.scale);object.updateMatrixWorld(true);
}
export function frameScene(camera,orbit,box) {
  if(box.isEmpty())return;
  const center=box.getCenter(new Vector3()),radius=Math.max(box.getSize(new Vector3()).length()/2,.001);
  const v=MathUtils.degToRad(camera.fov)/2,h=Math.atan(Math.tan(v)*camera.aspect);
  const distance=radius/Math.sin(Math.min(v,h))*1.2;
  const direction=camera.position.clone().sub(orbit.target).normalize();
  if(!direction.lengthSq())direction.set(1,.6,1).normalize();
  camera.position.copy(center).addScaledVector(direction,distance);orbit.target.copy(center);
  camera.near=Math.max(.00001,distance/10000);camera.far=Math.max(100,distance+radius*4);
  camera.updateProjectionMatrix();orbit.update();
}
// OBJ exporters often bake millimetres or a remote world origin into vertices.
// Only relocate/resize obvious outliers, keeping the source geometry untouched.
export function placeImportedObj(object,context) {
  const box=visibleBounds(object);if(box.isEmpty()||context.isEmpty())return {adjusted:false};
  const center=box.getCenter(new Vector3()),target=context.getCenter(new Vector3());
  const size=box.getSize(new Vector3()),reference=context.getSize(new Vector3());
  const longest=Math.max(size.x,size.y,size.z),span=Math.max(reference.x,reference.y,reference.z,.001);
  if(!longest)return {adjusted:false};
  const ratio=longest/span,remote=center.distanceTo(target)>span*8;
  if(!remote&&ratio>=.05&&ratio<=20)return {adjusted:false};
  const factor=ratio>20||ratio<.05?span*.5/longest:1;
  object.scale.multiplyScalar(factor);object.updateMatrixWorld(true);
  const adjusted=visibleBounds(object),adjustedSize=adjusted.getSize(new Vector3());
  target.x+=(reference.x+adjustedSize.x)*.65;
  object.position.add(target.sub(adjusted.getCenter(new Vector3())));object.updateMatrixWorld(true);
  return {adjusted:true,factor};
}
export function moveToContext(object,context) {
  const box=visibleBounds(object);if(box.isEmpty()||context.isEmpty())throw Error('Carregue outra peça YDD ou um ped como referência.');
  const target=context.getCenter(new Vector3());
  object.position.add(target.sub(box.getCenter(new Vector3())));object.updateMatrixWorld(true);
}
