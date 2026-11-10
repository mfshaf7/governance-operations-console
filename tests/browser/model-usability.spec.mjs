import {test,expect} from '../support/filled-surface-layout.mjs';
import {requestProjection,requestSummary as profileRequestSummary} from '../support/model-profile-request-fixture.mjs';
import {execFileSync} from 'node:child_process';
const inputs=JSON.parse(execFileSync(process.execPath,['--experimental-strip-types','--disable-warning=MODULE_TYPELESS_PACKAGE_JSON','--input-type=module','-e',`import {repositoryUiFixture} from './tests/support/repository-ui-fixture.mjs';import {modelRuntimePreviewRegistry} from './src/domain-workspaces/model-operations/read-model/fixtures/model-runtime.fixture.ts';import {projectLiveModelOperationsReadModel} from './src/domain-workspaces/model-operations/live-runtime/model-operations-live-projection.ts';const zero='sha256:'+'0'.repeat(64);process.stdout.write(JSON.stringify({capabilities:(await repositoryUiFixture()).capabilities,registry:modelRuntimePreviewRegistry(),readModel:projectLiveModelOperationsReadModel({sourceProjection:{source:{source_version:'a'.repeat(40)},digest:zero,profiles:[{profile_id:'agent-console-assist-v1',lifecycle:'active',purpose:'agent-console-assist',allowed_callers:['governance-operations-console/agent-console'],selected_environments:['dev-integration'],activation:{activation_allowed:true,reason:'Accepted policy'},security_review_ref:{uri:'review://synthetic',digest:zero}}]}})}));`],{encoding:'utf8'}));
const base=process.env.CONSOLE_TEST_BASE_URL??'http://127.0.0.1:4317';
if(new URL(base).port==='3317')throw Error('Use isolated preview only.');
test.use({viewport:{width:1700,height:1000},actionTimeout:15000});test.setTimeout(90000);
const zero='sha256:'+'0'.repeat(64);
function policySnapshot(){return {mode:'live',status:'current',observedAt:new Date().toISOString(),source:{authority:'platform-engineering'},requests:[requestProjection({revision:2,reviewState:'submitted'})],readModel:structuredClone(inputs.readModel)};}
async function open(page,handler){
 const {capabilities}=inputs;let snapshot=policySnapshot();const writes=[];
 await page.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(handler&&await handler(route,{path,req,snapshot,writes}))return;
  if(!['GET','HEAD','OPTIONS'].includes(req.method())){writes.push({path,body:req.postDataJSON()});return route.abort();}
  if(path==='/api/console/capabilities')return route.fulfill({json:capabilities});
  if(path==='/api/model-operations')return route.fulfill({json:snapshot});
  if(path==='/api/model-operations/requests')return route.fulfill({json:{schema_version:1,requests:snapshot.requests.map(profileRequestSummary).sort((a,b)=>a.request_id.localeCompare(b.request_id)),next_cursor:null}});
  if(path.startsWith('/api/model-operations/requests/'))return route.fulfill({json:snapshot.requests.find(row=>row.request_id===decodeURIComponent(path.split('/').at(-1)))});
  if(path==='/api/model-operations/runtime/registry')return route.fulfill({json:inputs.registry});
  if(path==='/api/model-operations/runtime/requests')return route.fulfill({json:{requests:[],next_cursor:null}});
  return route.continue();
 });
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>{const n=document.querySelector('button[title="Open MODEL"]');return n&&Object.keys(n).some(k=>k.startsWith('__reactProps$'));});await page.locator('button[title="Open MODEL"]').click();
 const control=page.getByRole('dialog',{name:'Model Operations Control',exact:true});await expect(control.locator('tbody tr')).toHaveCount(1);return {control,writes};
}
async function fillRequest(page,control){
 await control.getByRole('button',{name:'Request Profile',exact:true}).click();const form=page.getByRole('dialog',{name:'Request purpose profile',exact:true});
 await form.getByRole('button',{name:'Console AI Capability',exact:true}).click();await page.getByRole('option',{name:'Integration maintainer — explicit references',exact:true}).click();
 for(const[label,value]of [['Profile name','Synthetic profile'],['Request description','Review a synthetic request.'],['Requesting repository','governance-operations-console'],['Registered callers','synthetic=governance-operations-console'],['Admitted context URI','context://synthetic'],['Admitted context digest',zero],['Output schema repo','governance-operations-console'],['Output schema path','contracts/test.json'],['Output schema version','v1'],['Review notes','Keep within permitted context.']])await form.getByRole('textbox',{name:label,exact:true}).fill(value);
 await form.getByRole('textbox',{name:'Why is this needed?',exact:true}).fill('Review this synthetic request only.');return form;
}
for(const width of [1280,1700])test(`policy dashboard and compact routing are readable at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?800:1000});const {control,writes}=await open(page);
 await control.getByRole('button',{name:'Open Profile Dashboard',exact:true}).click();const dashboard=page.getByRole('dialog',{name:'Model Profile Dashboard',exact:true});
 await expect(dashboard.getByText('Policy permits use',{exact:true})).toBeVisible();await expect(dashboard.getByText('Profile change evidence',{exact:true})).toBeVisible();await expect(dashboard.getByText('Platform-controlled',{exact:true})).toHaveCount(0);
 const content=dashboard.getByRole('region',{name:'Profile dashboard content'});await expect(content).toBeVisible();expect(await dashboard.evaluate(n=>n.scrollWidth-n.clientWidth)).toBeLessThanOrEqual(1);
 await dashboard.screenshot({path:test.info().outputPath('dashboard.png')});
 await dashboard.getByRole('button',{name:'Models & routing',exact:true}).click();await expect(dashboard).toHaveCount(0);
 await expect(control.getByRole('columnheader',{name:'Reasoning / thinking',exact:true})).toBeVisible();await expect(control.getByRole('row').filter({hasText:'System default'})).toContainText('High');
 await control.screenshot({path:test.info().outputPath('routing-register.png')});await control.getByRole('button',{name:'Review routing',exact:true}).click();const routing=page.getByRole('dialog',{name:'Workflow routing',exact:true});
 await expect(routing.locator('[data-height="content"][data-width="standard"]')).toHaveCount(1);const box=await routing.locator('[data-width="standard"]').boundingBox();expect(box.width).toBeLessThanOrEqual(753);expect(await routing.evaluate(n=>n.scrollWidth-n.clientWidth)).toBeLessThanOrEqual(1);
 await routing.screenshot({path:test.info().outputPath('routing-dialog.png')});expect(writes).toEqual([]);
});
test('failed background profile poll fails closed and offers a working retry',async({page})=>{
 await page.clock.install();let fail=false;const {control,writes}=await open(page,async(route,{path})=>{if(path==='/api/model-operations'&&fail){await route.abort();return true;}return false;});
 fail=true;await page.clock.fastForward(16000);await expect(control.getByRole('button',{name:'Retry',exact:true})).toBeVisible();await expect(control.locator('tbody tr')).toHaveCount(0);await expect(control.getByRole('button',{name:'Request Profile',exact:true})).toBeDisabled();
 fail=false;await control.getByRole('button',{name:'Retry',exact:true}).click();await expect(control.locator('tbody tr')).toHaveCount(1);expect(writes).toEqual([]);
});
test('submission cannot close while pending; unknown result recovers the same request without resending',async({page})=>{
 let release;const hold=new Promise(r=>{release=r;});let original;
 const {control,writes}=await open(page,async(route,{path,req,writes})=>{
  if(path==='/api/model-operations'&&req.method()==='POST'){original=req.postDataJSON();writes.push(original);await hold;await route.abort();return true;}
  if(original&&path==='/api/model-operations/requests/'+encodeURIComponent(original.requestId)){await route.fulfill({json:requestProjection({requestId:original.requestId,revision:2,reviewState:'submitted'})});return true;}
  return false;
 });
 try{const form=await fillRequest(page,control);await form.getByRole('button',{name:'Submit Request',exact:true}).click();await expect(form.getByText('Recording profile request…',{exact:true})).toBeVisible();
 await expect(form.getByRole('button',{name:'Back To Register',exact:true})).toBeDisabled();await page.keyboard.press('Escape');await expect(form).toBeVisible();expect(writes.length).toBe(1);release();
 await expect(form.getByText('Result not confirmed',{exact:true})).toBeVisible();await expect(form.getByRole('button',{name:'Submit Request',exact:true})).toBeDisabled();await form.getByRole('button',{name:'Check original request',exact:true}).click();const history=page.getByRole('dialog',{name:'Manage Requests',exact:true});await expect(history.getByText(original.requestId,{exact:true})).toHaveCount(1);expect(writes.length).toBe(1);
 }finally{release();}
});
test('successful submission remains successful when its separate register refresh fails',async({page})=>{
 let submitted=false;const {control,writes}=await open(page,async(route,{path,req,writes})=>{
 if(path==='/api/model-operations'&&req.method()==='POST'){const draft=req.postDataJSON();writes.push(draft);submitted=true;await route.fulfill({json:requestProjection({requestId:draft.requestId,revision:2,reviewState:'submitted'})});return true;}
 if(path==='/api/model-operations'&&submitted){await route.abort();return true;}return false;});
 const form=await fillRequest(page,control);await form.getByRole('button',{name:'Submit Request',exact:true}).click();await expect(page.getByRole('dialog',{name:'Request submitted',exact:true})).toBeVisible();await expect(form.getByText('Result not confirmed',{exact:true})).toHaveCount(0);expect(writes.length).toBe(1);
});
test('compact routing keeps four fallbacks reachable and preserves the unsaved-draft guard',async({page})=>{
 await page.setViewportSize({width:1280,height:800});const {control,writes}=await open(page);await control.getByRole('radio',{name:'Models & routing',exact:true}).click();await control.getByRole('button',{name:'Review routing',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Workflow routing',exact:true});for(let i=0;i<3;i++)await dialog.getByRole('button',{name:'Add explicit fallback',exact:true}).click();
 await expect(dialog.getByRole('button',{name:'Remove fallback',exact:true})).toHaveCount(4);await expect(dialog.getByRole('button',{name:'Add explicit fallback',exact:true})).toBeDisabled();await dialog.getByRole('button',{name:'Save routing',exact:true}).scrollIntoViewIfNeeded();await expect(dialog.getByRole('button',{name:'Save routing',exact:true})).toBeDisabled();
 const scrollbar=await dialog.getByRole('button',{name:'Save routing',exact:true}).evaluate(button=>{let node=button.parentElement;while(node){const style=getComputedStyle(node);if(style.overflowY==='auto'&&node.scrollHeight>node.clientHeight+1)return {width:style.scrollbarWidth,color:style.scrollbarColor};node=node.parentElement;}return null;});
 expect(scrollbar).not.toBeNull();expect(scrollbar.width).toBe('thin');expect(scrollbar.color).not.toBe('auto');
 await dialog.screenshot({path:test.info().outputPath('routing-scrollbar.png')});
 await dialog.getByRole('button',{name:'Back to Models & routing',exact:true}).click();const guard=page.getByRole('alertdialog',{name:'Discard unsaved changes?',exact:true});await expect(guard).toBeVisible();await guard.getByRole('button',{name:'Keep editing',exact:true}).click();await expect(dialog.getByRole('button',{name:'Remove fallback',exact:true})).toHaveCount(4);
 await dialog.getByRole('button',{name:'Back to Models & routing',exact:true}).click();await guard.getByRole('button',{name:'Discard draft',exact:true}).click();await expect(dialog).toHaveCount(0);expect(writes).toEqual([]);
});
test('API connection continuation selects its exact source connection in model registrations',async({page})=>{
 const id='api-'+'a'.repeat(32),maturity={experimental:true,qualification:'real-account-verification-pending'};
 const registry=structuredClone(inputs.registry);registry.backends.push({backend_id:id,provider:'claude-api',allowed_tasks:registry.tasks,registered:false,account_login_supported:false,availability:'not-probed',catalogue_supported:true,verification_max_tokens:4096,...maturity});
 const presets=[['claude-api','Claude API','https://api.anthropic.com'],['deepseek-api','DeepSeek API','https://api.deepseek.com'],['glm-api','GLM · Z.AI Standard API','https://api.z.ai']].map(([provider,label,endpoint_origin])=>({provider,label,endpoint_origin,catalogue_supported:provider!=='glm-api',...maturity}));
 const {control,writes}=await open(page,async(route,{path})=>{
 if(path==='/api/model-operations/runtime/registry'){await route.fulfill({json:registry});return true;}
 if(path==='/api/model-operations/runtime/connections'){await route.fulfill({json:{revision:1,presets,connections:[{connection_id:id,provider:'claude-api',name:'Synthetic connected provider',state:'active',credential_generation:zero,credential_present:true,pending_operation:null,updated_at:'2026-11-06T00:00:00Z',...maturity}]}});return true;}return false;});
 await control.getByRole('radio',{name:'Models & routing',exact:true}).click();await control.getByRole('button',{name:'API connections',exact:true}).click();const dialog=page.getByRole('dialog',{name:'API connections',exact:true});await dialog.getByRole('button',{name:'Named connection',exact:true}).click();await page.getByRole('option',{name:/Synthetic connected provider/}).click();await dialog.getByRole('button',{name:'Continue to model registration',exact:true}).click();
 const registration=page.getByRole('dialog',{name:'Model registrations',exact:true});await expect(registration.getByRole('button',{name:'Provider connection',exact:true})).toContainText('Synthetic connected provider');await expect(registration.getByRole('button',{name:'Register connection',exact:true})).toBeEnabled();await expect(registration).toContainText('Experimental');expect(writes).toEqual([]);
});
test('recorded policy references fill explicitly while keeping new purpose choices',async({page})=>{
 const {control,writes}=await open(page);await control.getByRole('button',{name:'Request Profile',exact:true}).click();const form=page.getByRole('dialog',{name:'Request purpose profile',exact:true});await form.getByRole('textbox',{name:'Profile name',exact:true}).fill('New purpose kept');
 await form.getByRole('button',{name:'Console AI Capability',exact:true}).click();await page.getByRole('option',{name:'Integration maintainer — explicit references',exact:true}).click();await form.getByRole('button',{name:'Recorded policy references',exact:true}).click();await page.getByRole('option',{name:/Console test/}).click();await expect(form.getByRole('textbox',{name:'Admitted context URI',exact:true})).toHaveValue('');await form.getByRole('button',{name:'Fill policy references',exact:true}).click();await expect(form.getByRole('textbox',{name:'Admitted context URI',exact:true})).toHaveValue('https://context.local/test');await expect(form.getByRole('textbox',{name:'Profile name',exact:true})).toHaveValue('New purpose kept');await expect(form.getByRole('textbox',{name:'Request description',exact:true})).toHaveValue('');expect(writes).toEqual([]);
});
