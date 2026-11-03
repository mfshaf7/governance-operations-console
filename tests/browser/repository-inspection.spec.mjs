import {test,expect} from "@playwright/test";
import {providerLookupFor,lifecycleAuditFor} from "../support/repository-history-fixture.mjs";
import {execFileSync} from "node:child_process";
const fixtures=JSON.parse(execFileSync(process.execPath,["--experimental-strip-types","--disable-warning=MODULE_TYPELESS_PACKAGE_JSON","--input-type=module","-e",
 "import {repositoryUiFixture} from './tests/support/repository-ui-fixture.mjs'; process.stdout.write(JSON.stringify({own:await repositoryUiFixture(),other:await repositoryUiFixture({proposalId:'idea-852'}),standalone:await repositoryUiFixture({proposalId:null})}));"],{encoding:"utf8"}));
const fixture=fixtures.own;
if(fixture.capabilities.mode!=="live")throw new Error("Repository UI fixture must provide complete synthetic runtime configuration.");
const base=process.env.CONSOLE_TEST_BASE_URL??"http://127.0.0.1:4317";
test.use({viewport:{width:1700,height:1000},actionTimeout:15000});test.setTimeout(90000);

async function setup(page,{empty=false,lifecycle="unavailable",posture="active",requests="pending",custodyOrigin="own",intakeAvailable=true,inventoryAvailable=true,runtimeMode="live",intakeOwners=false}={}){
 const f=structuredClone(fixtures[custodyOrigin]),writes=[];
 const existingOwner=structuredClone(f.continuity.inventory[0]);
 if(posture==="unregistered")f.continuity.inventory=[];
 else {f.continuity.inventory[0].posture=posture;f.continuity.inventory[0].retired_collection=posture==="retired";}
 if(intakeOwners)for(const name of ['example-checks','example-security'])f.continuity.inventory.push({...structuredClone(existingOwner),name,record_id:`repo:${name}`,lineage:{...existingOwner.lineage,source_ref:`repo:${name}`}});
 f.capabilities.mode=runtimeMode;
 if(!intakeAvailable)f.capabilities.capabilities.find(item=>item.id==="workspace-intake").mutation.state="unavailable";
 await page.route("**/api/**",r=>["GET","HEAD","OPTIONS"].includes(r.request().method())?r.continue():(writes.push(r.request().url()),r.abort()));
 await page.route("**/api/console/capabilities",r=>r.fulfill({json:f.capabilities}));
 await page.route("**/api/workspace-continuity",r=>inventoryAvailable?r.fulfill({json:f.continuity}):r.fulfill({status:503,json:{error:"Synthetic inventory unavailable"}}));
 await page.route("**/api/workspace-intake/requests?*",r=>r.fulfill({json:{schema_version:1,workflow_id:"workspace-intake",
  target:{kind:"repo",name:"synthetic-source",record_id:"repo:synthetic-source"},custody_request_id:f.result.request.request_id,
  revision:0,pending_request_count:0,updated_at:null,records:[],next_cursor:null}}));
 await page.route("**/api/repositories/custody/provider-repository?*",r=>r.fulfill({json:providerLookupFor(f.result)}));
 await page.route("**/api/repositories/custody/requests*",r=>r.fulfill({json:{schema_version:1,mode:"live",status:"current",error:null,records:empty?[]:[f.result],next_cursor:null}}));
 const resolution={resolution_id:"resolution:test",custody_request_id:f.result.request.request_id,receipt_ref:"receipt://test",proposal_id:f.gate.projection.proposal_id,
  source_version:"version-16",repository_request_ref:`repo-request://proposal/${f.gate.projection.proposal_id}`,
  resolved_owner:"repo:synthetic-source",resolved_repo_ref:f.result.provider_readback.canonical_url,recorded_at:"2026-06-21T09:00:00Z",notes:"Original confirmation notes",custody_receipt_ref:f.result.receipt_ref};
 if(["resolved","recovery","implemented"].includes(requests)){
  Object.assign(f.gate.projection,{repository_resolution:resolution,repository_resolution_history_pending:requests==="recovery"});
  Object.assign(f.gate.projection.route.source_custody,{repository_gate_state:"resolved",owner:resolution.resolved_owner,source_ref:resolution.resolved_repo_ref});
  if(requests==="implemented")f.gate.projection.status="implemented";
 }
 if(requests==="stale")f.gate.projection.projection_state="stale";
 if(requests==="triaged")Object.assign(f.gate.projection,{status:"triaged",route:null,decision_notes:null});
 await page.route("**/api/proposals",r=>requests==="offline"?r.fulfill({status:503,json:{error:"Synthetic owner unavailable"}}):
  r.fulfill({json:{mode:"live",status:"current",error:null,observedAt:new Date().toISOString(),records:requests==="none"?[]:[f.gate]}}));
 await page.route("**/api/repositories/lifecycle/repositories/**",r=>lifecycle==="unavailable"
  ?r.fulfill({status:503,json:{mode:"live",status:"offline",retryable:false,code:"repository_lifecycle_runtime_not_configured",error:"The repository lifecycle runtime is not configured."}})
  :r.fulfill({json:{mode:"live",status:"not-initialized",audit:null,error:null,observedAt:new Date().toISOString()}}));
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>{const n=document.querySelector('button[title="Open REPOSITORY"]'),k=n&&Object.keys(n).find(k=>k.startsWith('__reactProps$'));return Boolean(k&&n[k].onClick)},null,{timeout:60000});
 await page.locator('button[title="Open REPOSITORY"]').click();
 if(!empty)await expect(page.getByRole("row").filter({hasText:"synthetic-source"})).toBeVisible({timeout:60000});
 await expect(page.getByRole("radio",{name:/^Requests/})).toBeVisible();
 return {...f,writes};
}

test("Repository keeps the shared two-panel overview and its register/selected layout at supported widths",async({page})=>{
 const {writes}=await setup(page);const control=page.getByRole("dialog",{name:"Repository Control",exact:true});
 await expect(control.locator('[data-teras-record-control-overview-grid="true"]')).toHaveCount(1);
 await expect(control.locator('[data-teras-record-control-overview-grid="true"] > *')).toHaveCount(2);
 await expect(control.getByRole("heading",{name:"Synthetic pending repository gate",exact:true})).toHaveCount(0);
 for(const width of [1200,1440,1700,1920]){
  await page.setViewportSize({width,height:1000});
  const selected=control.locator('[data-repository-selected-launcher="true"]');
  const box=await selected.boundingBox();
  for(const button of await selected.getByRole("button").all()){
   const b=await button.boundingBox();expect(b.x).toBeGreaterThanOrEqual(box.x);expect(b.x+b.width).toBeLessThanOrEqual(box.x+box.width+1);
  }
 }
 expect(writes).toEqual([]);
});

