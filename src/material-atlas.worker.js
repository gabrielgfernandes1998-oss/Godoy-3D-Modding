import {bakeMaterialAtlas} from './material-atlas.js';
self.onmessage=({data})=>{try{const result=bakeMaterialAtlas(data.materials,data.size,data);self.postMessage(result,[result.pixels.buffer]);}catch(e){self.postMessage({error:e.message});}};
