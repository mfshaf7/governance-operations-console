import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {proposalCompletionRecord,proposalCompletionRoute} from '../support/proposal-completion-fixture.mjs';
const base=process.env.CONSOLE_TEST_BASE_URL??'http://127.0.0.1:4317';
const fixture=JSON.parse(execFileSync(process.execPath,['--experimental-strip-types','--disable-warning=MODULE_TYPELESS_PACKAGE_JSON','--input-type=module','-e',"import {repositoryUiFixture} from './tests/support/repository-ui-fixture.mjs';process.stdout.write(JSON.stringify(await repositoryUiFixture()));"],{encoding:'utf8'}));
test.use({viewport:{width:1700,height:1000},actionTimeout:15000});test.setTimeout(90000);
function record(id,title,status='captured') {
 return {...proposalCompletionRecord({proposal_id:`idea-${id}`,record_ref:`openproject://work_packages/${id}`,title,status,triage_summary:status==='captured'?null:'Original review.',decision_notes:null,source:{ingress:'console',surface:'governance-operations-console',native_ref:{},context_ref:{}}}),summaryOnly:false,creationKnown:true};
}
function event(type,id,overrides={}) {return {schema_version:1,event_id:`proposal-event:idea-851:${id}`,proposal_id:'idea-851',record_version:'version-17',event_type:type,status_before:'accepted',status_after:'accepted',actor:{id:'operator:original-reviewer',kind:'operator'},command_id:`command:${id}`,receipt_refs:[`receipt:${id}`],summary:`Original ${type} summary.`,occurred_at:'2026-06-21T08:00:00Z',...overrides};}
async function open(page,options={}) {
 const records=[record(851,'Plan a useful tool'),record(852,'Explore another idea'),record(853,'Older backlog idea')],writes=[],reads=[],errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 let nextFailure=options.nextFailure??0,detailFailure=options.detailFailure??0,historyFailure=options.historyFailure??0,registerFailure=options.registerFailure??0;
 if(options.history){
  const r=records[0];r.projection.status='implemented';r.projection.route=proposalCompletionRoute();r.projection.decision_notes='LATEST NOTES MUST NOT REWRITE THE ORIGINAL';
  r.history.events=[event('disposition-recorded','original',{decision:{type:'disposition',outcome:'accepted',notes:'Original decision to preserve.',route:proposalCompletionRoute('prototype')}})];r.history.next_cursor='activity-page:2';
 }
 let releaseCommand;const commandGate=options.pendingCommand?new Promise(resolve=>{releaseCommand=resolve;}):Promise.resolve();
 await page.route('**/api/**',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;
  if(request.method()==='POST'){
   const body=request.postDataJSON();writes.push({path,body});
   if(path.endsWith('/commands')){await commandGate;
    if(options.commandSuccess){
      const row=records.find(record=>record.projection.proposal_id===body.proposalId);
      row.projection={...row.projection,status:'triaged',record_version:'version-18',triage_summary:body.payload.summary};
      const recorded=event('triaged','new-review',{proposal_id:body.proposalId,record_version:'version-18',status_before:'captured',status_after:'triaged',summary:body.payload.summary,command_id:body.commandId});
      row.history={...row.history,record_version:'version-18',events:[recorded]};
      return route.fulfill({status:201,json:{schema_version:1,command_id:body.commandId,replayed:false,projection:row.projection,history:row.history,event:recorded,receipt:{owner:'operator-orchestration-service',receipt_ref:'receipt:new-review',record_ref:row.projection.record_ref,record_version:'version-18',recorded_at:recorded.occurred_at}}});
    }
    return route.fulfill({status:503,json:{mode:'live',status:'offline',code:'source_unavailable',error:'The workflow could not confirm this request. Your draft is retained.'}});}
   if(path==='/api/proposals/capture-result')return route.fulfill({json:options.captureResult==='found'?{status:'found',proposalId:'idea-853'}:{status:'not-found',proposalId:null}});
   if(path==='/api/proposals')return route.fulfill({status:502,json:{mode:'live',status:'offline',code:'proposal_capture_unknown',error:'The response was interrupted.'}});
   return route.fulfill({status:503,json:{mode:'live',status:'offline',code:'synthetic_source_unavailable',error:'Synthetic write not configured.'}});
  }
  reads.push({path,query:Object.fromEntries(url.searchParams)});
  if(path==='/api/console/capabilities')return route.fulfill({json:fixture.capabilities});
  if(path==='/api/workspace-continuity')return route.fulfill({json:fixture.continuity});
  if(path==='/api/proposals'){
   if(registerFailure)return route.fulfill({status:registerFailure,json:{mode:'live',status:'offline',code:'synthetic_source_unavailable',error:'The proposal backlog is unavailable.'}});
   const query=(url.searchParams.get('query')??'').trim().toLowerCase(),cursor=url.searchParams.get('cursor'),second=cursor==='page:2';
   if(second&&nextFailure)return route.fulfill({status:nextFailure,json:{mode:'live',status:'offline',code:'synthetic_source_unavailable',error:'The next page is unavailable.'}});
   const found=query==='older'?(second?[records[2]]:[]):second?[records[2]]:records.slice(0,2);
   return route.fulfill({json:{mode:'live',status:'current',observedAt:new Date().toISOString(),records:found.map(r=>({...r,summaryOnly:true,history:{...r.history,events:[],next_cursor:null}})),page:{source_total:3,selector:{query,status:url.searchParams.get('status')??'all',ingress:url.searchParams.get('ingress')??'all'},next_cursor:second?null:'page:2'}}});
  }
  if(path==='/api/proposals/idea-851/history'){
   if(historyFailure)return route.fulfill({status:historyFailure,json:{mode:'live',status:'offline',code:'synthetic_source_unavailable',error:'History is temporarily unavailable.'}});
   return route.fulfill({json:{...records[0].history,events:[event('implementation-reconciled','implementation',{status_after:'implemented',occurred_at:'2026-06-22T08:00:00Z'})],next_cursor:null}});
  }
  const match=/^\/api\/proposals\/(idea-[0-9]+)$/.exec(path);
  if(match){if(detailFailure)return route.fulfill({status:detailFailure,json:{mode:'live',status:'offline',code:'synthetic_source_unavailable',error:'The selected proposal could not be loaded.'}});const found=records.find(r=>r.projection.proposal_id===match[1]);return found?route.fulfill({json:found}):route.fulfill({status:404,json:{mode:'live',status:'offline',code:'synthetic_source_unavailable',error:'No such proposal.'}});}
  return route.abort();
 });
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>{const n=document.querySelector('button[title="Open PROPOSAL"]'),k=n&&Object.keys(n).find(k=>k.startsWith('__reactProps$'));return Boolean(k&&n[k].onClick);});
 await page.locator('button[title="Open PROPOSAL"]').click();
 await expect(page.locator('[data-proposal-control-surface="true"]')).toBeVisible();
 return {records,writes,reads,errors,releaseCommand,recoverPage:()=>{nextFailure=0;},recoverDetails:()=>{detailFailure=0;},recoverHistory:()=>{historyFailure=0;},recoverRegister:()=>{registerFailure=0;}};
}
async function hub(page,title='Plan a useful tool'){
 await page.getByRole('row').filter({hasText:title}).click();
 await page.locator('[data-proposal-open-hub-action="true"]').click();
 await expect(page.getByRole('dialog',{name:'Proposal Hub',exact:true})).toBeVisible();
}
async function workflow(page,title){await hub(page,title);await page.locator('[data-proposal-hub-primary-action="true"]').click();const dialog=page.getByRole('dialog',{name:'Proposal Triage',exact:true});await expect(dialog).toBeVisible();return dialog;}

