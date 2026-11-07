import {createHash} from "node:crypto";

// Adapt an existing bounded owner collection to a filtered register page. The
// cursor retains an intra-page position, never records, credentials or authority.
// A sparse result exposes continuation after four reads instead of draining the
// owner or pretending that an empty scanned window is the end of the collection.
export async function scanRegisterPage<T>({selection,cursor,readPage,identity,matches,signal}: {
  selection: unknown; cursor: string|null; signal?:AbortSignal;
  readPage:(cursor:string|null)=>Promise<{records:T[];next_cursor:string|null}>;
  identity:(row:T)=>string; matches:(row:T)=>boolean|Promise<boolean>;
}) {
  const scope=digest(selection),position=decode(cursor,scope);
  let upstream=position?.upstream??null,index=position?.index??0,anchor=position?.anchor??null;
  const records:T[]=[],visited=new Set<string|null>();
  for(let reads=0;reads<4;reads++){
    signal?.throwIfAborted();
    if(visited.has(upstream))throw new Error("The source continuation did not advance. Refresh the first page.");
    visited.add(upstream);
    const page=await readPage(upstream),ids=page.records.map(identity),signature=digest(ids);
    if(page.next_cursor!==null&&(typeof page.next_cursor!=="string"||page.next_cursor.length>4096||page.next_cursor===upstream))throw new Error("The source continuation did not advance. Refresh the first page.");
    if(ids.length>25||new Set(ids).size!==ids.length||index>ids.length||anchor&&anchor!==signature)throw new Error("The source page changed. Refresh the first page.");
    for(;index<page.records.length;index++){
      signal?.throwIfAborted();
      if(await matches(page.records[index]))records.push(page.records[index]);
      if(records.length===25){
        const next=index+1<page.records.length?encode({scope,upstream,index:index+1,anchor:signature}):page.next_cursor?encode({scope,upstream:page.next_cursor,index:0,anchor:null}):null;
        return {records,next_cursor:next};
      }
    }
    if(!page.next_cursor)return {records,next_cursor:null};
    upstream=page.next_cursor;index=0;anchor=null;
  }
  return {records,next_cursor:encode({scope,upstream,index,anchor})};
}
function digest(value:unknown){return createHash("sha256").update(JSON.stringify(value)).digest("hex");}
type Position={scope:string;upstream:string|null;index:number;anchor:string|null};
function encode(value:Position){return Buffer.from(JSON.stringify(value)).toString("base64url");}
function decode(cursor:string|null,scope:string):Position|null{
  if(cursor===null)return null;
  try{
    if(cursor.length>8192||!/^[A-Za-z0-9_-]+$/.test(cursor))throw Error();
    const row=JSON.parse(Buffer.from(cursor,"base64url").toString());
    if(Object.keys(row).sort().join(",")!=="anchor,index,scope,upstream"||row.scope!==scope||!Number.isInteger(row.index)||row.index<0||row.index>25||
      row.upstream!==null&&(typeof row.upstream!=="string"||row.upstream.length>4096)||row.anchor!==null&&!/^[a-f0-9]{64}$/.test(row.anchor))throw Error();
    return row;
  }catch{throw Object.assign(new Error("This page belongs to a different search or is invalid. Refresh the first page."),{status:400});}
}
