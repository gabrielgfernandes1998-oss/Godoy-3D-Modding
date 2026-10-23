const fs=require('node:fs/promises');
const path=require('node:path');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const exec=promisify(execFile);
async function validGame(directory) {
  if(typeof directory!=='string'||!directory)return false;
  try {for(const name of ['GTA5.exe','x64v.rpf'])if(!(await fs.stat(path.join(directory,name))).isFile())return false;return true;}catch{return false;}
}
function libraryPaths(text) {
  return [...text.matchAll(/"path"\s*"((?:\\.|[^"\\])*)"/gi)].map(m=>m[1].replace(/\\\\/g,'\\').replace(/\\"/g,'"'));
}
async function discoverGame({env=process.env,steamRoots=[],registry=process.platform==='win32'}={}) {
  const roots=[...steamRoots];
  for(const prefix of [env['ProgramFiles(x86)'],env.ProgramFiles])if(prefix)roots.push(path.join(prefix,'Steam'));
  if(env.SystemDrive)roots.push(path.join(env.SystemDrive+'\\','Program Files (x86)','Steam'));
  if(registry)for(const key of ['HKCU\\Software\\Valve\\Steam','HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam']) {
    try {const {stdout}=await exec('reg.exe',['query',key,'/v',key.startsWith('HKCU')?'SteamPath':'InstallPath'],{windowsHide:true,timeout:5000});const m=stdout.match(/REG_SZ\s+(.+)/);if(m)roots.push(m[1].trim());}catch{}
  }
  const libraries=new Set(roots);
  for(const root of new Set(roots)) {
    try {for(const library of libraryPaths(await fs.readFile(path.join(root,'steamapps','libraryfolders.vdf'),'utf8')))libraries.add(library);}catch{}
  }
  for(const library of libraries) {
    const apps=path.join(library,'steamapps');
    try {
      const manifest=await fs.readFile(path.join(apps,'appmanifest_271590.acf'),'utf8');
      const name=manifest.match(/"installdir"\s*"([^"\r\n]+)"/i)?.[1];
      if(name&&!name.includes('..')&&!/[\\/]/.test(name)) {
        const candidate=path.join(apps,'common',name);if(await validGame(candidate))return candidate;
      }
    }catch{}
    const candidate=path.join(apps,'common','Grand Theft Auto V');if(await validGame(candidate))return candidate;
  }
  return null;
}
module.exports={validGame,libraryPaths,discoverGame};
