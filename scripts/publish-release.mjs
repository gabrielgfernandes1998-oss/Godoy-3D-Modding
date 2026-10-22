import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

const repo='gabrielgfernandes1998-oss/Godoy-3D-Modding';
const {version}=JSON.parse(await readFile('package.json','utf8'));
const tag=`v${version}`;
const archive=path.resolve('release',`Godoy-3D-Modding-${version}-Windows-x64-Portable.zip`);
const checksum=archive+'.sha256';
const size=(await stat(archive)).size;
if(!size)throw Error('Portable vazio. Execute npm run package:windows.');
const digest=createHash('sha256').update(await readFile(archive)).digest('hex');
if((await readFile(checksum,'utf8')).split(/\s+/)[0]!==digest)throw Error('SHA-256 do portable não confere.');
const gh=args=>execFileSync('gh',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
function api(route) {
  return JSON.parse(gh(['api',`repos/${repo}/${route}`]));
}
if(process.argv.includes('--check')) {
  console.log(JSON.stringify({repository:repo,tag,archive,size,sha256:digest,mode:'local validation only'},null,2));
  process.exit(0);
}
try {
  let release;
  try {release=api(`releases/tags/${tag}`);}
  catch(error) {
    // Network/auth failures must not be mistaken for an absent release.
    if(!String(error.stderr).includes('HTTP 404'))throw error;
    gh(['release','create',tag,'--repo',repo,'--verify-tag','--prerelease',
        '--title',`Godoy 3D Modding ${version} beta`,'--notes-file','docs/release-notes.md']);
    release=api(`releases/tags/${tag}`);
  }
  for(const file of [archive,checksum]) {
    const name=path.basename(file),local=await readFile(file);
    const expected=createHash('sha256').update(local).digest('hex');
    const existing=release.assets.find(a=>a.name===name);
    if(existing) {
      // Do not silently replace a different published asset.
      if(existing.size!==local.length||existing.digest!==`sha256:${expected}`)
        throw Error(`O anexo ${name} já existe e não foi confirmado como idêntico. Nenhum arquivo foi substituído.`);
      continue;
    }
    gh(['release','upload',tag,file,'--repo',repo]);
  }
  const verified=api(`releases/tags/${tag}`);
  for(const file of [archive,checksum]) {
    const asset=verified.assets.find(a=>a.name===path.basename(file));
    const bytes=await readFile(file),expected=createHash('sha256').update(bytes).digest('hex');
    if(!asset||asset.state!=='uploaded'||asset.size!==bytes.length||asset.digest!==`sha256:${expected}`)
      throw Error(`Não foi possível confirmar a integridade do anexo ${path.basename(file)}.`);
  }
  console.log(`Release e anexos confirmados: ${verified.html_url}`);
} catch(error) {
  console.error(String(error.stderr||error.message));
  process.exitCode=1;
}
