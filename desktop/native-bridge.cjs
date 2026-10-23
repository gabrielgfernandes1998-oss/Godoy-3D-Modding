const fs=require('node:fs/promises');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {validGame,discoverGame}=require('./gta-discovery.cjs');

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
  const bundled=path.join(process.resourcesPath,'codewalker-local');
  const readConfig=async()=>{try{return JSON.parse(await fs.readFile(configFile,'utf8'));}catch{return {};}};
  const save=async config=>{await fs.mkdir(path.dirname(configFile),{recursive:true});await fs.writeFile(configFile,JSON.stringify(config));};
  const resolveConfig=async()=> {
    const config=await readConfig();
    try {await fs.access(path.join(bundled,'CodeWalker.Core.dll'));config.codewalkerDirectory=bundled;}catch{}
    if(!await validGame(config.gameDirectory))config.gameDirectory=await discoverGame();
    if(config.gameDirectory)await save(config);
    return config;
  };
  ipcMain.handle('godoy:native-status',async event=> {
    allowed(event);if(process.platform!=='win32')return {configured:false,available:false};
    try {await fs.access(executable);}catch{return {configured:false,available:false};}
    const config=await resolveConfig();
    let core=false;try{await fs.access(path.join(config.codewalkerDirectory,'CodeWalker.Core.dll'));core=true;}catch{}
    return {configured:core&&!!config.gameDirectory,available:true,gameFound:!!config.gameDirectory,coreAvailable:core};
  });
  ipcMain.handle('godoy:native-configure',async event=> {
    allowed(event);if(busy)throw Error('Aguarde a operação nativa atual.');busy=true;
    try {
      const config=await resolveConfig();
      if(!config.codewalkerDirectory)throw Error('Núcleo CodeWalker ausente. Extraia novamente o portable completo.');
      const probe=await runBridge(executable,{command:'probe',codewalkerDirectory:config.codewalkerDirectory});
      if(!await validGame(config.gameDirectory)) {
        const gta=await dialog.showOpenDialog(getWindow(),{title:'Selecione a instalação GTA V Legacy (GTA5.exe e x64v.rpf)',properties:['openDirectory']});
        if(gta.canceled)return {canceled:true};
        config.gameDirectory=gta.filePaths[0];
        if(!await validGame(config.gameDirectory))throw Error('Pasta inválida: são necessários GTA5.exe e x64v.rpf do GTA V Legacy.');
      }
      await save(config);return {configured:true,version:probe.version};
    } finally {busy=false;}
  });
  ipcMain.handle('godoy:native-export-ydd',async(event,request)=> {
    allowed(event);if(busy)throw Error('Aguarde a operação nativa atual.');
    if(!request||!['preserve','pelvis','head','spine'].includes(request.bone)||!Array.isArray(request.matrix)||request.matrix.length!==16||request.matrix.some(n=>typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>100000))throw Error('Transformação de exportação inválida.');
    const bytes=value=>{if(!(value instanceof Uint8Array)||!value.length||value.length>80*1024*1024)throw Error('Arquivo nativo inválido.');return Buffer.from(value).toString('base64');};
    const additions=request.additions??[];if(!Array.isArray(additions)||additions.length>32||Buffer.byteLength(JSON.stringify(additions))>10*1024*1024)throw Error('OBJ incorporado acima do limite.');
    const data=bytes(request.bytes),pedData=request.pedBytes?bytes(request.pedBytes):undefined;
    busy=true;
    try {
      const config=await resolveConfig();
      const result=await runBridge(executable,{command:'edit-ydd',codewalkerDirectory:config.codewalkerDirectory,data,pedData,additions,matrix:request.matrix,bone:request.bone});
      if(typeof result.data!=='string'||result.data.length>112*1024*1024)throw Error('YDD de saída inválido.');
      return new Uint8Array(Buffer.from(result.data,'base64'));
    } finally {busy=false;}
  });
  ipcMain.handle('godoy:native-ped',async(event,gender)=> {
    allowed(event);if(!['male','female'].includes(gender))throw Error('Gênero inválido.');if(busy)throw Error('Aguarde a operação nativa atual.');busy=true;
    try {
      const config=await resolveConfig();if(!await validGame(config.gameDirectory))throw Error("GTA V Legacy não encontrado. Selecione o diretório do jogo.");const result=await runBridge(executable,{command:'ped',...config,gender});
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
