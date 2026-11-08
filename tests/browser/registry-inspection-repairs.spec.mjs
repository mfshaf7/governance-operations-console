import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { page as nativePageFixture, promotionPreparation as nativePromotionPreparation, nativeResult as nativeInventoryResult, config as nativeConfig, digest as nativeDigest, bind as nativeBind, at as nativeAt } from "../support/instance-inventory-fixture.mjs";
const require = createRequire(import.meta.url);
const { workspaceRegistryFixture, workspaceInventoryResultFixture, workspaceInventoryLifecyclePreparationFixture } = require("../../src/workspace-registry/fixtures/workspace-registry.fixture.ts");
const { assertWorkspaceContinuityProjection } = require("../../src/workspace-continuity/workspace-continuity-contract.ts");
const { reconcileWorkspaceRegistryContinuity } = require("../../src/workspace-continuity/workspace-registry-continuity.ts");
const { buildInstanceInventoryCommand } = require("../../src/workspace-registry/server/workspace-registry-instance-proof.ts");
const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:3320";
if (new URL(base).port === "3317") throw new Error("Use the isolated preview, never the live Console.");
test.setTimeout(90000);
test.beforeEach(async({context})=>{await context.route("**/api/**",route=>route.fulfill({status:503,json:{error:"Unmatched test API denied; no owner call made."}}));});
test.use({ actionTimeout: 10000, navigationTimeout: 60000 });
const digest = c => `sha256:${c.repeat(64)}`;
const snapshot = structuredClone(workspaceRegistryFixture);
snapshot.records = snapshot.records.filter(row => row.kind !== "product");
const record = snapshot.records[0], candidate = snapshot.eligible_promotions[0];
const continuity = assertWorkspaceContinuityProjection({ schema_version: 1, artifact_type: "workspace-continuity-projection", projection_state: "current",
  projection_id: `workspace-continuity-projection:${"c".repeat(64)}`, projection_digest: digest("c"),
  authority: { owner_repo: "workspace-governance", revision: snapshot.authority_revision, file_digests: {} },
  authority_boundary: { canonical_registry: "workspace-governance", readiness_projection: "workspace-governance-control-fabric", workflow_authority: "operator-orchestration-service", terminal_publication_authority: "operator-orchestration-service", mutation_authority: "none" },
  products: [], inventory: snapshot.records.map(row => ({ kind: row.kind, name: row.name, record_id: row.id, record_version: row.version,
    record_digest: row.record_digest, posture: row.posture, lifecycle: "active", retired_collection: false, lineage: row.lineage,
    last_mutation: { ...row.last_mutation, idempotency_key: `fixture:${row.id}`, readiness_digest: null, request_digest: null } })),
  intake: snapshot.eligible_promotions.map(row => ({ kind: row.target.kind, name: row.target.name, record_id: row.target.record_id,
    record_version: row.intake_entry_ref.version, record_digest: row.intake_entry_ref.digest, status: "admitted", decision_source: "operator",
    owner_route: row.owner_refs[0], decision: { id: row.approval_refs[0] }, source: { class: "direct" }, last_mutation: {} })),
});
reconcileWorkspaceRegistryContinuity(continuity, snapshot);


