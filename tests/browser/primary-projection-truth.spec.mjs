import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
import {projectionRepairFixture} from '../support/platform-attention-fixture.mjs';
import {environmentOperation,ownerProfileProjection} from '../support/environment-operations-ui-fixture.mjs';
const require=createRequire(import.meta.url);
const {prototypeWorkspaceReadModel}=require('../../src/domain-workspaces/prototype/read-model/prototype-workspace-read-model.ts');
const base=process.env.CONSOLE_TEST_BASE_URL??'http://127.0.0.1:4317';
if(new URL(base).port==='3317')throw Error('Use isolated preview.');
test.use({actionTimeout:15000,navigationTimeout:60000});test.setTimeout(90000);
async function setup(page,{unresolved=false,stale=false}={}){
 const fixture=projectionRepairFixture(),writes=[],errors=[];
 if(unresolved){const op=structuredClone(environmentOperation('current-start',{action:'dev-integration.start',state:'failed',retryable:true}));op.updated_at='2000-01-01T00:00:00Z';op.next_action={code:'retry',authority:'operator',reason:'This profile start still needs recovery.'};fixture.records.push(op);}
 const prototype=structuredClone(prototypeWorkspaceReadModel.records[0]);
 Object.assign(prototype,{id:'prototype-stale-item',name:'Retained stale prototype',lifecycle:'exploring',projectionFreshness:'stale owner record',openIssues:[],landing:{...prototype.landing,state:'ready'},baseline:{...prototype.baseline,state:'approved'},movementRequest:{...prototype.movementRequest,state:'idle'}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;
  if(!['GET','HEAD','OPTIONS'].includes(request.method())){writes.push(path);return route.fulfill({status:503,json:{error:'Read-only qualification'}});}
  if(path==='/api/environment-operations')return route.fulfill({json:{mode:'live',status:'current',observedAt:new Date().toISOString(),error:null,catalog:fixture.catalog,operations:fixture.records,
   ...(url.searchParams.has('workspace')?{historyPage:{workspace:url.searchParams.get('workspace'),limit:25,total:fixture.records.length,next_cursor:null,snapshot:'sha256:'+'a'.repeat(64)}}:{})}});
  if(path.startsWith('/api/environment-operations/')){const id=decodeURIComponent(path.split('/').at(-1));return route.fulfill({json:fixture.records.find(record=>record.operation_id===id)});}
  if(path==='/api/console/capabilities')return route.fulfill({json:{artifactType:'console-runtime-capability-projection',schemaVersion:1,mode:'live',capabilities:[]}});
  if(path==='/api/proposals')return route.fulfill({json:{mode:'live',status:'current',records:[],observedAt:new Date().toISOString(),error:null}});
  if(path==='/api/prototypes/records')return route.fulfill({json:{mode:'live',projection:{readModel:{...prototypeWorkspaceReadModel,records:stale?[prototype]:[]},nativeLifecycleOutcomes:[]}}});
  if(path==='/api/dev-integration/profiles')return route.fulfill({json:{mode:'live',projection:ownerProfileProjection()}});
  if(path==='/api/dev-integration/requests')return route.fulfill({json:{schema_version:1,requests:[],page:{offset:0,limit:25,total:0,next_offset:null}}});
  return route.fulfill({status:503,json:{error:'Unrelated fixture owner unavailable'}});
 });
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const b=document.querySelector('button[title="Dev Integration"]');return b&&Object.keys(b).some(k=>k.startsWith('__reactProps$'));},null,{timeout:60000});
 return {fixture,writes,errors};
}
for(const width of [1280,1700])test(`resolved old failures leave active Pulse but remain inspectable in history at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?800:1000});const h=await setup(page);
 const pulse=page.locator('[data-pulse-signal="blocked-operations"]');
 await expect(page.locator('.workspace-pulse-panel [data-teras-loading-signal]')).toHaveCount(0,{timeout:30000});
 await expect(pulse.locator('strong')).toHaveText('0+');
 await expect(page.getByRole('region',{name:'Operator priority',exact:true}).locator('button[class*="queueRow"]')).toHaveCount(0);
 await page.locator('button[title="Dev Integration"]').click();const workspace=page.getByRole('dialog',{name:'Dev Integration',exact:true});
 await expect(workspace.getByRole('heading',{name:'Operation history',exact:true})).toBeVisible({timeout:30000});
 for(const [id,title] of [['platform-operation:diagnostic','Check status'],['platform-operation:failed-source','Authorize source work']]){
  const original=workspace.getByRole('button',{name:'Inspect operation '+id,exact:true});await original.scrollIntoViewIfNeeded();await original.click();
  const dialog=page.getByRole('dialog',{name:title,exact:true});await expect(dialog).toContainText('Failed');
  await dialog.getByRole('button',{name:'Back to history',exact:true}).click();
 }
 await workspace.screenshot({path:test.info().outputPath('preserved-failed-history.png')});
 expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});
test('an unrelated newer success cannot hide a genuine unresolved start failure',async({page})=>{
 const h=await setup(page,{unresolved:true});
 await expect(page.locator('[data-pulse-signal="blocked-operations"] strong')).toHaveText('1+');
 const queue=page.getByRole('region',{name:'Operator priority',exact:true});await expect(queue.locator('button[class*="queueRow"]')).toHaveCount(1);await expect(queue).toContainText('alpha');
 expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});
test('a fresh owner response cannot turn a stale record into an executable priority',async({page})=>{
 const h=await setup(page,{stale:true});
 const row=page.getByRole('region',{name:'Operator priority',exact:true}).locator('button[class*="queueRow"]');
 await expect(row).toHaveCount(1);await expect(row).toHaveAttribute('data-tone','stale');await row.click();
 const selected=page.getByRole('region',{name:'Selected priority',exact:true});await expect(selected.getByRole('button',{name:'Open Prototype',exact:true})).toBeDisabled();
 await expect(page.locator('[data-pulse-signal="active-operations"]')).toHaveAttribute('data-tone','stale');
 expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});
