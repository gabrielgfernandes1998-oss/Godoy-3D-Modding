const fs=require('node:fs/promises');
function validateParts(parts){
 if(!Array.isArray(parts)||!parts.length||parts.length>65535)throw Error('Quantidade de geometrias incompatível com o campo de 16 bits do YDD.');
 for(const p of parts){const n=p.positions?.length/3;if(!(p.positions instanceof Float32Array)||!(p.normals instanceof Float32Array)||!(p.uvs instanceof Float32Array)||!(p.indices instanceof Uint16Array)||!Number.isInteger(n)||n<1||n>65535||p.normals.length!==n*3||p.uvs.length!==n*2||!p.indices.length||p.indices.length%3)throw Error('Parte binária OBJ inválida.');}
}
async function writeParts(file,parts){
 validateParts(parts);const out=await fs.open(file,'wx');
 try{const header=Buffer.alloc(8);header.write('OBJ2');header.writeUInt32LE(parts.length,4);await out.writeFile(header);
  for(const p of parts){const h=Buffer.alloc(8);h.writeUInt32LE(p.positions.length/3);h.writeUInt32LE(p.indices.length,4);await out.writeFile(h);for(const a of [p.positions,p.normals,p.uvs,p.indices])await out.writeFile(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}
 }finally{await out.close();}
}
module.exports={validateParts,writeParts};