async function setup(page, { fail = false, history = null, intake = false, extraOwner = false, promotion = false, submitPromotion = false } = {}) {
 let unavailable = fail, currentSnapshot = snapshot, currentContinuity = continuity; const writes = [], errors = [], preparations = [], originalReads = [];
 let ownerUnavailable = false, promotionUnavailable = false, stalePromotion = false, holdName = "", releaseHeld;
 let held = Promise.resolve();
 if (extraOwner) {
   currentSnapshot=structuredClone(snapshot);currentContinuity=structuredClone(continuity);
   const another={...structuredClone(record),id:"repo:synthetic-second-owner",name:"synthetic-second-owner"};currentSnapshot.records.push(another);
   const canonical={...structuredClone(continuity.inventory.find(item=>item.record_id===record.id)),record_id:another.id,name:another.name};currentContinuity.inventory.push(canonical);
 }
 const prepared = workspaceInventoryLifecyclePreparationFixture({ ...record, posture: "suspended", version: record.version + 1 });
 page.on("pageerror", e => errors.push(String(e)));
 await page.route("**/api/**", route => {
  const req = route.request(), path = new URL(req.url()).pathname;
  if(path === "/api/console/capabilities")return route.fulfill({json:{artifactType:"console-runtime-capability-projection",schemaVersion:1,mode:"live",capabilities:[]}});
  if(path === "/api/workspace-registry" || path === "/api/workspace-continuity") return unavailable
   ? route.fulfill({status:503,json:{error:"Synthetic source unavailable",code:"inspection_source_unavailable"}})
   : route.fulfill({json:path === "/api/workspace-registry" ? currentSnapshot : currentContinuity});
  if(path === "/api/workspace-registry/preparations" && promotion) {
   preparations.push(req.postDataJSON());
   if(promotionUnavailable) return route.fulfill({status:503,json:{error:"Synthetic promotion source unavailable"}});
   return route.fulfill({json:{schema_version:1,workflow_id:"workspace-inventory-promotion",canonical_mutation:false,
    authority_revision:stalePromotion ? "f".repeat(40) : snapshot.authority_revision,
    canonical_authority:{branch:"main",repo:"workspace-governance",intake_path:"contracts/intake-register.yaml",inventory_path:"contracts/components.yaml"},
    target:candidate.target,intake_entry_ref:candidate.intake_entry_ref,
    expected_state:{active_inventory_digest:digest("a"),active_record_digest:null,active_record_version:null,intake_entry_digest:candidate.intake_entry_ref.digest,intake_entry_version:candidate.intake_entry_ref.version,intake_register_digest:digest("b")}}});
  }
  if(path === "/api/workspace-registry/lifecycle/preparations") {
   preparations.push(req.postDataJSON());
   const target=req.postDataJSON().target;
   const sourceRecord=currentSnapshot.records.find(item=>item.id===target.record_id);
   if (intake && ownerUnavailable) return route.fulfill({status:503,json:{error:"Synthetic owner lookup unavailable"}});
   const value=intake && sourceRecord ? workspaceInventoryLifecyclePreparationFixture(sourceRecord) : prepared;
   if (intake && target.name === holdName) return held.then(()=>route.fulfill({json:value}));
   return route.fulfill({json:value});
  }
  if(path === "/api/workspace-registry/lifecycle/requests" && req.method() === "GET") return route.fulfill({json:{schema_version:1,workflow_id:"workspace-inventory-lifecycle",target:{kind:new URL(req.url()).searchParams.get("target_kind"),name:new URL(req.url()).searchParams.get("target_name"),record_id:`${new URL(req.url()).searchParams.get("target_kind")}:${new URL(req.url()).searchParams.get("target_name")}`},revision:0,pending_request_count:0,updated_at:null,records:[],next_cursor:null,canonical_mutation:false}});
  if(path.startsWith("/api/workspace-registry/promotions/") && req.method() === "GET") {originalReads.push(decodeURIComponent(path.split('/').at(-1)));return route.fulfill({status:503,json:{error:"Synthetic original read unavailable"}});}
  if(path === "/api/workspace-registry/promotions" && req.method() === "GET") return route.fulfill({json:{schema_version:1,workflow_id:"workspace-inventory-promotion",target:promotion ? candidate.target : {kind:record.kind,name:record.name,record_id:record.id},revision:0,pending_request_count:0,updated_at:null,records:[],next_cursor:null,canonical_mutation:false}});
  if(path.startsWith("/api/workspace-intake/requests") && req.method() === "GET") {
   const query = new URL(req.url()).searchParams, kind = query.get("target_kind"), name = query.get("target_name");
   return route.fulfill({json:{schema_version:1,workflow_id:"workspace-intake",target:{kind,name,record_id:`${kind}:${name}`},source_class:"direct",custody_request_id:null,revision:0,pending_request_count:0,updated_at:null,records:[],next_cursor:null}});
  }
  if(intake && path === "/api/workspace-intake/preparations") {
   const target = req.postDataJSON().target;
   return route.fulfill({json:{schema_version:1,workflow_id:"workspace-intake",canonical_mutation:false,
    authority_revision:snapshot.authority_revision,canonical_authority:{branch:"main",path:"contracts/intake-register.yaml",repo:"workspace-governance"},
    target:{...target,record_id:`${target.kind}:${target.name}`},expected_state:{record_digest:null,record_version:null,register_digest:digest("b")}}});
  }
  if(submitPromotion && path === "/api/workspace-registry/promotions" && req.method() === "POST") {
   writes.push({path,body:req.postDataJSON()});if(submitPromotion === "unavailable") return route.fulfill({status:503,json:{error:"Synthetic submission outcome unavailable"}});return route.fulfill({json:{...workspaceInventoryResultFixture,request_id:req.postDataJSON().request_id}});
  }
  if(!["GET","HEAD","OPTIONS"].includes(req.method())) { writes.push(path); return route.fulfill({status:503,json:{error:"Synthetic owner isolated",code:"inspection_owner_unavailable"}}); }
  return route.fulfill({status:503,json:{error:"Synthetic owner isolated",code:"inspection_owner_unavailable",mode:"live",status:"offline"}});
 });
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>{const e=document.querySelector('button[title="Workspace Registry"]');return e&&Object.keys(e).some(k=>k.startsWith('__reactProps$'))},undefined,{timeout:60000});
 await page.locator('button[title="Workspace Registry"]').click();
 const workspace = page.getByRole("dialog",{name:"Workspace Registry",exact:true});
 if(!fail) await expect(workspace.locator("tbody tr")).toHaveCount(currentSnapshot.records.length);
 function advanceSource() {
   currentSnapshot = structuredClone(snapshot); currentContinuity = structuredClone(continuity);
   const r = currentSnapshot.records.find(item => item.id === record.id), i = currentContinuity.inventory.find(item => item.record_id === record.id);
   r.version = prepared.expected_state.record_version; r.posture = prepared.expected_state.posture; r.record_digest = prepared.expected_state.record_digest;
   i.record_version = r.version; i.posture = r.posture; i.record_digest = r.record_digest;
 }
 return {workspace, prepared, writes, errors, preparations, originalReads, advanceSource,
   failPromotion: value=>{promotionUnavailable=value;}, stalePromotion: value=>{stalePromotion=value;},
   failOwner: value=>{ownerUnavailable=value;},
   holdOwner: name=>{holdName=name;held=new Promise(resolve=>{releaseHeld=resolve;});},
   releaseOwner: ()=>{holdName="";releaseHeld?.();},
   fail: value => { unavailable = value; }};
}
for(const width of [1280,1700]) test(`Registry scan columns and full lineage remain readable at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?800:1000});const h=await setup(page),w=h.workspace;
 const table=await w.locator('table').evaluate(t=>({overflow:t.parentElement.scrollWidth-t.parentElement.clientWidth,headers:[...t.querySelectorAll('th')].map(h=>({text:h.innerText,width:h.getBoundingClientRect().width,height:h.getBoundingClientRect().height})),rows:[...t.querySelectorAll('tbody tr')].map(r=>r.getBoundingClientRect().height)}));
 expect(table.overflow).toBeLessThan(3);expect(table.headers.every(h=>h.width>80&&h.height<70)).toBe(true);expect(table.rows.every(h=>h<170)).toBe(true);
 expect(table.headers.map(h=>h.text.toLowerCase())).toEqual(['record','type','responsible repositories','status']);
 for(const row of await w.locator('tbody tr').all())await expect(row.locator('td').nth(1).locator('[data-size="compact"][data-wrap="nowrap"]')).toHaveCount(1);
 const side=w.locator('[data-teras-record-control-layout] aside'),scroll=side.locator('[data-teras-panel-stack][data-scroll="true"]');await expect(scroll).toHaveCount(1);
 const evidence=side.getByRole('heading',{name:'Record origin and changes',exact:true}).locator('xpath=ancestor::section[1]');
 const gaps=await evidence.evaluate(panel=>{const children=[...panel.children],boxes=children.map(e=>e.getBoundingClientRect());return boxes.slice(1).map((box,i)=>box.top-boxes[i].bottom);});
 expect(gaps.length).toBe(2);expect(gaps.every(gap=>gap>=8)).toBe(true);
 await side.getByText('Record details',{exact:true}).click();await expect(side).toContainText(record.record_digest);await expect(side).toContainText(record.last_mutation.id);await expect(side.getByText('Receipt',{exact:true})).toHaveCount(0);
 const box=await scroll.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,5000);
 const detailBox=await side.locator('details > div').boundingBox();await page.mouse.move(detailBox.x+detailBox.width/2,Math.min(detailBox.y+detailBox.height/2,(width===1280?800:1000)-100));await page.mouse.wheel(0,5000);
 const last=side.getByText(snapshot.projection_digest,{exact:true});await expect.poll(()=>last.evaluate(e=>{const r=e.getBoundingClientRect(),s=e.closest('[data-teras-panel-stack]'),b=s.getBoundingClientRect();return r.top>=b.top-1&&r.bottom<=b.bottom+1;})).toBe(true);
 await w.getByRole('button',{name:/Eligible/}).click();await expect(w.locator('tbody tr')).toHaveCount(snapshot.eligible_promotions.length);await expect(w.getByRole('columnheader')).toHaveText(['Record','Type','Responsible repositories','Status']);await w.getByRole('searchbox',{name:'Search eligible',exact:true}).fill('unknown-search-value');await expect(w.getByText('No record matches the current filters.',{exact:true})).toBeVisible();
 expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});
test('Unknown source totals stay unknown; failed refresh shows a full-section retry and recovers',async({page})=>{
 await page.clock.install();const h=await setup(page,{fail:true}),w=h.workspace;await expect(w.getByText('Registry unavailable',{exact:true})).toBeVisible();
 const summary=w.locator('[aria-label="Workspace Registry summary"]');await expect(summary).toContainText('—');
 h.fail(false);await w.getByRole('button',{name:'Refresh Registry',exact:true}).click();await expect(w.locator('tbody tr')).toHaveCount(snapshot.records.length);
 h.fail(true);await page.clock.fastForward(16000);await expect(w.getByText('Retained',{exact:true})).toBeVisible();await expect(w.locator('tbody tr')).toHaveCount(0);await expect(w.getByRole('button',{name:'Retry registry read',exact:true})).toBeVisible();
 h.fail(false);await w.getByRole('button',{name:'Refresh Registry',exact:true}).click();await expect(w.getByRole('button',{name:'Manage Lifecycle',exact:true})).toBeEnabled();expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});
test('Fresh lifecycle preparation controls every reviewed posture/version and unfinished changes are guarded',async({page})=>{
 const h=await setup(page),w=h.workspace;await w.getByRole('button',{name:'Manage Lifecycle',exact:true}).click();const d=page.getByRole('dialog',{name:'Manage workspace item',exact:true});
 await expect(d.getByText('Refresh required',{exact:true}).first()).toBeVisible();await expect(d.getByRole('button',{name:'Review Action',exact:true})).toBeDisabled();h.advanceSource();
 await d.getByRole('button',{name:'Refresh record',exact:true}).click();await expect(d.getByRole('radio',{name:/Restore Record/})).toBeEnabled();await expect(d.getByRole('radio',{name:/Suspend Record/})).toBeDisabled();await d.getByRole('radio',{name:/Restore Record/}).click();
 await d.getByRole('textbox',{name:'Reason',exact:true}).fill('Restore after reviewing the current owner state.');await d.getByRole('textbox',{name:'Approval reference',exact:true}).fill('synthetic://approval/current');await d.getByRole('button',{name:'Acknowledge Workspace Inventory lifecycle impact',exact:true}).click();await expect(d.getByRole('button',{name:'Restore Record',exact:true})).toBeEnabled();await expect(d.getByRole('button',{name:'Review Action',exact:true})).toHaveCount(0);await expect(d.locator('[data-teras-progress-step-list]')).toHaveCount(0);
 await expect(d).toContainText(`version ${h.prepared.expected_state.record_version}`);const current=d.getByText('Current status',{exact:true}).locator('..');await expect(current).toContainText('suspended');const next=d.getByText('Resulting status',{exact:true}).locator('..');await expect(next).toContainText('active');
 await d.getByRole('button',{name:'Close modal',exact:true}).click();const guard=page.getByRole('alertdialog',{name:'Discard Lifecycle Draft?',exact:true});await guard.getByRole('button',{name:'Keep Editing',exact:true}).click();await expect(d.getByRole('textbox',{name:'Reason',exact:true})).toHaveValue('Restore after reviewing the current owner state.');
 expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});
test('History-only promotion never labels review/apply complete before an original request is selected',async({page})=>{
 const h=await setup(page);await h.workspace.getByRole('button',{name:'View Promotion Requests',exact:true}).click();const d=page.getByRole('dialog',{name:'Promotion History',exact:true});await expect(d.getByText('No previous requests for this item.',{exact:true})).toBeVisible();await expect(d.getByText('Choose a request',{exact:true})).toHaveCount(0);await expect(d.locator('[data-teras-progress-step-list]')).toHaveCount(0);await expect(d.locator('[data-teras-wizard-shell]')).toHaveCount(0);await expect(d.locator('[data-teras-modal]')).toHaveAttribute('data-height','content');expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});
test('Direct Intake authored metadata survives Keep Editing and requires explicit discard',async({page})=>{
 const h=await setup(page);await h.workspace.getByRole('button',{name:'Onboard workspace item',exact:true}).click();let d=page.getByRole('dialog',{name:'Workspace onboarding',exact:true});await chooseRegistrationType(page,d,'Product');await d.getByRole('textbox',{name:'Short name',exact:true}).fill('synthetic-new-product');await d.getByRole('button',{name:'Continue registration',exact:true}).click();d=page.getByRole('dialog',{name:/^(Product|Component) details$/,exact:true});const notes=d.getByRole('textbox',{name:'What does this item do?',exact:true});await notes.fill('Preserve this operator-authored boundary draft.');await d.getByRole('button',{name:'Close modal',exact:true}).click();let guard=page.getByRole('alertdialog',{name:'Discard Intake Draft?',exact:true});await guard.getByRole('button',{name:'Keep Editing',exact:true}).click();await expect(notes).toHaveValue('Preserve this operator-authored boundary draft.');await d.getByRole('button',{name:'Change item',exact:true}).click();guard=page.getByRole('alertdialog',{name:'Discard Intake Draft?',exact:true});await guard.getByRole('button',{name:'Discard Draft',exact:true}).click();await expect(page.getByRole('dialog',{name:'Workspace onboarding',exact:true})).toBeVisible();expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

test('Disconnected preview exposes Intake forms for review with every owner request and submission disabled',async({page})=>{
 const calls=[];await page.route('**/api/**',route=>{const path=new URL(route.request().url()).pathname;calls.push({path,method:route.request().method()});if(path==='/api/workspace-registry')return route.fulfill({status:503,json:{code:'workspace_registry_live_mode_required',error:'Disconnected preview'}});if(path==='/api/workspace-continuity')return route.fulfill({status:503,json:{code:'workspace_continuity_live_mode_required',error:'Disconnected preview'}});return route.fulfill({status:503,json:{error:'Unrelated source isolated',mode:'live',status:'offline'}});});
 await page.goto(base+'/?dev=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>{const e=document.querySelector('button[title="Workspace Registry"]');return e&&Object.keys(e).some(k=>k.startsWith('__reactProps$'))},undefined,{timeout:60000});await page.locator('button[title="Workspace Registry"]').click();const w=page.getByRole('dialog',{name:'Workspace Registry',exact:true});await w.getByRole('button',{name:'Onboard workspace item',exact:true}).click();const target=page.getByRole('dialog',{name:'Workspace onboarding',exact:true});await chooseRegistrationType(page,target,'Product');await target.getByRole('textbox',{name:'Short name',exact:true}).fill('synthetic-read-only-preview');await target.getByRole('button',{name:'Preview registration form',exact:true}).click();const d=page.getByRole('dialog',{name:/^(Product|Component) details$/,exact:true});await expect(d).toContainText('Preview only.');await expect(d.getByRole('button',{name:'Review registration',exact:true})).toBeDisabled();await expect(d.getByRole('button',{name:'Retry request history',exact:true})).toHaveCount(0);expect(calls.some(c=>c.path.startsWith('/api/workspace-intake'))).toBe(false);expect(calls.some(c=>c.method==='POST')).toBe(false);
});


for(const kind of ['Product','Component']) test(`${kind} guided registration collects metadata automatically and retains understandable review`,async({page})=>{
 await page.setViewportSize({width:1280,height:800});const h=await setup(page,{intake:true});await h.workspace.getByRole('button',{name:'Onboard workspace item',exact:true}).click();let d=page.getByRole('dialog',{name:'Workspace onboarding',exact:true});await chooseRegistrationType(page,d,kind);
 await d.getByRole('textbox',{name:'Short name',exact:true}).fill('Invalid name!');await d.getByRole('button',{name:'Continue registration',exact:true}).click();await expect(d.getByText('Use a short name starting with a lowercase letter or number. Only lowercase letters, numbers, dots, hyphens and underscores are allowed.',{exact:true})).toBeVisible();const name='synthetic-complete-'+kind.toLowerCase();await d.getByRole('textbox',{name:'Short name',exact:true}).fill(name);await d.getByRole('button',{name:'Continue registration',exact:true}).click();d=page.getByRole('dialog',{name:kind+' details',exact:true});const review=d.getByRole('button',{name:'Review registration',exact:true});await expect(review).toBeEnabled();await review.click();await expect(d.getByRole('alert')).toBeFocused();await expect(d.getByRole('alert')).toContainText('Describe what this');
 const field=label=>d.getByRole('textbox',{name:label,exact:true});await field('What does this item do?').fill('Synthetic '+kind+' boundary retained through review.');await review.click();await expect(d.getByRole('alert')).toBeFocused();await expect(d.getByRole('alert')).toContainText('Choose how this item will be checked.');
 await d.getByLabel('How will this item be checked?',{exact:true}).click();await page.getByRole('option',{name:'The repository maintains its source checks',exact:true}).click();
 async function selectOwner(label){const control=d.getByLabel(label,{exact:true});await control.focus();await page.keyboard.press('Enter');await page.getByRole('option',{name:'workspace-governance',exact:true}).click();await expect(control).toContainText('workspace-governance');}
 await selectOwner('Security repository');if(kind==='Product'){await selectOwner('Platform repository');await selectOwner('Runtime repository');await d.getByRole('button',{name:'Add source repository workspace-governance',exact:true}).click();await d.getByLabel('What will be handed over?',{exact:true}).click();await page.getByRole('option',{name:'Source code maintained in its repository',exact:true}).click();}else{await selectOwner('Responsible repository');await d.getByLabel('What kind of component is this?',{exact:true}).click();await page.getByRole('option',{name:'Shared infrastructure service',exact:true}).click();await expect(d.getByLabel('Which product does it support?',{exact:true})).toContainText('No product association');}
 await expect(d.getByText("Repository setup loaded",{exact:true})).toBeVisible();await expect(d.getByRole('textbox',{name:'Validation posture',exact:true})).toHaveCount(0);await expect(field('Supporting links (optional)')).toHaveValue('');await expect(field('Additional checks or limits (optional)')).toHaveValue('');
 await review.click();d=page.getByRole('dialog',{name:'Review workspace classification',exact:true});await expect(d.getByRole('button',{name:'Review Classification',exact:true})).toHaveCount(0);await expect(d.locator('[data-teras-progress-step-list]')).toHaveCount(0);await d.getByRole('radio',{name:'Proposed',exact:true}).click();await expect(d.getByRole('button',{name:'Submit Classification',exact:true})).toBeDisabled();
 for(const width of [1280,1700]){await page.setViewportSize({width,height:width===1280?800:1000});const metadata=d.getByText('Registration details',{exact:true}).locator('..');await expect(metadata).toContainText('workspace-governance');await expect(metadata).toContainText('The repository maintains its source checks');await expect(metadata).toContainText(kind==='Product'?'Source code maintained in its repository':'Shared infrastructure service');await d.getByText('Purpose, validation and evidence',{exact:true}).click();await expect(d).toContainText('Synthetic '+kind+' boundary retained through review.');await expect(d).toContainText('git://workspace-governance/');await expect(d).toContainText('Recorded owner plan:');await expect(d).toContainText('not proof that this new item passed');await d.getByText('Purpose, validation and evidence',{exact:true}).click();
 await expect(d.locator('[data-teras-wizard-shell]')).toHaveCount(0);await expect(d.locator('[data-teras-modal]')).toHaveAttribute('data-width','standard');await expect(d.locator('[data-teras-modal]')).toHaveAttribute('data-height','content');const acceptance=d.getByRole('button',{name:'Confirm the Workspace Intake review',exact:true}),region=d.locator('[data-teras-modal] > div').first(),box=await region.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,5000);await expect.poll(()=>acceptance.evaluate(e=>{const r=e.getBoundingClientRect();for(let a=e.parentElement;a;a=a.parentElement){const c=getComputedStyle(a),b=a.getBoundingClientRect();if(['auto','scroll','hidden','clip'].includes(c.overflowY)&&(r.top<b.top-1||r.bottom>b.top+a.clientHeight+1))return false;}return true;})).toBe(true);await page.screenshot({path:test.info().outputPath(kind.toLowerCase()+'-review-'+width+'.png')});}
 await d.getByRole('button',{name:'Confirm the Workspace Intake review',exact:true}).click();await expect(d.getByRole('button',{name:'Submit Classification',exact:true})).toBeEnabled();
 for(const decision of ['Out of scope','Admitted']){await d.getByRole('radio',{name:decision,exact:true}).click();await expect(d.getByRole('button',{name:'Submit Classification',exact:true})).toBeDisabled();const detail=d.getByText(kind==='Product'?'Delivery target':'Responsible repository',{exact:true}).locator('..');await expect(detail).toContainText(decision==='Out of scope'?'Not in scope':kind==='Product'?'Source code maintained in its repository':'workspace-governance');}
 await d.getByRole('button',{name:'Back to item details',exact:true}).click();d=page.getByRole('dialog',{name:kind+' details',exact:true});await expect(d.getByRole('textbox',{name:'What does this item do?',exact:true})).toHaveValue('Synthetic '+kind+' boundary retained through review.');await expect(d.getByLabel('How will this item be checked?',{exact:true})).toContainText('The repository maintains its source checks');expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

test('Automatic owner lookup failure preserves the registration draft and requires current source before review',async({page})=>{
 const h=await setup(page,{intake:true});h.failOwner(true);await h.workspace.getByRole('button',{name:'Onboard workspace item',exact:true}).click();const target=page.getByRole('dialog',{name:'Workspace onboarding',exact:true});await chooseRegistrationType(page,target,'Product');await target.getByRole('textbox',{name:'Short name',exact:true}).fill('synthetic-outage-draft');await target.getByRole('button',{name:'Continue registration',exact:true}).click();const d=page.getByRole('dialog',{name:'Product details',exact:true});await d.getByRole('textbox',{name:'What does this item do?',exact:true}).fill('Keep the authored purpose during owner source failure.');await d.getByLabel("Runtime repository",{exact:true}).click();await page.getByRole('option',{name:'workspace-governance',exact:true}).click();await expect(d.getByText("Repository setup needed",{exact:true})).toBeVisible();await expect(d).toContainText('current validation setup could not be read');await expect(d.getByRole('textbox',{name:'What does this item do?',exact:true})).toHaveValue('Keep the authored purpose during owner source failure.');h.failOwner(false);await d.getByRole('button',{name:"Refresh repository setup",exact:true}).click();await expect(d.getByText("Repository setup loaded",{exact:true})).toBeVisible();expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});
test('A delayed owner response cannot replace the newly selected validation source',async({page})=>{
 const h=await setup(page,{intake:true,extraOwner:true});h.holdOwner('workspace-governance');try{
 await h.workspace.getByRole('button',{name:'Onboard workspace item',exact:true}).click();const target=page.getByRole('dialog',{name:'Workspace onboarding',exact:true});await chooseRegistrationType(page,target,'Product');await target.getByRole('textbox',{name:'Short name',exact:true}).fill('synthetic-owner-switch');await target.getByRole('button',{name:'Continue registration',exact:true}).click();const d=page.getByRole('dialog',{name:'Product details',exact:true});const choose=async name=>{await d.getByLabel('Repository with the validation plan',{exact:true}).click();await page.getByRole('option',{name,exact:true}).click();};await choose('workspace-governance');await expect(d.getByText("Reading repository setup…",{exact:true}).first()).toBeVisible();await choose('synthetic-second-owner');await expect(d.getByText("Repository setup loaded",{exact:true})).toBeVisible();h.releaseOwner();await d.getByRole('button',{name:'Advanced validation settings',exact:true}).click();await d.getByText('Collected source details',{exact:true}).click();await expect(d.getByText(/#synthetic-second-owner$/)).toHaveCount(1);await expect(d.getByText(/#workspace-governance$/)).toHaveCount(0);expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
 } finally {h.releaseOwner();}
});

for(const width of [1280,1700]) test(`Promotion is one review with automatic current source at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1280?800:1000});const h=await setup(page,{promotion:true});const w=h.workspace;
 await w.getByRole('button',{name:/Eligible/}).click();await w.getByRole('button',{name:'Review activation',exact:true}).click();const d=page.getByRole('dialog',{name:'Review Promotion',exact:true});
 await expect(d.getByRole('button',{name:'Add to Registry',exact:true})).toBeEnabled();await expect(d.locator('[data-teras-progress-step-list]')).toHaveCount(0);await expect(d.locator('[data-teras-wizard-shell]')).toHaveCount(0);await expect(d.locator('[data-teras-modal]')).toHaveAttribute('data-width','standard');await expect(d.locator('[data-teras-modal]')).toHaveAttribute('data-height','content');expect(h.preparations).toHaveLength(1);
 await d.getByText('Approval and source details',{exact:true}).click();await expect(d).toContainText(candidate.approval_refs[0]);await expect(d).toContainText(candidate.candidate_digest);
 await page.screenshot({path:test.info().outputPath('promotion-'+width+'.png')});
 h.stalePromotion(true);await d.getByRole('button',{name:'Refresh source',exact:true}).click();await expect(d.getByRole('button',{name:'Add to Registry',exact:true})).toBeDisabled();
 h.stalePromotion(false);h.failPromotion(true);await d.getByRole('button',{name:'Refresh source',exact:true}).click();await expect(d).toContainText('Synthetic promotion source unavailable');await expect(d.getByRole('button',{name:'Add to Registry',exact:true})).toBeDisabled();
 expect(h.preparations).toHaveLength(3);h.failPromotion(false);await d.getByRole('button',{name:'Refresh source',exact:true}).click();await expect(d.getByRole('button',{name:'Add to Registry',exact:true})).toBeEnabled();expect(h.preparations).toHaveLength(4);expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});
