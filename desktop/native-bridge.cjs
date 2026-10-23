const fs=require('node:fs/promises');
const path=require('node:path');
const {spawn}=require('node:child_process');

function runBridge(executable,request,{timeout=300000}={}) {
  return new Promise((resolve,reject)=> {
    const child=spawn(executable,[],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    const chunks=[];let size=0,errorSize=0,settled=false;
    const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(value);};
    const timer=setTimeout(()=>{child.kill();finish(Error('CodeWalker demorou mais de 5 minutos. Confira a instalação do GTA.'));},timeout);
    child.on('error',error=>finish(error));
    child.stdout.on('data',chunk=>{size+=chunk.length;if(size>300*1024*1024){child.kill();finish(Error('Resposta nativa acima do limite.'));}else chunks.push(chunk);});
    child.stderr.on('data',chunk=>{errorSize+=chunk.length;if(errorSize>4*1024*1024)child.kill();});
    child.on('close',()=> {
      try {const result=JSON.parse(Buffer.concat(chunks).toString());if(!result.ok)throw Error(result.error||'Falha no CodeWalker.');finish(null,result);}
      catch(error){finish(error);}
    });
    child.stdin.on('error',error=>finish(error));child.stdin.end(JSON.stringify(request));
  });
}

function registerNativeBridge({app,ipcMain,dialog,getWindow}) {
  const configFile=path.join(app.getPath('userData'),'codewalker-settings.json');
  const executable=path.join(process.resourcesPath,'native-bridge','Godoy.CodeWalkerBridge.exe');
  let busy=false;
  const allowed=event=>{if(event.sender!==getWindow()?.webContents||event.senderFrame?.url!=='godoy://app/index.html')throw Error('Origem não autorizada.');};
  const readConfig=async()=>JSON.parse(await fs.readFile(configFile,'utf8'));
  ipcMain.handle('godoy:native-status',async event=> {
    allowed(event);if(process.platform!=='win32')return {configured:false,available:false};
    try {await fs.access(executable);}catch{return {configured:false,available:false};}
    try {const config=await readConfig();await fs.access(path.join(config.codewalkerDirectory,'CodeWalker.Core.dll'));return {configured:true,available:true};}catch{return {configured:false,available:true};}
  });
  ipcMain.handle('godoy:native-configure',async event=> {
    allowed(event);if(busy)throw Error('Aguarde a operação nativa atual.');busy=true;
    try {
      const cw=await dialog.showOpenDialog(getWindow(),{title:'Selecione a pasta do CodeWalker (CodeWalker.Core.dll)',properties:['openDirectory']});
      if(cw.canceled)return {canceled:true};
      const codewalkerDirectory=cw.filePaths[0];await fs.access(path.join(codewalkerDirectory,'CodeWalker.Core.dll'));
      const probe=await runBridge(executable,{command:'probe',codewalkerDirectory});
      const gta=await dialog.showOpenDialog(getWindow(),{title:'Selecione a instalação GTA V Legacy (GTA5.exe)',properties:['openDirectory']});
      if(gta.canceled)return {canceled:true};
      const gameDirectory=gta.filePaths[0];await fs.access(path.join(gameDirectory,'GTA5.exe'));await fs.access(path.join(gameDirectory,'x64v.rpf'));
      await fs.mkdir(path.dirname(configFile),{recursive:true});await fs.writeFile(configFile,JSON.stringify({codewalkerDirectory,gameDirectory}));
      return {configured:true,version:probe.version};
    } finally {busy=false;}
  });
  ipcMain.handle('godoy:native-ped',async(event,gender)=> {
    allowed(event);if(!['male','female'].includes(gender))throw Error('Gênero inválido.');if(busy)throw Error('Aguarde a operação nativa atual.');busy=true;
    try {
      const config=await readConfig(),result=await runBridge(executable,{command:'ped',...config,gender});
      if(!Array.isArray(result.assets)||result.assets.length>5)throw Error('Resposta de ped inválida.');
      const assets=result.assets.map(asset=> {
        if(!/^[a-z0-9_.-]+\.ydd$/i.test(asset.name)||typeof asset.data!=='string'||asset.data.length>112*1024*1024)throw Error('Componente de ped inválido.');
        return {name:asset.name,bytes:new Uint8Array(Buffer.from(asset.data,'base64'))};
      });
      return {ped:result.ped,assets,missing:result.missing??[]};
    } finally {busy=false;}
  });
}
module.exports={runBridge,registerNativeBridge};
