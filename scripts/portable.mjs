import {packager} from '@electron/packager';
import {cp,copyFile,mkdir,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.cwd(),{version}=JSON.parse(await readFile('package.json','utf8'));
const stage=path.join(root,'.portable-stage');
const native=path.join(root,'native/publish/native-bridge');
await stat(path.join(native,'Godoy.CodeWalkerBridge.exe'));
await rm(stage,{recursive:true,force:true});await mkdir(stage,{recursive:true});
try {
  await cp('dist',path.join(stage,'dist'),{recursive:true});
  await copyFile('electron.cjs',path.join(stage,'electron.cjs'));
  await cp('desktop',path.join(stage,'desktop'),{recursive:true});
  await writeFile(path.join(stage,'package.json'),JSON.stringify({name:'godoy-3d-modding',version,main:'electron.cjs',author:'Gabriel Godoy',description:'Godoy 3D Modding',private:true}));
  const paths=await packager({dir:stage,name:'Godoy 3D Modding',executableName:'Godoy3DModding',platform:'win32',arch:'x64',electronVersion:'45.0.0',out:path.join(root,'release'),overwrite:true,asar:true,prune:true,extraResource:[native],download:{cacheRoot:process.env.GODOY_ELECTRON_CACHE||'/tmp/godoy-electron-cache'}});
  for(const directory of paths) {
    for(const file of ['README.md','THIRD_PARTY_NOTICES.txt'])await copyFile(file,path.join(directory,file));
    await cp('docs',path.join(directory,'docs'),{recursive:true});
    await writeFile(path.join(directory,'LEIA-ME.txt'),[
      `GODOY 3D MODDING ${version} - WINDOWS 10/11 x64 PORTABLE`,
      '', 'Extraia TODO o ZIP e execute Godoy3DModding.exe.',
      'Nao execute diretamente dentro do ZIP. Nao precisa instalar Node.js ou Python.',
      'Requer GPU/driver com suporte a WebGL. Aplicativo nao assinado digitalmente.',
      '', 'Roupas e veiculos: pintura 3D/UV e exportacao YTD.',
      'Pack: gera YMT/META/fxmanifest e organiza arquivos em ZIP. Geracao YMT experimental.',
      'Malhas: gizmos, OBJ, uniao estatica de geometria/UV, exportacao GLB.',
      'Novas geometrias nao sao recompiladas em YDD/YFT. Sem rigging automatico ou _hi.yft gerado.',
      'Valide os recursos em um servidor FiveM Legacy antes de distribuir.',
      'Salve seus projetos; nao ha salvamento automatico. Os arquivos originais sao preservados.',
      '', 'Developed by Gabriel Godoy', '',
    ].join('\r\n'));
    const exe=await readFile(path.join(directory,'Godoy3DModding.exe'));
    if(exe[0]!==0x4d||exe[1]!==0x5a)throw Error('Executavel Windows invalido.');
    if(!(await stat(path.join(directory,'resources/app.asar'))).size)throw Error('Pacote ASAR vazio.');
    const archive=path.join(root,'release',`Godoy-3D-Modding-${version}-Windows-x64-Portable.zip`);
    await rm(archive,{force:true});
    execFileSync('zip',['-q','-r',archive,path.basename(directory)],{cwd:path.dirname(directory)});
    const digest=createHash('sha256').update(await readFile(archive)).digest('hex');
    await writeFile(archive+'.sha256',`${digest}  ${path.basename(archive)}\n`);
    execFileSync('unzip',['-tq',archive],{stdio:'inherit'});
    console.log(`Portable: ${archive}\nSHA-256: ${digest}`);
  }
} finally {await rm(stage,{recursive:true,force:true});}
