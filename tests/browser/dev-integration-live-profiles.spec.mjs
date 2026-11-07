import {test,expect} from '@playwright/test';
import {environmentCatalog,environmentOperation,ownerProfileProjection} from '../support/environment-operations-ui-fixture.mjs';
const base=process.env.CONSOLE_TEST_BASE_URL??'http://127.0.0.1:4317';
if(new URL(base).port==='3317')throw Error('Use isolated preview for intercepted write cases.');
test.setTimeout(90000);test.use({actionTimeout:10000,navigationTimeout:60000});
async function setup(page,{lost=false,longDescriptions=false,historyCount=0,profileCount=0}={}) {
 let projection=ownerProfileProjection(),offline=false,requests=[];
 if(longDescriptions){
  const seed=projection.profiles[0];projection.profiles=Array.from({length:20},(_,index)=>({...structuredClone(seed),profile_id:`long-profile-${index}`,purpose:"Keep workflow services, source checks and operator access available while preserving separate runtime and handoff evidence for this integration profile.",source:{...seed.source,ref:`repo://owner/dev-integration/profiles/long-profile-${index}/profile.yaml`}}));projection.page.total=20;
 }
 if(profileCount){const seed=projection.profiles[0];projection.profiles=Array.from({length:profileCount},(_,i)=>{const id='sized-profile-'+String(i).padStart(3,'0');return {...structuredClone(seed),profile_id:id,source:{...seed.source,ref:'repo://owner/dev-integration/profiles/'+id+'/profile.yaml'}};});projection.page.total=profileCount;}
 const template={profileId:'history-profile',ownerRepo:'owner',purpose:'Read-only history test',laneClass:'integration-devint',participatingRepos:['owner'],runtimePlatform:'local',runtimeStateModel:'disposable',dependencies:[],expectedWrites:{classification:'none',targets:[]},securityTriggers:[],persistence:null,replacesProfileId:null};
 requests=Array.from({length:historyCount},(_,i)=>{const id='devint-request:history-'+i,now='2026-11-01T00:00:00Z',digest='sha256:'+'c'.repeat(64),ref='oos://dev-integration/requests/'+id;return {schema_version:1,workflow_id:'dev-integration-profile-request',request_id:id,request:{...template,profileId:'history-profile-'+i},expected_source_version:'registry:'+'a'.repeat(40),intent_digest:digest,operator_id:'operator:synthetic',state:'recorded',created_at:now,updated_at:now,request_ref:ref,receipt:{request_ref:ref,request_id:id,intent_digest:digest,operator_id:'operator:synthetic',recorded_at:now,outcome:'request-recorded',digest},admission:{state:'not-checked',lifecycle:null,source_version:null,observed_at:null,profile_ref:null},readback:'current',next_action:{code:'review-profile-request',owner:'owner',reason:'Original request awaits owner review.'}};});
 const historyOffsets=[];
 const writes=[],errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(path==='/api/console/capabilities')return route.fulfill({json:{artifactType:'console-runtime-capability-projection',schemaVersion:1,mode:'live',capabilities:[]}});
  if(path==='/api/environment-operations'&&req.method()==='GET')return route.fulfill({json:{mode:'live',status:'current',observedAt:new Date().toISOString(),catalog:environmentCatalog(),operations:[environmentOperation('one')]}});
  if(path==='/api/dev-integration/profiles'){if(offline)return route.fulfill({status:503,json:{error:'Synthetic owner unavailable'}});const q=new URL(req.url()).searchParams,offset=Number(q.get('offset')??0),limit=Number(q.get('limit')??25),rows=profileCount?projection.profiles.filter(row=>!q.get('q')||row.profile_id.includes(q.get('q'))):projection.profiles;return route.fulfill({json:{mode:'live',projection:{...projection,profiles:profileCount?rows.slice(offset,offset+limit):rows,observed_at:new Date().toISOString(),...(profileCount?{page:{offset,limit,total:rows.length,next_offset:offset+limit<rows.length?offset+limit:null}}:{})}}});}
  if(path==='/api/dev-integration/requests'&&req.method()==='GET'){const offset=Number(new URL(req.url()).searchParams.get('offset')??0);historyOffsets.push(offset);return route.fulfill({json:{schema_version:1,requests:requests.slice(offset,offset+20),page:{offset,limit:20,total:requests.length,next_offset:offset+20<requests.length?offset+20:null}}});}
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
 return {w,writes,errors,historyOffsets,setOffline:value=>{offline=value;},changeSource:()=>{projection={...projection,source_version:'registry:'+'d'.repeat(40)};},refresh:()=>page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')))};
}
async function reviewRequest(page,w) {
 await w.getByRole('button',{name:'Request Profile',exact:true}).click();
 const form=page.getByRole('dialog',{name:'Dev Integration Profile Request',exact:true});
 await form.getByRole('textbox',{name:'Profile ID',exact:true}).fill('new-owner-runtime');
 await form.getByLabel("Implementation repository",{exact:true}).click();await page.getByRole('option',{name:'owner',exact:true}).click();
 await form.getByRole('textbox',{name:'Operational purpose',exact:true}).fill('A browser-only request contract exercise.');
 await form.getByRole('button',{name:'Next',exact:true}).click();await form.getByRole('button',{name:'Review Request',exact:true}).click();
 await expect(form).toContainText('OOS-owned profile request');await expect(form).not.toContainText('Workspace Proposals');return form;
}
for(const width of [1280,1700])test(`Real profile model reuses the register and all dashboard tabs at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?800:1000});const h=await setup(page);
 await h.w.getByRole('button',{name:'Open Profile Dashboard',exact:true}).click();
 const d=page.getByRole('dialog',{name:'Profile Dashboard',exact:true});await expect(d).toContainText('Current source profile contract');await expect(d).not.toContainText('Design preview');
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
 await expect(page.getByRole('dialog',{name:'Dev Integration Profile Request',exact:true})).toHaveCount(0);await expect(h.w).toContainText('2 of 2 matching');
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

for(const width of [1280,1700])test(`Long profile descriptions keep columns readable and paging inside the workspace at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?800:1000});const h=await setup(page,{longDescriptions:true});
 const footer=h.w.getByRole("navigation",{name:"Dev Integration profiles pages",exact:true});
 await expect(footer.getByRole("status")).toContainText("Showing 1–20 of 20");
 const geometry=await footer.evaluate(el=>({bottom:el.getBoundingClientRect().bottom,height:innerHeight,font:parseFloat(getComputedStyle(el.querySelector('[role="status"] p')).fontSize)}));
 expect(geometry.bottom).toBeLessThanOrEqual(geometry.height);expect(geometry.font).toBeLessThanOrEqual(12);
 const lane=h.w.getByRole("columnheader",{name:"Lane",exact:true});expect(await lane.evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(100);
 const row=h.w.getByRole("row").filter({hasText:"long-profile-0"});expect(await row.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(150);
 await row.getByRole("button",{name:"Inspect long-profile-0",exact:true}).click();
 const dashboard=page.getByRole("dialog",{name:"Profile Dashboard",exact:true});await expect(dashboard).toContainText("Keep workflow services, source checks and operator access available");
 await dashboard.getByRole("button",{name:"Back to Register",exact:true}).click();
 const history=h.w.getByRole("heading",{name:"Request history",exact:true});await history.scrollIntoViewIfNeeded();await expect(history).toBeVisible();
 expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

test('profile request history reaches older native offsets after head refresh and retains exact original inspection',async({page})=>{
 await page.setViewportSize({width:1700,height:1000});const h=await setup(page,{historyCount:61}),pager=h.w.getByRole('navigation',{name:'Integration request history pages',exact:true});
 await expect(pager.getByRole('status')).toHaveText('Showing 1–25 of 61 · Page 1');await pager.getByRole('button',{name:'Next page',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 26–50 of 61 · Page 2');
 const before=h.historyOffsets.filter(n=>n===0).length;await h.refresh();await expect.poll(()=>h.historyOffsets.filter(n=>n===0).length).toBeGreaterThan(before);await expect(pager.getByRole('status')).toHaveText('Showing 26–50 of 61 · Page 2');
 await pager.getByRole('button',{name:'Next page',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 51–61 of 61 · Page 3');await h.w.getByRole('button',{name:'Inspect profile request devint-request:history-60',exact:true}).click();const detail=page.getByRole('dialog',{name:'Profile request',exact:true});await detail.getByRole('button',{name:'Refresh original request',exact:true}).click();await expect(detail).toContainText('history-profile-60');await detail.getByRole('button',{name:'Back to requests',exact:true}).click();await pager.getByRole('button',{name:'Previous',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 26–50 of 61 · Page 2');expect(h.historyOffsets).toContain(25);expect(h.historyOffsets).toContain(50);expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

for(const width of[1280,1700])test(`native profile offsets fill100 rows and retain filters on resize at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?800:1000});const h=await setup(page,{profileCount:131}),pager=h.w.getByRole('navigation',{name:'Dev Integration profiles pages',exact:true});await expect(pager.getByRole('status')).toHaveText('Showing 1–25 of 131 · Page 1');await pager.getByRole('button',{name:'Dev Integration profiles rows per page',exact:true}).click();await page.getByRole('option',{name:'100',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 1–100 of 131 · Page 1');await expect(h.w.locator('tbody tr')).toHaveCount(100);await pager.getByRole('button',{name:'Next page',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 101–131 of 131 · Page 2');await pager.getByRole('button',{name:'Dev Integration profiles rows per page',exact:true}).click();await page.getByRole('option',{name:'50',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 1–50 of 131 · Page 1');await h.w.getByRole('searchbox',{name:'Search Dev Integration profiles',exact:true}).fill('sized-profile-130');await expect(pager.getByRole('status')).toHaveText('Showing 1–1 of 1 · Page 1');await pager.getByRole('button',{name:'Dev Integration profiles rows per page',exact:true}).click();await page.getByRole('option',{name:'100',exact:true}).click();await expect(h.w.getByRole('searchbox',{name:'Search Dev Integration profiles',exact:true})).toHaveValue('sized-profile-130');await expect(pager.getByRole('status')).toHaveText('Showing 1–1 of 1 · Page 1');expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});
