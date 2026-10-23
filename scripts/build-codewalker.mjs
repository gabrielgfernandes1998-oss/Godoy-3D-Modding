// Build the bundled grzyClothTool CodeWalker core; preserve corresponding source.
import { execFileSync } from 'node:child_process';
import { access, mkdir, cp, writeFile } from 'node:fs/promises';
import path from 'node:path';
const source = process.argv[2] || 'third_party/CodeWalker.Core';
const project = path.resolve(source, 'CodeWalker.Core.csproj');
await access(project);
const destination = path.resolve('native/publish/codewalker-local');
await mkdir(destination, { recursive: true });
execFileSync(process.env.GODOY_DOTNET || 'dotnet', [
  'build', project, '-c', 'Release', '-o', destination,
  '-p:CopyLocalLockFileAssemblies=true',
], { stdio: 'inherit' });
await access(path.join(destination, 'CodeWalker.Core.dll'));
console.log(`Núcleo integrado compilado: ${destination}`);
await cp(source, path.join(destination, 'source'), {recursive:true, filter:p=>!/(^|[\\/])(obj|bin)([\\/]|$)/.test(p)});
await cp('third_party/CodeWalker.Core/COPYING', path.join(destination, 'COPYING'));
await writeFile(path.join(destination, 'DEPENDENCIES.txt'), 'CodeWalker.Core: GPL-3.0, fontes em source/. SharpDX e bibliotecas Microsoft: MIT. Veja THIRD_PARTY_NOTICES.txt na raiz do portable.\n');
