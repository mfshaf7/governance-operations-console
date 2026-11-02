import { assertNativeReleaseWorkflow, type NativeReleaseWorkflow } from "./release-workflow-contract.ts";
export type GovernedProduct = {
 product_id:string; label:string; maturity:"fully-governed"|"platform-integrated"|"owner-managed";
 platform_owner:string; security_owner:string; highest_real_endpoint:string; stage_supported:boolean; production_supported:boolean;
 evidence:{id:string;label:string;status:string;recorded_at:string|null;source_bundle:string|null;image_digest:string|null;evidence_ref:string|null;url:string}[];
 runtime:{state:string;recorded_at:string|null;url:string}|null;
 workflows:{id:string;label:string;environment:"stage"|"prod";url:string;native?:NativeReleaseWorkflow}[];
 guidance_url:string;execution:"owner-workflow"|"unsupported"|"unavailable";unavailable_reason:string;
};
export type GovernedProductProjection = {source_posture?:"accepted-snapshot"|"owner-main"|"retained-owner-main";source_notice?:string|null;schema_version:1;workflow_id:"governed-product-projection";source_version:string;observed_at:string;products:GovernedProduct[];page:{offset:number;limit:number;total:number;next_offset:number|null}};
function fail():never{throw new Error("The owner product projection is invalid.");}
function object<T>(value:T, keys:string[]):T {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || Object.keys(value).some(key=>!keys.includes(key))) fail();
  return value;
}
function text(value:unknown, max=1024): asserts value is string {if(typeof value !== 'string'||!value.trim()||value.length>max)fail();}
function nullable(value:unknown, max=1024) {if(value!==null)text(value,max);}
function time(value:unknown) {if(value!==null&&(typeof value!=='string'||!Number.isFinite(Date.parse(value))))fail();}
function url(value:unknown) {text(value,2048);if(!/^https:\/\/github\.com\/mfshaf7\/[a-z0-9-]+\/(?:blob\/[0-9a-f]{40}\/[^?#\s]+|actions\/workflows\/[a-z0-9-]+\.yaml)$/.test(value))fail();}
export function assertGovernedProductProjection(value:unknown): GovernedProductProjection {
 const root=object(value,['schema_version','workflow_id','source_version','observed_at','products','page',...(value && typeof value==='object' && 'source_posture' in value?['source_posture']:[]),...(value && typeof value==='object' && 'source_notice' in value?['source_notice']:[])]) as GovernedProductProjection;
 if(root.schema_version!==1||root.workflow_id!=='governed-product-projection'||typeof root.source_version!=='string'||!/^products:[0-9a-f]{40}:[0-9a-f]{40}$/.test(root.source_version))fail();
 text(root.observed_at);time(root.observed_at);
 if('source_posture' in root&&!['accepted-snapshot','owner-main','retained-owner-main'].includes(String(root.source_posture)))fail();
 if('source_notice' in root)nullable(root.source_notice,1000);
 if(!Array.isArray(root.products)||root.products.length>25)fail();
 const ids=new Set();
 for(const item of root.products){
  const p=object(item,['product_id','label','maturity','platform_owner','security_owner','highest_real_endpoint','stage_supported','production_supported','evidence','runtime','workflows','guidance_url','execution','unavailable_reason']);
  for(const key of (['product_id','platform_owner','security_owner','highest_real_endpoint'] as const)){text(p[key],200);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p[key]))fail();}
  text(p.label,200);text(p.unavailable_reason,1000);url(p.guidance_url);
  if(ids.has(p.product_id))fail();ids.add(p.product_id);
  if(!['fully-governed','platform-integrated','owner-managed'].includes(p.maturity)||typeof p.stage_supported!=='boolean'||typeof p.production_supported!=='boolean'||!['owner-workflow','unsupported','unavailable'].includes(p.execution))fail();
  if(!Array.isArray(p.evidence)||p.evidence.length>10||!Array.isArray(p.workflows)||p.workflows.length>10)fail();
  const evidenceIds=new Set();
  for(const item of p.evidence){const e=object(item,['id','label','status','recorded_at','source_bundle','image_digest','evidence_ref','url']);for(const k of (['id','label','status'] as const))text(e[k],200);if(evidenceIds.has(e.id))fail();evidenceIds.add(e.id);time(e.recorded_at);nullable(e.source_bundle);nullable(e.evidence_ref,2048);nullable(e.image_digest);if(e.image_digest!==null&&!/^sha256:[0-9a-f]{64}$/.test(e.image_digest))fail();url(e.url);}
  const workflowIds=new Set();
  for(const item of p.workflows){const w=object(item,['id','label','environment','url',...('native' in item?['native']:[])]);text(w.id,200);text(w.label,200);if(workflowIds.has(w.id)||!['stage','prod'].includes(w.environment))fail();workflowIds.add(w.id);url(w.url);if('native' in w){if(p.product_id!=='openclaw')fail();assertNativeReleaseWorkflow(w.native,w.id,root.source_version);}}
  if(p.runtime!==null){const rt=object(p.runtime,['state','recorded_at','url']);if(!['live','traffic-stopped','suspended','quarantined'].includes(rt.state))fail();time(rt.recorded_at);url(rt.url);}
  if(p.execution==='unsupported'&&p.workflows.length)fail();
 }
 const page=object(root.page,['offset','limit','total','next_offset']);
 for(const key of (['offset','limit','total'] as const))if(!Number.isSafeInteger(page[key])||page[key]<0)fail();
 if(page.limit<1||page.limit>25||root.products.length>page.limit||page.offset>10000||page.total>10000||root.products.length!==Math.min(page.limit,Math.max(0,page.total-page.offset)))fail();
 if(page.next_offset!==(page.offset+root.products.length<page.total?page.offset+root.products.length:null))fail();
 return root;
}
