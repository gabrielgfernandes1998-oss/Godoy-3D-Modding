const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('godoyNative',Object.freeze({
  status:()=>ipcRenderer.invoke('godoy:native-status'),
  configure:()=>ipcRenderer.invoke('godoy:native-configure'),
  loadPed:gender=>ipcRenderer.invoke('godoy:native-ped',gender),
}));
