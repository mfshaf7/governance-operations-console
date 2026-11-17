import { test, expect } from "../support/filled-surface-layout.mjs";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {projectCanonicalDeliveryOverview}=require("../../src/domain-workspaces/delivery/live-runtime/delivery-overview-live-projection.ts");
const base=process.env.CONSOLE_TEST_BASE_URL??"http://127.0.0.1:3320";
test.setTimeout(120000);
test.use({viewport:{width:1700,height:1050}});

// Isolated browser protocol proof. Every API is intercepted. These responses
// never stand in for qualification of live OOS, source or ART mutations.
async function harness(page){
  const state={complete:false,reads:0,writes:[],errors:[],failClose:false,code:"landing-unit-closeout-retry-required"};
  function inventory(){
    const at=new Date().toISOString(),epic={id:1,type:"Epic",status:"new",subject:"Connected Execution Check",record_ref:"openproject://work_packages/1",owner_repo:null,target_pi:null,architecture_anchor_ref:null,required_upstream_ref:null};
    const tasks=[3,4].map(id=>({id,type:"Task",subject:`Work ${id}`,status:id===3||state.complete?"done":"in-progress",children:[],ready_contract_satisfied:true}));
    return projectCanonicalDeliveryOverview({schema_version:1,workflow_id:"delivery-console-overview",project:{identifier:"workspace-delivery-art"},roots:[epic],deferred_history_refs:[],mutation_authority:"none",
      operational_initiatives:[{epic,summary:{open_descendant_count:state.complete?0:1},execution_tree:{...epic,children:tasks},work_sessions:state.complete?[]:[{session_id:"work-session:delivery-1:workflow",work_item_ids:["work-item-3","work-item-4"],updated_at:at,state:"recorded"}],
        execution_navigation:{authority:"operator-orchestration-service",eligibility:"check-selected-work-item",native_status:"new",workflow_phase:"execution",package_posture:state.complete?"Closeout Pending":"In Progress",closeout_pending:state.complete,
          active_work_item_ids:state.complete?[]:[4],prepared_work_item_ids:[],blocked_work_item_ids:[],refinement_work_item_ids:[]}}]},"browser-owner-revision",at);
  }
  function session(){return {mode:"live",status:"current",observedAt:new Date().toISOString(),error:null,projection:{
    workflow_id:"delivery-art-work-session",work_item_id:"work-item-3",delivery_id:"delivery-1",covered_work_item_ids:["work-item-3","work-item-4"],
    landing_unit_id:"workflow",session_id:"work-session:delivery-1:workflow",session_revision:state.complete?"2026-11-17T02:00:00Z":"2026-11-17T01:00:00Z",state:"closeout-required",
    pull_request:{state:"merged",url:"https://github.com/example/work/pull/1",head_commit:"a".repeat(40),merge_commit:"b".repeat(40)},
    next_action:{authority:"operator-orchestration-service",code:state.code,...(state.requiredWork?{inputs:{work_item_id:`work-item-${state.requiredWork}`}}:{}),reason:"Synthetic owner next action for the connected workflow check."}}};}
  page.on("pageerror",error=>state.errors.push(error.message));
  await page.route("**/api/**",async route=>{
    const request=route.request(),path=new URL(request.url()).pathname;
    if(path==="/api/delivery/workspace"){state.reads++;return route.fulfill({json:{mode:"live",projection:inventory()}});}
    if(path==="/api/console/capabilities")return route.fulfill({json:{artifactType:"console-runtime-capability-projection",schemaVersion:1,mode:"live",capabilities:[]}});
    if(path==="/api/delivery/execution/3/work-session")return route.fulfill({json:session()});
    if(request.method()==="POST"){
      state.writes.push({path,body:request.postDataJSON()});
      if(path.endsWith("/work-session/close")){
        if(state.failClose){state.failClose=false;return route.fulfill({status:503,json:{mode:"live",status:"offline",error:"Synthetic lost acknowledgement",code:"delivery_work_session_projection_unavailable"}});}
        state.complete=true;state.code="initiative-closeout-required";return route.fulfill({json:session()});
      }
      if(path.endsWith("/work-session/reconstruct")){state.code="art-closeout-required";return route.fulfill({json:session()});}
      if(path.endsWith("/work-session/recover")){state.code="initiative-work-remains";return route.fulfill({json:session()});}
      return route.fulfill({status:503,json:{error:"Isolated unimplemented owner action"}});
    }
    return route.fulfill({status:503,json:{mode:"live",status:"offline",projection:null,error:"Isolated unavailable owner"}});
  });
  await page.goto(base,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>{const b=document.querySelector('button[title="Open DELIVERY"]');return b&&Object.keys(b).some(key=>key.startsWith("__reactProps$"));});
  await page.locator('button[title="Open DELIVERY"]').click();
  const workspace=page.getByRole("dialog",{name:"Delivery Workspace",exact:true});
  await workspace.locator('[data-delivery-workspace-section="execution-board"]').click();
  await workspace.getByRole("button",{name:"Open Work Item",exact:true}).click();
  const picker=page.getByRole("dialog",{name:"Open Work Item",exact:true});
  await expect(picker).toContainText("with a saved session");
  await picker.getByRole("button",{name:"Work item",exact:true}).click();
  await page.getByRole("option",{name:/^Task 3 ·/}).click();
  await picker.getByRole("button",{name:"Open Session",exact:true}).click();
  return {state,workspace,modal:page.getByRole("dialog",{name:"Governed Work Session",exact:true})};
}