test("live registration has one canonical path from the selected repository and its inspection",async({page})=>{
 const {writes,result}=await setup(page,{posture:"unregistered"});
 const control=page.getByRole("dialog",{name:"Repository Control",exact:true});
 const selected=control.locator('[data-repository-selected-launcher]');
 await expect(selected.getByRole("button",{name:"Review workspace registration",exact:true})).toBeEnabled();
 await expect(control.getByRole("button",{name:"Review Admission",exact:true})).toHaveCount(0);
 const journalReads=[];page.on("request",r=>{if(new URL(r.url()).pathname==="/api/workspace-intake/requests")journalReads.push(r.url());});
 await selected.getByRole("button",{name:"Review workspace registration",exact:true}).click();
 let intake=page.getByRole("dialog",{name:"Register repository",exact:true});
 await expect(intake).toBeVisible();
 await expect(intake.getByRole("button",{name:"Refresh registration history",exact:true})).toBeEnabled();
 expect(new URL(journalReads.at(-1)).searchParams.get("custody_request_id")).toBe(result.request.request_id);
 expect(new URL(journalReads.at(-1)).searchParams.get("target_name")).toBe("synthetic-source");
 await intake.getByRole("button",{name:"Back to Repository",exact:true}).click();
 await control.getByRole("row").filter({hasText:"synthetic-source"}).getByRole("button",{name:"Review",exact:true}).click();
 const details=page.getByRole("dialog",{name:"Repository details",exact:true});
 await expect(details.getByRole("button",{name:"Start Admission Review",exact:true})).toHaveCount(0);
 await details.getByRole("button",{name:"Review workspace registration",exact:true}).click();
 intake=page.getByRole("dialog",{name:"Register repository",exact:true});await expect(intake).toBeVisible();
 await expect(details).toHaveCount(0);
 await expect(page.locator('[data-repository-admission-run-modal]')).toHaveCount(0);
 expect(writes).toEqual([]);
});

test("unavailable registration explains the blocker and preserves read-only inspection without local fallback",async({page})=>{
 const {writes}=await setup(page,{posture:"unregistered",intakeAvailable:false});
 const control=page.getByRole("dialog",{name:"Repository Control",exact:true});
 const reason="Workspace registration is unavailable with the current connection or permissions.";
 await expect(control.getByRole("button",{name:"Review workspace registration",exact:true})).toBeDisabled();
 await expect(control.getByText(reason,{exact:true})).toBeVisible();
 await control.getByRole("button",{name:"Inspect Repository",exact:true}).click();
 const details=page.getByRole("dialog",{name:"Repository details",exact:true});
 await expect(details.getByText(reason,{exact:true})).toBeVisible();
 await expect(details.getByRole("button",{name:"Review workspace registration",exact:true})).toBeDisabled();
 await expect(details.getByRole("button",{name:"Start Admission Review",exact:true})).toHaveCount(0);
 await expect(page.getByRole("button",{name:"Run Local Admission Review",exact:true})).toHaveCount(0);
 expect(writes).toEqual([]);
});

test("missing current Inventory cannot revive the local admission route",async({page})=>{
 const {writes}=await setup(page,{inventoryAvailable:false});
 const control=page.getByRole("dialog",{name:"Repository Control",exact:true});
 await expect(control.getByRole("button",{name:"Review workspace registration",exact:true})).toHaveCount(0);
 await control.getByRole("row").filter({hasText:"synthetic-source"}).getByRole("button",{name:"Inspect",exact:true}).click();
 const details=page.locator('[data-repository-detail-modal]');
 await expect(details.getByText("Current admission unavailable",{exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:"Start Admission Review",exact:true})).toHaveCount(0);
 await expect(page.getByRole("button",{name:"Run Local Admission Review",exact:true})).toHaveCount(0);
 expect(writes).toEqual([]);
});

test("local admission remains explicitly limited to disconnected demonstration mode",async({page})=>{
 const {writes}=await setup(page,{posture:"unregistered",runtimeMode:"disconnected-preview"});
 const control=page.getByRole("dialog",{name:"Repository Control",exact:true});
 await expect(control.getByRole("button",{name:"Review workspace registration",exact:true})).toHaveCount(0);
 await control.getByRole("row").filter({hasText:"synthetic-source"}).getByRole("button",{name:"Review",exact:true}).click();
 await page.getByRole("dialog",{name:"Repository Admission",exact:true}).getByRole("button",{name:"Start Admission Review",exact:true}).click();
 const run=page.getByRole("dialog",{name:"Repository Admission Run",exact:true});
 await expect(run.getByRole("button",{name:"Run Local Admission Review",exact:true})).toBeEnabled();
 await expect(run.getByText("Execute the prototype-local admission review and inspect the generated evidence receipt.",{exact:true})).toBeVisible();
 expect(writes).toEqual([]);
});

test("retained identity-bound provisioning history reports unavailable lifecycle coverage honestly",async({page})=>{
 const {writes}=await setup(page);
 await page.getByRole("button",{name:"Review Repository",exact:true}).click();
 await page.getByRole("button",{name:"View History",exact:true}).click();
 const history=page.getByRole("dialog",{name:"Repository History",exact:true});
 await expect(history.getByText("Repository creation",{exact:true})).toBeVisible();
 await expect(history.getByText("Some sources could not be confirmed.",{exact:false})).toBeVisible();
 await expect(history.getByText("No Repository receipts are recorded.",{exact:true})).toHaveCount(0);
  await expect(history.getByText("1 receipt · Partial history",{exact:true})).toBeVisible();
 await expect(history.getByRole('button',{name:'Retry',exact:true})).toHaveCount(0);
 await expect(history.getByRole('button',{name:'Refresh history',exact:true})).toHaveCount(0);
 for(const width of [1200,1440,1700,1920]){
  await page.setViewportSize({width,height:1000});
  const overflow=await history.evaluate(n=>({client:n.clientWidth,scroll:n.scrollWidth}));expect(overflow.scroll).toBeLessThanOrEqual(overflow.client+1);
 }
 expect(writes).toEqual([]);
});

for(const lifecycle of ["unavailable","not-initialized"])test(`lifecycle ${lifecycle} preserves inspection and correct execution eligibility`,async({page})=>{
 const {writes}=await setup(page,{lifecycle});
 await page.getByRole("button",{name:"Review Repository",exact:true}).click();
 await page.getByRole("button",{name:"Manage Lifecycle",exact:true}).click();
 const dialog=page.getByRole("dialog",{name:"Repository Lifecycle",exact:true});
 await expect(dialog.getByText(lifecycle==="unavailable"?"Unavailable":"Ready for review",{exact:true}).first()).toBeVisible();
 await expect(dialog.getByText("Not verified",{exact:true}).first()).toBeVisible();
 await dialog.getByRole("button",{name:"Review Action",exact:true}).click();
 await dialog.getByRole("textbox",{name:"Approval note",exact:true}).fill("Reviewed this synthetic lifecycle action.");
 await dialog.getByRole("button",{name:"Confirm repository lifecycle action",exact:true}).click();
 const apply=dialog.getByRole("button",{name:"Apply Lifecycle Action",exact:true});
 if(lifecycle==="unavailable")await expect(apply).toBeDisabled();else await expect(apply).toBeEnabled();
 expect(writes).toEqual([]);
});

test("canonical gate dialog remains usable with an empty repository register",async({page})=>{
 const {writes}=await setup(page,{empty:true});
 await page.getByRole("radio",{name:/^Requests/}).click();
 await page.locator('[data-repository-requests-surface] tbody').getByRole("button",{name:"Review",exact:true}).first().click();
 const gate=page.getByRole("dialog",{name:"Repository request",exact:true});
 await expect(gate.getByRole("heading",{name:"Synthetic pending repository gate",exact:true})).toBeVisible();
 await expect(gate.getByRole("button",{name:"Confirm repository",exact:true})).toHaveCount(0);
 await expect(gate.getByRole("textbox",{name:"Repository resolution notes",exact:true})).toHaveCount(0);
 await expect(gate.getByRole("button",{name:"Create repository for this request",exact:true})).toBeVisible();
 await gate.getByRole("button",{name:"Back to Requests",exact:true}).click();
 await page.getByRole("radio",{name:"Repositories",exact:true}).click();
 await expect(page.getByRole("button",{name:"Create repository",exact:true})).toBeEnabled();
 await page.getByRole("button",{name:"Create repository",exact:true}).click();
 await expect(page.getByRole("dialog",{name:"Create a repository",exact:true})).toBeVisible();
 expect(writes).toEqual([]);
});

