import {test,expect} from "@playwright/test";
import {execFileSync} from "node:child_process";
import {createRequire} from "node:module";
import {page as nativePage, bind as nativeBind, promotionPreparation} from "../support/instance-inventory-fixture.mjs";
const nativeRepoName=promotionPreparation().target.name;
const {workspaceRegistryFixture}=createRequire(import.meta.url)("../../src/workspace-registry/fixtures/workspace-registry.fixture.ts");
import {proposalCompletionRecord,proposalCompletionRoute} from "../support/proposal-completion-fixture.mjs";

const fixture=JSON.parse(execFileSync(process.execPath,["--experimental-strip-types","--disable-warning=MODULE_TYPELESS_PACKAGE_JSON","--input-type=module","-e",
  "import {repositoryUiFixture} from './tests/support/repository-ui-fixture.mjs';process.stdout.write(JSON.stringify(await repositoryUiFixture()));"],{encoding:"utf8"}));
const base=process.env.CONSOLE_TEST_BASE_URL??"http://127.0.0.1:4317";
test.use({viewport:{width:1700,height:1000},actionTimeout:15000});test.setTimeout(120000);

async function open(page,{missing=false,unavailable=false,historical=false,handoff=false,correction=false,prepared=false,delayed=false,native=false}={}) {
  const f=structuredClone(fixture),writes=[];
  const item=f.continuity.inventory[0];
  f.continuity.inventory=[...(missing?[]:["workspace-prototype-studio"]),"example-project"].map(name=>({...structuredClone(item),name,record_id:`repo:${name}`,lineage:{...item.lineage,source_ref:`repo:${name}`}}));
  const record=proposalCompletionRecord({title:"Explore an uncertain idea",status:historical?"implemented":handoff||correction?"accepted":"triaged",decision_notes:historical||handoff||correction?"Recorded decision":null,
    ...(prepared ? {handoff:{state:"ready",packet_ref:"proposal-handoff:idea-851:version-17",target_receipt_ref:null,target_record_ref:null}} : {}),
    route:historical||correction?{...proposalCompletionRoute("prototype"),source_custody:{classification:"non-source-work",repository_mode:"not-required",repository_gate_state:"not-required",owner:"prototype",source_ref:null,rationale:"Historical source posture"}}
      :handoff?{...proposalCompletionRoute("prototype"),source_custody:{...proposalCompletionRoute("prototype").source_custody,owner:"workspace-prototype-studio",source_ref:"repo://workspace-prototype-studio"}}:null});
  const registry=structuredClone(workspaceRegistryFixture);
  registry.authority_revision=f.continuity.authority.revision;registry.eligible_promotions=[];
  registry.records=f.continuity.inventory.map(row=>({id:row.record_id,name:row.name,kind:row.kind,version:row.record_version,record_digest:row.record_digest,posture:row.posture,maturity:null,owner_refs:[row.name],lineage:row.lineage,last_mutation:{action:row.last_mutation.action,applied_at:row.last_mutation.applied_at,id:row.last_mutation.id,readiness_ref:row.last_mutation.readiness_ref,request_ref:row.last_mutation.request_ref}}));
  let fail=unavailable,releaseList;
  const listGate=delayed?new Promise(resolve=>{releaseList=resolve;}):Promise.resolve();
  await page.route("**/api/**",async r=>{
    const req=r.request(),path=new URL(req.url()).pathname;
    if(!["GET","HEAD","OPTIONS"].includes(req.method())) {
      writes.push({path,body:req.postDataJSON()});
      return r.fulfill({status:503,json:{code:"synthetic_transport_unavailable",error:"Synthetic response interruption"}});
    }
    if(path==="/api/console/capabilities")return r.fulfill({json:f.capabilities});
    if(path==="/api/workspace-continuity"){await listGate;return fail?r.fulfill({status:503,json:{error:"Synthetic Inventory unavailable"}}):r.fulfill({json:f.continuity});}
    if(path==="/api/workspace-registry"){
      await listGate;if(fail)return r.fulfill({status:503,json:{error:"Synthetic Registry unavailable"}});
      if(!native)return r.fulfill({json:registry});
      const item=f.continuity.inventory[0],query=new URL(req.url()).searchParams.get('query')??'';
      const internalPage= nativePage('inventory',{receipt:{version:2,record_digest:`sha256:${'d'.repeat(64)}`},record:{posture:'active',record:{lineage:{...item.lineage,source_ref:'repo:synthetic-project',intake_entry_version:1},last_mutation:item.last_mutation}}});
      internalPage.selection.query=query;if(!nativeRepoName.includes(query)){internalPage.records=[];internalPage.counts.inventory.active=0;}
      const {projection_digest:_old,...unsigned}=internalPage;
      const instance_page=nativeBind(unsigned,'projection_digest');
      return r.fulfill({json:{schema_version:1,workflow_id:'workspace-registry-view',canonical_mutation:false,authority_revision:registry.authority_revision,projection_id:'workspace-registry:synthetic-native',source_authorities:{legacy:registry.canonical_authority,instance:instance_page.authority},legacy_snapshot:registry,instance_page,records:[...registry.records,...instance_page.records],eligible_promotions:[],projected_at:new Date().toISOString(),projection_digest:`sha256:${'f'.repeat(64)}`}});
    }
    if(path==="/api/proposals")return r.fulfill({json:{mode:"live",status:"current",error:null,observedAt:new Date().toISOString(),records:[record]}});
    if(path===`/api/proposals/${record.projection.proposal_id}`)return r.fulfill({json:{...record,summaryOnly:false}});
    return r.abort();
  });
  await page.goto(base,{waitUntil:"domcontentloaded",timeout:90000});
  await page.waitForFunction(()=>{const n=document.querySelector('button[title="Open PROPOSAL"]'),k=n&&Object.keys(n).find(k=>k.startsWith('__reactProps$'));return Boolean(k&&n[k].onClick);});
  await page.locator('button[title="Open PROPOSAL"]').click();
  await page.getByRole('row').filter({hasText:record.projection.title}).click();
  await page.locator('[data-proposal-open-hub-action="true"]').click();
  if(historical)await page.getByRole('dialog',{name:'Proposal Hub',exact:true}).getByRole('button',{name:/Disposition.*Archive/}).click();
  else await page.locator('[data-proposal-hub-primary-action="true"]').click();
  const dialog=page.getByRole('dialog',{name:handoff||correction?'Proposal Handoff':'Proposal Disposition',exact:true});
  await expect(dialog).toBeVisible();
  return {dialog,writes,recover:()=>{fail=false;},setUnavailable:value=>{fail=value;},releaseList,record};
}

