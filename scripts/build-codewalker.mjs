// Build a user-supplied CodeWalker source tree for local use only.
import { execFileSync } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
const source = process.argv[2];
if (!source) throw new Error('Uso: npm run build:codewalker -- /caminho/CodeWalker.Core');
const project = path.resolve(source, 'CodeWalker.Core.csproj');
await access(project);
const destination = path.resolve('native/publish/codewalker-local');
await mkdir(destination, { recursive: true });
execFileSync(process.env.GODOY_DOTNET || 'dotnet', [
  'build', project, '-c', 'Release', '-o', destination,
  '-p:CopyLocalLockFileAssemblies=true',
], { stdio: 'inherit' });
await access(path.join(destination, 'CodeWalker.Core.dll'));
console.log(`No Godoy, selecione esta pasta em Configurar CodeWalker + GTA V:\n${destination}`);
console.log('Compilação local; este diretório não é incluído no portable ou publicado.');
