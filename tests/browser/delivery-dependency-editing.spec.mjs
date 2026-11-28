import {test,expect} from "../support/filled-surface-layout.mjs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{projectCanonicalDeliveryOverview}=require("../../src/domain-workspaces/delivery/live-runtime/delivery-overview-live-projection.ts");
const base=process.env.CONSOLE_TEST_BASE_URL??"http://127.0.0.1:3320";
test.setTimeout(120000);test.use({viewport:{width:1700,height:1050},actionTimeout:15000});

// Synthetic transport proves interaction and sequencing only; native owner
// qualification follows accepted-source activation, without injected responses.
async function open(page){
 const state={generation:1,writes:[],errors:[],rejectOnce:true,relations:[
  {id:1,relation_type:"follows",depends_on:{id:4,subject:"Work 4"},target:{id:3},lag:2,description:"Keep original lag unless this link is removed"},
  {id:2,relation_type:"follows",depends_on:{id:900,subject:"External recorded work"},target:{id:3},lag:4,description:"External supporting note"},
 ]};
 const ref=()=>`delivery-package:sha256:${String(state.generation).padStart(64,"0")}`;
 const node=(id,type,subject,children=[])=>({id,type,subject,children,status:"new",description:"Existing canonical narrative",record_ref:`openproject://work_packages/${id}`,owner_repo:"governance-operations-console",target_pi:null,architecture_anchor_ref:null,required_upstream_ref:null});
 const tree=node(1,"Epic","Dependency review exercise",[node(2,"Feature","Reviewed feature",[3,4,5].map(id=>node(id,"User story",`Work ${id}`)))]);
 const model=()=>{
  const work3 = tree.children[0].children[0];
  work3.depends_on_work_package_ids = state.relations.filter(relation => relation.target.id === 3).map(relation => relation.depends_on.id);
  work3.dependency_blocked = work3.depends_on_work_package_ids.length > 0;
  return projectCanonicalDeliveryOverview({schema_version:1,workflow_id:"delivery-console-overview",project:{identifier:"workspace-delivery-art"},roots:[tree],deferred_history_refs:[],mutation_authority:"none",operational_initiatives:[{epic:tree,execution_tree:tree,summary:{open_descendant_count:4},execution_navigation:{authority:"operator-orchestration-service",eligibility:"check-selected-work-item",native_status:"new",workflow_phase:"execution",package_posture:"New",closeout_pending:false,active_work_item_ids:[],prepared_work_item_ids:[],blocked_work_item_ids:[],refinement_work_item_ids:[]}}]},"test-only-owner-revision",new Date().toISOString());
 };
 const projection=()=>({schema_version:1,delivery_id:"delivery-1",record_ref:tree.record_ref,source_revision:ref(),projection_state:"current",projected_at:new Date().toISOString(),last_event_ref:null,package:{execution_tree:tree,dependency_relations:state.relations}});
 page.on("pageerror",error=>state.errors.push(error.message));
 await page.route("**/api/**",async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(path==="/api/console/capabilities")return route.fulfill({json:{artifactType:"console-runtime-capability-projection",schemaVersion:1,mode:"live",capabilities:[]}});
  if(path==="/api/delivery/workspace")return route.fulfill({json:{mode:"live",projection:model()}});
  if(path.endsWith("/change-control"))return route.fulfill({json:{mode:"live",status:"current",error:null,observedAt:new Date().toISOString(),projection:projection()}});
  if(path.includes("/change-control/commands/")){
   const id=decodeURIComponent(path.split("/").at(-1));
   state.readBack ??= [];state.readBack.push(id);
   return route.fulfill({json:state.confirm && id===state.delayed?.command_id
     ? {state:"completed",result:state.delayed} : {state:"pending"}});
  }
  if(path.endsWith("/change-control/commands")){
   const body=request.postDataJSON();state.writes.push(body);
   expect(body.expectedSourceRevision).toBe(ref());expect(body.acceptanceNote).toBe("Reviewed work prerequisites for this exercise.");
   const before=ref(),p=body.operation.payload;expect(body.operation.type).toBe("manage_dependency");
   let status="applied",effect={};
   if(p.action==="set"&&state.rejectOnce){state.rejectOnce=false;status="rejected";effect={error:{message:"Synthetic owner rejected this link; review and retry the remaining command."}};}
   else {
    const source=Number(p.depends_on_work_item_id.replace("work-item-","")),target=Number(p.target_work_item_id.replace("work-item-",""));
    if(p.action==="clear")state.relations=state.relations.filter(r=>r.depends_on.id!==source||r.target.id!==target);
    else state.relations.push({id:state.generation+10,relation_type:"follows",depends_on:{id:source,subject:`Work ${source}`},target:{id:target},lag:null,description:null});
    state.generation++;
   }
   const next_action={authority:"operator-orchestration-service",code:"refresh_delivery_package",label:"Review current work"},receipt={ref:"oos://synthetic/"+body.commandId,digest:"sha256:"+"a".repeat(64)};
   const result={schema_version:1,command_id:body.commandId,status,replayed:false,before:{record_ref:tree.record_ref,source_revision:before},after:{record_ref:tree.record_ref,source_revision:ref()},receipt,next_action,
    event:{schema_version:1,event_id:"event:"+body.commandId,command_id:body.commandId,command_digest:"sha256:"+"b".repeat(64),delivery_id:"delivery-1",operation_type:"manage_dependency",status,occurred_at:new Date().toISOString(),operator_id:"operator:test",source_revision_before:before,source_revision_after:ref(),effect,receipt,next_action,rollback:{mode:"compensating_command_required",reason:"Review a separate compensating command."}}};
   if(state.loseResponse){
    state.delayed=result;
    return route.fulfill({status:502,json:{error:"The request ended before its result arrived."}});
   }
   return route.fulfill({json:{mode:"live",status:"current",error:null,observedAt:new Date().toISOString(),result}});
  }
  return route.fulfill({status:503,json:{mode:"live",status:"offline",error:"Isolated unavailable owner",projection:null}});
 });
 const workspace=await openBoard(page);
 const hierarchy = workspace.getByRole("region", {name:"Work hierarchy", exact:true});
 await hierarchy.getByRole("button",{name:/^\d+ User Story #3 - Work 3\b/i}).click();
 await hierarchy.getByRole("button",{name:/^View on Work Board:/}).click();
 const details = workspace.locator('[data-execution-work-item-details="work-item-3"]');
 await expect(details.getByText("Depends on", {exact:true})).toBeVisible();
 await expect(details.getByRole("button", {name:/^Open User story #4:/i})).toBeVisible();
 await expect(details.getByText("Work item #900", {exact:true})).toBeVisible();
 await expect(details.getByRole("button",{name:"Add prerequisite",exact:true})).toHaveCount(0);
 await workspace.getByRole("radio",{name:"Work Tree",exact:true}).click();
 await workspace.getByRole("button",{name:"Edit Work Structure",exact:true}).click();
 const expand=workspace.getByRole("button",{name:/^Expand Feature #2\b/});if(await expand.count())await expand.click();
 return {state,workspace};
}
async function openBoard(page){
 await page.goto(base,{waitUntil:"domcontentloaded"});await page.waitForFunction(()=>{const b=document.querySelector('button[title="Open DELIVERY"]');return b&&Object.keys(b).some(key=>key.startsWith("__reactProps$"));});
 await page.locator('button[title="Open DELIVERY"]').click();
 const workspace=page.getByRole("dialog",{name:"Delivery Workspace",exact:true});await workspace.locator('[data-delivery-workspace-section="execution-board"]').click();
 await workspace.getByRole("button",{name:"Open Work Board",exact:true}).click();
 await workspace.getByRole("radio",{name:"Work Tree",exact:true}).click();
 return workspace;
}
async function choose(page,workspace,id){await workspace.getByRole("button",{name:"Prerequisite work item",exact:true}).click();await page.getByRole("option",{name:new RegExp(`^User story ${id} ·`)}).click();await workspace.getByRole("button",{name:"Add prerequisite",exact:true}).click();}

test("prerequisites preserve external links, reject local cycles, and apply reviewed changes with partial progress",async({page},info)=>{
 const {state,workspace}=await open(page);
 await workspace.locator('input[value="Work 4"]').click();await choose(page,workspace,3);
 await expect(workspace.getByRole("button",{name:"Done Editing",exact:true})).toBeDisabled();
 await expect(workspace).toContainText("Work dependencies form a cycle");expect(state.writes).toHaveLength(0);
 await workspace.getByRole("button",{name:/^Remove prerequisite User story 3/}).click();
 await workspace.locator('input[value="Work 3"]').click();
 await expect(workspace).toContainText("Work item 900 · outside this package");
 await choose(page,workspace,5);await workspace.getByRole("button",{name:/^Remove prerequisite User story 4/}).click();
 for(const viewport of [{width:1700,height:1050},{width:1280,height:720}]){
  await page.setViewportSize(viewport);await workspace.getByRole("button",{name:"Add prerequisite",exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath(`work-prerequisites-${viewport.width}.png`)});
 }
 await workspace.getByRole("button",{name:"Done Editing",exact:true}).click();
 const review=page.getByRole("dialog",{name:"Review Execution Changes",exact:true});
 await expect(review).toContainText("Remove prerequisite User story 4");await expect(review).toContainText("Require User story 5");expect(state.writes).toHaveLength(0);
 await review.getByRole("textbox",{name:"Acceptance note",exact:true}).fill("Reviewed work prerequisites for this exercise.");
 await review.getByRole("button",{name:"Apply Changes",exact:true}).click();
 await expect(review).toContainText("Synthetic owner rejected this link");await expect(review).toContainText("1 of 2 changes applied");
 expect(state.writes.map(w=>w.operation.payload.action)).toEqual(["clear","set"]);
 await review.getByRole("button",{name:"Retry Remaining Changes",exact:true}).click();
 const result=page.getByRole("dialog",{name:"Work structure updated",exact:true});await expect(result).toContainText("2 changes have been recorded");
 expect(state.writes.map(w=>w.operation.payload.action)).toEqual(["clear","set","set"]);
 expect(state.relations.map(r=>r.depends_on.id).sort()).toEqual([5,900]);
 const external=state.relations.find(r=>r.depends_on.id===900);expect(external.lag).toBe(4);expect(external.description).toBe("External supporting note");
 await result.getByRole("button",{name:"Close work structure result",exact:true}).click();
 await workspace.getByRole("button",{name:"Edit Work Structure",exact:true}).click();
 const expand=workspace.getByRole("button",{name:/^Expand Feature #2\b/});if(await expand.count())await expand.click();
 await workspace.locator('input[value="Work 3"]').click();await expect(workspace.getByRole("list",{name:"Selected prerequisites",exact:true})).toContainText("User story 5");
 expect(state.errors).toEqual([]);
});

test("a saved dependency change is recovered across reload without a second write",async({page})=>{
 const {state,workspace}=await open(page);
 state.rejectOnce=false;
 state.loseResponse=true;
 await workspace.locator('input[value="Work 3"]').click();
 await choose(page,workspace,5);
 await workspace.getByRole("button",{name:"Done Editing",exact:true}).click();
 const review=page.getByRole("dialog",{name:"Review Execution Changes",exact:true});
 await review.getByRole("textbox",{name:"Acceptance note",exact:true}).fill("Reviewed work prerequisites for this exercise.");
 await review.getByRole("button",{name:"Apply Changes",exact:true}).click();
 await expect(review.getByRole("button",{name:"Checking Result",exact:true})).toBeDisabled();
 const reloaded=await openBoard(page);
 await expect(reloaded).toContainText("Checking the result of your submitted work structure change");
 state.confirm=true;
 await expect(reloaded).toContainText("Your submitted work structure change was recorded.", {timeout:15000});
 expect(state.writes).toHaveLength(1);
 expect(new Set(state.readBack)).toEqual(new Set([state.writes[0].commandId]));
 expect(state.relations.filter(relation=>relation.depends_on.id===5)).toHaveLength(1);
});