test("partial closeout retry preserves identity and refreshes the board before package closeout navigation",async({page},info)=>{
  const {state,workspace,modal}=await harness(page);state.failClose=true;
  await expect(workspace.getByRole("heading",{name:"New",exact:true})).toHaveCount(0);
  const before=state.reads;
  await modal.getByRole("button",{name:"Retry Landing Unit Closeout",exact:true}).click();
  await expect(modal).toContainText("Synthetic lost acknowledgement");
  await modal.getByRole("button",{name:"Retry Landing Unit Closeout",exact:true}).click();
  await expect(modal.getByRole("button",{name:"Review Closeout",exact:true})).toBeVisible();
  await expect.poll(()=>state.reads).toBeGreaterThan(before);
  expect(state.writes[0]).toEqual(state.writes[1]);
  for (const [width,height] of [[1700,1050],[1280,720]]) {
    await page.setViewportSize({width,height});
    await modal.getByRole("button",{name:"Review Closeout",exact:true}).scrollIntoViewIfNeeded();
    await modal.screenshot({path:info.outputPath(`execution-session-follow-up-${width}.png`)});
    expect(await modal.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
  }
  await modal.getByRole("button",{name:"Review Closeout",exact:true}).click();
  await expect(page.getByRole("dialog",{name:"Delivery Closeout",exact:true})).toBeVisible();
  expect(state.writes.map(item=>item.path)).toEqual(Array(2).fill("/api/delivery/execution/3/work-session/close"));
  expect(state.errors).toEqual([]);
});

test("human review remains a link and reconstruction uses its bounded owner action",async({page})=>{
  const {state,modal}=await harness(page);state.code="pull-request-review-required";
  await modal.getByRole("button",{name:"Read Current Session",exact:true}).click();
  await expect(modal.getByRole("link",{name:"Open Pull Request ↗",exact:true})).toHaveAttribute("href","https://github.com/example/work/pull/1");
  await expect(modal.getByRole("button",{name:"Merge Source",exact:true})).toHaveCount(0);expect(state.writes).toEqual([]);
  state.code="architecture-reconstruction-required";
  await modal.getByRole("button",{name:"Read Current Session",exact:true}).click();
  await modal.getByRole("button",{name:"Rebuild Session Binding",exact:true}).click();
  expect(state.writes.map(item=>item.path)).toEqual(["/api/delivery/execution/3/work-session/reconstruct"]);
  state.code="architecture-human-gate-required";state.requiredWork=4;
  await modal.getByRole("button",{name:"Read Current Session",exact:true}).click();
  await modal.getByRole("button",{name:"Open Required Work",exact:true}).click();
  const chooser=page.getByRole("dialog",{name:"Open Work Item",exact:true});
  await expect(chooser.getByRole("button",{name:"Work item",exact:true})).toContainText("Task 4");
  expect(state.writes).toHaveLength(1);
  expect(state.errors).toEqual([]);
});

test("recovery requires an explicit substantive reason and then offers remaining-work navigation",async({page})=>{
  const {state,modal}=await harness(page);state.code="architecture-recovery-required";
  await modal.getByRole("button",{name:"Read Current Session",exact:true}).click();
  const archive=modal.getByRole("button",{name:"Archive Superseded Session",exact:true});
  await expect(archive).toBeDisabled();
  await modal.getByRole("textbox",{name:"Reason for archiving",exact:true}).fill("Preserve this attempt while preparing work against the accepted replacement architecture.");
  await archive.click();
  expect(state.writes).toHaveLength(1);expect(state.writes[0].path).toBe("/api/delivery/execution/3/work-session/recover");
  expect(state.writes[0].body.recovery.pull_request.head_commit).toBe("a".repeat(40));
  await modal.getByRole("button",{name:"Choose Remaining Work",exact:true}).click();
  await expect(page.getByRole("dialog",{name:"Open Work Item",exact:true})).toContainText("Connected Execution Check");
  expect(state.errors).toEqual([]);
});
