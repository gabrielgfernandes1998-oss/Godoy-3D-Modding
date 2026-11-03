const fs=require('node:fs/promises');
const path=require('node:path');
function validateTextures(textures=[]){
 if(!Array.isArray(textures)||textures.length>32)throw Error('Texturas GLB inválidas.');
 let total=0;
 for(const t of textures){
  if(!Number.isInteger(t.width)||!Number.isInteger(t.height)||t.width<1||t.height<1||t.width>4096||t.height>4096||!(t.pixels instanceof Uint8Array)||t.pixels.byteLength!==t.width*t.height*4||(total+=t.pixels.byteLength)>128*1024*1024)throw Error('Pixels GLB inválidos ou acima do limite de leitura.');
 }
 return textures;
}
async function writeTextures(directory,textures,{plan=false}={}){
 validateTextures(textures);const descriptors=[];
 for(const [i,t] of textures.entries()){
  const descriptor={width:t.width,height:t.height};
  if(!plan){descriptor.pixelsFile=path.join(directory,`addition-${i}.rgba`);await fs.writeFile(descriptor.pixelsFile,t.pixels,{flag:'wx'});}
  descriptors.push(descriptor);
 }
 return descriptors;
}
module.exports={validateTextures,writeTextures};
