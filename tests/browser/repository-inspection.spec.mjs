import {test,expect} from "@playwright/test";
import {execFileSync} from "node:child_process";
const fixture=JSON.parse(execFileSync(process.execPath,["--experimental-strip-types","--disable-warning=MODULE_TYPELESS_PACKAGE_JSON","--input-type=module","-e",
 "import {repositoryUiFixture} from './tests/support/repository-ui-fixture.mjs'; process.stdout.write(JSON.stringify(await repositoryUiFixture()));"],{encoding:"utf8"}));
if(fixture.capabilities.mode!=="live")throw new Error("Repository UI fixture must provide complete synthetic runtime configuration.");
const base=process.env.CONSOLE_TEST_BASE_URL??"http://127.0.0.1:4317";
test.use({viewport:{width:1700,height:1000},actionTimeout:15000});test.setTimeout(90000);

async function setup(page,{empty=false,lifecycle="unavailable",posture="active"}={}){
 const f=structuredClone(fixture),writes=[];
 f.continuity.inventory[0].posture=posture;f.continuity.inventory[0].retired_collection=posture==="retired";
 await page.route("**/api/**",r=>["GET","HEAD","OPTIONS"].includes(r.request().method())?r.continue():(writes.push(r.request().url()),r.abort()));
 await page.route("**/api/console/capabilities",r=>r.fulfill({json:f.capabilities}));
 await page.route("**/api/workspace-continuity",r=>r.fulfill({json:f.continuity}));
 await page.route("**/api/repositories/custody/requests*",r=>r.fulfill({json:{schema_version:1,mode:"live",status:"current",error:null,records:empty?[]:[f.result],next_cursor:null}}));
 await page.route("**/api/proposals",r=>r.fulfill({json:{mode:"live",status:"current",error:null,observedAt:new Date().toISOString(),records:[f.gate]}}));
 await page.route("**/api/repositories/lifecycle/repositories/**",r=>lifecycle==="unavailable"
  ?r.fulfill({status:503,json:{mode:"live",status:"offline",retryable:false,code:"repository_lifecycle_runtime_not_configured",error:"The repository lifecycle runtime is not configured."}})
  :r.fulfill({json:{mode:"live",status:"not-initialized",audit:null,error:null,observedAt:new Date().toISOString()}}));
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>{const n=document.querySelector('button[title="Open REPOSITORY"]'),k=n&&Object.keys(n).find(k=>k.startsWith('__reactProps$'));return Boolean(k&&n[k].onClick)},null,{timeout:60000});
 await page.locator('button[title="Open REPOSITORY"]').click();
 if(!empty)await expect(page.getByRole("row").filter({hasText:"synthetic-source"})).toBeVisible({timeout:60000});
 await expect(page.getByRole("button",{name:"Proposal Gates",exact:true})).toBeVisible();
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

test("retained identity-bound provisioning history reports unavailable lifecycle coverage honestly",async({page})=>{
 const {writes}=await setup(page);
 await page.getByRole("button",{name:"Review Repository",exact:true}).click();
 await page.getByRole("button",{name:"View History",exact:true}).click();
 const history=page.getByRole("dialog",{name:"Repository History",exact:true});
 await expect(history.getByText("Repository Provisioning",{exact:true})).toBeVisible();
 await expect(history.getByText("Lifecycle history is unavailable:",{exact:false})).toBeVisible();
 await expect(history.getByText("No Repository receipts are recorded.",{exact:true})).toHaveCount(0);
  await expect(history.getByText("1 receipt · Partial history",{exact:true})).toBeVisible();
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
 await page.getByRole("button",{name:"Proposal Gates",exact:true}).click();
 const gate=page.getByRole("dialog",{name:"Resolve Repository Gate",exact:true});
 await expect(gate.getByRole("heading",{name:"Synthetic pending repository gate",exact:true})).toBeVisible();
 await expect(gate.getByRole("button",{name:"Record Gate Resolution",exact:true})).toBeDisabled();
 await gate.getByRole("button",{name:"Back to Register",exact:true}).click();
 await expect(page.getByRole("button",{name:"Provision Repository",exact:true})).toBeEnabled();
 await page.getByRole("button",{name:"Provision Repository",exact:true}).click();
 await expect(page.getByRole("dialog",{name:"Provision New Repository",exact:true})).toBeVisible();
 expect(writes).toEqual([]);
});

test("moving the gate to its dialog preserves custody selection and unrecorded-draft protection",async({page})=>{
 const {result,writes}=await setup(page);
 await page.getByRole("button",{name:"Proposal Gates",exact:true}).click();
 const gate=page.getByRole("dialog",{name:"Resolve Repository Gate",exact:true});
 await gate.getByRole("button",{name:"Successful repository custody",exact:true}).click();
 await page.getByRole("option",{name:result.provider_readback.canonical_url,exact:true}).click();
 await gate.getByRole("textbox",{name:"Repository resolution notes",exact:true}).fill("Use this exact retained owner receipt.");
 await expect(gate.getByRole("button",{name:"Record Gate Resolution",exact:true})).toBeEnabled();
 await gate.getByRole("button",{name:"Back to Register",exact:true}).click();
 const guard=page.getByRole("alertdialog",{name:"Close Repository Gate Draft?",exact:true});
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
 const details=page.getByRole("dialog",{name:"Repository Admission",exact:true});await expect(details).toBeVisible();
 await details.getByRole("button",{name:"Open Provider Repository posture details",exact:true}).click();
 await expect(page.getByRole("dialog",{name:"Provider Repository",exact:true})).toBeVisible();
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
 const gate=page.getByRole("dialog",{name:"Resolve Repository Gate",exact:true});
 await expect(gate.getByRole("heading",{name:"Synthetic pending repository gate",exact:true})).toBeVisible();
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
 await page.getByRole("button",{name:"Provision Repository",exact:true}).click();
 const request=page.getByRole("dialog",{name:"Provision New Repository",exact:true});
 await expect(request).toBeVisible();
 await request.getByRole("button",{name:"Retained provisioning request",exact:true}).click();
 await expect(page.getByRole("option",{name:/synthetic-source.*succeeded/})).toBeVisible();
 expect(writes).toEqual([]);
});
