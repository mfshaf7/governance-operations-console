import {test,expect} from '../support/filled-surface-layout.mjs';
import {execFileSync} from 'node:child_process';
import {requestProjection,requestSummary} from '../support/model-profile-request-fixture.mjs';
const base=process.env.CONSOLE_TEST_BASE_URL??'http://127.0.0.1:4317';if(new URL(base).port==='3317')throw Error('Use isolated preview only.');
test.use({viewport:{width:1700,height:1000},actionTimeout:10000});test.setTimeout(90000);
const hash='sha256:'+'a'.repeat(64),commit='a'.repeat(40);
const inputs=JSON.parse(execFileSync(process.execPath,['--experimental-strip-types','--disable-warning=MODULE_TYPELESS_PACKAGE_JSON','--input-type=module','-e',`import{repositoryUiFixture}from'./tests/support/repository-ui-fixture.mjs';import{projectLiveModelOperationsReadModel}from'./src/domain-workspaces/model-operations/live-runtime/model-operations-live-projection.ts';const digest='sha256:'+'a'.repeat(64);process.stdout.write(JSON.stringify({capabilities:(await repositoryUiFixture()).capabilities,readModel:projectLiveModelOperationsReadModel({sourceProjection:{source:{source_version:'a'.repeat(40)},digest,profiles:[{profile_id:'sample-assistant-v1',lifecycle:'active',purpose:'planning',allowed_callers:['sample-project/planning'],selected_environments:['dev-integration'],activation:{activation_allowed:true,reason:'Controlled accepted policy'},security_review_ref:{uri:'review://sample',digest}}]}})}));`],{encoding:'utf8'}));
const preparation=(intent='suspend')=>({schema_version:1,profile_id:'sample-assistant-v1',intent,preparation_digest:hash,current_state:'active',result_state:intent==='activate'?'active':'suspended',affected_workflows:['sample-project/planning'],security_acceptance_required:['activate','exception'].includes(intent),can_submit:true,policy_changes:intent==='amend'?[{field:'max_output_tokens',label:'Response token limit',before:4000,after:3000}]:[],impact:'Policy changes suspend the profile until separate activation.',source_version:commit,editable_policy:{allowed_data_scope:['Admitted context'],runtime_limits:{max_output_tokens:4000}}});
async function open(page,{record=requestProjection({revision:4,reviewState:'approved'}),handler}={}){
 const errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname;
  if(req.method()==='POST')writes.push({path,body:req.postDataJSON()});
  if(handler&&await handler(route,{req,url,path,record}))return;
  if(path==='/api/console/capabilities')return route.fulfill({json:inputs.capabilities});
  if(path==='/api/model-operations')return route.fulfill({json:{mode:'live',status:'current',observedAt:new Date().toISOString(),source:{authority:'platform-engineering'},requests:[],readModel:inputs.readModel}});
  if(path==='/api/model-operations/requests')return route.fulfill({json:{schema_version:1,requests:[requestSummary(record)],next_cursor:null}});
  if(path.endsWith('/lifecycle')&&req.method()==='GET'){
   if(url.searchParams.get('view')==='security')return route.fulfill({json:{request_id:record.request_id,revision:record.revision,prepared:true,required:false,authorized:false,acceptance:null}});
   return route.fulfill({json:{request_id:record.request_id,state:'not-started',source_applied:false,runtime_state:'not-checked',next_action:'implement',history:[],review:null,operation_digest:null,error:null}});
  }
  if(path.startsWith('/api/model-operations/requests/')&&req.method()==='GET')return route.fulfill({json:record});
  if(!['GET','HEAD','OPTIONS'].includes(req.method()))return route.abort();return route.continue();
 });
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>{const n=document.querySelector('button[title="Open MODEL"]');return n&&Object.keys(n).some(k=>k.startsWith('__reactProps$'));});await page.locator('button[title="Open MODEL"]').click();
 const control=page.getByRole('dialog',{name:'Model Operations Control',exact:true});await expect(control.locator('tbody tr')).toHaveCount(1);return {control,writes,errors};
}
for(const width of [1280,1700])test(`policy action form uses one readable impact flow at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?800:1000});const {control,writes,errors}=await open(page,{handler:async(route,{path,req})=>{
  if(path==='/api/model-operations/lifecycle'&&req.method()==='POST'){
   const body=req.postDataJSON();expect(body.action).toBe('prepare');expect(Object.keys(body.input).sort()).toEqual(['changes','environment','intent','profile_id','request_id']);await route.fulfill({json:preparation(body.input.intent)});return true;
  }
 }});
 await control.getByRole('button',{name:'Open Profile Dashboard',exact:true}).click();await page.getByRole('dialog',{name:'Model Profile Dashboard',exact:true}).getByRole('button',{name:'Change profile policy',exact:true}).click();
 const form=page.getByRole('dialog',{name:'Change profile policy',exact:true});await expect(form.getByRole('button',{name:'Submit for review',exact:true})).toBeDisabled();
 await form.getByRole('button',{name:'What should change?',exact:true}).click();await expect(page.getByRole('option')).toHaveCount(6);await page.getByRole('option',{name:'Change operating policy',exact:true}).click();
 await form.getByRole('spinbutton',{name:'Response tokens — supported providers',exact:true}).fill('3000');await form.getByRole('textbox',{name:'Why is this change needed?',exact:true}).fill('Reduce the response budget for this registered workflow.');
 await form.getByRole('button',{name:'Check impact',exact:true}).click();await expect(form.getByText('Review the policy change',{exact:true})).toBeInViewport();await expect(form.getByRole('button',{name:'Submit for review',exact:true})).toBeEnabled();
 expect(await form.evaluate(n=>n.scrollWidth-n.clientWidth)).toBeLessThanOrEqual(1);await form.screenshot({path:test.info().outputPath('profile-policy-impact.png')});expect(writes.every(row=>row.body.action==='prepare')).toBe(true);expect(writes.filter(row=>Object.keys(row.body.input.changes).length>0)).toHaveLength(1);expect(errors).toEqual([]);
});
test('merged source is shown separately from an unavailable running policy and retains exact recovery',async({page})=>{
 let operation={request_id:'model-profile-request:console-test',state:'not-started',source_applied:false,runtime_state:'not-checked',next_action:'implement',history:[],review:null,operation_digest:null,error:null};
 const {control,writes,errors}=await open(page,{handler:async(route,{path,url,req})=>{
  if(path.endsWith('/lifecycle')&&url.searchParams.get('view')!=='security'){
   if(req.method()==='POST'){
    const input=req.postDataJSON().input;expect(input).toEqual({action:operation.next_action,expected_operation_digest:operation.operation_digest});
    operation={...operation,state:'runtime-unverified',source_applied:true,runtime_state:'unverified',next_action:'reconcile',operation_digest:hash,review:{url:'https://github.com/mfshaf7/platform-engineering/pull/42',number:42,head:commit},history:[{state:'source-applied',recorded_at:'2026-11-06T00:00:00Z',detail:'The exact reviewed source is merged.'}]};
   }
   await route.fulfill({json:operation});return true;
  }
 }});
 await control.getByRole('button',{name:'Manage Requests',exact:true}).click();const history=page.getByRole('dialog',{name:'Manage Requests',exact:true});await history.getByRole('button',{name:'Recorded request',exact:true}).click();await page.getByRole('option',{name:'Console test · Approved',exact:true}).click();
 await history.getByRole('button',{name:'Prepare source review',exact:true}).click();await expect(history.getByText('runtime unverified',{exact:true})).toBeVisible();await expect(history.getByRole('link',{name:'Open source changes on GitHub',exact:true})).toHaveAttribute('target','_blank');await expect(history.getByRole('button',{name:'Apply & verify running policy',exact:true})).toBeEnabled();
 expect(writes).toHaveLength(1);expect(errors).toEqual([]);await history.screenshot({path:test.info().outputPath('profile-source-runtime-separation.png')});
});
