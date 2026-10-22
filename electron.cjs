const {app,BrowserWindow,dialog,protocol,session}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {createAssetHandler}=require('./desktop/assets.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'godoy',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
app.setName('Godoy 3D Modding');
app.setAppUserModelId('com.gabrielgodoy.modding');
let window;
function log(message) {
  try {
    const directory=app.getPath('logs');fs.mkdirSync(directory,{recursive:true});
    fs.appendFileSync(path.join(directory,'startup.log'),`${new Date().toISOString()} ${message}\n`);
  } catch {console.error(message);}
}
app.whenReady().then(()=> {
  const root=path.join(__dirname,'dist');
  protocol.handle('godoy',createAssetHandler(root));
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=> {
    const allowed=['godoy:','blob:','data:','devtools:'];
    callback({cancel:!allowed.some(prefix=>details.url.startsWith(prefix))});
  });
  window=new BrowserWindow({width:1600,height:1060,minWidth:1100,minHeight:800,title:'Godoy 3D Modding',backgroundColor:'#171218',autoHideMenuBar:true,icon:path.join(root,'branding/icon.png'),webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('did-fail-load',(_event,code,description,url,isMainFrame)=> {
    log(`Load failed: ${code} ${description} ${url}`);
    if(isMainFrame)dialog.showErrorBox('Não foi possível carregar o studio',`Erro: ${description}. Extraia todo o ZIP novamente. Consulte startup.log em ${app.getPath('logs')}.`);
  });
  window.webContents.on('render-process-gone',(_event,details)=> {
    log(`Renderer stopped: ${details.reason}`);
    dialog.showErrorBox('A interface foi interrompida',`Motivo: ${details.reason}. Reinicie o aplicativo e confira seu driver de vídeo.`);
  });
  window.webContents.on('console-message',(_event,details)=> {
    if(details.level==='error')log(`Renderer: ${details.message}`);
  });
  window.webContents.on('will-navigate',event=>event.preventDefault());
  window.webContents.on('will-prevent-unload',event=> {
    const answer=dialog.showMessageBoxSync(window,{type:'question',title:'Alterações não salvas',message:'Há alterações não salvas nos editores.',detail:'Salve o projeto antes de fechar para preservar suas camadas e objetos.',buttons:['Continuar editando','Descartar e sair'],defaultId:0,cancelId:0,noLink:true});
    if(answer===1)event.preventDefault();
  });
  window.loadURL('godoy://app/index.html').catch(error=>log(`Startup: ${error.message}`));
}).catch(error=>{log(error.stack??error.message);dialog.showErrorBox('Erro de inicialização',error.message);app.quit();});
app.on('window-all-closed',()=>app.quit());
