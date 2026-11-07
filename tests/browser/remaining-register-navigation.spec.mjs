import {test,expect} from '../support/filled-surface-layout.mjs';
import {execFileSync} from 'node:child_process';
import {ownerWorkspace} from '../support/orchestration-ui-fixture.mjs';
const base=process.env.CONSOLE_TEST_BASE_URL??'http://127.0.0.1:4317';
if(new URL(base).port==='3317')throw Error('Use isolated preview.');
test.setTimeout(90000);test.use({actionTimeout:10000,navigationTimeout:60000});
const fixture=JSON.parse(execFileSync(process.execPath,['--experimental-strip-types','--disable-warning=MODULE_TYPELESS_PACKAGE_JSON','--input-type=module','-e',`
import {repositoryUiFixture} from './tests/support/repository-ui-fixture.mjs';
import {modelRuntimePreviewRegistry} from './src/domain-workspaces/model-operations/read-model/fixtures/model-runtime.fixture.ts';
import {modelOperationsPreview} from './src/domain-workspaces/model-operations/read-model/fixtures/model-review-preview.fixture.ts';
import {projectLiveModelOperationsReadModel} from './src/domain-workspaces/model-operations/live-runtime/model-operations-live-projection.ts';
const repo=await repositoryUiFixture(),registry=modelRuntimePreviewRegistry(),digest='sha256:'+'a'.repeat(64),backend=registry.backends[0].backend_id,seed=Object.values(registry.configuration.configuration.models).find(r=>r.backend_id===backend);
for(let i=0;i<60;i++)registry.configuration.configuration.models['sha256:'+(i+256).toString(16).padStart(64,'0')]={...seed,model:'batch-model-'+String(i).padStart(3,'0')};
registry.tasks=[...registry.tasks,...Array.from({length:60},(_,i)=>'batch-task-'+String(i).padStart(3,'0'))];
const profiles=Array.from({length:61},(_,i)=>({profile_id:'sample-profile-'+String(i).padStart(3,'0'),lifecycle:'active',purpose:'planning',allowed_callers:['sample-project/planning'],selected_environments:['dev-integration'],activation:{activation_allowed:true,reason:'Synthetic policy'},security_review_ref:{uri:'review://sample',digest}}));
process.stdout.write(JSON.stringify({repo,registry,operations:modelOperationsPreview(),readModel:projectLiveModelOperationsReadModel({sourceProjection:{source:{source_version:'a'.repeat(40)},digest,profiles}})}));
`],{encoding:'utf8'}));
async function open(page,destination,handler){
 const writes=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname;
  if(!['GET','HEAD','OPTIONS'].includes(req.method())){writes.push(path);return route.fulfill({status:503,json:{error:'No writes in paging inspection'}});}
  if(path==='/api/console/capabilities')return route.fulfill({json:fixture.repo.capabilities});
  if(await handler(route,{req,url,path}))return;
  return route.fulfill({status:503,json:{mode:'live',status:'offline',error:'Unrelated synthetic owner unavailable'}});
 });
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(title=>{const b=document.querySelector('button[title="'+title+'"]');return b&&Object.keys(b).some(k=>k.startsWith('__reactProps$'));},'Open '+destination);
 await page.locator('button[title="Open '+destination+'"]').click();
 return {writes,errors};
}
async function footerGeometry(footer){
 await footer.scrollIntoViewIfNeeded();const r=await footer.evaluate(n=>({bottom:n.getBoundingClientRect().bottom,viewport:innerHeight,font:parseFloat(getComputedStyle(n.querySelector('[role="status"] p')).fontSize),overflow:n.scrollWidth-n.clientWidth}));
 expect(r.bottom).toBeLessThanOrEqual(r.viewport);expect(r.font).toBeLessThanOrEqual(11);expect(r.overflow).toBeLessThan(2);
}
for(const width of [1280,1700]){
 test(`Model profiles, registered models and routing preserve columns and page the complete configuration at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:width===1280?800:1000});
  const h=await open(page,'MODEL',async(route,{path})=>{
   if(path==='/api/model-operations'){await route.fulfill({json:{mode:'live',status:'current',observedAt:new Date().toISOString(),requests:[],source:{authority:'platform-engineering'},readModel:fixture.readModel}});return true;}
   if(path==='/api/model-operations/runtime/registry'){await route.fulfill({json:fixture.registry});return true;}
   if(path==='/api/model-operations/runtime/requests'){await route.fulfill({json:{requests:[],next_cursor:null}});return true;}
   return false;
  });
  const w=page.getByRole('dialog',{name:'Model Operations Control',exact:true}),profiles=w.getByRole('navigation',{name:'Purpose profiles pages',exact:true});
  await expect(profiles.getByRole('status')).toHaveText('Showing 1–25 of 61 · Page 1');await expect(w.locator('tbody tr')).toHaveCount(25);
  await expect(w.getByRole('columnheader')).toHaveText(['Profile','Lifecycle','Access Readiness','Resolution','Action']);
  for(const expected of ['Showing 26–50 of 61 · Page 2','Showing 51–61 of 61 · Page 3']){await profiles.getByRole('button',{name:'Next page',exact:true}).click();await expect(profiles.getByRole('status')).toHaveText(expected);}
  await expect(w.locator('tbody tr')).toHaveCount(11);await expect(profiles.getByRole('button',{name:'Next page',exact:true})).toBeDisabled();
  await w.getByRole('searchbox',{name:'Search model profiles',exact:true}).fill('sample-profile-060');await expect(profiles.getByRole('status')).toHaveText('Showing 1–1 of 1 · Page 1');await expect(w.locator('tbody tr')).toHaveCount(1);await footerGeometry(profiles);await w.getByRole('searchbox',{name:'Search model profiles',exact:true}).clear();await expect(profiles.getByRole('status')).toHaveText('Showing 1–25 of 61 · Page 1');
  await w.getByRole('radio',{name:'Models & routing',exact:true}).click();
  const routes=w.getByRole('navigation',{name:'Workflow routing pages',exact:true});await expect(routes.getByRole('status')).toContainText('Showing 1–25');await routes.getByRole('button',{name:'Next page',exact:true}).click();await expect(routes.getByRole('status')).toContainText('Showing 26–50');
  await w.getByRole('searchbox',{name:'Search workflows',exact:true}).fill('batch-task-059');await expect(routes.getByRole('status')).toHaveText('Showing 1–1 of 1 · Page 1');await footerGeometry(routes);await w.getByRole('searchbox',{name:'Search workflows',exact:true}).clear();await expect(routes.getByRole('status')).toContainText('Showing 1–25');
  await w.getByRole('button',{name:'Manage registrations',exact:true}).click();const models=page.getByRole('dialog',{name:'Model registrations',exact:true}),pager=models.getByRole('navigation',{name:'Registered models pages',exact:true});
  await expect(pager.getByRole('status')).toContainText('Showing 1–25');await pager.getByRole('button',{name:'Next page',exact:true}).click();await expect(pager.getByRole('status')).toContainText('Showing 26–50');await footerGeometry(pager);
  await page.screenshot({path:test.info().outputPath('models-page-2.png')});
  await models.getByRole('searchbox',{name:'Search registered models',exact:true}).fill('batch-model-059');await expect(pager.getByRole('status')).toHaveText('Showing 1–1 of 1 · Page 1');
  await models.getByRole('searchbox',{name:'Search registered models',exact:true}).fill('nothing_matches');await expect(pager.getByRole('status')).toHaveText('No matches · Page 1');await expect(models.getByRole('button',{name:'Next page',exact:true})).toBeDisabled();await models.getByRole('searchbox',{name:'Search registered models',exact:true}).clear();await expect(pager.getByRole('status')).toContainText('Showing 1–25');
  expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
 });
 test(`Orchestration definitions retain the admitted catalog and shared empty/search footer at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:width===1280?800:1000});const wire=ownerWorkspace();wire.runs=[];
  // The live contract currently admits validation-readiness-run v1 only.
  // Paging is presentation consistency; this test does not invent new live workflows.
  const h=await open(page,'ORCHESTRATION',async(route,{path})=>{if(path==='/api/orchestration'){await route.fulfill({json:wire});return true;}return false;});
  const w=page.getByRole('dialog',{name:'Orchestration Workspace',exact:true});await w.locator('[data-orchestration-workspace-section="definitions"]').click();const pager=w.getByRole('navigation',{name:'Orchestration definitions pages',exact:true});
  await expect(pager.getByRole('status')).toHaveText('Showing 1–1 of 1 · Page 1');await expect(pager.getByRole('button',{name:'Next page',exact:true})).toBeDisabled();
  await w.getByRole('searchbox',{name:'Search orchestration definitions',exact:true}).fill('nothing_matches');await expect(pager.getByRole('status')).toHaveText('No matches · Page 1');
  await w.getByRole('searchbox',{name:'Search orchestration definitions',exact:true}).clear();await expect(pager.getByRole('status')).toHaveText('Showing 1–1 of 1 · Page 1');await expect(w.locator('tbody')).toContainText('Validation readiness run');await footerGeometry(pager);
  await page.screenshot({path:test.info().outputPath('definitions-search.png')});expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
 });
 test(`Repository requests page independently of the overview and retain search, status and retry at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:width===1280?800:1000});let unavailable=false;const queries=[];
  const requests=Array.from({length:61},(_,i)=>({proposalId:'idea-'+(1000+i),title:'Repository request '+i,recordRef:'openproject://work_packages/'+(1000+i),recordVersion:'version-'+i,sourceCurrent:true,gateState:i===60?'resolved':'pending',resolvedRepositoryRef:i===60?'repo:sample':null,resolution:null,recovery:null}));
  const h=await open(page,'REPOSITORY',async(route,{path,url})=>{
   if(path==='/api/proposals'){await route.fulfill({json:{mode:'live',status:'current',error:null,observedAt:new Date().toISOString(),records:[fixture.repo.gate]}});return true;}
   if(path==='/api/workspace-continuity'){await route.fulfill({json:fixture.repo.continuity});return true;}
   if(path==='/api/repositories/requests/register'){
    if(unavailable){await route.fulfill({status:503,json:{error:'Synthetic request source unavailable'}});return true;}
    const selection={query:url.searchParams.get('q')??'',status:url.searchParams.get('status')??'attention'},offset=Number(url.searchParams.get('cursor')??0);queries.push({selection,offset});
    const matched=requests.filter(r=>(selection.status==='all'||selection.status==='resolved'?selection.status==='all'||r.gateState==='resolved':r.gateState!=='resolved')&&(!selection.query||r.title.toLowerCase().includes(selection.query)));
    await route.fulfill({json:{mode:'live',status:'current',error:null,records:matched.slice(offset,offset+25),page:{selection,total:null,next_cursor:offset+25<matched.length?String(offset+25):null}}});return true;
   }return false;
  });
  const w=page.getByRole('dialog',{name:'Repository Control',exact:true});await w.getByRole('radio',{name:/^Requests/}).click();const pager=w.getByRole('navigation',{name:'Repository requests pages',exact:true});
  await expect(pager.getByRole('status')).toHaveText('Showing 1–25 · Page 1');await pager.getByRole('button',{name:'Next page',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 26–50 · Page 2');await w.getByRole('searchbox',{name:'Search repository requests',exact:true}).fill('request 59');await expect(pager.getByRole('status')).toHaveText('Showing 1–1 · Page 1');await w.getByRole('searchbox',{name:'Search repository requests',exact:true}).clear();await expect(pager.getByRole('status')).toHaveText('Showing 1–25 · Page 1');await w.locator('[data-repository-requests-surface] tbody tr').first().click();await pager.getByRole('button',{name:'Next page',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 26–50 · Page 2');await expect(w.getByRole('heading',{name:'Repository request 0',exact:true})).toBeVisible();await pager.getByRole('button',{name:'Previous',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 1–25 · Page 1');
  await w.getByRole('button',{name:'Filter request status',exact:true}).click();await page.getByRole('option',{name:'Resolved history',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 1–1 · Page 1');await expect(w.locator('[data-repository-requests-surface] tbody')).toContainText('Repository request 60');
  unavailable=true;await w.getByRole('button',{name:'Refresh requests',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Page unavailable');await expect(w.getByRole('alert')).toContainText('Synthetic request source unavailable');
  unavailable=false;await w.getByRole('button',{name:'Refresh requests',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 1–1 · Page 1');await footerGeometry(pager);
  expect(queries.some(q=>q.offset===25)).toBe(true);expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
 });
}

test('Model operation history replaces native pages, keeps the original selected request and recovers to first page',async({page})=>{
 const seed=structuredClone(fixture.operations[0]);
 seed.request.expected_configuration_revision=fixture.registry.configuration.revision-1;seed.applied_configuration=fixture.registry.configuration;seed.owner_receipt={command_id:seed.owner_command_id,command_digest:fixture.registry.configuration.digest,actor:'operator:synthetic',action:seed.request.action,previous_revision:seed.request.expected_configuration_revision,revision:fixture.registry.configuration.revision,configuration_digest:fixture.registry.configuration.digest,receipt_digest:fixture.registry.configuration.digest};
 const operations=Array.from({length:201},(_,i)=>JSON.parse(JSON.stringify(seed).replaceAll(seed.request_id,'model-operation:history-'+String(i).padStart(3,'0'))));
 let denied=false;const cursors=[],originals=[];
 const h=await open(page,'MODEL',async(route,{path,url})=>{
  if(path==='/api/model-operations'){await route.fulfill({json:{mode:'live',status:'current',observedAt:new Date().toISOString(),requests:[],source:{authority:'platform-engineering'},readModel:fixture.readModel}});return true;}
  if(path==='/api/model-operations/runtime/registry'){await route.fulfill({json:fixture.registry});return true;}
  if(path==='/api/model-operations/runtime/requests'){
   const offset=Number(url.searchParams.get('cursor')??0);cursors.push(offset);
   if(denied&&offset===200){await route.fulfill({status:503,json:{error:'Synthetic history read unavailable'}});return true;}
   await route.fulfill({json:{requests:operations.slice(offset,offset+100),next_cursor:offset+100<operations.length?String(offset+100):null}});return true;
  }
  if(path.startsWith('/api/model-operations/runtime/requests/')){const id=decodeURIComponent(path.split('/').at(-1));originals.push(id);await route.fulfill({json:operations.find(row=>row.request_id===id)});return true;}
  return false;
 });
 const w=page.getByRole('dialog',{name:'Model Operations Control',exact:true});await w.getByRole('radio',{name:'Models & routing',exact:true}).click();await w.getByRole('button',{name:'Operation history',exact:true}).click();
 const d=page.getByRole('dialog').last(),pager=d.getByRole('navigation',{name:'Model operation history pages',exact:true});
 await pager.getByRole('button',{name:'Model operation history rows per page',exact:true}).click();await page.getByRole('option',{name:'100',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 1–100 · Page 1');await pager.getByRole('button',{name:'Next page',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 101–200 · Page 2');
 await pager.getByRole('button',{name:'Next page',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 201–201 · Page 3');
 await d.getByRole('button',{name:'Request history',exact:true}).click();await page.getByRole('option').filter({hasText:'tory-200'}).click();await expect(d.getByRole('button',{name:'Check original request',exact:true})).toBeEnabled();
 await pager.getByRole('button',{name:'Previous',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 101–200 · Page 2');await d.getByRole('button',{name:'Check original request',exact:true}).click();await expect.poll(()=>originals.at(-1)).toBe('model-operation:history-200');await expect(pager.getByRole('status')).toHaveText('Showing 101–200 · Page 2');await expect(pager.getByRole('button',{name:'Next page',exact:true})).toBeEnabled();
 denied=true;await pager.getByRole('button',{name:'Next page',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Page unavailable');denied=false;await pager.getByRole('button',{name:'Refresh first page',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 1–100 · Page 1');
 expect(cursors).toContain(100);expect(cursors).toContain(200);expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});