async function choosePrototype(dialog) {
  await dialog.getByRole('radiogroup',{name:'Proposal route target',exact:true}).getByRole('radio',{name:'Prototype',exact:true}).click();
  const choices=dialog.getByRole('radiogroup',{name:'Proposal repository requirement',exact:true});
  await expect(choices.getByRole('radio',{name:'Prototype Studio',exact:true})).toBeChecked();
  return choices;
}

test('automatic repository checks preserve the routing explanation and draft', async ({page}) => {
  await page.clock.install();
  const h = await open(page);
  await choosePrototype(h.dialog);
  await expect(h.dialog.getByText('Incubate in Prototype Studio', {exact:true})).toBeVisible();
  await h.dialog.getByLabel('Route rationale', {exact:true}).fill('Keep this routing draft while checking repository availability.');
  let reads = 0, release;
  const gate = new Promise(resolve => { release = resolve; }), active = [];
  const handler = route => {
    const work = (async () => { reads++; await gate; await route.fallback(); })();
    active.push(work); return work;
  };
  await page.route('**/api/workspace-registry**', handler);
  try {
    await page.clock.fastForward(16000);
    await expect.poll(() => reads).toBeGreaterThan(0);
    await expect(h.dialog.getByText('Incubate in Prototype Studio', {exact:true})).toBeVisible();
    await expect(h.dialog.getByText('Checking repository list…', {exact:true})).toHaveCount(0);
    await expect(h.dialog.getByLabel('Route rationale', {exact:true})).toHaveValue('Keep this routing draft while checking repository availability.');
    expect(h.writes).toEqual([]);
  } finally {
    release(); await Promise.allSettled(active); await page.unroute('**/api/workspace-registry**', handler);
  }
});

