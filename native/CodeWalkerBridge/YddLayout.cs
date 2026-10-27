using CodeWalker.GameFiles;
using System.IO.Compression;

// YDD-only layout optimization. Every block stays whole and 16-byte aligned.
// Keep the standard CodeWalker layout as a fallback; choose a smaller valid one.
static class YddLayout {
    public static byte[] Save(YddFile file){
        var root=file.DrawableDict;root.FilePagesInfo=new ResourcePagesInfo();
        ResourceBuilder.GetBlocks(root,out var sys,out var gfx);
        Assign(sys,0x50000000,out var sf);Assign(gfx,0x60000000,out var gf);
        Validate(sys,0x50000000,sf);Validate(gfx,0x60000000,gf);
        root.FilePagesInfo.SystemPagesCount=(byte)sf.Count;root.FilePagesInfo.GraphicsPagesCount=(byte)gf.Count;
        using var system=new MemoryStream();using var graphics=new MemoryStream();
        var writer=new ResourceDataWriter(system,graphics);
        foreach(var block in sys.Concat(gfx)){
            writer.Position=block.FilePosition;long before=writer.Position;block.Write(writer);
            if(writer.Position-before!=block.BlockLength)throw new Exception("Tamanho de bloco YDD inconsistente.");
        }
        system.SetLength(sf.Size);graphics.SetLength(gf.Size);
        using var output=new MemoryStream();using(var header=new BinaryWriter(output,System.Text.Encoding.UTF8,true)){
            header.Write(0x37435352u);header.Write(165);header.Write(sf.Value|0xA0000000u);header.Write(gf.Value|0x50000000u);
        }
        using(var compressed=new DeflateStream(output,CompressionLevel.Optimal,true)){
            compressed.Write(system.GetBuffer(),0,(int)system.Length);compressed.Write(graphics.GetBuffer(),0,(int)graphics.Length);
        }
        return output.ToArray();
    }
    static void Validate(IList<IResourceBlock> blocks,uint address,RpfResourcePageFlags flags){
        if(flags.Count>255||flags.Size>=0x10000000u)throw new Exception("Layout YDD acima do endereçamento suportado.");
        long previous=address;
        foreach(var block in blocks.OrderBy(b=>b.FilePosition)){
            long start=block.FilePosition-address,end=start+block.BlockLength;
            if(block.FilePosition<previous||(block.FilePosition&15)!=0||start<0||end>flags.Size||
               !flags.Pages.Any(p=>start>=p.Offset&&end<=(long)p.Offset+p.Size))throw new Exception("Layout YDD com sobreposição ou bloco fora da página.");
            previous=block.FilePosition+block.BlockLength;
        }
    }

    public static void Assign(IList<IResourceBlock> blocks,uint address,out RpfResourcePageFlags flags){
        ResourceBuilder.AssignPositions(blocks,address,out flags);
        if(blocks.Count==0)return;
        var best=blocks.Select(b=>b.FilePosition).ToArray();var bestFlags=flags;
        long Align(long n)=>(n+15)&~15L;
        long largest=blocks.Max(b=>Align(b.BlockLength));
        uint[] maxima={1,3,15,63,127,1,1,1,1};
        for(uint shift=0;shift<=10;shift++){
            long pageSize=512L<<(int)(shift+8);if(pageSize<largest)continue;
            if(pageSize>bestFlags.Size)break;
            var set=new ResourceBuilder.ResourceBuilderBlockSet(blocks,address==0x50000000);
            var counts=new uint[9];int level=0;counts[0]=1;
            long start=0,position=0,space=pageSize,remainder=blocks.Sum(b=>Align(b.BlockLength));bool valid=true,root=true;
            while(true){
                var next=root&&set.IsSystemSet?set.RootBlock:set.TakeBestBlock(space);root=false;
                if(next!=null){
                    if(Align(next.Length)>space){valid=false;break;}
                    next.Block.FilePosition=address+position;long size=Align(next.Length);position+=size;space-=size;remainder-=size;
                }else if(set.Count>0){
                    start+=pageSize;position=start;
                    long needed=Align(set.FindBestBlock(long.MaxValue).Length);
                    // Page sizes are descending; never split a data block over pages.
                    while(level<8&&(counts[level]>=maxima[level]||remainder<=pageSize/2)){
                        if(pageSize/2<needed)break;pageSize/=2;level++;
                    }
                    if(counts[level]>=maxima[level]||pageSize<needed){valid=false;break;}
                    counts[level]++;space=pageSize;
                }else break;
            }
            if(!valid)continue;
            var candidate=new RpfResourcePageFlags(counts,shift);
            if(candidate.Count>255||candidate.Count!=counts.Sum(c=>(long)c)||candidate.Size<position)continue;
            if(candidate.Size<bestFlags.Size||(candidate.Size==bestFlags.Size&&candidate.Count<bestFlags.Count)){
                bestFlags=candidate;best=blocks.Select(b=>b.FilePosition).ToArray();
            }
        }
        for(int i=0;i<blocks.Count;i++)blocks[i].FilePosition=best[i];flags=bestFlags;
    }
}
