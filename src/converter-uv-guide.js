// Full vector guide avoids rasterizing hundreds of thousands of triangles on the UI.
export function uvGuideSvg(geometries,size){
 const chunks=[`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><g fill="none" stroke="#ba2c50" stroke-width="0.6">`];let path='',faces=0;
 for(const g of geometries)for(let f=0;f<g.indices.length;f+=3){for(let c=0;c<3;c++){const i=g.indices[f+c],x=(g.uvs[i*2]*size).toFixed(3),y=((1-g.uvs[i*2+1])*size).toFixed(3);path+=(c?'L':'M')+x+' '+y;}path+='Z';faces++;if(faces%2048===0){chunks.push('<path d="'+path+'"/>');path='';}}
 if(path)chunks.push('<path d="'+path+'"/>');chunks.push('</g></svg>');return chunks.join('');
}