test("moving the gate to its dialog preserves custody selection and unrecorded-draft protection",async({page})=>{
 const {result,writes}=await setup(page);
 await page.getByRole("radio",{name:/^Requests/}).click();
 await page.locator('[data-repository-requests-surface] tbody').getByRole("button",{name:"Review",exact:true}).first().click();
 const gate=page.getByRole("dialog",{name:"Repository request",exact:true});
 await expect(gate.getByRole("button",{name:"Created repository",exact:true})).toHaveCount(0);
 await expect(gate.getByText(result.provider_readback.canonical_url,{exact:true})).toBeVisible();
 await expect(gate.getByRole("button",{name:"Create repository for this request",exact:true})).toHaveCount(0);
 await gate.getByRole("textbox",{name:"Repository resolution notes",exact:true}).fill("Use this exact retained owner receipt.");
 await expect(gate.getByRole("button",{name:"Confirm repository",exact:true})).toBeEnabled();
 await gate.getByRole("button",{name:"Back to Requests",exact:true}).click();
 const guard=page.getByRole("alertdialog",{name:"Discard request changes?",exact:true});
 await expect(guard).toBeVisible();await guard.getByRole("button",{name:/Keep Editing/i}).click();
 await expect(gate.getByRole("textbox",{name:"Repository resolution notes",exact:true})).toHaveValue("Use this exact retained owner receipt.");
 expect(writes).toEqual([]);
});

test("Repository filters, details and posture inspection use the same selected owner record",async({page})=>{
 const {writes}=await setup(page);const control=page.getByRole("dialog",{name:"Repository Control",exact:true});
 await control.getByRole("button",{name:"Filter repository status",exact:true}).click();
 await page.getByRole("option",{name:"Admitted",exact:true}).click();
 const search=control.getByRole("searchbox",{name:"Search repositories",exact:true});
 await search.fill("absent-synthetic-name");await expect(control.locator("tbody tr")).toHaveCount(0);
 await search.fill("synthetic-source");const row=control.getByRole("row").filter({hasText:"synthetic-source"});
 await expect(row).toBeVisible();await control.screenshot({path:test.info().outputPath("repository-control.png")});
 await row.getByRole("button",{name:"Review",exact:true}).click();
 const details=page.getByRole("dialog",{name:"Repository details",exact:true});await expect(details).toBeVisible();
 await details.getByRole("button",{name:"Open Creation evidence posture details",exact:true}).click();
 await expect(page.getByRole("dialog",{name:"Creation evidence",exact:true})).toBeVisible();
 await page.keyboard.press("Escape");await expect(details).toBeVisible();expect(writes).toEqual([]);
});

test("Proposal handoff navigation opens the exact canonical repository gate in its dialog",async({page})=>{
 const {writes}=await setup(page);
 await page.getByRole("dialog",{name:"Repository Control",exact:true}).getByRole("button",{name:"Close modal",exact:true}).click();
 await page.locator('button[title="Open PROPOSAL"]').click();
 await page.getByRole("row").filter({hasText:"Synthetic pending repository gate"}).click();
 await page.locator('[data-proposal-open-hub-action="true"]').click();
 await page.locator('[data-proposal-hub-primary-action="true"]').click();
 await page.getByRole("dialog",{name:"Proposal Handoff",exact:true}).getByRole("button",{name:"Open Repository Control",exact:true}).click();
 const gate=page.getByRole("dialog",{name:"Repository request",exact:true});
 await expect(gate.getByRole("heading",{name:"Synthetic pending repository gate",exact:true})).toBeVisible();
 await gate.getByText("Technical details",{exact:true}).click();
 await expect(gate).toContainText("idea-851 / version-17");expect(writes).toEqual([]);
});

test("retired Repository details preserve read-only inspection and offer only the restore boundary",async({page})=>{
 const {writes}=await setup(page,{posture:"retired"});
 await page.getByRole("row").filter({hasText:"synthetic-source"}).getByRole("button",{name:"Inspect",exact:true}).click();
 const details=page.getByRole("dialog",{name:"synthetic-source",exact:true});
 await expect(details.getByText("Retired record posture",{exact:true})).toBeVisible();
 await details.getByRole("button",{name:"Manage Lifecycle",exact:true}).click();
 const lifecycle=page.getByRole("dialog",{name:"Repository Lifecycle",exact:true});
 await expect(lifecycle.getByRole("radio",{name:/^Restore Workspace Record/})).toBeEnabled();
 await expect(lifecycle.getByRole("radio",{name:/^Archive Provider Repository/})).toBeDisabled();
 expect(writes).toEqual([]);
});

test("provisioning remains reachable and retained provisioning requests remain inspectable",async({page})=>{
 const {writes}=await setup(page);
 await page.getByRole("button",{name:"Create repository",exact:true}).click();
 const request=page.getByRole("dialog",{name:"Create a repository",exact:true});
 await expect(request).toBeVisible();
 await request.getByRole("button",{name:"Repository request",exact:true}).click();
 await expect(page.getByRole("option",{name:/synthetic-source.*Completed/})).toBeVisible();
 expect(writes).toEqual([]);
});

test("completed repository requests are immutable readback and do not request fresh approval",async({page})=>{
 const {writes}=await setup(page);
 const control=page.getByRole("dialog",{name:"Repository Control",exact:true});
 await expect(control.getByText("Workspace registration complete",{exact:true})).toBeVisible();
 await expect(control.locator('[data-repository-intake-open]')).toHaveCount(0);
 await expect(control.locator('[data-teras-record-control-overview-grid]').getByRole('button',{name:'Proposal requests',exact:true})).toHaveCount(0);
 await control.getByRole('button',{name:'Create repository',exact:true}).click();
 let request=page.getByRole('dialog',{name:'Create a repository',exact:true});
 await request.getByRole('button',{name:'Repository request',exact:true}).click();
 await page.getByRole('option',{name:/synthetic-source.*Completed/}).click();
 request=page.getByRole('dialog',{name:'Repository request',exact:true});
 await expect(request.getByRole('heading',{name:'Repository created',exact:true})).toBeVisible();
 await expect(request.getByRole('textbox')).toHaveCount(0);
 await expect(request.locator('[data-repository-request-submit]')).toHaveCount(0);
 await expect(request.getByText('Required',{exact:true})).toHaveCount(0);
 expect(writes).toEqual([]);
});

test("Proposal requests open from the workspace header outside repository creation",async({page})=>{
 const {writes}=await setup(page);
 const control=page.getByRole('dialog',{name:'Repository Control',exact:true});
 await expect(control.locator('[data-teras-record-control-overview-grid]').getByRole('button',{name:'Proposal requests',exact:true})).toHaveCount(0);
 await control.getByRole('radio',{name:/^Requests/}).click();
 await control.locator('[data-repository-requests-surface] tbody').getByRole('button',{name:'Review',exact:true}).first().click();
 const requests=page.getByRole('dialog',{name:'Repository request',exact:true});
 await expect(requests.getByRole('heading',{name:'Synthetic pending repository gate',exact:true})).toBeVisible();
 expect(writes).toEqual([]);
});

