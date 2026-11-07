// Source offsets remain absolute. Each bounded page is validated by its adapter.
export async function readRegisterOffsetWindow<Row,Metadata>({offset,pageSize,readPage,signal}: {
 offset:number;pageSize:number;signal?:AbortSignal;
 readPage:(offset:number)=>Promise<{rows:readonly Row[];total:number;nextOffset:number|null;version:string;metadata:Metadata}>;
}){
 if(![25,50,100].includes(pageSize)||!Number.isSafeInteger(offset)||offset<0)throw Error('Invalid register page.');
 const rows:Row[]=[];let first:Awaited<ReturnType<typeof readPage>>|null=null,at=offset;
 for(let reads=0;reads<6;reads++){
  signal?.throwIfAborted();const page=await readPage(at);signal?.throwIfAborted();
  if(first&&(page.version!==first.version||page.total!==first.total))throw Error('The register changed. Refresh the first page.');first??=page;
  if(page.nextOffset!==null&&page.nextOffset!==at+page.rows.length)throw Error('The source returned an invalid continuation.');
  rows.push(...page.rows.slice(0,pageSize-rows.length));
  if(rows.length===pageSize||page.nextOffset===null)break;
  if(!page.rows.length)throw Error('The source continuation did not advance.');at=page.nextOffset;
 }
 return {rows,metadata:first!.metadata,page:{offset,limit:pageSize,total:first!.total,next_offset:offset+rows.length<first!.total?offset+rows.length:null}};
}
