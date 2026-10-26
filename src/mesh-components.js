// Join positional duplicates across UV/normal seams, then split disconnected pieces.
export function connectedFaceGroups(geometry){
 const p=geometry.attributes.position,index=geometry.index,count=index?.count??p.count,parent=Int32Array.from({length:p.count},(_,i)=>i),same=new Map();
 const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};const union=(a,b)=>{parent[find(a)]=find(b);};
 for(let i=0;i<p.count;i++){const key=[p.getX(i)||0,p.getY(i)||0,p.getZ(i)||0].join('/'),other=same.get(key);if(other===undefined)same.set(key,i);else union(i,other);}
 const vertex=i=>index?index.getX(i):i;for(let i=0;i<count;i+=3){union(vertex(i),vertex(i+1));union(vertex(i),vertex(i+2));}
 const groups=new Map();for(let i=0;i<count;i+=3){const key=find(vertex(i));if(!groups.has(key))groups.set(key,[]);groups.get(key).push(vertex(i),vertex(i+1),vertex(i+2));}return [...groups.values()].map(a=>Uint32Array.from(a));
}
