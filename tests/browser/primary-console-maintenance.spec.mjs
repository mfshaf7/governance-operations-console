import {test,expect} from "@playwright/test";
import {bodies} from "../console-architecture/agent-workspace-fixtures.mjs";
const base=process.env.CONSOLE_TEST_BASE_URL??"http://127.0.0.1:3320";
const paths={continuity:"/api/workspace-continuity",registry:"/api/workspace-registry",proposals:"/api/proposals",prototypes:"/api/prototypes/records",delivery:"/api/delivery/workspace",orchestration:"/api/orchestration",lifecycle:"/api/lifecycle-transitions",platform:"/api/environment-operations",models:"/api/model-operations/runtime/registry"};
const event=(id="synthetic:head")=>({action:{id:"wgcf.ledger.artifact-registry-read",label:"Artifact.Registry.Read"},actor:{kind:"system",ref:"synthetic-workflow-service"},causationId:null,category:"state-change",correlationId:null,durability:"source-projected",eventId:id,evidenceRefs:[],occurredAt:"2026-10-01T00:00:00Z",outcome:"informational",receiptRef:null,source:{owner:"workspace-governance-control-fabric",authority:"workspace-governance-control-fabric",label:"WGCF governance",ref:"wgcf://history/synthetic",mode:"source-projected"},subject:{kind:"ledger",label:"wgcf://artifacts/delivery-art/sha256/"+(id.includes("older")?"b":"a").repeat(64),ref:"wgcf://artifacts/delivery-art/sha256/"+(id.includes("older")?"b":"a").repeat(64)},summary:"Synthetic original owner summary"});
const snapshot=(id,cursor)=>({events:[event(id)],continuations:cursor?[{owner:"wgcf",cursor}]:[],sources:[],mode:"live",status:cursor?"partial":"current",error:null,observedAt:new Date().toISOString(),truncated:Boolean(cursor)});
test.use({viewport:{width:1700,height:1000}});test.setTimeout(90000);
test.beforeEach(async({page})=>{
 for(const [key,path]of Object.entries(paths))await page.route(`**${path}`,r=>r.fulfill({json:bodies[key]}));
 await page.route("**/api/agent-interaction*",r=>r.fulfill({json:r.request().method()==="DELETE"?{closed:true}:{checkedAt:new Date().toISOString(),endpoint:null,freshness:"live",model:"synthetic-profile",modelCount:1,observedAt:new Date().toISOString(),provider:"governed-ai-gateway",safetyMode:"oos-session/cgg-model-safe/governed-ai/manual-operator-request",status:"online"}}));
});
async function ready(page){await page.goto(base,{waitUntil:"domcontentloaded"});await expect(page.getByRole("region",{name:"Agent Console",exact:true}).getByRole("button",{name:"Workspace",exact:true})).toBeEnabled({timeout:60000});await page.getByRole("button",{name:"Inspect context",exact:true}).click();await expect(page.getByRole("dialog",{name:"Context Candidate",exact:true})).toBeVisible();await page.keyboard.press("Escape")}
test("long technical evidence stays contained at supported sizes; monitor tabs and agent modal keep keyboard ownership",async({page})=>{
 await page.route("**/api/governance-activity*",r=>r.fulfill({json:snapshot("synthetic:head",null)}));await ready(page);
 await page.getByRole("button",{name:"Show all events",exact:true}).click();await page.getByRole("button",{name:"View all activity",exact:true}).click();const history=page.getByRole("dialog",{name:"Activity History",exact:true});await history.locator('[aria-label="Governance activity history"] button').first().click();await history.getByText("Technical evidence and original record",{exact:true}).click();
 for(const width of [1200,1440,1700,1920]){await page.setViewportSize({width,height:900});const bounds=await history.locator("aside").evaluate(n=>({client:n.clientWidth,scroll:n.scrollWidth}));expect(bounds.scroll).toBeLessThanOrEqual(bounds.client+2);await expect(history.getByText(event().subject.ref,{exact:true})).toBeVisible()}
 await page.keyboard.press("Escape");const resources=page.getByRole("tab",{name:"RESOURCES",exact:true});await resources.focus();await page.keyboard.press("ArrowRight");await expect(page.getByRole("tab",{name:"COMPONENTS",exact:true})).toHaveAttribute("aria-selected","true");await page.keyboard.press("End");await expect(page.getByRole("tab",{name:"ALERTS",exact:true})).toHaveAttribute("aria-selected","true");
 const embedded=page.getByRole("region",{name:"Agent Console",exact:true});await embedded.getByRole("button",{name:"Expand agent interaction console",exact:true}).focus();await page.keyboard.press("Enter");const modal=page.getByRole("dialog",{name:"Agent Console",exact:true});await expect(modal).toBeVisible();await modal.getByRole("button",{name:"Focus",exact:true}).focus();await page.keyboard.press("Shift+Tab");expect(await modal.evaluate(n=>n.contains(document.activeElement))).toBe(true);await page.keyboard.press("Escape");await expect(embedded.getByRole("button",{name:"Expand agent interaction console",exact:true})).toBeFocused();
});
test("history retries the same failed cursor, replaces its bounded window and returns to latest",async({page})=>{
 const cursors=[];let first=true;
 await page.route("**/api/governance-activity*",r=>{const q=new URL(r.request().url()).searchParams;if(!q.has("cursor"))return r.fulfill({json:snapshot("synthetic:head","synthetic_cursor")});cursors.push(q.get("cursor"));if(first){first=false;return r.fulfill({status:503,json:{error:"Synthetic owner interruption"}})}return r.fulfill({json:snapshot("synthetic:older",null)})});
 await ready(page);await page.getByRole("button",{name:"Show all events",exact:true}).click();await page.getByRole("button",{name:"View all activity",exact:true}).click();const history=page.getByRole("dialog",{name:"Activity History",exact:true});await history.getByRole("button",{name:"Older events",exact:true}).click();await expect(history.getByRole("alert")).toContainText("current page is retained");await expect(history.locator('[aria-label="Governance activity history"] button')).toHaveCount(1);await history.getByRole("button",{name:"Older events",exact:true}).click();await expect(history.getByRole("status")).toContainText("page 2");expect(cursors).toEqual(["synthetic_cursor","synthetic_cursor"]);await expect(history.getByRole("button",{name:"Older events",exact:true})).toBeDisabled();await history.locator('[aria-label="Governance activity history"] button').first().click();await page.keyboard.press("Escape");await expect(page.locator("aside").filter({has:page.getByRole("heading",{name:"Evidence registry read",exact:true})})).toContainText("sha256:bbbbbbbbbbbb");await page.getByRole("button",{name:"View all activity",exact:true}).click();await expect(page.getByRole("dialog",{name:"Activity History",exact:true}).getByRole("status")).toContainText("page 2");await history.getByRole("button",{name:"Back to latest",exact:true}).click();await expect(history.getByRole("status")).toContainText("page 1");await expect(history.getByRole("button",{name:"Older events",exact:true})).toBeEnabled();
});

