import {test,expect} from '@playwright/test';
import {environmentCatalog,environmentOperation,ownerProfileProjection} from '../support/environment-operations-ui-fixture.mjs';
const base=process.env.CONSOLE_TEST_BASE_URL??'http://127.0.0.1:4317';
if(new URL(base).port==='3317')throw Error('Use isolated preview for intercepted write cases.');
test.setTimeout(90000);test.use({actionTimeout:10000,navigationTimeout:60000});
async function setup(page,{lost=false}={}) {
 let projection=ownerProfileProjection(),offline=false,requests=[];
 const writes=[],errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(path==='/api/console/capabilities')return route.fulfill({json:{artifactType:'console-runtime-capability-projection',schemaVersion:1,mode:'live',capabilities:[]}});
  if(path==='/api/environment-operations'&&req.method()==='GET')return route.fulfill({json:{mode:'live',status:'current',observedAt:new Date().toISOString(),catalog:environmentCatalog(),operations:[environmentOperation('one')]}});
  if(path==='/api/dev-integration/profiles')return offline?route.fulfill({status:503,json:{error:'Synthetic owner unavailable'}}):route.fulfill({json:{mode:'live',projection:{...projection,observed_at:new Date().toISOString()}}});
  if(path==='/api/dev-integration/requests'&&req.method()==='GET')return route.fulfill({json:{schema_version:1,requests,page:{offset:0,limit:20,total:requests.length,next_offset:null}}});
  if(path==='/api/dev-integration/requests'&&req.method()==='POST'){
   const body=req.postDataJSON();writes.push(body);
   const now=new Date().toISOString();
   const receipt={request_ref:'oos://dev-integration/requests/'+body.requestId,request_id:body.requestId,intent_digest:'sha256:'+'c'.repeat(64),operator_id:'operator:synthetic',recorded_at:now,outcome:'request-recorded',digest:'sha256:'+'d'.repeat(64)};
   const record={schema_version:1,workflow_id:'dev-integration-profile-request',request_id:body.requestId,request:body.request,expected_source_version:body.reviewedSourceVersion,intent_digest:receipt.intent_digest,operator_id:receipt.operator_id,state:'recorded',created_at:now,updated_at:now,request_ref:receipt.request_ref,receipt,admission:{state:'not-checked',lifecycle:null,source_version:null,observed_at:null,profile_ref:null},readback:'current',next_action:{code:'review-profile-request',owner:'owner',reason:'Request recorded for owner review in Dev Integration; admission and runtime launch remain separate.'}};
   requests=[record];return lost?route.fulfill({status:503,json:{error:'Synthetic lost acknowledgement'}}):route.fulfill({status:201,json:record});
  }
  if(path.startsWith('/api/dev-integration/requests/')&&req.method()==='GET'){
   const record=requests.find(row=>row.request_id===decodeURIComponent(path.split('/').at(-1)));
   return record?route.fulfill({json:record}):route.fulfill({status:404,json:{error:'Original request not found'}});
  }
  if(!['GET','HEAD','OPTIONS'].includes(req.method()))writes.push({unexpected:path});
  return route.fulfill({status:503,json:{error:'Isolated unrelated owner',mode:'live',status:'offline'}});
 });
 await page.goto(base+'/?dev=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const b=document.querySelector('button[title="Dev Integration"]');return b&&Object.keys(b).some(k=>k.startsWith('__reactProps$'));},undefined,{timeout:60000});
 await page.locator('button[title="Dev Integration"]').click();
 const w=page.getByRole('dialog',{name:'Dev Integration',exact:true});
 await expect(w.getByRole('heading',{name:'Profile Register',exact:true})).toBeVisible({timeout:30000});
 return {w,writes,errors,setOffline:value=>{offline=value;},changeSource:()=>{projection={...projection,source_version:'registry:'+'d'.repeat(40)};},refresh:()=>page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')))};
}
async function reviewRequest(page,w) {
 await w.getByRole('button',{name:'Request Profile',exact:true}).click();
 const form=page.getByRole('dialog',{name:'Dev Integration Profile Request',exact:true});
 await form.getByRole('textbox',{name:'Profile ID',exact:true}).fill('new-owner-runtime');
 await form.getByLabel('Owning repository',{exact:true}).click();await page.getByRole('option',{name:'owner',exact:true}).click();
 await form.getByRole('textbox',{name:'Operational purpose',exact:true}).fill('A browser-only request contract exercise.');
 await form.getByRole('button',{name:'Next',exact:true}).click();await form.getByRole('button',{name:'Review Request',exact:true}).click();
 await expect(form).toContainText('OOS-owned profile request');await expect(form).not.toContainText('Workspace Proposals');return form;
}
for(const width of [1280,1700])test(`Real profile model reuses the register and all dashboard tabs at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?800:1000});const h=await setup(page);
 await h.w.getByRole('button',{name:'Open Profile Dashboard',exact:true}).click();
 const d=page.getByRole('dialog',{name:'Profile Dashboard',exact:true});await expect(d).toContainText('Current owner profile contract');await expect(d).not.toContainText('Design preview');
 const support=d.getByRole('button',{name:'View Support Details',exact:true});await support.scrollIntoViewIfNeeded();await support.click();
 const s=page.getByRole('dialog',{name:'Declared Support Details',exact:true});await expect(s).toContainText('Not recorded');await expect(s).not.toContainText('Disposable runtime state');await s.getByRole('button',{name:'Close profile support details',exact:true}).click();
 await d.getByRole('radio',{name:'Runtime',exact:true}).click();await expect(d.getByRole('button',{name:'Check status',exact:true})).toBeEnabled();await expect(d).toContainText('Persistent; detailed contract not recorded');
 await d.getByRole('radio',{name:'Stage Handoff',exact:true}).click();await expect(d).toContainText('Owner-declared stage check');await expect(d).toContainText('Unknown');
 await page.screenshot({path:test.info().outputPath('owner-dashboard-'+width+'.png')});
 await d.getByRole('button',{name:'Back to Register',exact:true}).click();expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});
test('Live form uses canonical owner choices and records a request without creating an active profile',async({page})=>{
 const h=await setup(page),form=await reviewRequest(page,h.w);
 await form.getByRole('button',{name:'Submit Profile Request',exact:true}).click();const outcome=page.getByRole('dialog',{name:'Profile request recorded',exact:true});await expect(outcome).toBeVisible();await expect(outcome).toContainText('Recording receipt');await expect(outcome).not.toContainText('Proposal');await outcome.getByRole('button',{name:'Done',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Dev Integration Profile Request',exact:true})).toHaveCount(0);await expect(h.w).toContainText('2 of 2 loaded');
 await expect(h.w.getByRole('button',{name:/^Inspect profile request /})).toHaveCount(1);expect(h.writes).toHaveLength(1);expect(h.writes[0].request.ownerRepo).toBe('owner');expect(h.writes[0].request.requestedBy).toBeUndefined();expect(h.errors).toEqual([]);
});
test('Lost acknowledgement reads the original durable request instead of creating a replacement',async({page})=>{
 const h=await setup(page,{lost:true}),form=await reviewRequest(page,h.w);await form.getByRole('button',{name:'Submit Profile Request',exact:true}).click();
 const outcome=page.getByRole('dialog',{name:'Profile request needs attention',exact:true});await expect(outcome).toContainText('Synthetic lost acknowledgement');await outcome.getByRole('button',{name:'Read original request',exact:true}).click();
 const recovered=page.getByRole('dialog',{name:'Profile request recorded',exact:true});await expect(recovered).toBeVisible();await recovered.getByRole('button',{name:'Done',exact:true}).click();expect(h.writes).toHaveLength(1);expect(h.errors).toEqual([]);
});
test('Registry drift disables an already reviewed request before submission',async({page})=>{
 const h=await setup(page),form=await reviewRequest(page,h.w);h.changeSource();await h.refresh();await expect(form.getByRole('button',{name:'Submit Profile Request',exact:true})).toBeDisabled();await expect(form).toContainText('Source changed');expect(h.writes).toEqual([]);
});
test('Owner outage retains the register and disables new requests without switching to samples',async({page})=>{
 const h=await setup(page);h.setOffline(true);await h.refresh();await expect(h.w.getByRole('button',{name:'Request Profile',exact:true})).toBeDisabled();await expect(h.w).toContainText('Synthetic owner unavailable');await expect(h.w).not.toContainText('Design preview');expect(h.writes).toEqual([]);
});
