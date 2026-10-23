import {Matrix4,Vector3,Quaternion} from 'three';
// Native GTA is Z-up, preview is Y-up: (x,y,z) -> (x,z,-y).
const basis=new Matrix4().makeRotationX(-Math.PI/2);
export function nativeMatrix(object) {
  object.updateMatrix();
  const m=basis.clone().invert().multiply(object.matrix).multiply(basis);
  const values=m.toArray().map(n=>Math.abs(n)<1e-12?0:n);
  if(values.some(n=>!Number.isFinite(n)||Math.abs(n)>100000)||m.determinant()<=1e-8)throw Error('Use transformação finita com escala positiva.');
  return values;
}
export function sourceUnchanged(object,source) {
  const current=[];object.traverse(o=>{
    let parent=o;while(parent&&parent!==object){if(source.additions?.includes(parent))return;parent=parent.parent;}
    if(o.isMesh)current.push(o);
  });
  return current.length===source.geometries.size&&current.every(o=>source.geometries.get(o)===o.geometry);
}

// Rigid YDD models store coordinates local to their bound bone.
export function previewBindMatrix(r,pointer,index) {
  if(pointer==null)return new Matrix4();
  const block=r.ptr(pointer+0x20,16);if(block==null)return new Matrix4();
  const count=r.u16(pointer+0x5e);if(count>512||index>=count)throw Error('Esqueleto inválido.');
  const matrix=new Matrix4(),seen=new Set();
  while(index>=0) {
    if(index>=count||seen.has(index))throw Error('Hierarquia de ossos inválida.');seen.add(index);
    const p=block+index*80;r.range(p,80);
    const rotation=[0,4,8,12].map(o=>r.f32(p+o));
    const position=[0,4,8].map(o=>r.f32(p+0x10+o));
    const scale=[0,4,8].map(o=>r.f32(p+0x20+o));
    if([...rotation,...position,...scale].some(n=>!Number.isFinite(n)))throw Error('Transformação de osso inválida.');
    matrix.premultiply(new Matrix4().compose(new Vector3(...position),new Quaternion(...rotation),new Vector3(...scale)));
    const parent=r.u16(p+0x32);index=parent>32767?parent-65536:parent;
  }
  return basis.clone().multiply(matrix).multiply(basis.clone().invert());
}