test("selected component details never cover monitor controls at supported widths",async({page})=>{
 await page.route("**/api/governance-activity*",r=>r.fulfill({json:snapshot("synthetic:head",null)}));
 const observedAt=new Date().toISOString();
 const components=[0,1].map(index=>({alertEligible:true,environment:"dev-integration",freshness:"current",href:null,id:`synthetic-component-${index}`,label:`Synthetic Component ${index}`,observedAt,sourceAuthority:"platform-engineering",sourceMode:"source-projected",sourceRef:`synthetic://observation/${index}/`+"a".repeat(128),status:"available",surface:"Synthetic observed surface",tone:"ok"}));
 await page.route("**/api/runtime-observations",r=>r.fulfill({json:{artifactType:"console-runtime-component-projection",components,mode:"live",reasonCode:null,schemaVersion:1,source:{authority:"platform-engineering",freshness:"current",observedAt,reference:"synthetic://platform-observation"}}}));
 await ready(page);await page.getByRole("tab",{name:"COMPONENTS",exact:true}).click();const rows=page.locator(".component-status-row");await expect(rows).toHaveCount(2);
 for(const width of [1200,1440,1700,1920]){
  await page.setViewportSize({width,height:1000});
  await rows.first().click();await expect(rows.first()).toHaveClass(/component-status-row-active/);
  const detail=page.locator(".component-focus-content");const bounds=await detail.evaluate(n=>({client:n.clientWidth,scroll:n.scrollWidth}));expect(bounds.scroll).toBeLessThanOrEqual(bounds.client+2);await expect(detail.getByText(components[0].sourceRef,{exact:true})).toBeVisible();
  await rows.nth(1).click();await expect(rows.nth(1)).toHaveClass(/component-status-row-active/);await expect(rows.first()).not.toHaveClass(/component-status-row-active/);
  await rows.nth(1).click();await expect(rows.nth(1)).not.toHaveClass(/component-status-row-active/);
  await rows.first().click();await page.getByRole("tab",{name:"ALERTS",exact:true}).click();await expect(page.getByRole("tab",{name:"ALERTS",exact:true})).toHaveAttribute("aria-selected","true");
  await page.getByRole("tab",{name:"COMPONENTS",exact:true}).click();await expect(page.getByRole("tab",{name:"COMPONENTS",exact:true})).toHaveAttribute("aria-selected","true");
  // Tab transitions may close details; do not impose a new persistence contract.
  if((await rows.first().getAttribute("class"))?.includes("component-status-row-active"))await rows.first().click();
 }
});