test('failed automatic repository checks close the recording gate and recover without losing notes', async ({page}) => {
  await page.clock.install();
  const h=await open(page);await choosePrototype(h.dialog);
  await expect(h.dialog.getByText('Incubate in Prototype Studio',{exact:true})).toBeVisible();
  await h.dialog.getByRole('textbox',{name:'Decision notes',exact:true}).fill('Keep exploring this idea.');
  await h.dialog.getByLabel('Route rationale',{exact:true}).fill('Use Studio for the experiment.');
  const submit=h.dialog.locator('[data-proposal-disposition-primary-action="true"]');
  await expect(submit).toBeEnabled();h.setUnavailable(true);
  await page.clock.fastForward(16000);
  await expect(h.dialog.getByRole('button',{name:'Refresh repository list',exact:true})).toBeVisible();
  await expect(submit).toBeDisabled();
  await expect(h.dialog.getByRole('textbox',{name:'Decision notes',exact:true})).toHaveValue('Keep exploring this idea.');
  h.recover();await h.dialog.getByRole('button',{name:'Refresh repository list',exact:true}).click();
  await expect(submit).toBeEnabled();expect(h.writes).toEqual([]);
});

test('Prototype offers Studio incubation without a project repository and sends existing custody',async({page},info)=>{
  const {dialog,writes}=await open(page);
  const choices=await choosePrototype(dialog);
  await expect(choices.getByRole('radio',{name:'Not Required',exact:true})).toHaveCount(0);
  await expect(dialog.getByText('Incubate in Prototype Studio',{exact:true})).toBeVisible();
  await expect(dialog).toContainText('A dedicated product repository can wait');
  await dialog.getByRole('textbox',{name:'Decision notes',exact:true}).fill('Explore the idea before deciding on a product repository.');
  await dialog.getByLabel('Route rationale',{exact:true}).fill('Keep source in the existing Studio repository.');
  const submit=dialog.locator('[data-proposal-disposition-primary-action="true"]');
  await expect(submit).toBeEnabled();
  for(const width of [1280,1700]) {
    await page.setViewportSize({width,height:1000});
    await dialog.screenshot({path:info.outputPath(`studio-${width}.png`)});
    const panel=await dialog.boundingBox();
    for(const radio of await choices.getByRole('radio').all()) {const box=await radio.boundingBox();expect(box.x).toBeGreaterThanOrEqual(panel.x);expect(box.x+box.width).toBeLessThanOrEqual(panel.x+panel.width+1);}
  }
  await submit.click();
  await expect.poll(()=>writes.filter(x=>x.path.includes('/commands')).length).toBe(1);
  const request=writes.find(x=>x.path.includes('/commands'));
  expect(request.body.payload.route).toMatchObject({routeTarget:'Prototype',repoMode:'existing',repoOwner:'workspace-prototype-studio',repoRef:'repo://workspace-prototype-studio'});
  expect(writes.every(x=>!x.path.includes('/repositories/'))).toBe(true);
});

