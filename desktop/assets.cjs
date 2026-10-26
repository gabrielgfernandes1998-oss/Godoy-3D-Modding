const fs=require('node:fs/promises');
const path=require('node:path');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
  '.png':'image/png','.ico':'image/x-icon','.svg':'image/svg+xml','.glb':'model/gltf-binary',
  '.woff2':'font/woff2','.wasm':'application/wasm'};
const policy="default-src 'self' blob: data:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' blob: data:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'";

function createAssetHandler(root) {
  const directory=path.resolve(root);
  return async request=> {
    try {
      const url=new URL(request.url);
      if(url.protocol!=='godoy:'||url.hostname!=='app')return new Response('Not found',{status:404});
      if(!['GET','HEAD'].includes(request.method??'GET'))return new Response('Method not allowed',{status:405});
      let pathname;
      try{pathname=decodeURIComponent(url.pathname);}catch{return new Response('Bad request',{status:400});}
      if(!pathname.startsWith('/')||/[\\\0]/.test(pathname))return new Response('Forbidden',{status:403});
      const file=path.resolve(directory,'.'+(pathname==='/'?'/index.html':pathname));
      const relative=path.relative(directory,file);
      if(!relative||relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))return new Response('Forbidden',{status:403});
      // Read directly, including inside ASAR. net.fetch(file://...) goes through
      // webRequest again and is intentionally blocked by our network filter.
      const bytes=await fs.readFile(file);
      return new Response(request.method==='HEAD'?null:bytes,{headers:{
        'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream',
        'Content-Security-Policy':policy,'X-Content-Type-Options':'nosniff',
      }});
    } catch(error) {
      if(['ENOENT','EISDIR','ENOTDIR'].includes(error.code))return new Response('Not found',{status:404});
      return new Response('Unable to load local asset',{status:500});
    }
  };
}
module.exports={createAssetHandler};
