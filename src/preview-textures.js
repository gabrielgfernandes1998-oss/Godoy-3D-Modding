import {CanvasTexture,RepeatWrapping,SRGBColorSpace} from 'three';

// GTA clothing variations commonly rename the diffuse entry in each YTD.
export function previewDiffuse(drawable,shaderIndex,dictionary) {
  const name=drawable.shaders[shaderIndex]?.diffuseName?.toLowerCase();
  return dictionary?.textures.find(t=>t.supported&&t.name.toLowerCase()===name)
    ??dictionary?.textures.find(t=>t.supported)
    ??drawable.textures?.find(t=>t.supported&&t.name.toLowerCase()===name);
}
export function previewTexture(entry) {
  if(!entry?.supported)return null;
  const canvas=document.createElement('canvas');canvas.width=entry.width;canvas.height=entry.height;
  canvas.getContext('2d').putImageData(new ImageData(entry.decode(),entry.width,entry.height),0,0);
  const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;
  map.wrapS=map.wrapT=RepeatWrapping;
  return map;
}
