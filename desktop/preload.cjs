const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('godoyNative',Object.freeze({
  readPedLibrary:(gender,kind)=>ipcRenderer.invoke('godoy:ped-library-read',gender,kind),
  writePedLibrary:(gender,kind,record)=>ipcRenderer.invoke('godoy:ped-library-write',gender,kind,record),
  deletePedLibrary:(gender,kind)=>ipcRenderer.invoke('godoy:ped-library-delete',gender,kind),
  status:()=>ipcRenderer.invoke('godoy:native-status'),
  configure:()=>ipcRenderer.invoke('godoy:native-configure'),
  createYdd:request=>ipcRenderer.invoke('godoy:native-create-ydd',request),
  exportYdd:request=>ipcRenderer.invoke('godoy:native-export-ydd',request),
  loadPed:gender=>ipcRenderer.invoke('godoy:native-ped',gender),
}));