test('register replaces pages, selected records load independently, and sparse search reaches older records',async({page})=>{
 const h=await open(page);
 await expect(page.getByRole('row').filter({hasText:'Plan a useful tool'})).toBeVisible();
 await page.getByRole('button',{name:'Next page',exact:true}).click();
 await expect(page.getByRole('row').filter({hasText:'Older backlog idea'})).toBeVisible();
 await expect(page.getByRole('row').filter({hasText:'Plan a useful tool'})).toHaveCount(0);
 await page.getByRole('button',{name:'Previous',exact:true}).click();
 await expect(page.getByRole('row').filter({hasText:'Plan a useful tool'})).toBeVisible();
 await page.getByRole('searchbox',{name:'Search proposals',exact:true}).fill('older');
 await expect(page.getByRole('button',{name:'Continue search',exact:true})).toBeEnabled();
 await expect(page.getByRole('row').filter({hasText:'Older backlog idea'})).toHaveCount(0);
 await page.getByRole('button',{name:'Continue search',exact:true}).click();
 await expect(page.getByRole('row').filter({hasText:'Older backlog idea'})).toBeVisible();
 expect(h.reads.filter(r=>r.path.includes('/history'))).toHaveLength(0);
 expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

for(const status of [503,403])test(`page failure ${status} preserves readable recovery or clears denied data`,async({page})=>{
 const h=await open(page,{nextFailure:status});await expect(page.getByRole('row').filter({hasText:'Plan a useful tool'})).toBeVisible();
 await page.getByRole('button',{name:'Next page',exact:true}).click();
 await expect(page.getByText('The next page is unavailable.',{exact:true})).toBeVisible();
 if(status===403)await expect(page.getByRole('row').filter({hasText:'Plan a useful tool'})).toHaveCount(0);
 else await expect(page.getByRole('row').filter({hasText:'Plan a useful tool'})).toBeVisible();
 h.recoverPage();await page.getByRole('button',{name:'Refresh first page',exact:true}).click();await expect(page.getByRole('row').filter({hasText:'Plan a useful tool'})).toBeVisible();
 expect(h.errors).toEqual([]);
});

test('source error offers retry without substituting preview records',async({page})=>{
 const h=await open(page,{registerFailure:503});await expect(page.getByText('The proposal backlog is unavailable.',{exact:true})).toBeVisible();
 await expect(page.getByRole('row').filter({hasText:'Plan a useful tool'})).toHaveCount(0);
 h.recoverRegister();await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.getByRole('row').filter({hasText:'Plan a useful tool'})).toBeVisible();
 expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

test('history keeps original decision, loads later events and supports retry',async({page})=>{
 const h=await open(page,{history:true,historyFailure:503});await hub(page);await page.locator('[data-proposal-hub-primary-action="true"]').click();
 const dialog=page.getByRole('dialog',{name:'Proposal History',exact:true});await expect(dialog).toBeVisible();
 await expect(dialog).toContainText('Original decision to preserve.');await expect(dialog).not.toContainText('LATEST NOTES MUST NOT REWRITE THE ORIGINAL');
 await dialog.getByRole('button',{name:'Load more history',exact:true}).click();await expect(dialog).toContainText('History is temporarily unavailable.');
 h.recoverHistory();await dialog.getByRole('button',{name:'Retry history',exact:true}).click();await expect(dialog).toContainText('Implementation confirmed');
 await expect(dialog.getByRole('button',{name:'Load more history',exact:true})).toHaveCount(0);await expect(dialog).toContainText('operator:original-reviewer');
 await dialog.getByText('Event references',{exact:true}).click();await expect(dialog).toContainText('receipt:implementation');expect(h.errors).toEqual([]);
 await page.screenshot({path:process.env.CONSOLE_TEST_SCREENSHOT_DIR+'/proposal-history.png'});
});

test('held command prevents duplicate submission, retains draft on failure and explains the result',async({page})=>{
 const h=await open(page,{pendingCommand:true}),dialog=await workflow(page);
 await dialog.getByRole('textbox',{name:'Summary',exact:true}).fill('Original operator review.');
 await dialog.locator('[data-proposal-triage-primary-action="true"]').click();
 const pending=page.getByRole('dialog',{name:'Updating proposal',exact:true});await expect(pending).toBeVisible();
 await page.keyboard.press('Escape');await expect(pending).toBeVisible();expect(h.writes.filter(r=>r.path.endsWith('/commands'))).toHaveLength(1);
 h.releaseCommand();const failure=page.getByRole('dialog',{name:'Submission not confirmed',exact:true});await expect(failure).toContainText('Your draft is retained.');
 await failure.getByRole('button',{name:'Continue',exact:true}).click();await expect(dialog.getByRole('textbox',{name:'Summary',exact:true})).toHaveValue('Original operator review.');
 expect(h.errors).toEqual([]);
});

test('successful review refreshes the actual selected record and shows the next action',async({page})=>{
 const h=await open(page,{commandSuccess:true}),dialog=await workflow(page,'Explore another idea');
 await dialog.getByRole('textbox',{name:'Summary',exact:true}).fill('Reviewed the second idea.');
 await dialog.locator('[data-proposal-triage-primary-action="true"]').click();
 const result=page.getByRole('dialog',{name:'Update recorded',exact:true});await expect(result).toContainText('Choose the proposal outcome and direction next.');
 await result.getByRole('button',{name:'Continue',exact:true}).click();
 const updatedHub=page.getByRole('dialog',{name:'Proposal Hub',exact:true});await expect(updatedHub).toContainText('Disposition Next');
 await updatedHub.getByRole('button',{name:/Triage.*Done/}).click();
 await expect(dialog.getByRole('textbox',{name:'Summary',exact:true})).toHaveValue('Reviewed the second idea.');
 await expect(dialog.locator('[data-proposal-triage-primary-action="true"]')).toBeDisabled();
 expect(h.writes.filter(row=>row.path.endsWith('/commands'))).toHaveLength(1);expect(h.writes[0].body.proposalId).toBe('idea-852');expect(h.errors).toEqual([]);
});

test('selected detail failure blocks workflow until an exact-source retry succeeds',async({page})=>{
 const h=await open(page,{detailFailure:503});await hub(page);
 const dialog=page.getByRole('dialog',{name:'Proposal Hub',exact:true});await expect(dialog).toContainText('The selected proposal could not be loaded.');
 await expect(dialog.locator('[data-proposal-hub-primary-action="true"]')).toHaveCount(0);
 h.recoverDetails();await dialog.getByRole('button',{name:'Retry details',exact:true}).click();
 await expect(dialog.locator('[data-proposal-hub-primary-action="true"]')).toBeVisible();expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

test('oversize triage text is preserved, explained and cannot submit from either action',async({page})=>{
 const h=await open(page),dialog=await workflow(page),field=dialog.getByRole('textbox',{name:'Summary',exact:true});
 await field.fill('a'.repeat(2001));await expect(field).toHaveValue('a'.repeat(2001));await expect(dialog).toContainText('shorten before submitting');
 const actions=dialog.getByRole('button',{name:'Complete Required Fields',exact:true});await expect(actions).toHaveCount(2);for(const action of await actions.all())await expect(action).toBeDisabled();
 await field.fill('a'.repeat(2000));await expect(dialog.locator('[data-proposal-triage-primary-action="true"]')).toBeEnabled();expect(h.writes).toEqual([]);
});

for(const outcome of ['found','not-found'])test(`capture interruption ${outcome} reuses the original capture identity`,async({page})=>{
 const h=await open(page,{captureResult:outcome});await page.getByRole('button',{name:'Capture Proposal',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Capture Proposal',exact:true});await dialog.getByRole('textbox',{name:'Proposal title',exact:true}).fill('An original idea');await dialog.getByRole('textbox',{name:'Proposal context',exact:true}).fill('The original context to preserve.');
 await dialog.getByRole('button',{name:'Create proposal',exact:true}).click();
 if(outcome==='found'){await expect(dialog).toHaveCount(0);expect(h.writes.filter(r=>r.path==='/api/proposals')).toHaveLength(1);}
 else{
  await expect(dialog.getByRole('button',{name:'Check capture result',exact:true})).toBeVisible();await expect(dialog.getByRole('textbox',{name:'Proposal title',exact:true})).toBeDisabled();
  await dialog.getByRole('button',{name:'Check capture result',exact:true}).click();await expect(dialog.getByRole('button',{name:'Retry original capture',exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'Retry original capture',exact:true}).click();await expect.poll(()=>h.writes.filter(r=>r.path==='/api/proposals').length).toBe(2);
  const originals=h.writes.filter(r=>r.path==='/api/proposals');expect(originals[0].body).toEqual(originals[1].body);
 }
 expect(h.errors).toEqual([]);
});

for(const width of [1280,1700])test(`Proposal form stays within the baseline at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});const h=await open(page),dialog=await workflow(page);
 const box=await dialog.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1);
 for(const field of await dialog.getByRole('textbox').all()){const f=await field.boundingBox();expect(f.x).toBeGreaterThanOrEqual(box.x);expect(f.x+f.width).toBeLessThanOrEqual(box.x+box.width+1);}
 await page.screenshot({path:process.env.CONSOLE_TEST_SCREENSHOT_DIR+`/proposal-triage-${width}.png`});expect(h.errors).toEqual([]);
});
