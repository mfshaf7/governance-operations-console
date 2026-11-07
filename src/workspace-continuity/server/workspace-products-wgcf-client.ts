import {createHash} from "node:crypto";
import {resolveConsoleWgcfConnection,type ConsoleWgcfConnection} from "../../console-integration/configuration/console-runtime-configuration.ts";
import {ownerQueryFetch} from "../../console-integration/server/owner-query-fetch.ts";
import {assertWorkspaceContinuityProjection,assertWorkspaceContinuityProduct} from "../workspace-continuity-contract.ts";
import {WorkspaceContinuityWgcfError} from "./workspace-continuity-wgcf-client.ts";

export async function readWorkspaceProductPage(params:URLSearchParams,callerSignal?:AbortSignal,options:{config?:ConsoleWgcfConnection;fetchImpl?:typeof fetch}={}){
  if([...params.keys()].some(key=>!["view","query","maturity","posture","cursor","id"].includes(key)||params.getAll(key).length!==1))throw invalid();
  const selection={query:(params.get("query")??"").trim().toLowerCase(),maturity:params.get("maturity")??"all",posture:params.get("posture")??"all",id:params.get("id")};
  if(selection.query.length>128||!["all","owner-managed","platform-integrated","fully-governed"].includes(selection.maturity)||!["all","active","suspended","retired"].includes(selection.posture)||selection.id!==null&&(!/^product:[a-z0-9][a-z0-9._-]{0,185}$/.test(selection.id)||params.has("cursor")))throw invalid();
  const config=options.config??resolveConsoleWgcfConnection(),owner=ownerQueryFetch(callerSignal,options.fetchImpl);
  const query=new URLSearchParams({view:"products",query:selection.query,maturity:selection.maturity,posture:selection.posture,...(params.has("cursor")?{cursor:params.get("cursor")!}:{}),...(selection.id?{id:selection.id}:{})});
  const response=await owner.fetchImpl(`${config.baseUrl}/v1/projections/workspace-continuity?${query}`,{cache:"no-store",redirect:"error",headers:{Accept:"application/json","x-wgcf-caller-id":config.callerId,"x-wgcf-caller-secret":config.callerSecret}});
  const text=await response.text();if(Buffer.byteLength(text)>2097152)throw new WorkspaceContinuityWgcfError("Product page exceeded its read budget.","workspace_products_large",502);
  const body=JSON.parse(text);
  if(!response.ok)throw new WorkspaceContinuityWgcfError(response.status===400?"Product source or selection changed. Refresh the first page.":"Managed products could not be verified.","workspace_products_unavailable",response.status);
  if(body.artifact_type==="workspace-continuity-projection"){
    // Rolling-version compatibility: this retained response explicitly attests
    // a complete collection. Slice that verified snapshot, never a truncated list.
    const source=assertWorkspaceContinuityProjection(body),rows=source.products.filter(row=>(selection.id===null||row.product_id===selection.id)&&(selection.maturity==="all"||row.maturity===selection.maturity)&&(selection.posture==="all"||row.posture===selection.posture)&&(!selection.query||[row.product_id,row.name,row.owners.platform,row.owners.runtime,row.owners.security,...row.owners.source].join(" ").toLowerCase().includes(selection.query))).sort((a,b)=>a.product_id<b.product_id?-1:a.product_id>b.product_id?1:0);
    let after:string|null=null;const cursor=params.get("cursor");
    if(cursor){try{const position=JSON.parse(Buffer.from(cursor,"base64url").toString());if(cursor.length>1024||!/^[A-Za-z0-9_-]+$/.test(cursor)||Object.keys(position).sort().join(",")!=="after,revision,selection"||position.revision!==source.authority.revision||JSON.stringify(position.selection)!==JSON.stringify(selection)||!rows.some(row=>row.product_id===position.after))throw Error();after=position.after;}catch{throw invalid();}}
    const products=rows.filter(row=>after===null||row.product_id>after).slice(0,25);
    if(selection.id&&products.length!==1)throw new WorkspaceContinuityWgcfError("The original product is unavailable.","workspace_product_original_missing",404);
    const next_cursor=products.length&&rows.some(row=>row.product_id>products.at(-1)!.product_id)?Buffer.from(JSON.stringify({revision:source.authority.revision,selection,after:products.at(-1)!.product_id})).toString("base64url"):null;
    const value={schema_version:1,artifact_type:"workspace-products-page",projection_state:"current",authority_revision:source.authority.revision,selection,products,page:{limit:25,total:rows.length,next_cursor}};
    return {...value,projection_digest:digest(value)};
  }
  if(body.schema_version!==1||body.artifact_type!=="workspace-products-page"||body.projection_state!=="current"||!/^([a-f0-9]{40})$/.test(body.authority_revision)||JSON.stringify(body.selection)!==JSON.stringify(selection)||!Array.isArray(body.products)||body.products.length>25||body.page?.limit!==25||!Number.isSafeInteger(body.page.total)||body.page.total<body.products.length||body.page.next_cursor!==null&&(typeof body.page.next_cursor!=="string"||!/^[A-Za-z0-9_-]{1,1024}$/.test(body.page.next_cursor)))throw invalid();
  const {projection_digest,...content}=body;if(projection_digest!==digest(content))throw invalid();
  const products=body.products.map(assertWorkspaceContinuityProduct);
  if(new Set(products.map((row:{product_id:string})=>row.product_id)).size!==products.length||selection.id&&(products.length!==1||products[0].product_id!==selection.id))throw invalid();
  return {...body,products};
}
function invalid(){return new WorkspaceContinuityWgcfError("Product source or selection changed. Refresh the first page.","workspace_products_selection_invalid",400);}
function digest(value:unknown){return `sha256:${createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex")}`;}
function canonical(value:unknown):unknown{if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,row])=>[key,canonical(row)]));return value;}
