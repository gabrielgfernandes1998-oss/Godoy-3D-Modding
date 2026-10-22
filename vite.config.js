import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({base:'./',build:{rollupOptions:{input:{main:resolve('index.html'),clothing:resolve('modules/clothing/index.html'),vehicles:resolve('modules/vehicles/index.html'),mesh:resolve('mesh.html')}}}});