test('Studio, another repository, new repository and Delivery no-repository choices retain distinct meanings',async({page})=>{
  const {dialog,writes}=await open(page);const choices=await choosePrototype(dialog);
  await choices.getByRole('radio',{name:'Existing Repo',exact:true}).click();
  await dialog.getByLabel('Incubation repository',{exact:true}).click();
  await page.getByRole('option',{name:/example-project/}).click();
  await choices.getByRole('radio',{name:'New Repo',exact:true}).click();
  await expect(dialog).toContainText('creates a request in Repository Control');
  await choices.getByRole('radio',{name:'Prototype Studio',exact:true}).click();
  await expect(dialog.getByText('Incubate in Prototype Studio',{exact:true})).toBeVisible();
  await dialog.getByRole('radiogroup',{name:'Proposal route target',exact:true}).getByRole('radio',{name:'Delivery',exact:true}).click();
  await expect(choices.getByRole('radio',{name:'Prototype Studio',exact:true})).toHaveCount(0);
  await choices.getByRole('radio',{name:'Not Required',exact:true}).click();
  await expect(dialog).toContainText('This work does not require a repository');
  await choosePrototype(dialog);
  expect(writes).toEqual([]);
});

for(const unavailable of [false,true])test(`Unavailable Studio blocks recording and offers recovery (${unavailable?'source failure':'missing entry'})`,async({page})=>{
  const h=await open(page,{missing:!unavailable,unavailable});await choosePrototype(h.dialog);
  await h.dialog.getByRole('textbox',{name:'Decision notes',exact:true}).fill('Review this incubation decision.');
  await h.dialog.getByLabel('Route rationale',{exact:true}).fill('Experiment in Studio.');
  await expect(h.dialog).toContainText('Prototype Studio is not available');
  await expect(h.dialog.locator('[data-proposal-disposition-primary-action="true"]')).toBeDisabled();
  if(unavailable){h.recover();await h.dialog.getByRole('button',{name:'Refresh repository list',exact:true}).click();await expect(h.dialog.locator('[data-proposal-disposition-primary-action="true"]')).toBeEnabled();}
  expect(h.writes).toEqual([]);
});

test('Historical Prototype no-repository decisions remain unchanged and read-only',async({page})=>{
  const {dialog,writes}=await open(page,{historical:true});
  await expect(dialog.getByRole('radiogroup',{name:'Proposal repository requirement',exact:true}).getByRole('radio',{name:'Not Required, confirmed',exact:true})).toBeChecked();
  await expect(dialog.locator('[data-proposal-disposition-primary-action="true"]')).toBeDisabled();
  expect(writes).toEqual([]);
});

test('Recorded Studio incubation reaches Handoff without a repository-creation detour',async({page})=>{
  const {dialog,writes}=await open(page,{handoff:true});
  await expect(dialog.getByRole('heading',{name:'Incubate in Prototype Studio',exact:true})).toBeVisible();
  await expect(dialog).toContainText('This handoff does not request a separate project repository');
  await expect(dialog).toContainText('repo://workspace-prototype-studio');
  await expect(dialog.getByRole('button',{name:'Open Repository Control',exact:true})).toHaveCount(0);
  expect(writes).toEqual([]);
});

