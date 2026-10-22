const {app,BrowserWindow,dialog,protocol,net,session}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
protocol.registerSchemesAsPrivileged([{scheme:'godoy',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
app.setName('Godoy 3D Modding');
app.setAppUserModelId('com.gabrielgodoy.modding');
let window;
app.whenReady().then(()=> {
  const root=path.join(__dirname,'dist');
  protocol.handle('godoy',request=> {
    const url=new URL(request.url);
    if(url.hostname!=='app')return new Response('Not found',{status:404});
    let pathname;
    try{pathname=decodeURIComponent(url.pathname);}catch{return new Response('Bad request',{status:400});}
    const file=path.resolve(root,'.'+pathname);
    if(!file.startsWith(root+path.sep))return new Response('Forbidden',{status:403});
    return net.fetch(pathToFileURL(file).toString());
  });
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=> {
    const allowed=['godoy:','blob:','data:','devtools:'];
    callback({cancel:!allowed.some(prefix=>details.url.startsWith(prefix))});
  });
  window=new BrowserWindow({width:1600,height:1060,minWidth:1100,minHeight:800,title:'Godoy 3D Modding',backgroundColor:'#171218',autoHideMenuBar:true,icon:path.join(root,'branding/icon.png'),webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',event=>event.preventDefault());
  window.webContents.on('will-prevent-unload',event=> {
    const answer=dialog.showMessageBoxSync(window,{type:'question',title:'Alterações não salvas',message:'Há alterações não salvas nos editores.',detail:'Salve o projeto antes de fechar para preservar suas camadas e objetos.',buttons:['Continuar editando','Descartar e sair'],defaultId:0,cancelId:0,noLink:true});
    if(answer===1)event.preventDefault();
  });
  window.loadURL('godoy://app/index.html');
});
app.on('window-all-closed',()=>app.quit());