test('Metadata editing retains untouched fields and reviews the exact requested record',async({page})=>{
 await page.setViewportSize({width:1280,height:800});const h=await setup(page);h.advanceSource();await h.workspace.getByRole('button',{name:'Manage Lifecycle',exact:true}).click();let d=page.getByRole('dialog',{name:'Manage workspace item',exact:true});
 await expect(d.getByRole('textbox',{name:'Validation notes',exact:true})).toBeEnabled();await expect(d.getByRole('textbox',{name:'Complete record value (JSON)',exact:true})).toHaveCount(0);
 const note='Synthetic owner notes kept with all unchanged validation bindings.';await d.getByRole('textbox',{name:'Validation notes',exact:true}).fill(note);await d.getByRole('button',{name:'Edit complete record',exact:true}).click();const json=d.getByRole('textbox',{name:'Complete record value (JSON)',exact:true});const requested=JSON.parse(await json.inputValue());const {record:_envelope,...original}=h.prepared.current_record;
 expect(requested).toEqual({...original,validation_behavior:{...original.validation_behavior,notes:note}});
 await json.fill('{');await expect(d).toContainText('Record value must be valid JSON.');await expect(d.getByRole('button',{name:'Review Action',exact:true})).toBeDisabled();await json.fill(JSON.stringify(requested,null,2));await d.getByRole('button',{name:'Hide complete record',exact:true}).click();
 await d.getByRole('textbox',{name:'Reason',exact:true}).fill('Update the current validation description after owner review.');await d.getByRole('textbox',{name:'Approval reference',exact:true}).fill('synthetic://approval/metadata');await d.getByRole('button',{name:'Acknowledge Workspace Inventory lifecycle impact',exact:true}).click();await d.getByRole('button',{name:'Review Action',exact:true}).click();d=page.getByRole('dialog',{name:'Confirm metadata change',exact:true});await expect(d.locator('[data-teras-wizard-shell]')).toHaveCount(0);await expect(d.getByRole('button',{name:'Update Metadata',exact:true})).toBeDisabled();await d.getByText('Reviewed record details',{exact:true}).click();await expect(d.getByText('Requested metadata',{exact:true}).locator('..')).toContainText(note);await d.getByRole('button',{name:'Confirm Workspace Inventory lifecycle action',exact:true}).click();await expect(d.getByRole('button',{name:'Update Metadata',exact:true})).toBeEnabled();await page.screenshot({path:test.info().outputPath('metadata-review.png')});
 await d.getByRole('button',{name:'Back',exact:true}).click();d=page.getByRole('dialog',{name:'Manage workspace item',exact:true});await expect(d.getByRole('textbox',{name:'Validation notes',exact:true})).toHaveValue(note);await d.getByRole('button',{name:'Close modal',exact:true}).click();await expect(page.getByRole('alertdialog',{name:'Discard Lifecycle Draft?',exact:true})).toBeVisible();expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

test('Existing component owner edits use registered choices and preserve the rest of the record',async({page})=>{
 const h=await setup(page,{intake:true});const component=snapshot.records.find(item=>item.kind==='component');await h.workspace.locator('tbody tr').filter({hasText:component.name}).click();await h.workspace.getByRole('button',{name:'Manage Lifecycle',exact:true}).click();const d=page.getByRole('dialog',{name:'Manage workspace item',exact:true});const owner=d.getByLabel('Responsible repository',{exact:true});await expect(owner).toContainText(component.owner_refs[0]);await owner.click();await page.getByRole('option',{name:'workspace-governance',exact:true}).click();await d.getByRole('button',{name:'Edit complete record',exact:true}).click();const next=JSON.parse(await d.getByRole('textbox',{name:'Complete record value (JSON)',exact:true}).inputValue());const {record:_envelope,...original}=workspaceInventoryLifecyclePreparationFixture(component).current_record;expect(next).toEqual({...original,owner_repo:'workspace-governance'});expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

test('Automatic record preparation keeps the pending draft in place until the source returns',async({page})=>{
 const h=await setup(page,{intake:true});h.holdOwner(record.name);try{await h.workspace.getByRole('button',{name:'Manage Lifecycle',exact:true}).click();const d=page.getByRole('dialog',{name:'Manage workspace item',exact:true});await expect(d.getByRole('radio',{name:/Update Metadata/})).toBeDisabled();await expect(d.getByRole('button',{name:'Back to Registry',exact:true})).toBeDisabled();await d.getByRole('button',{name:'Close modal',exact:true}).click();await expect(d).toBeVisible();h.releaseOwner();await expect(d.getByRole('radio',{name:/Update Metadata/})).toBeEnabled();await expect(d.getByRole('button',{name:'Back to Registry',exact:true})).toBeEnabled();expect(h.preparations).toHaveLength(1);expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);}finally{h.releaseOwner();}
});

test('Explicit promotion opens a separate acknowledgement and never claims an accepted request is completed',async({page})=>{
 const h=await setup(page,{promotion:true,submitPromotion:true});await h.workspace.getByRole('button',{name:/Eligible/}).click();await h.workspace.getByRole('button',{name:'Review activation',exact:true}).click();let d=page.getByRole('dialog',{name:'Review Promotion',exact:true});await d.getByRole('button',{name:'Add to Registry',exact:true}).click();d=page.getByRole('dialog',{name:'Promotion submitted',exact:true});await expect(d).toBeVisible();await expect(page.getByRole('dialog',{name:'Review Promotion',exact:true})).toHaveCount(0);await expect(d.locator('[data-teras-wizard-shell]')).toHaveCount(0);await expect(d.getByRole('button',{name:'Continue Request',exact:true})).toBeVisible();expect(h.writes).toHaveLength(1);await d.getByText('Request and receipt details',{exact:true}).click();await expect(d).toContainText(h.writes[0].body.request_id);await expect(page.getByRole('dialog',{name:'Item added to Registry',exact:true})).toHaveCount(0);await d.getByRole('button',{name:'Back to Registry',exact:true}).click();await expect(h.workspace).toBeVisible();expect(h.errors).toEqual([]);
});

test('Unconfirmed promotion keeps original-request recovery in the separate feedback dialog',async({page})=>{
 const h=await setup(page,{promotion:true,submitPromotion:'unavailable'});await h.workspace.getByRole('button',{name:/Eligible/}).click();await h.workspace.getByRole('button',{name:'Review activation',exact:true}).click();await page.getByRole('dialog',{name:'Review Promotion',exact:true}).getByRole('button',{name:'Add to Registry',exact:true}).click();const d=page.getByRole('dialog',{name:'Submission needs attention',exact:true});await expect(d).toBeVisible();await expect(d).toContainText('No confirmed outcome is available');await expect(d.getByRole('button',{name:'Check original request',exact:true})).toBeEnabled();await expect(d.getByRole('button',{name:'Add to Registry',exact:true})).toHaveCount(0);expect(h.writes).toHaveLength(1);await d.getByRole('button',{name:'Check original request',exact:true}).click();expect(h.originalReads).toEqual([h.writes[0].body.request_id]);expect(h.writes).toHaveLength(1);expect(h.errors).toEqual([]);
});

test("internal project promotion preserves the existing review interface and shows its actual private-storage receipt", async ({ page }, testInfo) => {
  const h = await setup(page), prepared = nativePromotionPreparation();
  let command = null, current = null;
  const submissions = [], selections = [];
  await page.route("**/api/workspace-registry**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    if (path === "/api/workspace-registry") {
      const scope = url.searchParams.get("scope") ?? "inventory", query = url.searchParams.get("query") ?? "";
      selections.push({ scope, query, after: url.searchParams.get("after") });
      const internal = nativePageFixture(scope, scope === "inventory" ? current : null);
      if (scope === "eligible" && current || query && !prepared.target.record_id.includes(query)) {
        internal.records = []; internal.eligible_promotions = [];
        internal.counts = { intake: { "out-of-scope": 0, proposed: 0, admitted: 0 }, inventory: { active: 0, suspended: 0, retired: 0 } };
      }
      const { projection_digest: _old, ...body } = internal, instancePage = nativeBind(body, "projection_digest");
      return route.fulfill({ json: nativeBind({ schema_version: 1, workflow_id: "workspace-registry-view", canonical_mutation: false,
        authority_revision: snapshot.authority_revision, legacy_snapshot: snapshot, instance_page: instancePage,
        source_authorities: { legacy: snapshot.canonical_authority, instance: instancePage.authority },
        records: [...snapshot.records, ...instancePage.records], eligible_promotions: [...snapshot.eligible_promotions, ...instancePage.eligible_promotions],
        projected_at: nativeAt, projection_id: "synthetic-internal-registry-preview" }, "projection_digest") });
    }
    if (path === "/api/workspace-registry/preparations" && request.postDataJSON().target.record_id === prepared.target.record_id) return route.fulfill({ json: prepared });
    if (path === "/api/workspace-registry/promotions" && request.method() === "GET" && url.searchParams.get("target_name") === prepared.target.name) return route.fulfill({ json: {
      schema_version: 1, workflow_id: "workspace-inventory-promotion", canonical_mutation: false, target: prepared.target,
      revision: 0, pending_request_count: 0, updated_at: null, records: [], next_cursor: null } });
    if (path === "/api/workspace-registry/promotions" && request.method() === "POST") {
      const input = request.postDataJSON(); submissions.push(input);
      expect(input.reviewed_preparation.authority_kind).toBe("internal-instance-record");
      expect(input.candidate).toEqual(prepared.candidate);
      command = buildInstanceInventoryCommand({ preparation: prepared, requestId: input.request_id, action: "promote",
        requestedValue: input.candidate.active_record.value, approvalRefs: input.candidate.approval_refs,
        impactAcknowledgements: [], reason: null, callerId: nativeConfig.callerId, now: new Date(nativeAt) }, nativeDigest);
      return route.fulfill({ json: nativeInventoryResult(command) });
    }
    if (command && path.endsWith("/continue")) {
      const completed = nativeInventoryResult(command, "succeeded"); current = completed.readback;
      return route.fulfill({ json: completed });
    }
    return route.fallback();
  });
  await h.workspace.getByRole("button", { name: "Refresh Registry", exact: true }).click();
  await h.workspace.getByRole("button", { name: /Eligible/ }).click();
  const row = h.workspace.locator("tbody tr").filter({ hasText: prepared.target.name });
  await expect(row).toBeVisible(); await row.click();
  await h.workspace.getByRole("button", { name: "Review activation", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Review Promotion", exact: true });
  await expect(review.getByRole("button", { name: "Add to Registry", exact: true })).toBeEnabled();
  await review.getByRole("button", { name: "Add to Registry", exact: true }).click();
  const accepted = page.getByRole("dialog", { name: "Promotion submitted", exact: true });
  await expect(accepted).toContainText("Operator approval recorded");
  expect(current).toBeNull();
  await accepted.getByRole("button", { name: "Continue Request", exact: true }).click();
  await expect(page.getByText("Item added to Registry", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to Registry", exact: true }).click();
  await h.workspace.getByRole("button", { name: /01.*Registry|Registry.*shown/ }).click();
  const recorded = h.workspace.locator("tbody tr").filter({ hasText: prepared.target.name });
  await expect(recorded).toBeVisible(); await recorded.click();
  await h.workspace.getByText("Record details", { exact: true }).click();
  await expect(h.workspace).toContainText("Private installation storage");
  expect(submissions).toHaveLength(1);
  expect(selections.some(selection => selection.scope === "eligible")).toBe(true);
  expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("internal-registry-promoted.png"), fullPage: true });
});

test('Inventory request history keeps Previous/Next ranges, global pending protection and a failed-read retry',async({page})=>{
 const h=await setup(page);let unavailable=false;const cursors=[];
 await page.route('**/api/workspace-registry/lifecycle/requests?**',route=>{
  if(unavailable)return route.fulfill({status:503,json:{error:'Synthetic request history unavailable'}});
  const query=new URL(route.request().url()).searchParams,cursor=query.get('cursor'),offset=cursor?parseInt(cursor,16):0;cursors.push(offset);
  const rows=Array.from({length:61},(_,i)=>({request_id:'workspace-inventory-lifecycle-request:history-'+i,status:'succeeded',revision:1,requested_at:'2026-11-01T00:00:00Z',updated_at:'2026-11-01T00:00:00Z',action:'update'}));
  return route.fulfill({json:{schema_version:1,workflow_id:'workspace-inventory-lifecycle',target:{kind:record.kind,name:record.name,record_id:record.id},revision:1000,pending_request_count:1,canonical_mutation:false,updated_at:'2026-11-01T00:00:00Z',records:rows.slice(offset,offset+25),next_cursor:offset+25<rows.length?(offset+25).toString(16).padStart(64,'0'):null}});
 });
 await h.workspace.getByRole('button',{name:'Manage Lifecycle',exact:true}).click();const d=page.getByRole('dialog',{name:'Manage workspace item',exact:true}),pager=d.getByRole('navigation',{name:'Inventory request history pages',exact:true});
 await expect(pager.getByRole('status')).toHaveText('Showing 1–25 · Page 1');await expect(d).toContainText('1 pending. Open the original request');await pager.getByRole('button',{name:'Inventory request history rows per page',exact:true}).click();await page.getByRole('option',{name:'100',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 1–61 · Page 1');await pager.getByRole('button',{name:'Inventory request history rows per page',exact:true}).click();await page.getByRole('option',{name:'25',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 1–25 · Page 1');await expect(d.getByRole('button',{name:'Refresh record',exact:true})).toBeDisabled();
 await pager.getByRole('button',{name:'Next page',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 26–50 · Page 2');await expect(d.getByRole('button',{name:'Refresh record',exact:true})).toBeDisabled();
 await pager.getByRole('button',{name:'Next page',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 51–61 · Page 3');await pager.getByRole('button',{name:'Previous',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 26–50 · Page 2');
 unavailable=true;await pager.getByRole('button',{name:'Next page',exact:true}).click();await expect(pager).toHaveCount(0);await expect(d.getByRole('button',{name:'Retry request history',exact:true})).toBeVisible();unavailable=false;await d.getByRole('button',{name:'Retry request history',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 26–50 · Page 2');
 expect(cursors).toContain(50);expect(cursors.filter(value=>value===25).length).toBeGreaterThan(1);expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

async function chooseRegistrationType(page, dialog, kind) {
 await dialog.getByLabel('Registration type',{exact:true}).click();
 await page.getByRole('option',{name:kind==='Product'?'Product — an application or service':'Component — a supporting service or library',exact:true}).click();
}

const {directWorkspaceIntakeCandidate, emptyDirectIntakeDraft} = require('../../src/console-integration/workspace-intake/workspace-intake-direct-candidate.ts');
async function chooseField(page, dialog, label, option) {
 const trigger=dialog.getByLabel(label,{exact:true});await trigger.click();
 const id=await trigger.getAttribute('aria-controls');
 await page.locator(`[id=${JSON.stringify(id)}]`).getByRole('option',{name:option,exact:true}).click();
}
for(const kind of ['product','component']) for(const decision of ['admitted','proposed','out-of-scope']) for(const recovered of [false,true]) {
 test(`${kind} ${decision} ${recovered?'original':'fresh'} outcome preserves classification stage and activation route`,async({page},info)=>{
  const h=await setup(page,{intake:true}),name=`synthetic-${kind}-${decision}`;
  const draft={...emptyDirectIntakeDraft,notes:'Synthetic source boundary retained for the exact item.',validationPosture:'covered-by-owner-repo',
   graphRole:kind==='product'?'product-readiness-aggregate':'shared-platform-component',validationNotes:'Synthetic repository validation.',evidence:'synthetic://review',
   platformOwner:'workspace-governance',runtimeOwner:'workspace-governance',securityOwner:'workspace-governance',sourceOwners:'workspace-governance',endpoint:'owner-managed-source',ownerRepo:'workspace-governance',componentClass:'shared-platform'};
  const origin=await directWorkspaceIntakeCandidate({kind,name},draft,['workspace-governance'],[]);
  const requestId='workspace-intake-request:synthetic-stage-proof',writes=[];
  const original={schema_version:1,workflow_id:'workspace-intake',request_id:requestId,revision:2,status:'succeeded',canonical_mutation:true,failure:null,review:null,
   history:[{sequence:1,status:'succeeded',at:nativeAt,details:null}],next_action:'complete',readback:{classification:decision},
   receipt:{schema_version:2,artifact_type:'workspace-intake-receipt',receipt_id:'synthetic-stage-receipt',receipt_digest:digest('a'),completed_at:nativeAt,phase:'merged-authority',outcome:'succeeded',canonical_authority:{branch:'main',path:'contracts/intake-register.yaml',repo:'workspace-governance'}}};
  await page.route('**/api/workspace-intake/**',route=>{
   const req=route.request(),path=new URL(req.url()).pathname;
   if(path.endsWith('/preparations'))return route.fulfill({json:{schema_version:1,workflow_id:'workspace-intake',canonical_mutation:false,authority_revision:snapshot.authority_revision,
    canonical_authority:{branch:'main',path:'contracts/intake-register.yaml',repo:'workspace-governance'},target:{kind,name,record_id:`${kind}:${name}`},expected_state:{record_digest:null,record_version:null,register_digest:digest('b')}}});
   if(path==='/api/workspace-intake/requests' && req.method()==='POST') {writes.push(req.postDataJSON());return route.fulfill({json:{...original,request_id:writes.at(-1).request_id}});}
   if(path==='/api/workspace-intake/requests')return route.fulfill({json:{schema_version:1,workflow_id:'workspace-intake',target:{kind,name,record_id:`${kind}:${name}`},custody_request_id:null,source_class:'direct',revision:recovered?2:0,pending_request_count:0,updated_at:recovered?nativeAt:null,next_cursor:null,
    records:recovered?[{request_id:requestId,classification:decision,revision:2,status:'succeeded',requested_at:nativeAt,updated_at:nativeAt,candidate:{source:origin.source,requested_record:origin.requested_record,evidence_refs:origin.evidence_refs,schema_version:1,artifact_type:'workspace-intake-source-candidate',candidate_digest:origin.source.digest,target:{kind,name,record_id:`${kind}:${name}`}}}]:[]}});
   if(req.method()==='GET'&&decodeURIComponent(path.split('/').at(-1))===requestId)return route.fulfill({json:original});
   return route.fulfill({status:503,json:{error:'Unmatched classification test request denied'}});
  });
  await h.workspace.getByRole('button',{name:'Onboard workspace item',exact:true}).click();let d=page.getByRole('dialog').last();
  await chooseRegistrationType(page,d,kind==='product'?'Product':'Component');await expect(d).toContainText('installation-private product and component registration is not supported');
  await d.getByRole('textbox',{name:'Short name',exact:true}).fill(name);await d.getByRole('button',{name:'Continue registration',exact:true}).click();d=page.getByRole('dialog').last();
  if(recovered)await d.getByRole('button',{name:`Reopen original request ${requestId}`,exact:true}).click();
  else {
   await d.getByRole('textbox',{name:'What does this item do?',exact:true}).fill(draft.notes);
   if(kind==='product') {
    await chooseField(page,d,'Platform repository','workspace-governance');await chooseField(page,d,'Runtime repository','workspace-governance');
    await d.getByRole('button',{name:'Add source repository workspace-governance',exact:true}).click();await chooseField(page,d,'What will be handed over?','Source code maintained in its repository');
   } else {await chooseField(page,d,'Responsible repository','workspace-governance');await chooseField(page,d,'What kind of component is this?','Shared infrastructure service');}
   await chooseField(page,d,'Security repository','workspace-governance');await chooseField(page,d,'How will this item be checked?','The repository maintains its source checks');
   await expect(d.getByText('Repository setup loaded',{exact:true})).toBeVisible();await d.getByRole('button',{name:'Review registration',exact:true}).click();d=page.getByRole('dialog').last();
   await d.getByRole('radio',{name:decision==='admitted'?'Admitted':decision==='proposed'?'Proposed':'Out of scope',exact:true}).click();
   await d.getByRole('button',{name:'Confirm the Workspace Intake review',exact:true}).click();await d.getByRole('button',{name:'Submit Classification',exact:true}).click();
  }
  d=page.getByRole('dialog',{name:'Classification recorded',exact:true});await expect(d).toBeVisible();await expect(d).not.toContainText('Registration completed');
  await expect(d.getByRole('button',{name:'Refresh Original Request',exact:true})).toHaveCount(0);
  await page.screenshot({path:info.outputPath(`${kind}-${decision}-${recovered?'original':'fresh'}.png`)});
  if(decision==='admitted') {await expect(d).toContainText('does not activate');await d.getByRole('button',{name:'Review activation',exact:true}).click();
   await expect(h.workspace.getByRole('button',{name:/Eligible/})).toHaveAttribute('aria-current','page');await expect(h.workspace.getByRole('searchbox')).toHaveValue(name);
  } else {await expect(d.getByRole('button',{name:'Review activation',exact:true})).toHaveCount(0);await expect(d).toContainText(decision==='proposed'?'not active':'no activation step');}
  expect(writes).toHaveLength(recovered?0:1);if(!recovered)expect(writes[0].decision).toBe(decision);expect(h.errors).toEqual([]);
 });
}

test('preparation is announced as reading and enabled lifecycle choices never announce unavailable',async({page})=>{
 const h=await setup(page,{intake:true});h.holdOwner(record.name);
 try{await h.workspace.getByRole('button',{name:'Manage Lifecycle',exact:true}).click();const d=page.getByRole('dialog',{name:'Manage workspace item',exact:true});
  await expect(d.getByText('Reading',{exact:true})).toBeVisible();await expect(d).not.toContainText('Registry and prepared source differ');await expect(d).not.toContainText('Submitting…');
  h.releaseOwner();const update=d.getByRole('radio',{name:'Update Metadata',exact:true});await expect(update).toBeEnabled();
  await expect(update).toHaveAttribute('aria-label','Update Metadata');await expect(d.getByRole('radio',{name:/^Restore Record, unavailable:/})).toBeDisabled();
 }finally{h.releaseOwner();}
 expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

test('classification source preparation never announces a submission before the operator submits',async({page})=>{
 const h=await setup(page,{intake:true});let release;const held=new Promise(resolve=>{release=resolve;});
 await page.route('**/api/workspace-intake/preparations',async route=>{
  await held;const target=route.request().postDataJSON().target;
  await route.fulfill({json:{schema_version:1,workflow_id:'workspace-intake',canonical_mutation:false,authority_revision:snapshot.authority_revision,
   canonical_authority:{branch:'main',path:'contracts/intake-register.yaml',repo:'workspace-governance'},target:{...target,record_id:`${target.kind}:${target.name}`},expected_state:{record_digest:null,record_version:null,register_digest:digest('b')}}});
 });
 try {
  await h.workspace.getByRole('button',{name:'Onboard workspace item',exact:true}).click();let d=page.getByRole('dialog').last();await chooseRegistrationType(page,d,'Component');
  await d.getByRole('textbox',{name:'Short name',exact:true}).fill('synthetic-reading-only');await d.getByRole('button',{name:'Continue registration',exact:true}).click();d=page.getByRole('dialog').last();
  await d.getByRole('textbox',{name:'What does this item do?',exact:true}).fill('Synthetic shared component source-preparation check.');await chooseField(page,d,'Responsible repository','workspace-governance');
  await chooseField(page,d,'Security repository','workspace-governance');await chooseField(page,d,'What kind of component is this?','Shared infrastructure service');await chooseField(page,d,'How will this item be checked?','The repository maintains its source checks');
  await expect(d.getByText('Repository setup loaded',{exact:true})).toBeVisible();await d.getByRole('button',{name:'Review registration',exact:true}).click();d=page.getByRole('dialog',{name:'Review workspace classification',exact:true});
  await expect(d.getByRole('button',{name:'Preparing review…',exact:true})).toBeDisabled();await expect(d).not.toContainText('Submitting…');release();
  await expect(d.getByRole('button',{name:'Submit Classification',exact:true})).toBeDisabled();await expect(d.getByRole('radio',{name:'Select classification',exact:true})).toHaveCount(0);
  expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
 } finally {release();}
});

for(const family of ['promotion','lifecycle'])test(`${family} history hides pagination for loading, empty and failed reads`,async({page})=>{
 const h=await setup(page);let mode='loading',release;const held=new Promise(resolve=>{release=resolve;});
 const endpoint=family==='promotion'?'promotions':'lifecycle/requests';
 await page.route(`**/api/workspace-registry/${endpoint}?**`,async route=>{
  if(mode==='loading')await held;
  if(mode==='failed')return route.fulfill({status:503,json:{error:'Synthetic history unavailable'}});
  return route.fulfill({json:{schema_version:1,workflow_id:family==='promotion'?'workspace-inventory-promotion':'workspace-inventory-lifecycle',target:{kind:record.kind,name:record.name,record_id:record.id},revision:0,pending_request_count:0,updated_at:null,records:[],next_cursor:null,canonical_mutation:false}});
 });
 async function openHistory(){
  await h.workspace.getByRole('button',{name:family==='promotion'?'View Promotion Requests':'Manage Lifecycle',exact:true}).click();
  const d=page.getByRole('dialog',{name:family==='promotion'?'Promotion History':'Manage workspace item',exact:true});
  if(family==='lifecycle')await d.getByRole('button',{name:'Request history',exact:true}).click();return d;
 }
 try{
  let d=await openHistory();const pager=()=>d.getByRole('navigation',{name:'Inventory request history pages',exact:true});
  await expect(d.getByText('Loading request history…',{exact:true})).toBeVisible();await expect(pager()).toHaveCount(0);
  mode='empty';release();await expect(d.getByText('No previous requests for this item.',{exact:true})).toBeVisible();await expect(pager()).toHaveCount(0);if(family==='promotion')await expect(d.getByText('Choose a request',{exact:true})).toHaveCount(0);
  await d.getByRole('button',{name:'Back to Registry',exact:true}).click();mode='failed';d=await openHistory();
  await expect(d.getByRole('button',{name:'Retry request history',exact:true})).toBeVisible();await expect(pager()).toHaveCount(0);
  mode='empty';await d.getByRole('button',{name:'Retry request history',exact:true}).click();await expect(d.getByText('No previous requests for this item.',{exact:true})).toBeVisible();await expect(pager()).toHaveCount(0);
  expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
 }finally{release();}
});

test('empty onboarding history has a clear empty state without pagination controls',async({page})=>{
 const h=await setup(page,{intake:true});await h.workspace.getByRole('button',{name:'Onboard workspace item',exact:true}).click();let d=page.getByRole('dialog',{name:'Workspace onboarding',exact:true});
 await chooseRegistrationType(page,d,'Product');await d.getByRole('textbox',{name:'Short name',exact:true}).fill('synthetic-empty-onboarding-history');await d.getByRole('button',{name:'Continue registration',exact:true}).click();d=page.getByRole('dialog',{name:'Product details',exact:true});
 await expect(d.getByText('No previous onboarding requests for this item.',{exact:true})).toBeVisible();await expect(d.getByRole('navigation',{name:'Workspace onboarding requests pages',exact:true})).toHaveCount(0);
 expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

test('Registry background checks keep the current view stable without visible refresh controls',async({page})=>{
 await page.clock.install();const h=await setup(page),w=h.workspace;let checks=0,release;const held=new Promise(resolve=>{release=resolve;});
 await page.route('**/api/workspace-registry?**',async route=>{checks++;await held;return route.fallback();});
 try{
  await w.locator('tbody tr').nth(1).click();await page.clock.fastForward(16000);await expect.poll(()=>checks).toBe(1);
  await expect(w.getByRole('button',{name:'Refresh Registry',exact:true})).toBeEnabled();await expect(w.getByRole('button',{name:'Refreshing…',exact:true})).toHaveCount(0);
  await expect(w.getByRole('button',{name:'Manage Lifecycle',exact:true})).toBeEnabled();await expect(w.locator('tbody tr')).toHaveCount(snapshot.records.length);
  await expect(w.getByRole('navigation',{name:'Workspace Registry pages',exact:true}).getByRole('status')).toContainText('Showing');await expect(w.locator('[data-teras-record-control-layout] aside')).toContainText(snapshot.records[1].name);
  expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
 }finally{release();}
});

test('pending Inventory history polls quietly and preserves its current page and pending gate',async({page})=>{
 await page.clock.install();const h=await setup(page);let hold=false,checks=0,release;const held=new Promise(resolve=>{release=resolve;});const cursors=[];
 await page.route('**/api/workspace-registry/lifecycle/requests?**',async route=>{
  const query=new URL(route.request().url()).searchParams,cursor=query.get('cursor'),offset=cursor?parseInt(cursor,16):0;cursors.push(offset);
  if(hold){checks++;await held;}
  const rows=Array.from({length:26},(_,i)=>({request_id:'workspace-inventory-lifecycle-request:quiet-'+i,status:i===0?'accepted':'succeeded',revision:1,requested_at:nativeAt,updated_at:nativeAt,action:'update'}));
  return route.fulfill({json:{schema_version:1,workflow_id:'workspace-inventory-lifecycle',target:{kind:record.kind,name:record.name,record_id:record.id},revision:30,pending_request_count:1,canonical_mutation:false,updated_at:nativeAt,records:rows.slice(offset,offset+25),next_cursor:offset+25<rows.length?(offset+25).toString(16).padStart(64,'0'):null}});
 });
 try{
  await h.workspace.getByRole('button',{name:'Manage Lifecycle',exact:true}).click();const d=page.getByRole('dialog',{name:'Manage workspace item',exact:true});const pager=d.getByRole('navigation',{name:'Inventory request history pages',exact:true});
  await expect(pager.getByRole('status')).toHaveText('Showing 1–25 · Page 1');await pager.getByRole('button',{name:'Next page',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 26–26 · Page 2');
  hold=true;await page.clock.fastForward(16000);await expect.poll(()=>checks).toBe(1);await expect(pager.getByRole('status')).toHaveText('Showing 26–26 · Page 2');
  await expect(d.getByText('Loading request history…',{exact:true})).toHaveCount(0);await expect(d.getByRole('button',{name:'Reopen original request workspace-inventory-lifecycle-request:quiet-25',exact:true})).toBeEnabled();
  await expect(d.getByRole('button',{name:'Refresh record',exact:true})).toBeDisabled();expect(cursors.at(-1)).toBe(25);expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
 }finally{release();}
});

test('pending direct onboarding history checks keep the selected page and do not reload the form',async({page})=>{
 await page.clock.install();const h=await setup(page,{intake:true}),kind='product',name='synthetic-quiet-history';
 const draft={...emptyDirectIntakeDraft,notes:'Synthetic source boundary.',validationPosture:'covered-by-owner-repo',graphRole:'product-readiness-aggregate',validationNotes:'Synthetic checks.',evidence:'synthetic://review',platformOwner:'workspace-governance',runtimeOwner:'workspace-governance',securityOwner:'workspace-governance',sourceOwners:'workspace-governance',endpoint:'owner-managed-source'};
 const origin=await directWorkspaceIntakeCandidate({kind,name},draft,['workspace-governance'],[]);let hold=false,checks=0,release;const held=new Promise(resolve=>{release=resolve;});const cursors=[];
 await page.route('**/api/workspace-intake/requests?**',async route=>{
  const query=new URL(route.request().url()).searchParams,cursor=query.get('cursor'),offset=cursor?parseInt(cursor,16):0;cursors.push(offset);if(hold){checks++;await held;}
  const rows=Array.from({length:26},(_,i)=>({request_id:'workspace-intake-request:quiet-'+i,status:i===0?'accepted':'succeeded',revision:1,classification:'proposed',requested_at:nativeAt,updated_at:nativeAt,candidate:{schema_version:1,artifact_type:'workspace-intake-source-candidate',candidate_digest:origin.source.digest,source:origin.source,requested_record:origin.requested_record,evidence_refs:origin.evidence_refs,target:{kind,name,record_id:`${kind}:${name}`}}}));
  return route.fulfill({json:{schema_version:1,workflow_id:'workspace-intake',target:{kind,name,record_id:`${kind}:${name}`},source_class:'direct',custody_request_id:null,revision:30,pending_request_count:1,updated_at:nativeAt,records:rows.slice(offset,offset+25),next_cursor:offset+25<rows.length?(offset+25).toString(16).padStart(64,'0'):null}});
 });
 try{
  await h.workspace.getByRole('button',{name:'Onboard workspace item',exact:true}).click();let d=page.getByRole('dialog',{name:'Workspace onboarding',exact:true});await chooseRegistrationType(page,d,'Product');await d.getByRole('textbox',{name:'Short name',exact:true}).fill(name);await d.getByRole('button',{name:'Continue registration',exact:true}).click();d=page.getByRole('dialog',{name:'Product details',exact:true});
  const pager=d.getByRole('navigation',{name:'Workspace onboarding requests pages',exact:true});await expect(pager.getByRole('status')).toHaveText('Showing 1–25 · Page 1');await pager.getByRole('button',{name:'Next page',exact:true}).click();await expect(pager.getByRole('status')).toHaveText('Showing 26–26 · Page 2');
  await d.getByRole('textbox',{name:'What does this item do?',exact:true}).fill('Keep this draft while original requests are checked.');hold=true;await page.clock.fastForward(16000);await expect.poll(()=>checks).toBe(1);
  await expect(pager.getByRole('status')).toHaveText('Showing 26–26 · Page 2');await expect(d.getByText('Loading request history…',{exact:true})).toHaveCount(0);await expect(d.getByRole('textbox',{name:'What does this item do?',exact:true})).toHaveValue('Keep this draft while original requests are checked.');
  await expect(d.getByRole('button',{name:'Review registration',exact:true})).toBeDisabled();expect(cursors.at(-1)).toBe(25);expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
 }finally{release();}
});

test('activation opened during a background check prepares its source after that read finishes',async({page})=>{
 await page.clock.install();const h=await setup(page,{promotion:true}),w=h.workspace;await w.getByRole('button',{name:/Eligible/}).click();const currentView=page.waitForResponse(response=>response.url().includes('/api/workspace-registry?scope=eligible'));await page.clock.runFor(300);await currentView;await expect(w.getByRole('button',{name:'Refresh Registry',exact:true})).toBeEnabled();await expect(w.getByRole('button',{name:'Review activation',exact:true})).toBeEnabled();
 let checks=0,release;const held=new Promise(resolve=>{release=resolve;});await page.route('**/api/workspace-registry?**',async route=>{checks++;await held;return route.fallback();});
 try{
  await page.clock.fastForward(16000);await expect.poll(()=>checks).toBe(1);await w.getByRole('button',{name:'Review activation',exact:true}).click();const d=page.getByRole('dialog',{name:'Review Promotion',exact:true});
  await expect(d.getByRole('button',{name:'Please wait…',exact:true})).toBeDisabled();expect(h.preparations).toHaveLength(0);release();await expect(d.getByRole('button',{name:'Add to Registry',exact:true})).toBeEnabled();expect(h.preparations).toHaveLength(1);expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
 }finally{release();}
});
