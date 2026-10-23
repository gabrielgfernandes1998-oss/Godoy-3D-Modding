export class SceneHistory {
  constructor({limit=32,onChange=()=>{}}={}) {
    this.limit=limit;this.onChange=onChange;this.undoStack=[];this.redoStack=[];
    this.serial=0;this.state=0;this.savedState=0;
  }
  get dirty(){return this.state!==this.savedState;}
  get commands(){return [...this.undoStack,...this.redoStack];}
  execute(command) {
    command.redo();
    command.before=this.state;command.after=++this.serial;
    this.state=command.after;this.undoStack.push(command);this.redoStack=[];
    if(this.undoStack.length>this.limit)this.undoStack.shift();
    this.onChange();
  }
  undo() {
    const command=this.undoStack.at(-1);if(!command)return false;
    command.undo();this.undoStack.pop();this.redoStack.push(command);this.state=command.before;this.onChange();return true;
  }
  redo() {
    const command=this.redoStack.at(-1);if(!command)return false;
    command.redo();this.redoStack.pop();this.undoStack.push(command);this.state=command.after;this.onChange();return true;
  }
  markSaved(){this.savedState=this.state;this.onChange();}
}

export const snapshotTransform=object=>({position:object.position.toArray(),quaternion:object.quaternion.toArray(),scale:object.scale.toArray()});
export function applyTransform(object,value) {
  object.position.fromArray(value.position);object.quaternion.fromArray(value.quaternion);object.scale.fromArray(value.scale);object.updateMatrixWorld(true);
}
export const sameTransform=(a,b)=>Object.keys(a).every(key=>a[key].every((v,i)=>Math.abs(v-b[key][i])<1e-10));
