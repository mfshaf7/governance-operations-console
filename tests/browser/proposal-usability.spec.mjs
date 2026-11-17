import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {proposalCompletionRecord,proposalCompletionRoute} from '../support/proposal-completion-fixture.mjs';
const base=process.env.CONSOLE_TEST_BASE_URL??'http://127.0.0.1:4317';
const fixture=JSON.parse(execFileSync(process.execPath,['--experimental-strip-types','--disable-warning=MODULE_TYPELESS_PACKAGE_JSON','--input-type=module','-e',"import {repositoryUiFixture} from './tests/support/repository-ui-fixture.mjs';process.stdout.write(JSON.stringify(await repositoryUiFixture()));"],{encoding:'utf8'}));
test.use({viewport:{width:1700,height:1000},actionTimeout:15000});test.setTimeout(90000);
function record(id,title,status='captured') {
 return {...proposalCompletionRecord({proposal_id:`idea-${id}`,record_ref:`openproject://work_packages/${id}`,title,status,triage_summary:status==='captured'?null:'Original review.',decision_notes:null,source:{ingress:'console',surface:'governance-operations-console',native_ref:{},context_ref:{}}}),summaryOnly:false,creationKnown:true};
}
function event(type,id,overrides={}) {return {schema_version:1,event_id:`proposal-event:idea-851:${id}`,proposal_id:'idea-851',record_version:'version-17',event_type:type,status_before:'accepted',status_after:'accepted',actor:{id:'operator:original-reviewer',kind:'operator'},command_id:`command:${id}`,receipt_refs:[`receipt:${id}`],summary:`Original ${type} summary.`,occurred_at:'2026-06-21T08:00:00Z',...overrides};}
async function open(page,options={}) {
 const records=[record(851,'Plan a useful tool'),record(852,'Explore another idea'),...Array.from({length:23},(_,index)=>record(900+index,`Additional current idea ${index+1}`)),record(853,'Older backlog idea')],writes=[],reads=[],errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 let nextFailure=options.nextFailure??0,detailFailure=options.detailFailure??0,historyFailure=options.historyFailure??0,registerFailure=options.registerFailure??0;
 if(options.triaged){records[0].projection.status='triaged';records[0].projection.triage_summary='Recorded constraint: keep data local; no cloud synchronization.';}
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
   const found=query==='older'?(second?[records.at(-1)]:[]):second?[records.at(-1)]:records.slice(0,-1);
   return route.fulfill({json:{mode:'live',status:'current',observedAt:new Date().toISOString(),records:found.map(r=>({...r,summaryOnly:true,history:{...r.history,events:[],next_cursor:null}})),page:{source_total:records.length,selector:{query,status:url.searchParams.get('status')??'all',ingress:url.searchParams.get('ingress')??'all'},next_cursor:second?null:'page:2'}}});
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

test('advisor request includes real proposal observations and keeps missing evidence explicit without submitting work',async({page})=>{
 const h=await open(page);let sent;
 await page.route('**/api/advisor-interaction',route=>{sent=route.request().postDataJSON();return route.fulfill({json:{intent:'answer',message:'Synthetic explanation only.',edits:[],evidence:{profileId:'agent-console-assistant-v1',auditRef:'audit:synthetic',contextRef:'context:synthetic'}}});});
 const dialog=await workflow(page,'Plan a useful tool');
 await dialog.getByRole('textbox',{name:'Summary',exact:true}).fill('Retained manual summary');
 await dialog.getByRole('textbox',{name:'Proposal triage advisor prompt',exact:true}).fill('What is still unknown about this proposal?');
 await dialog.getByRole('button',{name:'run',exact:true}).click();
 await expect.poll(()=>sent?.scope?.role).toBe('proposal-triage');
 const context=JSON.parse(sent.scope.context);
 expect(context.observations.title).toBe('Plan a useful tool');
 expect(context.observations.projectionState).toBe('current');
 expect(context.observations.handoffRule).toBeTruthy();
 expect(context.coverage.referencesAreLoadedContents).toBe(false);
 expect(context.coverage.unavailable).toContain('Repository contents');
 await expect(dialog.getByRole('textbox',{name:'Summary',exact:true})).toHaveValue('Retained manual summary');
 expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

test('Disposition advisor receives recorded triage knowledge without submitting a decision',async({page})=>{
 const h=await open(page,{triaged:true});let sent;
 await page.route('**/api/advisor-interaction',route=>{sent=route.request().postDataJSON();return route.fulfill({json:{intent:'answer',message:'Synthetic context inspection only.',edits:[],evidence:{profileId:'agent-console-assistant-v1',auditRef:'audit:synthetic',contextRef:'context:synthetic'}}});});
 await hub(page);await page.locator('[data-proposal-hub-primary-action="true"]').click();
 const dialog=page.getByRole('dialog',{name:'Proposal Disposition',exact:true});await expect(dialog).toBeVisible();
 const expand=dialog.getByTitle('Expand advisor');if(await expand.count())await expand.click();
 await dialog.getByRole('textbox',{name:'Proposal disposition advisor prompt',exact:true}).fill('Which recorded constraints should inform this decision?');
 await dialog.getByRole('button',{name:'run',exact:true}).click();
 await expect.poll(()=>sent?.scope?.role).toBe('proposal-disposition');
 const context=JSON.parse(sent.scope.context),source=h.records[0].projection;
 expect(context.observations.recordedTriage).toEqual({summary:source.triage_summary,sourceRef:source.record_ref,sourceRevision:source.record_version});
 expect(sent.scope.fields.map(field=>field.key)).not.toContain('triageSummary');
 expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

test('advisor conversation restores from private owner input and carries follow-ups without automatic inference or project crossover',async({page})=>{
 const h=await open(page),records=new Map(),sent=[],preserved=[]; let historyUnavailable=false;
 await page.route('**/api/saved-work/advisor-conversation/**',async route=>{
  const id=decodeURIComponent(new URL(route.request().url()).pathname.split('/').at(-1));
  if(historyUnavailable)return route.fulfill({status:503,json:{error:'Saved conversation temporarily unavailable.'}});
  if(route.request().method()==='POST'){
   const input=route.request().postDataJSON(),before=records.get(id);
   if(new URL(route.request().url()).searchParams.get('action')==='preserve')preserved.push(input);
   else{
    if((before?.revision??0)!==input.expected_revision)return route.fulfill({status:409,json:{error:'Another session saved this conversation.'}});
    records.set(id,{revision:input.expected_revision+1,payload_json:input.payload_json,content_digest:'sha256:'+createHash('sha256').update(input.payload_json).digest('hex'),acknowledgement_id:'working:'+input.command_id,saved_at:new Date().toISOString()});
   }
  }
  return route.fulfill({json:{mode:'live',operatorId:'operator:fixture',snapshot:{kind:'advisor-conversation',subject_id:id,record:records.get(id)??null,recoveries:[]}}});
 });
 const answer='Synthetic working discussion: keep data local. This is not an approval.';
 await page.route('**/api/advisor-interaction',route=>{sent.push(route.request().postDataJSON());return route.fulfill({json:{intent:'answer',message:answer,edits:[],evidence:{profileId:'agent-console-assistant-v1',auditRef:'audit:synthetic',contextRef:'context:synthetic'}}});});
 let dialog=await workflow(page,'Plan a useful tool');
 await dialog.getByRole('textbox',{name:'Proposal triage advisor prompt',exact:true}).fill('Let us discuss keeping project data local.');
 await dialog.getByRole('button',{name:'run',exact:true}).click();
 await expect.poll(()=>[...records.values()].some(row=>{const value=JSON.parse(row.payload_json);return value.turns.length===2&&value.pending===null;})).toBe(true);
 await dialog.getByRole('textbox',{name:'Proposal triage advisor prompt',exact:true}).fill('Unsent follow-up retained privately.');
 await expect.poll(()=>[...records.values()].some(row=>JSON.parse(row.payload_json).draftPrompt==='Unsent follow-up retained privately.')).toBe(true);
 async function reopen(name){
  await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>{const node=document.querySelector('button[title="Open PROPOSAL"]');return node&&Object.keys(node).some(key=>key.startsWith('__reactProps$'));});
  await page.locator('button[title="Open PROPOSAL"]').click();return workflow(page,name);
 }
 dialog=await reopen('Plan a useful tool');
 await expect(dialog.getByText(answer,{exact:true})).toBeVisible();expect(sent).toHaveLength(1);
 await expect(dialog.getByRole('textbox',{name:'Proposal triage advisor prompt',exact:true})).toHaveValue('Unsent follow-up retained privately.');
 historyUnavailable=true; dialog=await reopen('Plan a useful tool');
 await expect(dialog.getByRole('button',{name:'Retry conversation save',exact:true})).toBeVisible();
 await dialog.getByRole('textbox',{name:'Proposal triage advisor prompt',exact:true}).fill('What did we discuss about data storage?');
 await expect(dialog.getByRole('button',{name:'run',exact:true})).toBeDisabled();expect(sent).toHaveLength(1);
 historyUnavailable=false;await dialog.getByRole('button',{name:'Retry conversation save',exact:true}).click();
 await expect(dialog.getByText(answer,{exact:true})).toBeVisible();expect(sent).toHaveLength(1);
 await expect(dialog.getByRole('textbox',{name:'Proposal triage advisor prompt',exact:true})).toHaveValue('What did we discuss about data storage?');
 await dialog.getByRole('textbox',{name:'Proposal triage advisor prompt',exact:true}).fill('What did we discuss about data storage?');
 await dialog.getByRole('button',{name:'run',exact:true}).click();
 await expect.poll(()=>sent.length).toBe(2);
 expect(sent[1].conversation).toEqual([{role:'operator',text:'Let us discuss keeping project data local.'},{role:'advisor',text:answer}]);
 await expect.poll(()=>[...records.values()].some(row=>JSON.parse(row.payload_json).turns.length===4)).toBe(true);
 const priorRecords=JSON.stringify([...records]);historyUnavailable=true;
 dialog=await reopen('Plan a useful tool');
 await dialog.getByRole('button',{name:'Use current context only',exact:true}).click();
 await dialog.getByRole('textbox',{name:'Proposal triage advisor prompt',exact:true}).fill('Temporary discussion without saved history.');
 await dialog.getByRole('button',{name:'run',exact:true}).click();await expect.poll(()=>sent.length).toBe(3);
 expect(sent[2].conversation).toEqual([]);
 await expect(dialog.getByText(answer,{exact:true})).toBeVisible();expect(JSON.stringify([...records])).toBe(priorRecords);
 historyUnavailable=false;await dialog.getByRole('button',{name:'Use server conversation',exact:true}).click();
 await expect.poll(()=>preserved.length).toBeGreaterThan(0);
 expect(JSON.parse(preserved[0].raw_value).turns[0].text).toBe('Temporary discussion without saved history.');
 await expect(dialog.getByText('Let us discuss keeping project data local.',{exact:true})).toBeVisible();
 expect(JSON.stringify([...records])).toBe(priorRecords);expect(sent).toHaveLength(3);
 dialog=await reopen('Explore another idea');
 await dialog.getByRole('textbox',{name:'Proposal triage advisor prompt',exact:true}).fill('Summarize this separate idea.');
 await dialog.getByRole('button',{name:'run',exact:true}).click();
 await expect.poll(()=>sent.length).toBe(4);expect(sent[3].conversation).toEqual([]);
 expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

test('primary agent includes a visited project only after explicit choice, with readback and separate project conversations',async({page})=>{
 const h=await open(page),sent=[];
 await page.route('**/api/saved-work/advisor-conversation/**',route=>route.fulfill({json:{mode:'disconnected-preview'}}));
 await page.route('**/api/agent-interaction*',route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{checkedAt:new Date().toISOString(),endpoint:null,freshness:'live',model:'agent-console-assistant-v1',modelCount:1,observedAt:new Date().toISOString(),provider:'governed-ai-gateway',safetyMode:'oos-session/cgg-model-safe/governed-ai/manual-operator-request',status:'online'}});
  if(route.request().method()==='DELETE')return route.fulfill({json:{closed:true}});
  const input=route.request().postDataJSON();sent.push(input);
  return route.fulfill({body:'Synthetic read-only explanation.',headers:{'Content-Type':'text/plain','X-Agent-Context-Admitted':'true','X-Agent-CGG-Receipt':'cgg:synthetic','X-Agent-Context-Artifact':'sha256:'+'a'.repeat(64),'X-Agent-Invocation':'invocation:synthetic','X-Agent-Receipt':'receipt:synthetic','X-Agent-Receipt-Digest':'sha256:'+'b'.repeat(64),'X-Agent-Session':'session:synthetic',
    'X-Agent-Project-Context':encodeURIComponent(JSON.stringify({selection:input.selectedProject,title:'Current recorded item',revision:'version-17',coverage:'Current recorded facts; linked files not loaded.'}))}});
 });
 await page.getByRole('row').filter({hasText:'Plan a useful tool'}).click();
 await page.keyboard.press('Escape');
 const agent=page.locator('[data-agent-console-dock][aria-label="Agent Console"]');
 const select=agent.getByRole('combobox',{name:'Item context',exact:true});
 await expect(select).toBeVisible();await expect(select).toHaveValue('');expect(sent).toHaveLength(0);
 await select.selectOption('proposal:idea-851');
 const prompt=agent.getByRole('textbox',{name:'Agent terminal command input',exact:true});
 await expect(agent.locator('.model-dock-context-title')).toContainText('Plan a useful tool');
 await prompt.fill('Explain this selected project.');await agent.getByRole('button',{name:'Run agent command',exact:true}).click();
 await expect.poll(()=>sent.length).toBe(1);expect(sent[0].selectedProject).toEqual({kind:'proposal',id:'idea-851'});
 expect(sent[0]).not.toHaveProperty('body');expect(sent[0].conversation).toEqual([]);
 await expect(agent.locator('.terminal-transcript')).toContainText('Current recorded item · version-17');
 await expect(agent.locator('.terminal-transcript')).toContainText('Synthetic read-only explanation.');
 await page.screenshot({path:test.info().outputPath('selected-project-context.png')});
 await page.locator('button[title="Open PROPOSAL"]').click();
 await page.getByRole('row').filter({hasText:'Explore another idea'}).click();await page.keyboard.press('Escape');
 await select.selectOption('proposal:idea-852');await prompt.fill('Explain the other project.');await agent.getByRole('button',{name:'Run agent command',exact:true}).click();
 await expect.poll(()=>sent.length).toBe(2);expect(sent[1].selectedProject).toEqual({kind:'proposal',id:'idea-852'});expect(sent[1].conversation).toEqual([]);
 expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

test('register replaces pages, selected records load independently, and sparse search reaches older records',async({page})=>{
 const h=await open(page);
 await expect(page.getByRole('row').filter({hasText:'Plan a useful tool'})).toBeVisible();
 await expect(page.getByRole('row').filter({hasText:'Plan a useful tool'}).getByRole('cell').first()).toHaveText('01');
 const pagination=page.getByRole('navigation',{name:'Proposal pages',exact:true});
 await expect(pagination).toContainText('Showing 1–25 · Page 1');
 const footer=await pagination.boundingBox(),body=await page.locator('[data-proposal-register="standard"]').boundingBox();
 expect(footer.y).toBeGreaterThanOrEqual(body.y+body.height);
 for(const name of ['Previous','Next page'])expect((await pagination.getByRole('button',{name,exact:true}).boundingBox()).height).toBeGreaterThanOrEqual(30);
 await page.getByRole('button',{name:'Next page',exact:true}).click();
 await expect(page.getByRole('row').filter({hasText:'Older backlog idea'})).toBeVisible();
 await expect(page.getByRole('row').filter({hasText:'Older backlog idea'}).getByRole('cell').first()).toHaveText('26');
 await expect(pagination).toContainText('Showing 26–26 · Page 2');
 await expect(page.getByRole('row').filter({hasText:'Plan a useful tool'})).toHaveCount(0);
 await page.getByRole('button',{name:'Previous',exact:true}).click();
 await expect(page.getByRole('row').filter({hasText:'Plan a useful tool'})).toBeVisible();
 await expect(page.getByRole('row').filter({hasText:'Plan a useful tool'}).getByRole('cell').first()).toHaveText('01');
 await page.getByRole('searchbox',{name:'Search proposals',exact:true}).fill('older');
 await expect(page.getByRole('button',{name:'Continue search',exact:true})).toBeEnabled();
 await expect(page.getByRole('row').filter({hasText:'Older backlog idea'})).toHaveCount(0);
 await page.getByRole('button',{name:'Continue search',exact:true}).click();
 await expect(page.getByRole('row').filter({hasText:'Older backlog idea'})).toBeVisible();
 await expect(page.getByRole('row').filter({hasText:'Older backlog idea'}).getByRole('cell').first()).toHaveText('01');
 await expect(pagination).toContainText('Showing 1–1 · Page 2');
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
 await page.screenshot({path:test.info().outputPath('proposal-history.png')});
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
 await page.screenshot({path:test.info().outputPath(`proposal-triage-${width}.png`)});expect(h.errors).toEqual([]);
});
