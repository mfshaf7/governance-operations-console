// Presentation windows over bounded, validated native pages. Native cursors are
// passed unchanged to their source. The window cursor never contains records.
type Position={scope:string;native:string|null;skip:number;anchor:string|null};
export async function readRegisterWindow<Row>({cursor,pageSize,scope,readPage,identity,signal}: {
 cursor:string|null;pageSize:number;scope:string;signal?:AbortSignal;
 readPage:(cursor:string|null)=>Promise<{rows:readonly Row[];nextCursor:string|null}>;identity:(row:Row)=>string;
}){
 if(![25,50,100].includes(pageSize))throw Error('Choose 25, 50 or 100 rows per page.');
 const binding=JSON.stringify([scope,pageSize]),position=decode(cursor,binding);
 let native=position?.native??null,skip=position?.skip??0,anchor=position?.anchor??null;
 const rows:Row[]=[],seen=new Set<string>(),visited=new Set<string|null>();
 for(let reads=0;reads<6;reads++){
  signal?.throwIfAborted();if(visited.has(native))throw Error('The source continuation did not advance. Refresh the first page.');visited.add(native);
  const page=await readPage(native);signal?.throwIfAborted();
  if(!Array.isArray(page.rows)||page.rows.length>100||page.nextCursor!==null&&(typeof page.nextCursor!=='string'||page.nextCursor===native))throw Error('The source returned an invalid page.');
  const ids=page.rows.map(identity),signature=await fingerprint(ids);
  if(new Set(ids).size!==ids.length||skip>ids.length||anchor&&anchor!==signature)throw Error('The source page changed. Refresh the first page.');
  for(;skip<page.rows.length;skip++){
   if(seen.has(ids[skip]))throw Error('The source page changed. Refresh the first page.');seen.add(ids[skip]);rows.push(page.rows[skip]);
   if(rows.length===pageSize)return {rows,nextCursor:skip+1<ids.length?encode({scope:binding,native,skip:skip+1,anchor:signature}):page.nextCursor?encode({scope:binding,native:page.nextCursor,skip:0,anchor:null}):null};
  }
  if(!page.nextCursor)return {rows,nextCursor:null};
  native=page.nextCursor;skip=0;anchor=null;
  // A sparse bounded search remains resumable rather than silently draining it.
  if(!page.rows.length)break;
 }
 return {rows,nextCursor:encode({scope:binding,native,skip,anchor})};
}
async function fingerprint(ids:string[]){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(ids))))).map(v=>v.toString(16).padStart(2,'0')).join('');}
function encode(position:Position){return 'window:'+encodeURIComponent(JSON.stringify(position));}
function decode(cursor:string|null,scope:string):Position|null{
 if(cursor===null)return null;
 try{if(!cursor.startsWith('window:')||cursor.length>32768)throw Error();const p=JSON.parse(decodeURIComponent(cursor.slice(7)));
 if(Object.keys(p).sort().join(',')!=='anchor,native,scope,skip'||p.scope!==scope||!Number.isInteger(p.skip)||p.skip<0||p.skip>100||p.native!==null&&(typeof p.native!=='string'||p.native.length>8192)||p.anchor!==null&&(typeof p.anchor!=='string'||!/^[a-f0-9]{64}$/.test(p.anchor)))throw Error();return p;
 }catch{throw Error('This page belongs to a different selection. Refresh the first page.');}
}