test("switching repository requests preserves unsaved input until explicit discard",async({page})=>{
 const {writes}=await setup(page);
 await page.getByRole('button',{name:'Create repository',exact:true}).click();
 const request=page.getByRole('dialog',{name:'Create a repository',exact:true});
 await request.getByRole('textbox',{name:'Repository name',exact:true}).fill('new-unsaved-repository');
 const switchRequest=async()=>{
  await request.getByRole('button',{name:'Repository request',exact:true}).click();
  await page.getByRole('option',{name:/synthetic-source.*Completed/}).click();
  return page.getByRole('alertdialog',{name:'Switch repository request?',exact:true});
 };
 let guard=await switchRequest();await expect(guard).toBeVisible();
 await guard.getByRole('button',{name:'Keep Editing',exact:true}).click();
 await expect(request.getByRole('textbox',{name:'Repository name',exact:true})).toHaveValue('new-unsaved-repository');
 guard=await switchRequest();await guard.getByRole('button',{name:'Discard Draft',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Repository request',exact:true}).getByRole('heading',{name:'Repository created',exact:true})).toBeVisible();
 expect(writes).toEqual([]);
});

for(const requests of ["resolved","implemented"])test(`resolved request history survives ${requests} without inflating attention`,async({page})=>{
 const {writes}=await setup(page,{requests});
 const control=page.getByRole('dialog',{name:'Repository Control',exact:true});
 await expect(control.locator('[data-repository-request-count]')).toHaveText('(0)');
 await control.getByRole('radio',{name:/^Requests/}).click();
 await expect(control.getByText('No repository requests need attention.',{exact:false})).toBeVisible();
 await control.getByRole('button',{name:'Filter request status',exact:true}).click();
 await page.getByRole('option',{name:'Resolved history',exact:true}).click();
 await control.getByRole('row').filter({hasText:'Synthetic pending repository gate'}).getByRole('button',{name:'Review',exact:true}).click();
 const confirmation=page.getByRole('dialog',{name:'Repository request',exact:true});
 await expect(confirmation.getByText('The repository requirement has been confirmed.',{exact:true})).toBeVisible();
 await expect(confirmation.getByRole('textbox')).toHaveCount(0);
 await expect(confirmation.getByRole('button',{name:'Confirm repository',exact:true})).toHaveCount(0);
 await confirmation.getByRole('button',{name:'Back to Requests',exact:true}).click();
 await control.getByRole('button',{name:'Open Proposal',exact:true}).click();
 const proposal=page.getByRole('dialog',{name:'Proposal Control',exact:true});
 await expect(proposal.getByRole('row').filter({hasText:'Synthetic pending repository gate'})).toBeVisible();
 expect(writes).toEqual([]);
});

for(const requests of ['stale','offline'])test(`${requests} request source cannot claim zero attention or enable confirmation`,async({page})=>{
 const {writes}=await setup(page,{requests});
 const control=page.getByRole('dialog',{name:'Repository Control',exact:true});
 await expect(control.locator('[data-repository-request-count]')).toHaveText('(—)');
 await control.getByRole('radio',{name:/^Requests/}).click();
 await expect(control.getByText('Current request count is unavailable.',{exact:false})).toBeVisible();
 if(requests==='stale'){
  await control.locator('tbody').getByRole('button',{name:'Review',exact:true}).click();
  const confirmation=page.getByRole('dialog',{name:'Repository request',exact:true});
  await expect(confirmation.getByRole('button',{name:'Confirm repository',exact:true})).toBeDisabled();
  await expect(confirmation.getByRole('textbox',{name:'Repository resolution notes',exact:true})).toBeDisabled();
 }
 expect(writes).toEqual([]);
});

test('interrupted confirmation preserves the original owner inputs and exact source version',async({page})=>{
 const {writes,result}=await setup(page,{requests:'recovery'});
 const control=page.getByRole('dialog',{name:'Repository Control',exact:true});
 await expect(control.locator('[data-repository-request-count]')).toHaveText('(1)');
 await control.getByRole('radio',{name:/^Requests/}).click();
 await control.locator('tbody').getByRole('button',{name:'Review',exact:true}).click();
 const confirmation=page.getByRole('dialog',{name:'Repository request',exact:true});
 await expect(confirmation.getByRole('textbox',{name:'Repository resolution notes',exact:true})).toHaveValue('Original confirmation notes');
 await expect(confirmation.getByRole('textbox',{name:'Repository resolution notes',exact:true})).toBeDisabled();
 let submitted;
 await page.route('**/api/proposals/*/repository-resolution',async r=>{submitted=r.request().postDataJSON();await r.fulfill({status:503,json:{error:'Synthetic interrupted owner reply'}})});
 await confirmation.getByRole('button',{name:'Finish confirmation',exact:true}).click();
 await expect(confirmation.getByRole('alert')).toContainText('Synthetic interrupted owner reply');
 expect(submitted).toEqual({proposalId:'idea-851',recordRef:'openproject://work_packages/851',recordVersion:'version-16',
  custodyRequestId:result.request.request_id,custodyReceiptRef:result.receipt_ref,notes:'Original confirmation notes'});
 expect(writes).toEqual([]);
});

for(const custodyOrigin of ['other','standalone'])test(`${custodyOrigin} repository is excluded and new creation automatically binds the selected request`,async({page})=>{
 const {writes,result}=await setup(page,{custodyOrigin});
 await page.getByRole('radio',{name:/^Requests/}).click();
 await page.locator('[data-repository-requests-surface] tbody').getByRole('button',{name:'Review',exact:true}).click();
 const confirmation=page.getByRole('dialog',{name:'Repository request',exact:true});
 await expect(confirmation.getByRole('button',{name:'Created repository',exact:true})).toHaveCount(0);
 await expect(confirmation.getByRole('button',{name:'Confirm repository',exact:true})).toHaveCount(0);
 await expect(confirmation.getByRole('textbox',{name:'Repository resolution notes',exact:true})).toHaveCount(0);
 await expect(confirmation.getByText(result.provider_readback.canonical_url,{exact:true})).toHaveCount(0);
 await confirmation.getByRole('button',{name:'Create repository for this request',exact:true}).click();
 const create=page.getByRole('dialog',{name:'Create a repository',exact:true});
 await expect(create.getByText('Synthetic pending repository gate',{exact:true})).toBeVisible();
 await create.getByRole('textbox',{name:'GitHub organization',exact:true}).fill('example-organization');
 await create.getByRole('textbox',{name:'Repository name',exact:true}).fill('new-request-source');
 await create.getByRole('textbox',{name:'Repository purpose',exact:true}).fill('New source created to fulfil this exact request.');
 await create.getByRole('button',{name:'Repository visibility',exact:true}).click();
 await page.getByRole('option',{name:'Private',exact:true}).click();
 await create.getByRole('button',{name:'Confirm provider baseline review',exact:true}).click();
 await create.getByRole('textbox',{name:'Provisioning approval note',exact:true}).fill('Approve creation for this exact Proposal request.');
 let submitted;
 await page.route('**/api/repositories/provisioning/requests',async r=>{submitted=r.request().postDataJSON();await r.fulfill({status:503,json:{error:'Synthetic create unavailable',code:'synthetic_create_unavailable',mode:'live',status:'offline',retryable:false}})});
 await create.locator('[data-repository-request-submit]').click();
 await expect.poll(()=>submitted?.proposalId).toBe('idea-851');
 expect(submitted.repositoryName).toBe('new-request-source');
 expect(writes).toEqual([]);
});

test('Proposal reuse chooses current Inventory and new-repository choice explains the separate request',async({page})=>{
 const {writes}=await setup(page,{requests:'triaged'});
 await page.getByRole('dialog',{name:'Repository Control',exact:true}).getByRole('button',{name:'Close modal',exact:true}).click();
 await page.locator('button[title="Open PROPOSAL"]').click();
 await page.getByRole('row').filter({hasText:'Synthetic pending repository gate'}).click();
 await page.locator('[data-proposal-open-hub-action]').click();
 await page.locator('[data-proposal-hub-primary-action]').click();
 const disposition=page.getByRole('dialog',{name:'Proposal Disposition',exact:true});
 await disposition.getByRole('radio',{name:'Accept',exact:true}).click();
 await disposition.getByRole('radio',{name:'Existing Repo',exact:true}).click();
 await disposition.getByRole('button',{name:'Existing owner repo',exact:true}).click();
 await expect(page.getByRole('option',{name:'synthetic-source / repo:synthetic-source',exact:true})).toBeVisible();
 await expect(page.getByRole('option')).toHaveCount(2);
 await page.keyboard.press('Escape');
 await disposition.getByRole('radio',{name:'New Repo',exact:true}).click();
 await expect(disposition.getByText('Accepting this Proposal creates a request in Repository Control.',{exact:false})).toBeVisible();
 expect(writes).toEqual([]);
});

async function openAttachmentRequest(page){
 await page.getByRole('radio',{name:/^Requests/}).click();
 await page.locator('[data-repository-requests-surface] tbody').getByRole('button',{name:'Review',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Repository request',exact:true});
 await dialog.getByRole('radio',{name:'Already created',exact:true}).click();
 return dialog;
}
const lookupFixture={schema_version:1,provider:'github',provider_host:'github.com',provider_repository_id:'123456789',owner:'example-org',name:'manual-source',canonical_url:'https://github.com/example-org/manual-source',visibility:'private',provider_lifecycle_state:'active',observed_at:'2026-11-03T08:00:00Z'};
function attachmentResponse(intent){
 return JSON.parse(execFileSync(process.execPath,['--experimental-strip-types','--disable-warning=MODULE_TYPELESS_PACKAGE_JSON','--input-type=module','-e',
  "import {attachmentFixture} from './tests/support/repository-attachment-fixture.mjs'; process.stdout.write(JSON.stringify(attachmentFixture(JSON.parse(process.argv[1]))));",JSON.stringify(intent)],{encoding:'utf8'}));
}

test('method choice keeps creation separate and preserves an attachment draft through switches and close guard',async({page})=>{
 const {writes,result}=await setup(page,{custodyOrigin:'standalone'});
 const dialog=await openAttachmentRequest(page);
 await expect(dialog.getByRole('button',{name:'Create repository for this request',exact:true})).toHaveCount(0);
 await dialog.getByRole('button',{name:'Repository to attach',exact:true}).click();
 await page.getByRole('option',{name:result.provider_readback.canonical_url,exact:true}).click();
 await dialog.getByRole('textbox',{name:'Attachment approval',exact:true}).fill('This repository was created manually for the requested project.');
 await expect(dialog.getByRole('button',{name:'Verify and attach repository',exact:true})).toBeDisabled();
 await dialog.getByRole('radio',{name:'Create new',exact:true}).click();
 await expect(dialog.getByRole('button',{name:'Create repository for this request',exact:true})).toBeVisible();
 await expect(dialog.getByRole('textbox',{name:'Attachment approval',exact:true})).toBeHidden();
 await dialog.getByRole('radio',{name:'Already created',exact:true}).click();
 await expect(dialog.getByRole('textbox',{name:'Attachment approval',exact:true})).toHaveValue('This repository was created manually for the requested project.');
 await dialog.getByRole('button',{name:'Back to Requests',exact:true}).click();
 const guard=page.getByRole('alertdialog',{name:'Discard request changes?',exact:true});await expect(guard).toBeVisible();
 await guard.getByRole('button',{name:/Keep Editing/i}).click();
 await expect(dialog.getByRole('textbox',{name:'Attachment approval',exact:true})).toHaveValue('This repository was created manually for the requested project.');
 expect(writes).toEqual([]);
});

test('manual repository URL resolves identity, requires purpose approval, attaches and survives reload as a verified result',async({page})=>{
 const {writes,result}=await setup(page,{custodyOrigin:'standalone'});
 let lookups=0,submitted,attached;
 await page.route('**/api/repositories/custody/provider-repository?*',r=>{lookups++;return r.fulfill({json:lookupFixture})});
 await page.route('**/api/repositories/custody/requests',r=>r.request().method()==='POST'?(submitted=r.request().postDataJSON(),attached=attachmentResponse(submitted),r.fulfill({json:attached})):
  r.fulfill({json:{schema_version:1,mode:'live',status:'current',error:null,records:attached?[result,attached]:[result],next_cursor:null}}));
 let dialog=await openAttachmentRequest(page);
 await dialog.getByRole('button',{name:'Repository to attach',exact:true}).click();
 await page.getByRole('option',{name:'Enter a GitHub repository URL',exact:true}).click();
 await dialog.getByRole('textbox',{name:'GitHub repository URL',exact:true}).fill(lookupFixture.canonical_url);
 await dialog.getByRole('button',{name:'Check repository',exact:true}).click();
 await expect(dialog.getByText(lookupFixture.canonical_url,{exact:true})).toBeVisible();
 await expect(dialog.getByRole('textbox',{name:'Attachment workspace owner reference',exact:true})).toHaveValue('repo:manual-source');
 await expect(dialog.getByRole('textbox',{name:/provider.*id/i})).toHaveCount(0);
 const approve=dialog.getByRole('button',{name:'Verify and attach repository',exact:true});
 await expect(approve).toBeDisabled();
 await dialog.getByRole('textbox',{name:'Attachment approval',exact:true}).fill('Manually created this private repository to fulfil this exact request.');
 await dialog.getByRole('button',{name:'Confirm repository was created for this request',exact:true}).click();
 await expect(approve).toBeEnabled();await approve.click();
 await expect(dialog.getByText('Attached repository',{exact:true})).toBeVisible();
 expect(submitted.proposalId).toBe('idea-851');expect(submitted.createdForRequest).toBe(true);expect(submitted.providerRepositoryId).toBe(lookupFixture.provider_repository_id);
 expect(lookups).toBe(1);await expect(dialog.getByRole('button',{name:'Confirm repository',exact:true})).toBeEnabled();
 await expect(dialog.getByRole('textbox',{name:'Repository resolution notes',exact:true})).toHaveValue('Manually created this private repository to fulfil this exact request.');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const n=document.querySelector('button[title="Open REPOSITORY"]'),k=n&&Object.keys(n).find(k=>k.startsWith('__reactProps$'));return Boolean(k&&n[k].onClick)},null,{timeout:60000});
 await page.locator('button[title="Open REPOSITORY"]').click();
 await page.getByRole('radio',{name:/^Requests/}).click();
 await page.locator('[data-repository-requests-surface] tbody').getByRole('button',{name:'Review',exact:true}).click();
 dialog=page.getByRole('dialog',{name:'Repository request',exact:true});
 await expect(dialog.getByText('Attached repository',{exact:true})).toBeVisible();
 await expect(dialog.getByText(lookupFixture.canonical_url,{exact:true})).toBeVisible();
 await expect(dialog.getByRole('radiogroup',{name:'Repository method',exact:true})).toHaveCount(0);
 expect(writes).toEqual([]);
});

test('invalid or unavailable manual lookup cannot leave an attachable stale identity',async({page})=>{
 const {writes}=await setup(page,{custodyOrigin:'standalone'});let calls=0;
 await page.route('**/api/repositories/custody/provider-repository?*',r=>{calls++;return r.fulfill({status:403,json:{error:'Repository application cannot access this repository.'}})});
 const dialog=await openAttachmentRequest(page);
 await dialog.getByRole('button',{name:'Repository to attach',exact:true}).click();
 await page.getByRole('option',{name:'Enter a GitHub repository URL',exact:true}).click();
 const url=dialog.getByRole('textbox',{name:'GitHub repository URL',exact:true});
 await url.fill('https://outside.test/org/repo');await dialog.getByRole('button',{name:'Check repository',exact:true}).click();
 await expect(dialog.getByRole('alert')).toContainText('GitHub repository root');expect(calls).toBe(0);
 await url.fill(lookupFixture.canonical_url);await dialog.getByRole('button',{name:'Check repository',exact:true}).click();
 await expect(dialog.getByRole('alert')).toContainText('cannot access');expect(calls).toBe(1);
 await expect(dialog.getByRole('button',{name:'Verify and attach repository',exact:true})).toHaveCount(0);
 expect(writes).toEqual([]);
});


test('attachment with no known repositories opens URL entry directly',async({page})=>{
 const {writes}=await setup(page,{empty:true});
 const dialog=await openAttachmentRequest(page);
 await expect(dialog.getByRole('button',{name:'Repository to attach',exact:true})).toHaveCount(0);
 await expect(dialog.getByRole('textbox',{name:'GitHub repository URL',exact:true})).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Check repository',exact:true})).toBeDisabled();
 expect(writes).toEqual([]);
});

async function registrationForm(page,options={}){
 const state=await setup(page,{posture:'unregistered',...options});
 await page.getByRole('dialog',{name:'Repository Control',exact:true}).getByRole('button',{name:'Review workspace registration',exact:true}).click();
 const form=page.getByRole('dialog',{name:'Register repository',exact:true});
 await expect(form.getByRole('button',{name:'Refresh registration history',exact:true})).toBeEnabled();
 return {...state,form};
}
async function chooseRegistration(page,form,label,option){
 await form.getByRole('button',{name:label,exact:true}).click();await page.getByRole('option',{name:option,exact:true}).click();
}
async function fillSourceRegistration(page,form){
 await chooseRegistration(page,form,'What will this repository contain?','Application or library source');
 await chooseRegistration(page,form,'Who owns the source checks?','The repository maintains its source checks');
 await chooseRegistration(page,form,'Does the agreed design require a security binding?','No dedicated security binding');
 await form.getByRole('textbox',{name:'Source-check notes (optional for repository-owned controls)',exact:true}).fill('Application behavior tests and source validation, maintained by this repository.');
}

test('registration uses readable choices, preserves an edited draft and binds exact owner metadata without a classification write',async({page})=>{
 const {form,result,writes}=await registrationForm(page);const submitted=[];
 await page.route('**/api/workspace-intake/preparations',r=>{submitted.push(r.request().postDataJSON());return r.fulfill({status:503,json:{error:'Synthetic registration source unavailable'}});});
 await expect(form.getByRole('textbox',{name:'What does this repository own?',exact:true})).toHaveValue(result.request.provisioning.description);
 await expect(form.getByRole('button',{name:'Review owner setup',exact:true})).toBeDisabled();
 await form.getByRole('button',{name:'Review registration',exact:true}).click();
 await expect(form.getByRole('alert')).toContainText('Choose a repository type');expect(submitted).toEqual([]);
 await fillSourceRegistration(page,form);
 await form.getByRole('button',{name:'Review registration',exact:true}).click();
 await expect(form.getByRole('alert')).toContainText('Synthetic registration source unavailable');
 expect(submitted).toHaveLength(1);expect(submitted[0].target).toEqual({kind:'repo',name:'synthetic-source'});
 const selection=submitted[0].repository_custody;
 expect(selection.request_id).toBe(result.request.request_id);
 expect(selection.requested_record).toMatchObject({kind:'repo',repo_class:'product-source',requires_security_bindings:false,security_owner:null,
  validation_behavior:{posture:'covered-by-owner-repo',wgcf_graph_role:'product-runtime-source',catalog_refs:[]}});
 expect(selection.requested_record.provider_repository).toBeUndefined();
 await form.getByRole('button',{name:'Back to Repository',exact:true}).click();
 const guard=page.getByRole('alertdialog',{name:'Discard registration draft?',exact:true});await expect(guard).toBeVisible();
 await guard.getByRole('button',{name:/Keep Editing/i}).click();
 await expect(form.getByRole('textbox',{name:'Source-check notes (optional for repository-owned controls)',exact:true})).toHaveValue('Application behavior tests and source validation, maintained by this repository.');
 await form.getByRole('button',{name:'Close modal',exact:true}).click();await guard.getByRole('button',{name:/Discard Draft/i}).click();
 await page.getByRole('dialog',{name:'Repository Control',exact:true}).getByRole('button',{name:'Review workspace registration',exact:true}).click();
 await expect(form.getByRole('button',{name:'What will this repository contain?',exact:true})).toContainText('Choose a repository type');
 expect(writes).toEqual([]);
});

test('registered checks are collected from the selected owner and re-read before preparing the candidate',async({page})=>{
 const {form,writes}=await registrationForm(page,{intakeOwners:true});let reads=0,sourceFailed=false;const submitted=[];
 const plan=JSON.parse(execFileSync(process.execPath,['--experimental-strip-types','--disable-warning=MODULE_TYPELESS_PACKAGE_JSON','--input-type=module','-e',
  "import {workspaceRegistryFixture,workspaceInventoryLifecyclePreparationFixture} from './src/workspace-registry/fixtures/workspace-registry.fixture.ts';const row=workspaceRegistryFixture.records.find(r=>r.kind==='repo');const p=workspaceInventoryLifecyclePreparationFixture({...row,id:'repo:example-checks',name:'example-checks',posture:'active'});process.stdout.write(JSON.stringify(p));"],{encoding:'utf8'}));
 await page.route('**/api/workspace-registry/lifecycle/preparations',r=>{reads++;expect(r.request().postDataJSON().target).toEqual({kind:'repo',name:'example-checks',record_id:'repo:example-checks'});return sourceFailed?r.fulfill({status:503,json:{error:'Synthetic check owner unavailable'}}):r.fulfill({json:plan});});
 await page.route('**/api/workspace-intake/preparations',r=>{submitted.push(r.request().postDataJSON());return r.fulfill({status:503,json:{error:'Synthetic review unavailable'}});});
 await chooseRegistration(page,form,'What will this repository contain?','Application or library source');
 await chooseRegistration(page,form,'Who owns the source checks?','An existing runtime profile runs registered checks');
 await chooseRegistration(page,form,'Which repository owns the registered checks?','example-checks');
 await expect(form.getByText(plan.current_record.validation_behavior.notes,{exact:true})).toBeVisible();
 await chooseRegistration(page,form,'Does the agreed design require a security binding?','No dedicated security binding');
 await form.getByRole('button',{name:'Review registration',exact:true}).click();
 await expect(form.getByRole('alert')).toContainText('Synthetic review unavailable');
 expect(reads).toBe(2);expect(submitted).toHaveLength(1);
 expect(submitted[0].repository_custody.requested_record.validation_behavior.catalog_refs).toEqual(plan.current_record.validation_behavior.catalog_refs);
 expect(submitted[0].repository_custody.requested_record.validation_behavior.notes).toContain('not evidence that these checks have passed');
 sourceFailed=true;await form.getByRole('button',{name:'Refresh check plan',exact:true}).click();
 await expect(form.getByText("The repository's current validation setup could not be read. Your draft is kept; refresh its setup to continue.",{exact:true})).toBeVisible();
 await form.getByRole('button',{name:'Review registration',exact:true}).click();expect(submitted).toHaveLength(1);
 await expect(form.getByRole('button',{name:'Which repository owns the registered checks?',exact:true})).toContainText('example-checks');
 expect(writes).toEqual([]);
});

test('specialist registration exposes compatible roles, manual bindings and current security owner choices',async({page})=>{
 const {form,writes}=await registrationForm(page,{intakeOwners:true});
 await chooseRegistration(page,form,'What will this repository contain?','Application or library source');
 await chooseRegistration(page,form,'Who owns the source checks?','Checks need a proposed runtime profile');
 await expect(form.getByRole('button',{name:'Validation role',exact:true})).toBeVisible();
 await form.getByRole('button',{name:'Validation role',exact:true}).click();
 await expect(page.getByRole('option',{name:'Product runtime source',exact:true})).toHaveCount(0);
 await page.getByRole('option',{name:'Context provider',exact:true}).click();
 await chooseRegistration(page,form,'Does the agreed design require a security binding?','Yes, a dedicated security binding is required');
 await chooseRegistration(page,form,'Which repository owns the security binding?','example-security');
 await chooseRegistration(page,form,'Who owns the source checks?','An interface contract defines the checks');
 await chooseRegistration(page,form,'Registered check bindings','Use explicitly reviewed check IDs');
 await form.getByRole('textbox',{name:'Registered check IDs (optional unless this approach invokes checks)',exact:true}).fill('contract-model');
 await form.getByRole('textbox',{name:'Source-check notes (optional for repository-owned controls)',exact:true}).fill('Owner-reviewed interface contract checks.');
 await form.getByText('Registration technical details',{exact:true}).click();
 await expect(form.getByText('contract-model',{exact:true})).toBeVisible();
 await expect(form.getByText('context-packet-provider',{exact:true})).toBeVisible();
 expect(writes).toEqual([]);
});

test('recorded classification returns to preserved details without an unsubmitted-draft warning',async({page})=>{
 const {form,result,writes}=await registrationForm(page);let acknowledged=null;
 const digest=`sha256:${'a'.repeat(64)}`;
 await page.route('**/api/workspace-intake/preparations',r=>{
  const input=r.request().postDataJSON(),target={kind:'repo',name:'synthetic-source',record_id:'repo:synthetic-source'};
  const source={class:'repository-custody',ref:`oos://repository-custody/requests/${encodeURIComponent(result.request.request_id)}/intake/${'a'.repeat(64)}`,digest};
  return r.fulfill({json:{schema_version:1,workflow_id:'workspace-intake',canonical_mutation:false,authority_revision:'b'.repeat(40),
   canonical_authority:{repo:'workspace-governance',branch:'main',path:'contracts/intake-register.yaml'},target,
   expected_state:{record_version:null,record_digest:null,register_digest:digest},source_candidate:{schema_version:1,artifact_type:'workspace-intake-source-candidate',candidate_digest:digest,
    source,target,requested_record:input.repository_custody.requested_record,evidence_refs:[source.ref]}}});
 });
 await page.route('**/api/workspace-intake/requests',r=>{
  const body=r.request().postDataJSON();acknowledged=body;
  return r.fulfill({json:{schema_version:1,workflow_id:'workspace-intake',request_id:body.request_id,revision:1,status:'accepted',canonical_mutation:false,
   history:[{sequence:1,status:'accepted',at:'2026-11-03T09:00:00Z',details:null}],next_action:'continue',receipt:null,review:null,failure:null,readback:null,readiness:null}});
 });
 await page.route('**/api/workspace-intake/requests?*',r=>r.fulfill({json:{schema_version:1,workflow_id:'workspace-intake',target:{kind:'repo',name:'synthetic-source',record_id:'repo:synthetic-source'},
  custody_request_id:result.request.request_id,revision:acknowledged?1:0,pending_request_count:acknowledged?1:0,updated_at:acknowledged?'2026-11-03T09:00:00Z':null,next_cursor:null,
  records:acknowledged?[{request_id:acknowledged.request_id,classification:'proposed',status:'accepted',revision:1,requested_at:'2026-11-03T09:00:00Z',updated_at:'2026-11-03T09:00:00Z',
   candidate:{schema_version:1,artifact_type:'workspace-intake-source-candidate',candidate_digest:digest,source:acknowledged.candidate.source,
    target:{kind:'repo',name:'synthetic-source',record_id:'repo:synthetic-source'},requested_record:acknowledged.candidate.requested_record,evidence_refs:acknowledged.candidate.evidence_refs}}]:[]}}));
 await fillSourceRegistration(page,form);await form.getByRole('button',{name:'Review registration',exact:true}).click();
 const decision=page.getByRole('dialog',{name:'Workspace Intake Classification',exact:true});
 await decision.getByRole('radio',{name:'Proposed',exact:true}).click();
 await decision.getByRole('button',{name:'Review Classification',exact:true}).click();
 await decision.getByRole('button',{name:'Confirm the Workspace Intake review',exact:true}).click();
 await decision.getByRole('button',{name:'Submit Classification',exact:true}).click();
 await expect(decision.getByRole('button',{name:'Back to registration',exact:true})).toBeVisible();
 await decision.getByRole('button',{name:'Back to registration',exact:true}).click();
 await expect(form.getByText('A registration request is still pending. Open it below before starting another.',{exact:true})).toBeVisible();
 await form.getByRole('button',{name:'Back to Repository',exact:true}).click();
 await expect(form).toHaveCount(0);await expect(page.getByRole('alertdialog',{name:'Discard registration draft?',exact:true})).toHaveCount(0);
 expect(acknowledged.decision).toBe('proposed');expect(writes).toEqual([]);
});

test('active repository verification loads existing controls and prepares manual checks without a new Intake decision',async({page})=>{
 const {writes}=await setup(page,{requests:'none'});const submitted=[];
 const profile={schema_version:1,owner_repo:'synthetic-source',profile_id:'owner-source-controls',application_verification:{mode:'unconfigured',manual_checks:[]},
  commands:[{id:'source-controls',kind:'validations',name:'Existing source controls',executable:'python3',args:['scripts/validate_owner.py','--repo-root','.'],fidelity:'filesystem',conformance_binding:'none',timeout_seconds:120,scope:'source-controls'}]};
 await page.route('**/api/repository-owner-bootstrap/requests?*',r=>r.fulfill({json:{mode:'live',projection:{records:[],pendingRequest:null}}}));
 await page.route('**/api/repository-owner-bootstrap/preparations',r=>{
  const input=r.request().postDataJSON();submitted.push(input);
  if(input.evidenceProfile===null)return r.fulfill({json:{mode:'live',projection:{existing_owner_controls:{evidence_profile:profile},plan:null,preparation_digest:`sha256:${'a'.repeat(64)}`}}});
  return r.fulfill({status:409,json:{mode:'live',error:'Synthetic review checkpoint: no source request submitted.'}});
 });
 const control=page.getByRole('dialog',{name:'Repository Control',exact:true});
 await control.getByRole('button',{name:'Application verification',exact:true}).click();
 const form=page.locator('[data-surface-id="repository-owner-bootstrap"]');
 const dialog=page.getByRole('dialog').filter({has:page.getByRole('button',{name:'Load current plan',exact:true})});
 await dialog.getByRole('button',{name:'Load current plan',exact:true}).click();
 await expect(dialog.getByText(/Loaded owner-source-controls/)).toBeVisible();
 await dialog.getByRole('textbox',{name:'Check 1: action',exact:true}).fill('Add a task and refresh');
 await dialog.getByRole('textbox',{name:'Expected result',exact:true}).fill('The task remains visible');
 await dialog.getByRole('button',{name:'Back to Repository',exact:true}).click();
 const guard=page.getByRole('alertdialog',{name:'Discard verification draft?',exact:true});await expect(guard).toBeVisible();
 await guard.getByRole('button',{name:/Keep Editing/i}).click();
 await expect(dialog.getByRole('textbox',{name:'Check 1: action',exact:true})).toHaveValue('Add a task and refresh');
 await dialog.getByRole('button',{name:'Review verification change',exact:true}).click();
 await expect(dialog.getByText('Synthetic review checkpoint: no source request submitted.',{exact:true})).toBeVisible();
 expect(submitted).toHaveLength(2);expect(submitted[0].evidenceProfile).toBeNull();
 expect(submitted[1].operation).toBe('configure-verification');
 expect(submitted[1].evidenceProfile.application_verification).toEqual({mode:'manual',manual_checks:[{id:'manual-1',action:'Add a task and refresh',expected_result:'The task remains visible'}]});
 expect(submitted[1].evidenceProfile.commands).toEqual(profile.commands);expect(writes).toEqual([]);
});

test('History has no permanent refresh and replaces a failed provider section with centered read-only retry',async({page})=>{
 const {writes,result}=await setup(page);let lookups=0,pendingResolve;
 await page.route('**/api/repositories/custody/provider-repository?*',async route=>{
  lookups++;
  if(lookups>1)await new Promise(resolve=>{pendingResolve=resolve});
  if(lookups===2)return route.fulfill({status:503,json:{code:'repository_provider_unavailable',error:'Synthetic provider unavailable',retryable:true}});
  return route.fulfill({json:providerLookupFor(result,'archived')});
 });
 await page.route('**/api/repositories/lifecycle/repositories/**',route=>route.fulfill({json:{mode:'live',status:'current',audit:lifecycleAuditFor(result,'active'),error:null,observedAt:'2026-06-21T10:00:00Z'}}));
 await page.getByRole('button',{name:'Review Repository',exact:true}).click();
 const details=page.getByRole('dialog',{name:'Repository details',exact:true});
 await expect(details.getByRole('button',{name:'Open Creation evidence posture details',exact:true})).toContainText('Recorded');
 await details.getByRole('button',{name:'View History',exact:true}).click();
 const history=page.getByRole('dialog',{name:'Repository History',exact:true});
 await expect(history.getByText('Archived',{exact:true})).toBeVisible();
 await expect(history.getByText('Admitted',{exact:true}).first()).toBeVisible();
 await expect(history.getByText('active',{exact:true}).last()).toBeVisible();
 await expect(history.getByText('No local admission receipt',{exact:true})).toHaveCount(0);
 await expect(history.getByRole('button',{name:'Refresh history',exact:true})).toHaveCount(0);
 await expect(history.getByRole('button',{name:'Retry',exact:true})).toHaveCount(0);
 await history.getByText('Technical details',{exact:true}).click();
 await expect(history.getByText('No local setup receipt',{exact:true})).toHaveCount(0);
 for(const width of [1280,1700]){
  await page.setViewportSize({width,height:width===1280?800:1100});
  expect(await history.evaluate(n=>n.scrollWidth<=n.clientWidth+1)).toBe(true);
  await history.screenshot({path:test.info().outputPath(`history-${width}.png`)});
 }
 await history.getByRole('button',{name:'Close Repository history',exact:true}).click();
 await page.getByRole('button',{name:'Review Repository',exact:true}).click();
 await page.getByRole('button',{name:'View History',exact:true}).click();
 await expect(history.getByText('Refreshing',{exact:true})).toBeVisible();
 pendingResolve();
 const failure=history.getByRole('status').filter({hasText:'GitHub status could not be loaded'});
 await expect(failure.getByRole('button',{name:'Retry',exact:true})).toBeVisible();
 await expect(history.getByText('Observed at',{exact:true})).toHaveCount(0);
 await failure.screenshot({path:test.info().outputPath('provider-retry.png')});
 await failure.getByRole('button',{name:'Retry',exact:true}).click();
 await expect(history.getByText('Reading GitHub status…',{exact:true})).toBeVisible();
 pendingResolve();
 await expect(history.getByText('Archived',{exact:true})).toBeVisible();
 await expect(history.getByRole('button',{name:'Retry',exact:true})).toHaveCount(0);
 expect(lookups).toBe(3);expect(writes).toEqual([]);
});

test('a temporary History source failure replaces the section until Retry succeeds',async({page})=>{
 const {writes,result}=await setup(page);let reads=0,finish;
 await page.route('**/api/repositories/lifecycle/repositories/**',async route=>{
  reads++;
  if(reads>1)await new Promise(resolve=>{finish=resolve});
  return reads===1?route.fulfill({status:502,json:{mode:'live',status:'offline',retryable:true,code:'repository_lifecycle_oos_unavailable',error:'Synthetic connection interrupted'}})
   :route.fulfill({json:{mode:'live',status:'current',audit:lifecycleAuditFor(result),error:null,observedAt:'2026-06-21T10:00:00Z'}});
 });
 await page.getByRole('button',{name:'Review Repository',exact:true}).click();
 await page.getByRole('button',{name:'View History',exact:true}).click();
 const history=page.getByRole('dialog',{name:'Repository History',exact:true});
 const failure=history.getByRole('status').filter({hasText:'History could not be loaded'});
 await expect(failure.getByRole('button',{name:'Retry',exact:true})).toBeVisible();
 await expect(history.getByRole('list',{name:'Repository receipt timeline'})).toHaveCount(0);
 const parent=failure.locator('..'),button=failure.getByRole('button',{name:'Retry',exact:true});
 const a=await parent.boundingBox(),b=await button.boundingBox();
 expect(Math.abs((b.x+b.width/2)-(a.x+a.width/2))).toBeLessThan(4);
 await history.screenshot({path:test.info().outputPath('history-retry.png')});
 await button.click();
 await expect(history.getByText('Reading repository history…',{exact:true})).toBeVisible();
 await expect(history.getByRole('list',{name:'Repository receipt timeline'})).toHaveCount(0);
 finish();
 await expect(history.getByText('Repository creation',{exact:true})).toBeVisible();
 await expect(history.getByRole('button',{name:'Retry',exact:true})).toHaveCount(0);
 expect(reads).toBe(2);expect(writes).toEqual([]);
});

test('missing GitHub reader setup explains the failure without offering Retry',async({page})=>{
 const {writes}=await setup(page);
 await page.route('**/api/repositories/custody/provider-repository?*',route=>route.fulfill({status:503,json:{code:'repository_provider_not_configured',retryable:false,error:'The provider identity is not active'}}));
 await page.getByRole('button',{name:'Review Repository',exact:true}).click();
 await page.getByRole('button',{name:'View History',exact:true}).click();
 const history=page.getByRole('dialog',{name:'Repository History',exact:true});
 await expect(history.getByText('GitHub connection needs setup',{exact:true})).toBeVisible();
 await expect(history.getByRole('button',{name:'Retry',exact:true})).toHaveCount(0);
 await expect(history.getByRole('button',{name:'Refresh history',exact:true})).toHaveCount(0);
 expect(writes).toEqual([]);
});

test('a repository in a different account explains the access boundary without offering Retry',async({page})=>{
 const {writes}=await setup(page);
 await page.route('**/api/repositories/custody/provider-repository?*',route=>route.fulfill({status:403,json:{code:'repository_provider_owner_not_admitted',retryable:false,error:'Outside the connected account'}}));
 await page.getByRole('button',{name:'Review Repository',exact:true}).click();
 await page.getByRole('button',{name:'View History',exact:true}).click();
 const history=page.getByRole('dialog',{name:'Repository History',exact:true});
 await expect(history.getByText('Different GitHub account',{exact:true})).toBeVisible();
 await expect(history.getByRole('button',{name:'Retry',exact:true})).toHaveCount(0);
 expect(writes).toEqual([]);
});