test("the command header and all seven launcher paths fit between the fixed docks",async({page})=>{
 await page.route("**/api/governance-activity*",r=>r.fulfill({json:snapshot("synthetic:head",null)}));
 await ready(page);
 const navigation=page.getByRole("navigation",{name:"Console navigation",exact:true});
 const launcher=page.locator(".operator-approval-strip");
 const buttons=launcher.locator("button");
 await expect(buttons).toHaveCount(7);
 for(const width of [1200,1440,1700,1920]){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(()=>window.scrollTo(0,0));
  const nav=await navigation.boundingBox();
  const header=page.locator(".top-command-panel");
  const bounds=await header.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(nav.x+nav.width);
  const title=await header.locator("h1").evaluate(n=>({width:n.clientWidth,scroll:n.scrollWidth}));
  expect(title.width).toBeGreaterThan(240);
  expect(title.scroll).toBeLessThanOrEqual(title.width+1);
  for(const button of await buttons.all()){
   await button.scrollIntoViewIfNeeded();
   expect(await button.evaluate(n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
   const label=await button.locator(".operator-approval-label").evaluate(n=>({client:n.clientWidth,scroll:n.scrollWidth}));
   expect(label.scroll).toBeLessThanOrEqual(label.client+1);
  }
 }
});

test("a long live Proposal keeps its next action visible and its full body in the Hub",async({page})=>{
 const at=new Date().toISOString();
 const body="Synthetic proposal context that should remain complete in the owner workflow. ".repeat(70)+"END OF ORIGINAL CONTEXT";
 const projection={schema_version:1,proposal_id:"idea-851",title:"Synthetic long proposal",body,status:"captured",projection_state:"current",record_project:"workspace-proposals",record_ref:"openproject://work_packages/851",record_system:"openproject",record_version:"version-17",decision_notes:null,triage_summary:null,route:null,last_event_ref:null,updated_at:at,handoff:{packet_ref:null,state:"not-requested",target_receipt_ref:null,target_record_ref:null},source:{context_ref:{request_id:"synthetic-851"},native_ref:{request_id:"synthetic-851"},ingress:"console",surface:"governance-operations-console"}};
 await page.route("**/api/proposals",r=>r.fulfill({json:{mode:"live",status:"current",error:null,observedAt:at,records:[{createdAt:at,projection,history:{schema_version:1,proposal_id:"idea-851",record_version:"version-17",events:[],next_cursor:null}}]}}));
 await ready(page);
 await page.getByRole("navigation",{name:"Console navigation",exact:true}).locator('button[title="Open PROPOSAL"]').click();
 const selected=page.locator('[data-proposal-selected-launcher="true"]');
 await expect(selected).toContainText("Full context is available in Proposal Hub.");
 await expect(selected).not.toContainText("END OF ORIGINAL CONTEXT");
 await expect(page.getByText("Console capture creates a proposal in Workspace Proposals through OOS.",{exact:false})).toBeVisible();
 const action=selected.getByRole("button",{name:"Open Proposal Hub",exact:true});
 const bounds=await selected.boundingBox(),button=await action.boundingBox();
 expect(button.y+button.height).toBeLessThanOrEqual(bounds.y+bounds.height);
 await action.click();
 await expect(page.getByText(body,{exact:true})).toBeAttached();
});

test("disconnected Proposal capture describes local preview persistence",async({page})=>{
 await page.route("**/api/proposals",r=>r.fulfill({json:{mode:"disconnected-preview",status:"current",error:null,observedAt:new Date().toISOString(),records:[]}}));
 await ready(page);
 await page.getByRole("navigation",{name:"Console navigation",exact:true}).locator('button[title="Open PROPOSAL"]').click();
 await expect(page.getByText("Console capture adds a local proposal to this disconnected preview.",{exact:false})).toBeVisible();
 await page.getByRole("button",{name:"Capture Proposal",exact:true}).click();
 await expect(page.getByRole("dialog",{name:"Capture Proposal",exact:true})).toContainText("disconnected preview");
});
