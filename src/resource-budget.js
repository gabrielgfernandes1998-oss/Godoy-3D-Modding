import {pageSize} from '../modules/vehicles/src/formats/resource.js';
export const FIVEM_RESOURCE_LIMIT=100_000_000;
export function resourceBudget(bytes){
 if(!ArrayBuffer.isView(bytes)||bytes.byteLength<16)return null;
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(view.getUint32(0,true)!==0x37435352)return null;
 const system=pageSize(view.getUint32(8,true)),graphics=pageSize(view.getUint32(12,true));
 return {fileBytes:bytes.byteLength,systemBytes:system,graphicsBytes:graphics,pagesBytes:system+graphics,largestSegmentBytes:Math.max(system,graphics),limit:FIVEM_RESOURCE_LIMIT};
}
export function assertFiveMBudget(bytes,name){const size=resourceBudget(bytes);if(size&&(size.largestSegmentBytes>FIVEM_RESOURCE_LIMIT||size.fileBytes>FIVEM_RESOURCE_LIMIT))throw Error(`${name}: arquivo ${(size.fileBytes/1e6).toFixed(2)} MB, sistema ${(size.systemBytes/1e6).toFixed(2)} MB, gráficos ${(size.graphicsBytes/1e6).toFixed(2)} MB. Acima do orçamento de 100 MB do FiveM. Use Compactar YDD nas abas 03/05; se não bastar, reduza a geometria na origem.`);return size;}