for(const prepared of [false,true])test(`An active accepted no-source Proposal has a version-bound correction (${prepared?'saved Handoff preserved':'no saved Handoff'})`,async({page})=>{
  const {dialog:handoff,writes,record}=await open(page,{correction:true,prepared});
  await expect(handoff.getByRole('heading',{name:'Prototype source home missing',exact:true})).toBeVisible();
  await expect(handoff).toContainText('No source home recorded');
  await handoff.getByRole('button',{name:'Open source-home decision',exact:true}).click();
  if(prepared) {
    const guard=page.getByRole('alertdialog',{name:'Leave Handoff Draft?',exact:true});
    await expect(guard).toBeVisible();
    await guard.getByRole('button',{name:'Back to Hub',exact:true}).click();
  }
  const dialog=page.getByRole('dialog',{name:'Proposal Disposition',exact:true});
  await expect(dialog.locator('[data-proposal-disposition-primary-action="true"]')).toBeDisabled();
  expect(writes).toEqual([]);
  await dialog.getByRole('button',{name:'Change source home',exact:true}).click();
  await expect(dialog.getByText('Source-home change draft',{exact:true})).toBeVisible();
  await expect(dialog.getByRole('radio',{name:'Prototype Studio',exact:true})).toBeChecked();
  await expect(dialog.getByRole('textbox',{name:'Decision notes',exact:true})).toHaveValue('Review the source home for this accepted Prototype proposal. Preserve the original decision in History.');
  await expect(dialog.getByLabel('Route rationale',{exact:true})).toHaveValue('');
  await expect(dialog.getByRole('radiogroup',{name:'Proposal route target',exact:true}).getByRole('radio').first()).toBeDisabled();
  await expect(dialog.locator('[data-proposal-disposition-primary-action="true"]')).toBeDisabled();
  expect(writes).toEqual([]);
  await dialog.getByRole('textbox',{name:'Decision notes',exact:true}).fill('Use Studio for incubation; keep the original decision in history.');
  await dialog.getByLabel('Route rationale',{exact:true}).fill('No separate product repository is needed for this experiment.');
  await dialog.locator('[data-proposal-disposition-primary-action="true"]').click();
  await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0].body.source).toMatchObject({recordVersion:record.projection.record_version,status:'accepted'});
  expect(writes[0].body.payload.route).toMatchObject({repoMode:'existing',repoRef:'repo://workspace-prototype-studio',routeTarget:'Prototype'});
  expect(writes[0].body.payload.decision.outcome).toBe('accepted');
  expect(writes[0].body.payload.decision).not.toHaveProperty('sourceHomeCorrection');
});

test('Studio source verification shows loading until Inventory responds, without claiming absence or enabling submission',async({page})=>{
  const {dialog,writes,releaseList}=await open(page,{delayed:true});
  await choosePrototype(dialog);
  await expect(dialog.getByText('Checking repository list…',{exact:true})).toBeVisible();
  await expect(dialog).not.toContainText('Prototype Studio is not available');
  await expect(dialog.locator('[data-proposal-disposition-primary-action="true"]')).toBeDisabled();
  releaseList();
  await expect(dialog).toContainText("Explore in Studio's existing repository.");
  await expect(dialog.getByText('Checking repository list…',{exact:true})).toHaveCount(0);
  expect(writes).toEqual([]);
});


test('Proposal reuse searches current internal Registry repositories and sends their exact canonical owner',async({page})=>{
 const {dialog,writes}=await open(page,{native:true});
 await dialog.getByRole('radiogroup',{name:'Proposal route target',exact:true}).getByRole('radio',{name:'Delivery',exact:true}).click();
 await dialog.getByRole('radiogroup',{name:'Proposal repository requirement',exact:true}).getByRole('radio',{name:'Existing Repo',exact:true}).click();
 await dialog.getByRole('textbox',{name:'Search onboarded repositories',exact:true}).fill('synthetic');
 await dialog.getByRole('button',{name:'Main implementation repository',exact:true}).click();
 await page.getByRole('option',{name:new RegExp(nativeRepoName)}).click();
 await dialog.getByRole('textbox',{name:'Decision notes',exact:true}).fill('Use this onboarded internal source repository for Delivery.');
 await dialog.getByLabel('Route rationale',{exact:true}).fill('Keep internal source under its current registered identity.');
 await dialog.locator('[data-proposal-disposition-primary-action="true"]').click();
 await expect.poll(()=>writes.filter(x=>x.path.includes('/commands')).length).toBe(1);
 const request=writes.find(x=>x.path.includes('/commands'));
 expect(request.body.payload.route.repoOwner).toBe(nativeRepoName);
 expect(request.body.payload.route.repoRef).toBe(`repo://${nativeRepoName}`);
});
