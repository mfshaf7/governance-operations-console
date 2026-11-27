import {test,expect} from "../support/filled-surface-layout.mjs";
import {createRequire} from "node:module";
import {createHash} from "node:crypto";
import {technicalPlanInput,technicalPlanArtifact} from "../support/technical-plan-fixture.mjs";
const require=createRequire(import.meta.url),{projectCanonicalDeliveryOverview}=require("../../src/domain-workspaces/delivery/live-runtime/delivery-overview-live-projection.ts");
const base=process.env.CONSOLE_TEST_BASE_URL??"http://127.0.0.1:3320";
test.setTimeout(60000);
test.beforeEach(({page})=>{
 page.setDefaultTimeout(12000);
 page.setDefaultNavigationTimeout(35000);
});
test.use({viewport:{width:1700,height:1050}});
const scopedWorkDescription = "Update the homepage and coordinate the compatibility change that lands first.";
const advisorPlanSummary = "Publish the reviewed homepage so visitors can find the updated contact details.\n\nCheck the links and layout before release.";
async function open(page,{recorded=false,staleApproval=false,history=false,validationErrors=[],durableDraft=false,website=false,initialPlan,recordedRevision=false,longWorkTitle,guidance=false,sessionImpact=[],staleImpact=false}={}){
 const state={requests:[],advisor:[],errors:[],workReads:[],staleApproval,staleImpact,recorded,savedDraft:null};
 const impact={revision:"sha256:"+"e".repeat(64),sessions:sessionImpact};
 if(initialPlan){
  const packageId=initialPlan.delivery_id;
  const payload_json=JSON.stringify({schemaVersion:1,packageId,draft:{
   deliveryId:packageId,coveredWorkItemIds:initialPlan.covered_work_item_ids,rationale:initialPlan.decision.rationale,
   architectureJson:JSON.stringify(initialPlan.architecture),conformanceJson:JSON.stringify(initialPlan.conformance_plan),
   repoRevisionsJson:JSON.stringify(initialPlan.repo_revisions),
  }});
  state.savedDraft={payload_json,revision:1,content_digest:"sha256:"+createHash("sha256").update(payload_json).digest("hex"),
    acknowledgement_id:"saved-work:technical-plan",saved_at:new Date().toISOString()};
 }
 const epic={id:1,type:"Epic",status:"in-progress",subject:website?"Personal Website":"Technical Plan Exercise",record_ref:"openproject://work_packages/1",owner_repo:"governance-operations-console",target_pi:null,architecture_anchor_ref:null,required_upstream_ref:null};
 const task={id:3,type:"User story",status:"ready",subject:longWorkTitle??(website?"Build the homepage":"Implement the reviewed outcome"),description:"Build the bounded requested change.",owner_repo:"governance-operations-console",ready_contract_satisfied:true,children:[]};
 const contractTask={...task,id:4,subject:"Prepare site compatibility",owner_repo:"website-contracts"};
 const unrelated={...task,id:5,subject:"Unrelated work on the same schedule"};
 if(guidance){
  Object.assign(task,{target_pi:"PI-2026-11",iteration:"PI-2026-11 / Iteration 2",depends_on_work_package_ids:[4]});
  Object.assign(contractTask,{target_pi:"PI-2026-11",iteration:"PI-2026-11 / Iteration 1"});
  Object.assign(unrelated,{target_pi:task.target_pi,iteration:task.iteration});
 }
 const children=guidance?[task,contractTask,unrelated]:initialPlan||recorded?[task,contractTask]:[task];
 const model=projectCanonicalDeliveryOverview({schema_version:1,workflow_id:"delivery-console-overview",project:{identifier:"workspace-delivery-art"},roots:[epic],deferred_history_refs:[],mutation_authority:"none",operational_initiatives:[{epic,execution_tree:{...epic,children},summary:{open_descendant_count:children.length}}]},"test-revision",new Date().toISOString());
 page.on("pageerror",error=>state.errors.push(error.message));
 await page.route("**/api/**",async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(path==="/api/console/capabilities")return route.fulfill({json:{artifactType:"console-runtime-capability-projection",schemaVersion:1,mode:"live",capabilities:[]}});
  if(path==="/api/delivery/workspace")return route.fulfill({json:{mode:"live",projection:model}});
  if(guidance && path==="/api/delivery/execution/delivery-1/change-control"){
   const observedAt=new Date().toISOString();
   return route.fulfill({json:{mode:"live",status:"current",observedAt,error:null,projection:{
    schema_version:1,delivery_id:"delivery-1",record_ref:epic.record_ref,
    source_revision:"delivery-package:sha256:"+"e".repeat(64),projection_state:"current",
    last_event_ref:null,projected_at:observedAt,package:{
     execution_tree:{...epic,children:children.map(child=>({...child,
      record_ref:`openproject://work_packages/${child.id}`,
      description:child.id===task.id?scopedWorkDescription:child.description,
     }))},dependency_relations:[],
    },
   }}});
  }
  if(path==="/api/saved-work/technical-plan/delivery-1"&&(durableDraft||initialPlan)){
   if(req.method()==="POST"){
    const {payload_json,expected_revision}=req.postDataJSON();
    const revision=state.savedDraft?.revision??0;
    if(expected_revision!==revision)return route.fulfill({status:409,json:{error:"The draft changed in another session."}});
    state.savedDraft={payload_json,revision:revision+1,content_digest:"sha256:"+createHash("sha256").update(payload_json).digest("hex"),
      acknowledgement_id:"saved-work:technical-plan",saved_at:new Date().toISOString()};
   }
   return route.fulfill({json:{mode:"live",operatorId:"operator:synthetic",snapshot:{
    kind:"technical-plan",subject_id:"delivery-1",record:state.savedDraft,recoveries:[],
   }}});
  }
  if(path==="/api/delivery/execution/3/work-session"&&req.method()==="GET"){
   state.workReads.push(3);
   return route.fulfill({json:{mode:"live",status:"current",observedAt:new Date().toISOString(),error:null,projection:{
    workflow_id:"delivery-art-work-session",work_item_id:"work-item-3",delivery_id:"delivery-1",landing_unit_id:null,
    session_id:null,session_revision:null,state:state.recorded||guidance?"decision-required":"blocked",next_action:{
     authority:"operator-orchestration-service",code:state.recorded||guidance?"work-session-start-required":"architecture-packet-required",
     reason:guidance?"Review this selected work before starting.":state.recorded?"Review the start with the recorded plan.":"An approved plan is required for this work."
    }
   }}});
  }
  if(path.startsWith("/api/saved-work/"))return route.fulfill({json:{mode:"disconnected-preview"}});
  if(path==="/api/delivery/architecture-packets/delivery-1"){
   if(!state.recorded)return route.fulfill({status:404,json:{mode:"live",status:"offline",code:"delivery_art_reference_missing",error:"No recorded plan"}});
   return route.fulfill({json:{mode:"live",status:"current",observedAt:new Date().toISOString(),error:null,result:{workflow_id:"delivery-art-architecture-packet-current",artifact:technicalPlanArtifact(technicalPlanInput("architecture-ready"),true),contract_posture:"current",custody_receipt:{},projected_reference:{}}}});
  }
  if(path==="/api/advisor-interaction"){
   const body=req.postDataJSON();state.advisor.push(body);
   if(body.scope.ref.includes(":plan-guidance:")){
    const message=body.prompt.includes("editable starter") ? JSON.stringify({
      rationale:advisorPlanSummary,verification:"Homepage compatibility",success:"The homepage opens with the new compatibility change.",
      failure:"An incompatible revision is rejected.",rollback:["Restore the previous homepage."]})
      : "PLAN RECOMMENDED\n\nThe homepage depends on a compatibility change in the previous iteration.";
    return route.fulfill({json:{intent:"answer",message,edits:[],evidence:{profileId:"agent-console-assistant-v1",auditRef:"audit:test",contextRef:"context:test"}}});
   }
   const edit=body.scope.fields[0]?.key==="planSummary" ? {field:"planSummary",value:advisorPlanSummary} :
    {field:"sectionJson",value:JSON.stringify([{work_item_id:"work-item-3",work_item_type:"User story",parent_work_item_id:"work-item-1",owner_repo:"governance-operations-console"}])};
   return route.fulfill({json:{intent:body.prompt.startsWith("Draft")?"draft":"answer",message:"Synthetic governed response for this manual request.",edits:body.prompt.startsWith("Draft")?[edit]:[],evidence:{profileId:"agent-console-assistant-v1",auditRef:"audit:test",contextRef:"context:test"}}});
  }
  if(path==="/api/delivery/architecture-packets/facts"){
   const { input } = req.postDataJSON();
   state.factReads = [...(state.factReads ?? []), input];
   const authorization = {uri:`https://github.com/example/${task.owner_repo}/blob/`+"d".repeat(40)+"/docs/authorization.md",digest:"sha256:"+"e".repeat(64)};
   const result = {delivery_id:input.delivery_id,kind:input.kind};
   if(input.kind==="recorded-authorization") result.refs=[authorization];
   else{
    const fact = input.kind==="revision" ? {repo:task.owner_repo,base_ref:"origin/main",commit:"d".repeat(40)} :
     input.kind==="authorization" ? authorization : {repo: input.repo,revision:input.revision,path:input.path,field:input.field,
      observed_value:true,observed_posture:"source-ready"};
    result.facts=[recordedRevision?{repo:task.owner_repo,status:"available",fact}:{repo:task.owner_repo,status:"unavailable"}];
   }
   return route.fulfill({json:{mode:"live",status:"current",result}});
  }
  if(path==="/api/delivery/architecture-packets/draft"){
   const body=req.postDataJSON();state.requests.push({path,body});
   if(validationErrors.length)return route.fulfill({status:422,json:{mode:"live",status:"offline",code:"delivery_art_authoring_contract_invalid",error:"This plan needs correction.",issues:validationErrors}});
   const approved=body.input.decision.status==="architecture-ready";
   return route.fulfill({json:{mode:"live",status:"current",observedAt:new Date().toISOString(),error:null,result:{workflow_id:"delivery-art-architecture-packet-draft",architecture_packet:technicalPlanArtifact(body.input),session_impact:impact,source_snapshot:{art_digest:"sha256:"+(approved&&state.staleApproval?"c":"b").repeat(64),covered_record_count:1,dependency_record_count:0,relation_count:0}}}});
  }
  if(path==="/api/delivery/architecture-packets/persist"){
   const body=req.postDataJSON();state.requests.push({path,body});
   if(state.staleImpact)return route.fulfill({status:409,json:{mode:"live",status:"offline",code:"delivery_art_plan_impact_changed",error:"The current plan or work session changed. Validate the draft and review the current impact before recording."}});
   expect(body.expected_impact_revision).toBe(impact.revision);
   state.recorded=true;
   const artifact={...body.artifact,custody:{backend:"wgcf-artifact-registry",state:"durable",uri:"wgcf://artifacts/delivery-art/sha256/"+"a".repeat(64)}};
   return route.fulfill({json:{mode:"live",status:"current",observedAt:new Date().toISOString(),error:null,result:{workflow_id:"delivery-art-architecture-packet-persist",artifact,session_impact:impact,custody_receipt:{ref:"receipt:test"},owner_receipt:{ref:"owner:test"}}}});
  }
  return route.fulfill({status:503,json:{mode:"live",status:"offline",projection:null,error:"Isolated owner unavailable"}});
 });
 await page.goto(base,{waitUntil:"domcontentloaded"});await page.waitForFunction(()=>{const button=document.querySelector('button[title="Open DELIVERY"]');return button&&Object.keys(button).some(key=>key.startsWith("__reactProps$"));});
 await page.locator('button[title="Open DELIVERY"]').click();const workspace=page.getByRole("dialog",{name:"Delivery Workspace",exact:true});await workspace.locator('[data-delivery-workspace-section="execution-board"]').click();
 if(history)await workspace.getByRole("radio",{name:"History",exact:true}).click();
 if(website){
  await workspace.getByRole("button",{name:"Open Work Board",exact:true}).click();
  await workspace.getByRole("button",{name:/User story #3 Build the homepage/}).click();
  await workspace.getByRole("button",{name:"Check Work Requirements",exact:true}).click();
  if(!guidance){
   const session = page.getByRole("dialog",{name:"Work Session",exact:true});
   await expect(session.getByRole("button",{name:"Check recommendation",exact:true})).toHaveCount(0);
   await session.getByRole("button",{name:"Prepare Technical Plan",exact:true}).click();
  }
 }else await workspace.getByRole("button",{name:"Open Technical Plan",exact:true}).click();
 return {state,workspace,modal:page.getByRole("dialog",{name:"Technical Plan & Approval",exact:true})};
}
test("Execution checks only explicitly and keeps advice and starter coverage tied to the selected work", async ({page}, info) => {
 const {state,modal}=await open(page,{website:true,guidance:true,durableDraft:true});
 const session=page.getByRole("dialog",{name:"Work Session",exact:true});
 const check=session.getByRole("button",{name:"Check recommendation",exact:true});
 await expect(check).toBeEnabled();
 expect(state.advisor).toEqual([]);
 await check.click();
 await expect(session.getByText("A Technical Plan would help",{exact:true})).toBeVisible();
 const first=state.advisor[0];
 expect(first.scope).toMatchObject({role:"execution-architecture",packageRef:"delivery-1",readOnly:true,fields:[]});
 const {selectedWork,prerequisites,dependentWork}=JSON.parse(first.scope.context).observations;
 expect(selectedWork).toMatchObject({id:3,targetPI:"PI-2026-11",iteration:"PI-2026-11 / Iteration 2",description:scopedWorkDescription});
 expect(prerequisites).toEqual([expect.objectContaining({id:4,iteration:"PI-2026-11 / Iteration 1"})]);
 expect(dependentWork).toEqual([]);
 expect(first.scope.context).not.toContain("Unrelated work on the same schedule");
 await session.screenshot({path:info.outputPath("technical-plan-recommendation.png")});

 await session.getByRole("button",{name:"Draft Technical Plan",exact:true}).click();
 await expect(modal.getByText("The starter includes an approach", {exact:false})).toBeVisible();
 await expect.poll(()=>state.savedDraft?.revision).toBe(1);
 const draft=JSON.parse(state.savedDraft.payload_json).draft;
 expect(draft.coveredWorkItemIds).toEqual(["work-item-3"]);
 expect(draft.rationale).toBe(advisorPlanSummary);
 expect(JSON.parse(draft.conformanceJson).cases.map(row=>row.applies_to_work_item_ids)).toEqual([["work-item-3"],["work-item-3"]]);
 expect(JSON.parse(draft.architectureJson).rollback_cleanup_terminal_conditions.rollback_units).toEqual(["Restore the previous homepage."]);
 expect(draft.starterBasis.workItemId).toBe(3);
 expect(state.requests).toEqual([]);
 expect(state.advisor).toHaveLength(2);
 await modal.getByRole("button",{name:"Back to Execution Board",exact:true}).click();
 await expect(session.getByText("A Technical Plan would help",{exact:true})).toBeVisible();
 // Open the same private draft and change its coverage. The starter remains editable.
 await session.getByRole("button",{name:"Draft Technical Plan",exact:true}).click();
 await expect(modal.getByText("Opened the existing plan. Its content is preserved.",{exact:true})).toBeVisible();
 await modal.getByRole("button",{name:/User story #5 - Unrelated work on the same schedule/}).click();
 await expect(modal.getByText("Review the starter against the current scope",{exact:true})).toBeVisible();
 await expect.poll(()=>JSON.parse(state.savedDraft.payload_json).draft.coveredWorkItemIds).toEqual(["work-item-3","work-item-5"]);
 expect(JSON.parse(state.savedDraft.payload_json).draft.rationale).toBe(advisorPlanSummary);
});

test("Execution displays an approved plan before asking the model and preserves an existing private draft", async ({page}) => {
 const {state,modal}=await open(page,{website:true,guidance:true,recorded:true,initialPlan:technicalPlanInput()});
 const session=page.getByRole("dialog",{name:"Work Session",exact:true});
 const initialDraft=structuredClone(state.savedDraft);
 await session.getByRole("button",{name:"View Approved Plan",exact:true}).click();
 await expect(modal.getByText("Read-only",{exact:true})).toBeVisible();
 expect(state.advisor).toEqual([]);
 expect(state.savedDraft).toEqual(initialDraft);
});

test("Execution starter preserves the already saved plan draft", async ({page}) => {
 const {state,modal}=await open(page,{website:true,guidance:true,initialPlan:technicalPlanInput()});
 const session=page.getByRole("dialog",{name:"Work Session",exact:true});
 const initialDraft=structuredClone(state.savedDraft);
 await session.getByRole("button",{name:"Check recommendation",exact:true}).click();
 await session.getByRole("button",{name:"Draft Technical Plan",exact:true}).click();
 await expect(modal.getByText("Opened the existing plan. Its content is preserved.",{exact:true})).toBeVisible();
 expect(state.savedDraft).toEqual(initialDraft);
 expect(state.requests).toEqual([]);
});

test("owner validation findings remain inspectable and editing clears the failed attempt",async({page})=>{
 const findings=["architecture work dependency graph must be acyclic",
   "architecture human gate gate:publish-review evidence prerequisites are absent from authority work item work-item-3 execution prerequisites: work-item-2"];
 const {state,modal}=await open(page,{validationErrors:findings,initialPlan:technicalPlanInput()});
 await step(modal,"Review & record").click();
 await modal.getByRole("button",{name:"Validate Plan",exact:true}).click();
 const action=modal.locator('[data-technical-plan-action="true"]');
 await expect(action).toContainText("This plan needs correction.");
 await expect(modal.getByRole("heading",{name:"Changes needed before approval",exact:true})).toBeVisible();
 await expect(modal.getByText(/Some work or approvals depend on each other/)).toBeVisible();
 await expect(modal.getByText(/missing a dependency for its required evidence/)).toBeVisible();
 await expect(modal.getByText(findings[0],{exact:true})).toBeHidden();
 await modal.getByText("Plan checks requiring attention · 2",{exact:true}).click();
 for(const finding of findings)await expect(modal.getByText(finding,{exact:true})).toBeVisible();
 await page.screenshot({path:test.info().outputPath("technical-plan-validation-findings.png")});
 await expect(modal.getByRole("button",{name:"Approve Plan",exact:true})).toHaveCount(0);
 await action.getByRole("button",{name:"Review next issue",exact:true}).click();
 await expect(modal.getByRole("heading",{name:"Work dependencies",exact:true})).toBeVisible();
 await step(modal,"Choose scope").click();
 await modal.getByRole("textbox",{name:"Plan summary and justification",exact:true}).fill("Revised reviewed rationale, with the dependency correction still to validate.");
 await expect(action).not.toContainText("Plan checks requiring attention");
 expect(state.requests).toHaveLength(1);
 expect(state.requests[0].body.input.decision.status).toBe("draft");
 expect(state.errors).toEqual([]);
});
const step=(modal,label)=>modal.getByRole("group",{name:"Technical plan flow"}).getByRole("button",{name:new RegExp(label)});
async function includeWork(modal){
 await step(modal,"Choose scope").click();
 await modal.getByRole("textbox",{name:"Find work to include",exact:true}).fill("3");
 const work=modal.getByRole("button",{name:/^User story #3 - (Implement the reviewed outcome|Build the homepage)/});
 if(await work.getAttribute("aria-pressed")!=="true")await work.click();
}
test("package entry and advisor are scoped, manual and undoable without canonical mutation",async({page},info)=>{
 const {state,modal}=await open(page);await expect(modal).toContainText("Technical Plan Exercise");await expect(modal).toContainText("No approved plan recorded");expect(state.advisor).toEqual([]);
 await expect(modal.getByText(/^Ask me about the work included in this plan\./)).toBeVisible();
 const prompt=modal.getByRole("textbox",{name:"Technical plan advisor prompt",exact:true});
 const run=prompt.locator("xpath=ancestor::form").getByRole("button",{name:"run",exact:true});
 const summary=modal.getByRole("textbox",{name:"Plan summary and justification",exact:true});
 const original="Retain the current launch plan until the homepage passes review.";
 await summary.fill(original);
 await includeWork(modal);
 await prompt.fill("Draft the plan summary in plain language");
 await run.click();
 await expect(summary).toHaveValue(advisorPlanSummary);
 expect(state.advisor[0].scope).toMatchObject({role:"execution-architecture",ref:"delivery-1:scope-summary",
  readOnly:false,fields:[{key:"planSummary",value:original}]});
 expect(state.advisor[0].scope.fields).toHaveLength(1);
 await modal.getByRole("button",{name:"Undo advisor edit",exact:true}).click();
 await expect(summary).toHaveValue(original);
 expect(state.requests).toEqual([]);
 await step(modal,"Plan the changes").click();
 await expect(modal.getByRole("tab",{name:/^Work responsibilities/})).toHaveCount(0);
 await modal.getByRole("tab",{name:/^Source revisions/}).click();
 await prompt.fill("Explain this section");
 await run.click();
 await expect.poll(()=>state.advisor.length).toBe(2);expect(state.advisor[1].scope).toMatchObject({role:"execution-architecture",readOnly:true});expect(state.requests).toEqual([]);
 await prompt.fill("Draft revisions from recorded facts");
 await run.click();
 await expect.poll(()=>state.advisor.length).toBe(3);await expect(modal).toContainText("read-only; no edits are allowed");expect(state.requests).toEqual([]);
 for(const [width,height]of[[1700,1050],[1280,720]]){await page.setViewportSize({width,height});await modal.screenshot({path:info.outputPath(`technical-plan-advisor-${width}.png`)});expect(await modal.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
   const shown=await prompt.evaluate(element=>{let {top,bottom}=element.getBoundingClientRect();for(let parent=element.parentElement;parent;parent=parent.parentElement){if(getComputedStyle(parent).overflowY!=="visible"){const rect=parent.getBoundingClientRect();top=Math.max(top,rect.top);bottom=Math.min(bottom,rect.bottom);}}return bottom-top;});expect(shown).toBeGreaterThanOrEqual(25);
   expect(await prompt.evaluate(element=>{const panel=element.closest("section"),stack=element.closest('[data-teras-panel-stack="true"]');return panel&&stack?panel.getBoundingClientRect().bottom-stack.getBoundingClientRect().bottom:0;})).toBeLessThanOrEqual(1);}
 await modal.getByRole("tab",{name:/^Source revisions/}).click();
 await prompt.fill("Draft repository revisions");await run.click();
 await expect.poll(()=>state.advisor.length).toBe(4);expect(state.advisor.at(-1).scope.readOnly).toBe(true);
 await expect(modal).toContainText("read-only; no edits are allowed");expect(state.requests).toEqual([]);
 await modal.getByRole("tab",{name:/^Change groups/}).click();
 for(const name of ["Saved architecture","Implementation sequence","Review & record"]){
  if(name==="Review & record")await step(modal,name).click();
  else await modal.getByRole("button",{name,exact:true}).click();
  await prompt.fill("Draft the selected change groups");await run.click();
  await expect.poll(()=>JSON.parse(state.advisor.at(-1).scope.context).observations.planView).toBe(
   {"Saved architecture":"design","Implementation sequence":"sequence","Review & record":"review"}[name]);
  expect(state.advisor.at(-1).scope.readOnly).toBe(true);
 }
 expect(state.advisor).toHaveLength(7);
 await step(modal,"Plan the changes").click();
 await modal.getByRole("button",{name:"Edit plan",exact:true}).click();
 await expect(modal.getByRole("button",{name:"Add group",exact:true})).toBeEnabled();
 expect(state.requests).toEqual([]);
 expect(state.errors).toEqual([]);
});
test("a personal website plan records approval and returns to the exact work-start review",async({page},info)=>{
 const input=technicalPlanInput();
 input.decision.rationale="Release the homepage when links and desktop and mobile layouts have been checked.";
 const {state,modal}=await open(page,{website:true,initialPlan:input,sessionImpact:[
  {disposition:"refresh",reason:"scope-unchanged",owner_repo:"governance-operations-console",work_item_ids:["work-item-3"],open_work_item_id:"work-item-3"},
  {disposition:"rebuild",reason:"scope-changed-clean",owner_repo:"website-contracts",work_item_ids:["work-item-4"],open_work_item_id:"work-item-4"},
  {disposition:"review",reason:"session-operator",owner_repo:"governance-operations-console",work_item_ids:["work-item-5"],open_work_item_id:null},
 ]});
 await expect(modal).toContainText("Opened from a work item");
 await expect(modal).toContainText("Build the homepage");
 await step(modal,"Plan the changes").click();
 const advisorPrompt=modal.getByRole("textbox",{name:"Technical plan advisor prompt",exact:true});
 await advisorPrompt.fill("Explain what needs to happen before the homepage.");
 await modal.getByRole("button",{name:"Saved architecture",exact:true}).click();
 const action=modal.locator('[data-technical-plan-action="true"]');
 await expect(action).toContainText("Use the saved diagrams and brief to check the plan against the system design.");
 await expect(advisorPrompt).toBeVisible();
 await expect(advisorPrompt).toHaveValue("Explain what needs to happen before the homepage.");
 await modal.getByRole("button",{name:"Implementation sequence",exact:true}).click();
 await expect(advisorPrompt).toBeVisible();
 await expect(advisorPrompt).toHaveValue("Explain what needs to happen before the homepage.");
 await expect(modal.getByRole("button",{name:"Continue to review",exact:true})).toBeVisible();
 await expect(modal.getByLabel("Implementation sequence canvas")).toBeVisible();
 await expect(modal.getByRole("list",{name:"Focused dependency diagram"})).toContainText("Build the homepage");
 await modal.getByRole("button",{name:"Open full map",exact:true}).click();
 const map=page.getByRole("dialog",{name:"Full dependency map",exact:true});
 await map.getByRole("button",{name:"Zoom in",exact:true}).click();
 await map.getByRole("button",{name:"Close dialog",exact:true}).click();
 await modal.screenshot({path:info.outputPath("technical-plan-sequence.png")});
 await action.getByRole("button",{name:"Continue to review",exact:true}).click();
 await expect(step(modal,"Review & record")).toHaveAttribute("aria-current","step");
 await modal.getByRole("button",{name:"Validate Plan",exact:true}).click();
 const impact=modal.getByRole("list",{name:"Affected work sessions"});
 await expect(impact).toContainText("Refresh plan link");
 await expect(impact).toContainText("Rebuild available");
 await expect(impact).toContainText("Review needed");
 await expect(impact.getByRole("button",{name:"Open Work Session"})).toHaveCount(0);
 await impact.screenshot({path:info.outputPath("plan-session-impact.png")});
 await expect(modal.getByRole("button",{name:"Approve Plan",exact:true})).toBeDisabled();
 await modal.getByRole("radio",{name:"I approve this technical plan for the covered work",exact:true}).click();
 await modal.getByRole("button",{name:"Approve Plan",exact:true}).click();
 expect(state.requests).toHaveLength(2);
 expect(state.requests.every(item=>item.path.endsWith("/draft"))).toBe(true);
 await modal.getByRole("button",{name:"Record Approved Plan",exact:true}).click();
 await expect(modal).toContainText("Plan recorded");
 await expect(action).toContainText("Return to the work-start check for the selected item.");
 expect(state.requests).toHaveLength(3);
 expect(state.requests[2].body.artifact.covered_work_item_ids).toEqual(["work-item-3","work-item-4"]);
 expect(state.requests[2].body.artifact.decision.status).toBe("architecture-ready");
 const reads=state.workReads.length;
 await expect(impact.getByRole("button",{name:"Open Work Session"})).toHaveCount(2);
 await impact.getByRole("listitem").filter({hasText:"Build the homepage"}).getByRole("button",{name:"Open Work Session"}).click();
 const work=page.getByRole("dialog",{name:"Work Session",exact:true});
 await expect(work).toContainText("Build the homepage");
 await expect(work).toContainText("Review the start with the recorded plan.");
 expect(state.workReads.length).toBeGreaterThan(reads);
 expect(state.workReads.every(id=>id===3)).toBe(true);
 expect(state.errors).toEqual([]);
});
test("a change after plan approval requires review again and keeps the draft",async({page})=>{
 const {state,modal}=await open(page,{staleImpact:true,initialPlan:technicalPlanInput()});
 await step(modal,"Review & record").click();
 await modal.getByRole("button",{name:"Validate Plan",exact:true}).click();
 await expect(modal).toContainText("There are no active work sessions affected by this plan.");
 await modal.getByRole("radio",{name:"I approve this technical plan for the covered work",exact:true}).click();
 await modal.getByRole("button",{name:"Approve Plan",exact:true}).click();
 await modal.getByRole("button",{name:"Record Approved Plan",exact:true}).click();
 await expect(modal).toContainText("Validate the draft and review the current impact");
 await expect(modal.getByRole("button",{name:"Validate Plan",exact:true})).toBeEnabled();
 await expect(modal.getByRole("button",{name:"Record Approved Plan",exact:true})).toHaveCount(0);
 expect(state.recorded).toBe(false);
 expect(state.savedDraft).not.toBeNull();
});
test("changed source prevents recording and History exposes no approval actions",async({page})=>{
 const {state,modal}=await open(page,{staleApproval:true,initialPlan:technicalPlanInput()});await step(modal,"Review & record").click();await modal.getByRole("button",{name:"Validate Plan",exact:true}).click();
 await modal.getByRole("radio",{name:"I approve this technical plan for the covered work",exact:true}).click();await modal.getByRole("button",{name:"Approve Plan",exact:true}).click();
 await expect(modal).toContainText("Source facts changed during approval");expect(state.requests.some(item=>item.path.endsWith("/persist"))).toBe(false);expect(state.errors).toEqual([]);
 const retained=await open(page,{recorded:true,history:true});
 const historyActions=retained.modal.locator('[data-technical-plan-action="true"]');
 await expect(historyActions).toContainText("Plan status");
 await expect(historyActions).toContainText("Plan recorded");
 await step(retained.modal,"Plan the changes").click();
 await expect(retained.modal.getByRole("button",{name:"Edit plan",exact:true})).toHaveCount(0);
 await retained.modal.getByRole("button",{name:"View plan",exact:true}).click();
 await retained.modal.getByRole("tab",{name:/^Source revisions/}).click();
 await retained.modal.getByRole("button",{name:"View revision details",exact:true}).click();
 const sources=retained.modal.getByRole("list",{name:"Repository revisions",exact:true});
 await sources.getByRole("button",{name:/governance-operations-console.*bbbbbbbbbbbb/}).click();
 const commit=retained.modal.getByRole("textbox",{name:"Exact commit",exact:true});
 await expect(commit).toHaveValue("b".repeat(40));
 await expect(commit).toBeDisabled();
 await retained.modal.getByRole("group",{name:"Planning areas",exact:true}).getByRole("button",{name:/Verification/}).click();
 await expect(retained.modal.getByRole("button",{name:"Add verification case",exact:true})).toBeDisabled();
 await retained.modal.getByRole("button",{name:/The page builds against the compatible revision/}).click();
 const retainedCase=page.getByRole("dialog",{name:"View verification case",exact:true});
 await expect(retainedCase.getByRole("textbox",{name:"Expected outcome",exact:true})).toBeDisabled();
 await retainedCase.getByRole("button",{name:"Close",exact:true}).click();
 for(const name of ["Validate Plan","Approve Plan","Record Approved Plan","Revise Current Plan"])await expect(retained.modal.getByRole("button",{name,exact:true})).toHaveCount(0);
 expect(retained.state.requests).toEqual([]);
});

test("technical plan drafts resume after closing and refresh with editable input only",async({page})=>{
 const {state,modal,workspace}=await open(page,{durableDraft:true});
 await includeWork(modal);
 await modal.getByRole("textbox",{name:"Plan summary and justification",exact:true}).fill("Release the reviewed homepage after checking links and layout.");
 await expect(modal.locator('[data-saved-work-status="saved"]')).toBeVisible();
 const saved=JSON.parse(state.savedDraft.payload_json);
 expect(saved.draft.coveredWorkItemIds).toEqual(["work-item-3"]);
 expect(saved.draft).not.toHaveProperty("approval");
 await modal.getByRole("button",{name:"Back to Execution Board",exact:true}).click();
 await page.reload({waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>Object.keys(document.querySelector('button[title="Open DELIVERY"]')??{}).some(key=>key.startsWith("__reactProps$")));
 if(!await workspace.isVisible())await page.getByTitle("Open DELIVERY",{exact:true}).click();
 await workspace.locator('[data-delivery-workspace-section="execution-board"]').click();
 await workspace.getByRole("button",{name:"Open Technical Plan",exact:true}).click();
 await expect(modal.getByText("1 in scope",{exact:true})).toBeVisible();
 await expect(modal.getByRole("textbox",{name:"Plan summary and justification",exact:true})).toHaveValue(saved.draft.rationale);
 await step(modal,"Review & record").click();
 await modal.getByRole("button",{name:"Read plan rationale",exact:true}).click();
 const rationale=page.getByRole("dialog",{name:"Plan rationale",exact:true});
 await expect(rationale.getByText(saved.draft.rationale,{exact:true})).toBeVisible();
 await rationale.getByRole("button",{name:"Close plan rationale",exact:true}).click();
 expect(state.requests).toEqual([]);
});

test("guided preparation keeps group IDs and source order synchronized",async({page},info)=>{
 await page.setViewportSize({width:1440,height:900});
 const {state,modal}=await open(page,{durableDraft:true});
 await includeWork(modal);
 await step(modal,"Plan the changes").click();
 const areas=modal.getByRole("group",{name:"Planning areas",exact:true});
 await expect(areas.getByRole("button")).toHaveText([
  /01.*Work & Changes/, /02.*Approvals & Decisions/, /03.*Sequence & Handoffs/, /04.*Operation & Recovery/, /05.*Verification/,
 ]);
 await expect(areas.getByRole("button",{name:/Work & Changes/})).toHaveAttribute("aria-current","step");
 await expect(modal.getByRole("textbox",{name:"Stored draft content",exact:true})).toHaveCount(0);
 const sections=modal.getByRole("tablist",{name:"Plan sections",exact:true});
 const editorFrame=modal.getByRole("heading",{name:"Change groups",exact:true}).locator("xpath=ancestor::*[@data-frame][1]");
 await expect(editorFrame.getByText("Group work by repository for review, merge, and rollback.",{exact:true})).toBeVisible();
 await expect(editorFrame.getByRole("tablist",{name:"Plan sections",exact:true})).toBeVisible();
 await expect(editorFrame.getByRole("region",{name:"Section fields",exact:true})).toBeVisible();
 await expect(sections.getByRole("tab")).toHaveText([/^Change groups/,/^Source revisions/]);
 await sections.getByRole("tab",{selected:true}).press("ArrowRight");
 await expect(sections.getByRole("tab",{name:/^Source revisions/})).toHaveAttribute("aria-selected","true");
 await expect(modal.getByRole("tabpanel",{name:/^Source revisions/})).toBeVisible();
 const choose=async label=>sections.getByRole("tab",{name:new RegExp("^"+label)}).click();
 await choose("Change groups");
 const groupSearch=modal.getByRole("textbox",{name:"Find a group",exact:true});
 await expect(groupSearch).toBeEnabled();
 await modal.getByRole("list",{name:"Change groups",exact:true}).getByRole("button",{name:/Implement the reviewed outcome/}).click();
 const groupPage=modal.getByRole("tabpanel");
 const covered=groupPage.getByRole("list",{name:"Choose work for this change group",exact:true});
 await expect(covered.getByRole("button",{name:/Implement the reviewed outcome/})).toHaveAttribute("aria-pressed","true");
 await groupPage.getByRole("button",{name:"Changes repository files",exact:true}).click();
 await page.getByRole("option",{name:"Yes",exact:true}).click();
 await groupPage.getByRole("button",{name:"Back to entries",exact:true}).click();
 await expect(modal.getByText("All grouped",{exact:true})).toHaveCount(0);
 await expect(modal.getByRole("textbox",{name:"Identifier",exact:true})).toHaveCount(0);
 await expect.poll(()=>state.savedDraft&&JSON.parse(JSON.parse(state.savedDraft.payload_json).draft.architectureJson).landing_units?.[0]?.source_backed).toBe(true);
 const architecture=JSON.parse(JSON.parse(state.savedDraft.payload_json).draft.architectureJson);
 const [group]=architecture.landing_units;
 expect(group.id).toMatch(/^change-/);
 expect(group.owner_repo).toBe("governance-operations-console");
 expect(group.covered_work_item_ids).toEqual(["work-item-3"]);
 expect(architecture.source_landing_graph).toEqual({edges:[],nodes:[group.id]});
 await areas.getByRole("button",{name:/Sequence & Handoffs/}).click();
 await expect(sections).toHaveCount(0);
 await expect(modal.getByRole("region",{name:"Work dependencies",exact:true})).toBeVisible();
 await modal.screenshot({path:info.outputPath("guided-single-repository-order.png")});
 await expect(modal.getByRole("list",{name:"Merge dependencies",exact:true})).toHaveCount(0);
 await areas.getByRole("button",{name:/Operation & Recovery/}).click();
 await expect(sections).toHaveCount(0);
 await expect(modal.getByRole("region",{name:"Rollback and completion",exact:true})).toBeVisible();
 await modal.getByRole("button",{name:"Show lifecycle and access options",exact:true}).click();
 await expect(sections.getByRole("tab")).toHaveText([/^Rollback and completion/,/^States and recovery/,/^Access and execution/,/^Runtime responsibilities/]);
 expect(JSON.parse(JSON.parse(state.savedDraft.payload_json).draft.architectureJson).source_landing_graph.edges).toEqual([]);
 expect(state.requests).toEqual([]);
 expect(state.errors).toEqual([]);
});

test("draft repair keeps retained text until the operator applies valid content",async({page})=>{
 const initialPlan={...technicalPlanInput(),architecture:[]};
 const {state,modal}=await open(page,{initialPlan});
 await step(modal,"Review & record").click();
 await modal.getByRole("button",{name:"Review next issue",exact:true}).click();
 const repair=modal.getByRole("button",{name:"Open draft repair",exact:true});
 await repair.click();
 const dialog=page.getByRole("dialog",{name:"Recover saved draft",exact:true});
 const field=dialog.getByRole("textbox",{name:"Stored draft content",exact:true});
 await expect(field).toHaveValue("[]");
 await field.fill("[");
 await dialog.getByRole("button",{name:"Use repaired content",exact:true}).click();
 await expect(dialog).toContainText("The repaired text must be valid JSON.");
 await dialog.getByRole("button",{name:"Close dialog",exact:true}).click();
 await repair.click();
 await expect(field).toHaveValue("[]");
 await field.fill(JSON.stringify(technicalPlanInput().architecture));
 await dialog.getByRole("button",{name:"Use repaired content",exact:true}).click();
 await expect(modal.getByRole("list",{name:"Change groups",exact:true})).toBeVisible();
 await expect(repair).toHaveCount(0);
 expect(state.requests).toEqual([]);
});

test("the three-step flow stays navigable and the package entry opens the Work Board",async({page},info)=>{
 const {state,workspace,modal}=await open(page);
 const scope=step(modal,"Choose scope");
 await expect(scope).toHaveAttribute("aria-current","step");
 const continueToPlan=modal.getByRole("button",{name:"Continue to plan",exact:true});
 const workBoard=modal.getByRole("button",{name:"Open Work Board",exact:true});
 await expect(continueToPlan).toBeVisible();
 await expect(workBoard).toHaveCount(0);
 await expect(modal.getByRole("heading",{name:"Work to include",exact:true})).toBeVisible();
 await expect(modal.getByText("Choose the work items this plan covers. Expand a feature to see its items.",{exact:true})).toBeVisible();
 const guidance=modal.getByText("When does this work need a plan?",{exact:true});
 const example=modal.getByRole("heading",{name:"Work with a shared rollout",exact:true});
 await expect(example).toBeVisible();
 await guidance.press("Enter");
 await expect(example).toBeHidden();
 await guidance.press("Enter");
 await expect(example).toBeVisible();
 for(const [width,height] of [[1700,1050],[1280,720]]){
   await page.setViewportSize({width,height});
   await expect(modal.getByText(/^For example, coordinate a contact form and its service/)).toBeInViewport({ratio:1});
   await modal.screenshot({path:info.outputPath(`technical-plan-scope-${width}.png`)});
   expect(await modal.evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);
 }
 await step(modal,"Review & record").click();
 await expect(modal.getByRole("button",{name:"Review next issue",exact:true})).toBeVisible();
 await modal.getByRole("button",{name:"Review next issue",exact:true}).click();
 await expect(scope).toHaveAttribute("aria-current","step");
 const widen=modal.getByRole("button",{name:"Widen advisor",exact:true});
 const prompt=modal.getByRole("textbox",{name:"Technical plan advisor prompt",exact:true});
 const advisor=modal.getByText("Technical Plan Advisor",{exact:true}).locator("xpath=ancestor::section[1]");
 await prompt.fill("Explain the execution check");
 const initialWidth=(await advisor.boundingBox()).width;
 await widen.click();
 await expect.poll(async()=>(await advisor.boundingBox()).width).toBeGreaterThan(initialWidth);
 await expect(prompt).toHaveValue("Explain the execution check");
 await continueToPlan.click();
 await expect(step(modal,"Plan the changes")).toHaveAttribute("aria-current","step");
 const tools=modal.getByRole("group",{name:"Plan tools",exact:true});
 for(const label of ["Edit plan","Implementation sequence","Saved architecture"]){
   const button=tools.getByRole("button",{name:label,exact:true});
   await button.hover();
   await expect.poll(()=>button.evaluate(element=>{
     const region=element.closest("[data-teras-content-region]");
     return element.getBoundingClientRect().top-region.getBoundingClientRect().top;
   })).toBeGreaterThan(1);
 }
 await workBoard.click();
 await expect(modal).toHaveCount(0);
 await expect(workspace.getByRole("radio",{name:"Work Board",exact:true})).toBeChecked();
 await workspace.getByRole("button",{name:/User story #3 Implement the reviewed outcome/}).click();
 const checked=page.waitForRequest(request=>new URL(request.url()).pathname==="/api/delivery/execution/3/work-session");
 await workspace.getByRole("button",{name:"Check Work Requirements",exact:true}).click();
 await checked;
 expect(state.requests).toEqual([]);
 expect(state.advisor).toEqual([]);
 expect(state.errors).toEqual([]);
});

test("a fresh draft explains verification and records valid empty answers", async ({page}) => {
 const {state,modal}=await open(page,{durableDraft:true,recordedRevision:true});
 await includeWork(modal);
 await step(modal,"Plan the changes").click();
 const areas=modal.getByRole("group",{name:"Planning areas",exact:true});
 const tabs=modal.getByRole("tablist",{name:"Plan sections",exact:true});
 const panel=modal.getByRole("tabpanel");
 const openSection=async(area,section)=>{
  await areas.getByRole("button",{name:new RegExp(area)}).click();
  await tabs.getByRole("tab",{name:new RegExp("^"+section)}).click();
 };
 for(const [area,section,answer] of [
  ["Approvals & Decisions","Required approvals","No approvals needed"],
  ["Approvals & Decisions","Open decisions","No open decisions"],
 ]){
  await openSection(area,section);
  await expect(panel).toContainText(answer+" · recorded in this draft");
  await expect(tabs.getByRole("tab",{selected:true})).toContainText("None applies");
 }
 await areas.getByRole("button",{name:/Sequence & Handoffs/}).click();
 await expect(tabs).toHaveCount(0);
 const dependencies=modal.getByRole("region",{name:"Work dependencies",exact:true});
 await expect(dependencies.getByRole("button",{name:"Add remaining work",exact:true})).toHaveCount(0);
 await expect(dependencies).toContainText("No dependencies to schedule");
 await expect.poll(()=>JSON.parse(JSON.parse(state.savedDraft.payload_json).draft.architectureJson).work_item_execution_plan?.length).toBe(1);
 await openSection("Work & Changes","Source revisions");
 await panel.getByRole("button",{name:"Read missing revisions",exact:true}).click();
 await expect(panel).toContainText("1 revision pinned.");
 await expect(panel).toContainText("governance-operations-console");
 await expect(panel).toContainText("main · dddddddddddd");
 expect(state.factReads.at(-1)).toMatchObject({kind:"revision",delivery_id:"delivery-1",covered_work_item_ids:["work-item-3"]});
 await areas.getByRole("button",{name:/Verification/}).click();
 await expect(tabs).toHaveCount(0);
 const verification=modal.getByRole("region",{name:"Verification cases",exact:true});
 await expect(verification.getByRole("button",{name:"Add verification case",exact:true})).toBeVisible();
 const openSettings=verification.getByRole("button",{name:"Connection and Git checks",exact:true});
 await openSettings.click();
 const settings=page.getByRole("dialog",{name:"Connection and Git checks",exact:true});
 await expect(settings.getByRole("heading",{name:"System connections",exact:true})).toBeVisible();
 await expect(settings.getByRole("heading",{name:"Git dependencies",exact:true})).toBeVisible();
 await expect(settings.getByRole("button",{name:"Verification required",exact:true})).toHaveCount(0);
 await settings.getByRole("button",{name:"Do the extra connection checks apply?",exact:true}).click();
 await page.getByRole("option",{name:"No",exact:true}).click();
 await settings.getByRole("textbox",{name:"Reason for connection checks",exact:true}).fill("This change uses the existing system connection.");
 await expect.poll(()=>{
  const draft=state.savedDraft&&JSON.parse(state.savedDraft.payload_json).draft;
  if(!draft)return null;
  const {required_human_gates,contradictions_open_decisions,runtime_activation_chains}=JSON.parse(draft.architectureJson);
  return {empty:[required_human_gates,contradictions_open_decisions,runtime_activation_chains],
   verification:JSON.parse(draft.conformanceJson),source:JSON.parse(draft.repoRevisionsJson)};
 }).toEqual({empty:[[],[],[]],verification:{required:true,work_item_dimension_applicability:[{work_item_id:"work-item-3",dimension_ids:[]}],protocol_applicability:{applies:false,rationale:"This change uses the existing system connection."}},
  source:[{repo:"governance-operations-console",base_ref:"origin/main",commit:"d".repeat(40)}]});
 await settings.getByRole("button",{name:"Do the extra connection checks apply?",exact:true}).click();
 await page.getByRole("option",{name:"Yes",exact:true}).click();
 await settings.getByRole("button",{name:"Close dialog",exact:true}).click();
 await expect(openSettings).toBeFocused();
 await verification.getByRole("button",{name:"Check coverage",exact:true}).click();
 const coverage=page.getByRole("dialog",{name:"Check coverage",exact:true});
 await expect(coverage.getByRole("heading",{name:"Standard connection checks",exact:true})).toBeVisible();
 await expect(coverage.getByText("Commands and acknowledgements",{exact:true})).toBeVisible();
 await expect(coverage.getByText("Agreement between validators",{exact:true})).toBeVisible();
 await expect(coverage.getByText("command-and-acknowledgement-semantics",{exact:true})).toHaveCount(0);
 await coverage.getByRole("button",{name:"Close dialog",exact:true}).click();
 await expect(verification.getByRole("button",{name:"Check coverage",exact:true})).toBeFocused();
 expect(state.requests).toEqual([]);
 expect(state.errors).toEqual([]);
});

test("a saved plan reveals an entry on selection and reuses recorded form values", async ({page},info) => {
 await page.setViewportSize({width:1280,height:720});
 const initialPlan=technicalPlanInput();
 initialPlan.architecture.source_landing_graph.edges=[];
 initialPlan.architecture.descendant_owner_map[0].work_item_type="Defect";
 const {state,modal}=await open(page,{initialPlan});
 await step(modal,"Choose scope").click();
 await expect(modal.getByRole("button",{name:/^User story #3 - Implement/})).toBeVisible();
 await expect(modal.getByText("Correct work details",{exact:true})).toHaveCount(0);
 await step(modal,"Plan the changes").click();
 const areas=modal.getByRole("group",{name:"Planning areas",exact:true});
 await areas.getByRole("button",{name:/Sequence & Handoffs/}).click();
 await modal.getByRole("tab",{name:/^Change merge order/}).click();
 await modal.getByRole("button",{name:"Add merge dependency",exact:true}).click();
 const mergeDialog=page.getByRole("dialog",{name:"Add merge dependency",exact:true});
 await mergeDialog.getByRole("button",{name:"Merge this change first",exact:true}).click();
 await page.getByRole("option",{name:/Prepare site compatibility/}).click();
 await mergeDialog.getByRole("button",{name:"Before this change",exact:true}).click();
 await page.getByRole("option",{name:/Implement the reviewed outcome/}).click();
 await mergeDialog.getByRole("button",{name:"Add to draft",exact:true}).click();
 await expect(modal.getByRole("list",{name:"Merge dependencies",exact:true})).toContainText("Prepare site compatibility");
 await expect.poll(()=>JSON.parse(JSON.parse(state.savedDraft.payload_json).draft.architectureJson).source_landing_graph.edges).toEqual([
  {prerequisite_landing_unit_id:"delivery-1-contract",dependent_landing_unit_id:"delivery-1-packet-authoring"},
 ]);
 expect(JSON.parse(JSON.parse(state.savedDraft.payload_json).draft.architectureJson).descendant_owner_map[0].work_item_type).toBe("User story");
 await modal.getByRole("tab",{name:/^Evidence handoffs/}).click();
 const panel=modal.getByRole("tabpanel");
 const row=panel.getByRole("button",{name:"Compatibility report",exact:true});
 await row.press("Enter");
 const heading=panel.getByRole("heading",{name:"Compatibility report",exact:true});
 await expect(heading).toBeInViewport();
 await expect(heading.locator("span")).toBeFocused();
 await expect(panel.getByRole("list",{name:"Evidence exchanged between changes",exact:true})).toHaveCount(0);
 await expect(panel.getByText("Repository supplying evidence",{exact:true})).toBeVisible();
 await panel.getByRole("button",{name:"Back to entries",exact:true}).click();
 await expect(row).toBeFocused();
 const addHandoffButton=panel.getByRole("button",{name:"Add evidence handoff",exact:true});
 await addHandoffButton.click();
 const addHandoff=page.getByRole("dialog",{name:"Add evidence handoff",exact:true});
 const initialRevision=state.savedDraft.revision;
 await addHandoff.getByRole("button",{name:"Change group supplying evidence",exact:true}).click();
 await page.getByRole("option",{name:/Prepare site compatibility/}).click();
 await expect(addHandoff.getByRole("button",{name:"Work item supplying evidence",exact:true})).toContainText("Prepare site compatibility");
 await expect(addHandoff.getByText("website-contracts",{exact:true})).toBeVisible();
 await addHandoff.getByRole("textbox",{name:"Evidence to pass",exact:true}).fill("Cancelled evidence");
 await addHandoff.screenshot({path:info.outputPath("technical-plan-add-handoff.png")});
 await addHandoff.getByRole("button",{name:"Cancel",exact:true}).click();
 await expect(addHandoff).toHaveCount(0);
 await expect(addHandoffButton).toBeFocused();
 await expect(panel.getByRole("list",{name:"Evidence exchanged between changes",exact:true}).getByRole("button")).toHaveCount(1);
 expect(state.savedDraft.revision).toBe(initialRevision);
 await addHandoffButton.click();
 await expect(addHandoff.getByRole("textbox",{name:"Evidence to pass",exact:true})).toHaveValue("");
 await addHandoff.getByRole("textbox",{name:"Evidence to pass",exact:true}).fill("Reviewed implementation notes");
 await addHandoff.getByRole("button",{name:"Add to draft",exact:true}).click();
 await expect(panel.getByRole("button",{name:"Reviewed implementation notes",exact:true})).toBeVisible();
 await expect.poll(()=>JSON.parse(JSON.parse(state.savedDraft.payload_json).draft.architectureJson).evidence_receipt_handoffs.length).toBe(2);
 await areas.getByRole("button",{name:/Operation & Recovery/}).click();
 await modal.getByRole("tab",{name:/^States and recovery/}).click();
 await expect(panel.getByRole("textbox",{name:"States 1",exact:true})).toHaveValue("ready");
 await panel.getByRole("button",{name:"ready → published",exact:true}).click();
 await expect(panel.getByRole("button",{name:"From state",exact:true})).toContainText("ready");
 await expect(panel.getByRole("button",{name:"To state",exact:true})).toContainText("published");
 await expect(panel.getByRole("list",{name:"Transitions",exact:true})).toHaveCount(0);
 await step(modal,"Review & record").click();
 await modal.getByRole("button",{name:"Review area",exact:true}).click();
 await page.getByRole("option",{name:"Sequence & Handoffs",exact:true}).click();
 const reviewTarget=modal.getByRole("button",{name:"Evidence handoffs details",exact:true});
 await reviewTarget.click();
 const reader=page.getByRole("dialog",{name:"Evidence handoffs",exact:true});
 const reviewList=reader.getByRole("list",{name:"Evidence handoffs",exact:true});
 await reviewList.getByRole("button",{name:"Compatibility report",exact:true}).click();
 await expect(reviewList).toHaveCount(0);
 await expect(reader.locator("[data-plan-review-entry]")).toBeVisible();
 await expect(reader.getByRole("heading",{name:"Sending the evidence",exact:true})).toBeVisible();
 await expect(reader.getByRole("heading",{name:"Receiving the evidence",exact:true})).toBeVisible();
 for(const reference of ["User story #4","User story #3"]){
  const metadata=reader.locator('[class*="terasMetadataValue"]');
  await expect(metadata.getByText(reference,{exact:true}).first()).toHaveCSS("color","rgb(255, 193, 90)");
 }
 await expect(reader.getByText("Compatibility report",{exact:true})).toHaveCount(1);
 await reader.getByRole("button",{name:"Back to entries",exact:true}).click();
 await expect(reviewList.getByRole("button",{name:"Compatibility report",exact:true})).toBeFocused();
 await reader.getByRole("button",{name:"Close review details",exact:true}).click();
 await expect(reviewTarget).toBeFocused();
 expect(state.requests).toEqual([]);
 expect(state.errors).toEqual([]);
});

test("Operation and Recovery uses the available space for transitions, recovery, and access notes", async ({page}) => {
 await page.setViewportSize({width:1700,height:1000});
 const initialPlan=technicalPlanInput();
 const lifecycle=initialPlan.architecture.lifecycle_state_model;
 for(const state of ["building","starting","failed","stopped","restoring","verifying","retrying","complete","archived"]){
  lifecycle.states.push(state);
  lifecycle.transitions.push({from:"ready",to:state,authority:"governance-operations-console",evidence:"Reviewed transition"});
 }
 const rollback="Restore the last verified revision.\nConfirm the service is healthy before reopening access.";
 initialPlan.architecture.rollback_cleanup_terminal_conditions.rollback_units=[rollback];
 initialPlan.architecture.rollback_cleanup_terminal_conditions.cleanup_obligations=["Remove the failed build."];
 const access=initialPlan.architecture.authorization_session_execution_model;
 access.summary="Use the existing sign-in and repository permissions for sessions.\n\nKeep private runtime settings for the project.\n\nSave the approved result with its evidence.";
 access.session_binding="Check the signed-in account against the project before opening a session.\n\nKeep the session bound to the selected environment.\n\nConfirm the repository permissions before reopening a saved session.";
 access.execution_binding="Review the exact revision before approving the change.\n\nBind the execution to the accepted package and source.\n\nRecord the result against the approved revision.";
 const {state,modal}=await open(page,{initialPlan});
 await step(modal,"Plan the changes").click();
 await modal.getByRole("group",{name:"Planning areas",exact:true}).getByRole("button",{name:/Operation & Recovery/}).click();
 await modal.getByRole("tab",{name:/^States and recovery/}).click();
 const panel=modal.getByRole("tabpanel");
 const stateField=panel.getByRole("textbox",{name:"States 1",exact:true});
 const transitions=panel.getByRole("list",{name:"Transitions",exact:true});
 const transition=transitions.getByRole("button",{name:"ready → published",exact:true});
 await expect(transition).toBeVisible();
 const stateBounds=await stateField.boundingBox();
 const listBounds=await transitions.boundingBox();
 expect(stateBounds.x+stateBounds.width).toBeLessThan(listBounds.x);
 expect(listBounds.height).toBeGreaterThan(222);
 await transition.press("Enter");
 await expect(stateField).toBeHidden();
 await expect(panel.getByRole("button",{name:"From state",exact:true})).toContainText("ready");
 await panel.getByRole("button",{name:"Back to entries",exact:true}).click();
 await expect(transition).toBeFocused();
 await expect(stateField).toHaveValue("ready");

 await page.setViewportSize({width:1280,height:720});
 expect((await transitions.boundingBox()).height).toBeGreaterThan(96);
 await modal.getByRole("tab",{name:/^Rollback and completion/}).click();
 await expect(panel.locator("textarea").and(panel.getByRole("textbox",{name:"What to roll back 1",exact:true}))).toHaveValue(rollback);
 await expect(panel.getByRole("textbox",{name:"What to clean up 1",exact:true})).toHaveValue("Remove the failed build.");
 await modal.getByRole("tab",{name:/^Access and execution/}).click();
 const summary=panel.getByRole("textbox",{name:"Summary",exact:true});
 const session=panel.getByRole("textbox",{name:"Who can use a work session",exact:true});
 const execution=panel.getByRole("textbox",{name:"Who can approve or perform a change",exact:true});
 await expect(summary).toHaveValue(access.summary);
 await expect(session).toHaveValue(access.session_binding);
 await expect(execution).toHaveValue(access.execution_binding);
 for (const [width,height] of [[1280,720],[1700,1000]]) {
  await page.setViewportSize({width,height});
  for (const note of [summary,session,execution]) {
   expect(await note.evaluate(input=>input.scrollHeight-input.clientHeight)).toBeLessThanOrEqual(1);
   expect((await note.boundingBox()).height).toBeGreaterThanOrEqual(110);
  }
  const summaryBox=await summary.boundingBox();
  const sessionBox=await session.boundingBox();
  const executionBox=await execution.boundingBox();
  if (width===1280) {
   expect(sessionBox.width).toBeCloseTo(summaryBox.width,0);
   expect(executionBox.y).toBeGreaterThan(sessionBox.y+sessionBox.height);
  } else {
   expect(sessionBox.x+sessionBox.width).toBeLessThan(executionBox.x);
  }
 }
 expect(state.requests).toEqual([]);
 expect(state.errors).toEqual([]);
});

test("activation and authorization reuse the pinned source and leave approvals to the operator", async ({page}) => {
 const initialPlan=technicalPlanInput();
 const owner="governance-operations-console";
 const pin={repo:owner,base_ref:"origin/main",commit:"d".repeat(40)};
 initialPlan.repo_revisions=[pin];
 initialPlan.architecture.required_human_gates=[{gate_id:"gate:activation",authority_work_item_id:"work-item-3",
  authority_owner_repo:owner,blocked_transition:"before_runtime_activation",affected_landing_unit_ids:["delivery-1-contract"],evidence_requirement:"Reviewed runtime proof"}];
 initialPlan.architecture.runtime_activation_chains=[{chain_id:"enable-runtime",gate_id:"gate:activation",source_owner_repo:owner,
  source_activation_posture:"owner-source-change-required",commissioning_landing_unit_ids:[],
  source_activation_evidence:{repo:owner,revision:"a".repeat(40),path:"config/runtime.yaml",field:"runtime.enabled",
   observed_value:false,observed_posture:"owner-source-change-required"}}];
 const {state,modal}=await open(page,{initialPlan,recordedRevision:true});
 await step(modal,"Plan the changes").click();
 const areas=modal.getByRole("group",{name:"Planning areas",exact:true});
 const panel=modal.getByRole("tabpanel");
 await areas.getByRole("button",{name:/Operation & Recovery/}).click();
 await modal.getByRole("tab",{name:/^Activation order/}).click();
 await panel.getByRole("list",{name:"Activation order",exact:true}).getByRole("button").first().click();
 await expect(panel).toContainText("Read the setting again");
 await panel.getByRole("button",{name:"Read setting",exact:true}).click();
 await expect(panel).toContainText("Setting read from the pinned revision.");
 await expect(panel).toContainText("Ready at the pinned revision");
 await expect.poll(()=>JSON.parse(JSON.parse(state.savedDraft.payload_json).draft.architectureJson).runtime_activation_chains[0].source_activation_evidence.revision).toEqual(pin.commit);
 expect(state.factReads.at(-1)).toMatchObject({kind:"activation",repo:owner,base_ref:pin.base_ref,revision:pin.commit,
  path:"config/runtime.yaml",field:"runtime.enabled"});
 await panel.getByRole("button",{name:"Enter independently verified evidence",exact:true}).click();
 const evidence=page.getByRole("dialog",{name:"Record activation evidence",exact:true});
 const valueType=evidence.getByRole("button",{name:"Source value type",exact:true});
 await valueType.click();
 await page.getByRole("option",{name:"Text",exact:true}).click();
 const typeGuard=page.getByRole("alertdialog",{name:"Replace the source value?",exact:true});
 await typeGuard.getByRole("button",{name:"Cancel",exact:true}).click();
 await expect(valueType).toContainText("Boolean");
 await evidence.getByRole("button",{name:"Close dialog",exact:true}).click();
 await modal.getByRole("tab",{name:/^Access and execution/}).click();
 await panel.getByRole("button",{name:"Find approved references",exact:true}).click();
 await panel.getByRole("button",{name:"Authorization reference",exact:true}).click();
 await page.getByRole("option",{name:/authorization\.md · governance-operations-console/}).click();
 await panel.getByRole("button",{name:"Use authorization reference",exact:true}).click();
 await expect.poll(()=>JSON.parse(JSON.parse(state.savedDraft.payload_json).draft.architectureJson).authorization_session_execution_model.authority_refs?.[0]?.digest)
  .toEqual("sha256:"+"e".repeat(64));
 const findDocument=panel.getByRole("button",{name:"Find a document in pinned source",exact:true});
 await findDocument.click();
 const documentLookup=page.getByRole("dialog",{name:"Find an authorization document",exact:true});
 const documentPath = documentLookup.getByRole("textbox",{name:"Document path or GitHub permalink",exact:true});
 const readDocument = documentLookup.getByRole("button",{name:"Read document reference",exact:true});
 const permalink = `https://github.com/example/${owner}/blob/${pin.commit}/docs/authorization.md`;
 await expect(documentLookup.getByRole("button",{name:"Repository",exact:true})).toHaveCount(0);
 await expect(documentLookup).toContainText(pin.commit.slice(0,12));
 await documentPath.fill(permalink.replace(pin.commit, "a".repeat(40)));
 await expect(readDocument).toBeDisabled();
 await expect(documentLookup).toContainText("revision pinned in this plan");
 await documentPath.fill(permalink.replace("/example/", "/other-account/"));
 await readDocument.click();
 await expect(documentLookup).toContainText("different repository from the link");
 await expect(documentLookup.getByRole("button",{name:"Use authorization reference",exact:true})).toHaveCount(0);
 await documentPath.fill(permalink + "#L10-L12");
 await readDocument.click();
 await expect(documentLookup).toContainText("Document found.");
 await documentLookup.getByRole("button",{name:"Use authorization reference",exact:true}).click();
 await expect(panel).toContainText("This authorization reference is already in the draft.");
 await expect(findDocument).toBeFocused();
 expect(state.factReads.at(-1)).toMatchObject({kind:"authorization",repo:owner,revision:pin.commit,path:"docs/authorization.md"});
 expect(state.requests).toEqual([]);
 expect(state.errors).toEqual([]);
});

test("runtime setup reuses only the selected repository’s approved actions", async ({page}) => {
 const initialPlan = technicalPlanInput();
 const owner = "governance-operations-console";
 initialPlan.architecture.runtime_boundaries = [{
   owner_repo: owner, allowed_capability_ids: ["console.custom-read"], prohibited_capability_ids: [],
 }];
 const {state,modal} = await open(page,{initialPlan,recorded:true});
 await step(modal,"Plan the changes").click();
 const panel = modal.getByRole("tabpanel");
 await modal.getByRole("group",{name:"Planning areas",exact:true}).getByRole("button",{name:/Operation & Recovery/}).click();
 await modal.getByRole("tab",{name:/^Runtime responsibilities/}).click();
 await expect(panel.getByText("Standard installation rules",{exact:true})).toBeVisible();
 await panel.getByRole("list",{name:"Runtime responsibilities",exact:true}).getByRole("button",{name:owner,exact:true}).click();
 await panel.getByRole("button",{name:"Reuse an approved allowed action",exact:true}).click();
 await page.getByRole("option",{name:"submit operator intent",exact:true}).click();
 await panel.getByRole("button",{name:"Reuse an approved prohibited action",exact:true}).click();
 await page.getByRole("option",{name:"own lifecycle truth",exact:true}).click();
 const savedRows = () => JSON.parse(JSON.parse(state.savedDraft.payload_json).draft.architectureJson).runtime_boundaries;
 await expect.poll(() => savedRows()[0]).toEqual({
   owner_repo:owner, allowed_capability_ids:["console.custom-read","console.submit-operator-intent"],
   prohibited_capability_ids:["console.own-lifecycle-truth"],
 });
 await expect(panel.getByRole("button",{name:"Reuse an approved allowed action",exact:true})).toHaveCount(0);
 await panel.getByRole("button",{name:"Back to entries",exact:true}).click();
 await panel.getByRole("button",{name:"Add runtime responsibility",exact:true}).click();
 const form = page.getByRole("dialog",{name:"Add runtime responsibility",exact:true});
 await form.getByRole("button",{name:"Repository",exact:true}).click();
 await expect(page.getByRole("option",{name:owner,exact:true})).toHaveCount(0);
 await page.getByRole("option",{name:"website-contracts",exact:true}).click();
 await expect(form.getByRole("button",{name:/^Reuse an approved/})).toHaveCount(0);
 await form.getByRole("button",{name:"Cancel",exact:true}).click();
 expect(savedRows()).toHaveLength(1);
 expect(state.requests).toEqual([]);
 expect(state.errors).toEqual([]);
});

test("option changes retain inactive sections through save and reload, and guard draft loss", async ({page}) => {
 const initialPlan=technicalPlanInput();
 const access=initialPlan.architecture.authorization_session_execution_model;
 Object.assign(access,{session_binding:"Keep the session bound to the project.",execution_binding:"Review the exact revision.",
  authority_refs:[{uri:"https://example.test/authorization",digest:"sha256:"+"a".repeat(64)}]});
 const lifecycle=initialPlan.architecture.lifecycle_state_model;
 initialPlan.architecture.contradictions_open_decisions=[{
  id:"decision:launch",status:"resolved",summary:"Choose the launch window",resolution:"Launch in the morning.",
 }];
 const {state,modal,workspace}=await open(page,{initialPlan});
 const panel=modal.getByRole("tabpanel");
 const areas=modal.getByRole("group",{name:"Planning areas",exact:true});
 const choose=async(label,option)=>{
  await panel.getByRole("button",{name:label,exact:true}).click();
  await page.getByRole("option",{name:option,exact:true}).click();
 };
 const enterOperation=async()=>{
  await step(modal,"Plan the changes").click();
  await areas.getByRole("button",{name:/Operation & Recovery/}).click();
 };
 const savedDraft=()=>JSON.parse(state.savedDraft.payload_json).draft;

 await modal.getByRole("button",{name:/^User story #3 - Implement/}).click();
 const scopeGuard=page.getByRole("alertdialog",{name:"Remove work from this plan?",exact:true});
 await expect(scopeGuard).toContainText("assigned checks or dependency timing");
 await scopeGuard.getByRole("button",{name:"Cancel",exact:true}).click();
 await expect(modal.getByText("2 in scope",{exact:true})).toBeVisible();

 await enterOperation();
 await modal.getByRole("tab",{name:/^Access and execution/}).click();
 await choose("Does this work need additional access rules?","Use standard installation access");
 await expect(panel).toContainText("Previous details are kept in this draft.");
 await expect(panel.getByRole("textbox",{name:"Summary",exact:true})).toHaveCount(0);
 await modal.getByRole("tab",{name:/^States and recovery/}).click();
 await choose("Does this work change the lifecycle?","No lifecycle changes");
 await expect(panel).toContainText("Previous details are kept in this draft.");
 await expect.poll(()=>savedDraft().inactiveArchitectureSections).toEqual({
  authorization_session_execution_model:access,lifecycle_state_model:lifecycle,
 });
 const active=JSON.parse(savedDraft().architectureJson);
 expect(active.authorization_session_execution_model).toBeNull();
 expect(active.lifecycle_state_model).toBeNull();
 await step(modal,"Review & record").click();
 await expect(modal.getByText("Previous details kept in this draft",{exact:true})).toBeVisible();
 await expect(modal.locator('[data-saved-work-status="saved"]')).toBeVisible();
 await modal.getByRole("button",{name:"Back to Execution Board",exact:true}).click();
 await page.reload({waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>Object.keys(document.querySelector('button[title="Open DELIVERY"]')??{}).some(key=>key.startsWith("__reactProps$")));
 if(!await workspace.isVisible())await page.getByTitle("Open DELIVERY",{exact:true}).click();
 await workspace.locator('[data-delivery-workspace-section="execution-board"]').click();
 await workspace.getByRole("button",{name:"Open Technical Plan",exact:true}).click();
 await enterOperation();
 await modal.getByRole("tab",{name:/^Access and execution/}).click();
 await expect(panel).toContainText("Previous details are kept in this draft.");
 await choose("Does this work need additional access rules?","Plan additional access rules");
 await expect(panel.getByRole("textbox",{name:"Summary",exact:true})).toHaveValue(access.summary);
 await expect(panel.getByRole("textbox",{name:"Who can use a work session",exact:true})).toHaveValue(access.session_binding);
 await expect(panel.getByRole("textbox",{name:"Who can approve or perform a change",exact:true})).toHaveValue(access.execution_binding);
 await modal.getByRole("tab",{name:/^States and recovery/}).click();
 await choose("Does this work change the lifecycle?","Plan lifecycle changes");
 await expect(panel.getByRole("button",{name:"ready → published",exact:true})).toBeVisible();
 await expect.poll(()=>savedDraft().inactiveArchitectureSections).toBeUndefined();
 expect(JSON.parse(savedDraft().architectureJson).authorization_session_execution_model).toEqual(access);
 expect(JSON.parse(savedDraft().architectureJson).lifecycle_state_model).toEqual(lifecycle);

 await areas.getByRole("button",{name:/Approvals & Decisions/}).click();
 await modal.getByRole("tab",{name:/^Open decisions/}).click();
 await panel.getByRole("button",{name:"Choose the launch window",exact:true}).click();
 await choose("Status",/^open$/i);
 const decisionGuard=page.getByRole("alertdialog",{name:"Reopen this decision?",exact:true});
 await expect(decisionGuard).toContainText("clears the written resolution");
 await decisionGuard.getByRole("button",{name:"Cancel",exact:true}).click();
 await expect(panel.getByRole("textbox",{name:"Resolution",exact:true})).toHaveValue("Launch in the morning.");
 await choose("Status",/^open$/i);
 await decisionGuard.getByRole("button",{name:"Reopen and clear resolution",exact:true}).click();
 await expect.poll(()=>JSON.parse(savedDraft().architectureJson).contradictions_open_decisions[0]).toMatchObject({status:"open",resolution:null});
 await areas.getByRole("button",{name:/Work & Changes/}).click();
 const groups=panel.getByRole("list",{name:"Change groups",exact:true});
 await groups.getByRole("button").first().click();
 const removeGroup=panel.getByRole("button",{name:"Remove change group",exact:true});
 await removeGroup.click();
 const groupGuard=page.getByRole("alertdialog",{name:"Remove this change group?",exact:true});
 await expect(groupGuard).toContainText("work assignments will be cleared");
 await groupGuard.getByRole("button",{name:"Cancel",exact:true}).click();
 await expect(removeGroup).toBeVisible();
 expect(state.requests).toEqual([]);
 expect(state.errors).toEqual([]);
});

test("Technical Plan keeps long selections, repository facts and lower controls readable at compact width", async ({page}) => {
 await page.setViewportSize({width:1280,height:720});
 const longWorkTitle="Publish the verified implementation with the exact source revision and retain the complete evidence for the operator";
 const initialPlan=technicalPlanInput();
 initialPlan.architecture.required_human_gates=[{
  gate_id:"gate:review",
  authority_work_item_id:"work-item-3",
  authority_owner_repo:"governance-operations-console",
  blocked_transition:"before_implementation",
  affected_landing_unit_ids:["delivery-1-packet-authoring"],
  evidence_requirement:"Inspect the recorded checks.",
 }];
 const {modal,state}=await open(page,{initialPlan,longWorkTitle,recordedRevision:true});
 await step(modal,"Plan the changes").click();
 const areas=modal.getByRole("group",{name:"Planning areas",exact:true});
 const panel=modal.getByRole("tabpanel");
 await areas.getByRole("button",{name:/Approvals & Decisions/}).click();
 const findApproval=panel.getByRole("textbox",{name:"Find required approvals",exact:true});
 await expect(findApproval).toBeEnabled();
 await findApproval.fill("No approval matches this query");
 await expect(panel.getByText("No entries match this search.",{exact:true})).toBeVisible();
 await findApproval.clear();
 await panel.getByRole("list",{name:"Required approvals",exact:true}).getByRole("button").first().click();
 const work=panel.getByRole("button",{name:"Approval work item",exact:true});
 const label=work.locator("span").first();
 await expect(label).toContainText(longWorkTitle);
 expect(await label.evaluate(node=>node.scrollWidth-node.clientWidth)).toBeLessThanOrEqual(1);
 await work.click();
 const selected=page.getByRole("option",{name:new RegExp(longWorkTitle)});
 await expect(selected).toBeInViewport();
 expect(await selected.evaluate(node=>node.scrollWidth-node.clientWidth)).toBeLessThanOrEqual(1);
 await page.keyboard.press("Escape");
 const requirement=panel.getByRole("textbox",{name:"Evidence to review",exact:true});
 await requirement.scrollIntoViewIfNeeded();
 await expect(requirement).toBeInViewport();
 await expect(panel.getByText("governance-operations-console",{exact:true})).toBeVisible();

 await page.setViewportSize({width:820,height:720});
 await modal.getByRole("button",{name:"Planning area",exact:true}).click();
 await page.getByRole("option",{name:/Work & Changes/}).click();
 await modal.getByRole("tab",{name:/^Source revisions/}).click();
 const fields=panel.getByRole("region",{name:"Section fields",exact:true});
 expect((await fields.boundingBox()).height).toBeGreaterThan(165);
 await expect(fields.getByRole("group",{name:"Repository revision status"})
  .getByText("governance-operations-console",{exact:true})).toBeInViewport();
 const pinAction=fields.getByRole("button",{name:"Pin a revision",exact:true});
 await pinAction.click();
 const pinDialog=page.getByRole("dialog",{name:"Pin a source revision",exact:true});
 const readBranch=pinDialog.getByRole("button",{name:"Read and pin revision",exact:true});
 await expect(readBranch).toBeInViewport();
 await pinDialog.getByRole("button",{name:"Repository",exact:true}).click();
 await page.getByRole("option",{name:"governance-operations-console",exact:true}).click();
 await pinDialog.getByRole("textbox",{name:"Branch",exact:true}).fill("main");
 await pinDialog.getByRole("textbox",{name:"Exact commit (optional)",exact:true}).fill("d".repeat(40));
 await readBranch.click();
 await expect(pinDialog.getByRole("status")).toContainText("1 revision pinned.");
 expect(state.factReads.at(-1)).toMatchObject({kind:"revision",repo:"governance-operations-console",base_ref:"main",revision:"d".repeat(40)});
 await pinDialog.getByRole("button",{name:"Close dialog",exact:true}).click();
 await expect(pinAction).toBeFocused();
});

test("Technical Plan puts revision management and authorization in their owning headers", async ({page}) => {
 await page.setViewportSize({width:1280,height:720});
 const {modal}=await open(page,{initialPlan:technicalPlanInput()});
 const panel=modal.getByRole("tabpanel");
 const areas=modal.getByRole("group",{name:"Planning areas",exact:true});
 const tabs=modal.getByRole("tablist",{name:"Plan sections",exact:true});
 await step(modal,"Plan the changes").click();
 const muted=await areas.getByRole("button",{name:/Work & Changes/}).getAttribute("data-tone");
 expect(muted).toBe("warn");
 expect(await areas.getByRole("button",{name:/Operation & Recovery/}).getAttribute("data-tone")).toBe("muted");
 await tabs.getByRole("tab",{name:/^Source revisions/}).click();
 const manage=panel.getByRole("button",{name:"Manage revisions",exact:true});
 await manage.press("Enter");
 const list=panel.getByRole("list",{name:"Repository revisions",exact:true});
 expect((await list.boundingBox()).height).toBeGreaterThan(110);
 await expect(panel.getByRole("heading",{name:"Manage recorded revisions"}).locator("span")).toBeFocused();
 await panel.getByRole("button",{name:"Back to revision status",exact:true}).click();
 await expect(manage).toBeFocused();

 await areas.getByRole("button",{name:/Operation & Recovery/}).click();
 await expect(tabs.getByRole("tab",{name:/^Activation order/})).toHaveCount(0);
 const heights=await tabs.getByRole("tab").evaluateAll(nodes=>nodes.map(node=>Math.round(node.getBoundingClientRect().height)));
 expect(new Set(heights).size).toBe(1);
 await expect(panel.getByRole("button",{name:/repository (search|registry)/i})).toHaveCount(0);
 await tabs.getByRole("tab",{name:/^States and recovery/}).click();
 await expect(panel.getByRole("button",{name:"Search repository registry",exact:true})).toHaveCount(0);
 await panel.getByRole("button",{name:"ready → published",exact:true}).click();
 await expect(panel.getByRole("button",{name:"Search repository registry",exact:true})).toBeVisible();

 await tabs.getByRole("tab",{name:/^Access and execution/}).click();
 const manual = panel.getByText("Enter a verified reference manually", {exact:true});
 await manual.click();
 await panel.getByRole("button",{name:"Add authorization record",exact:true}).click();
 const add=page.getByRole("dialog",{name:"Add authorization record",exact:true});
 await add.getByRole("textbox",{name:"Evidence record link",exact:true}).fill("https://example.com/verified");
 const digest = add.getByRole("textbox",{name:"SHA-256 from the record",exact:true});
 await digest.fill("invalid");
 await expect(add.getByRole("button",{name:"Add to draft",exact:true})).toBeDisabled();
 await digest.fill("sha256:" + "a".repeat(64));
 await expect(add.getByRole("button",{name:"Add to draft",exact:true})).toBeEnabled();
 await add.getByRole("button",{name:"Cancel",exact:true}).click();
 await expect(panel.getByRole("button",{name:"Add authorization record",exact:true})).toBeFocused();
});

test("large verification plans add incomplete drafts and finish them in the shared case form", async ({page}, info) => {
 const initialPlan = technicalPlanInput();
 const template = initialPlan.conformance_plan.cases[0];
 initialPlan.conformance_plan.cases = Array.from({length: 100}, (_, index) => ({
   ...template, id: `case:verification-${index + 1}`, expected_outcome: `Original case ${index + 1}`,
 }));
 await page.setViewportSize({width:1280,height:720});
 const {modal, state} = await open(page, {initialPlan});
 await step(modal, "Plan the changes").click();
 await modal.getByRole("group", {name:"Planning areas",exact:true}).getByRole("button", {name:/Verification/}).click();
 const verification = modal.getByRole("region", {name:"Verification cases",exact:true});
 await verification.getByRole("button", {name:"Add verification case",exact:true}).click();
 const add = page.getByRole("dialog", {name:"Add verification case",exact:true});
 await expect(add.getByRole("button", {name:"Add to draft",exact:true})).toBeDisabled();
 const what = add.getByRole("heading", {name:"What to verify",exact:true});
 const how = add.getByRole("heading", {name:"How to verify",exact:true});
 expect((await how.boundingBox()).x).toBeGreaterThan((await what.boundingBox()).x);
 await expect(add.getByText("Choose at least one work item.",{exact:true})).toBeVisible();
 await expect(add.getByText("Choose at least one verification area.",{exact:true})).toBeVisible();
 await add.getByRole("textbox", {name:"Expected outcome",exact:true}).fill("The website keeps the saved section after reload.");
 await add.screenshot({path:info.outputPath("verification-case-wide.png")});
 await add.getByRole("button", {name:"Keep incomplete case",exact:true}).click();

 const savedCases = () => JSON.parse(JSON.parse(state.savedDraft.payload_json).draft.conformanceJson).cases;
 await expect.poll(() => savedCases().length).toBe(101);
 const find = verification.getByRole("textbox", {name:"Find verification cases",exact:true});
 await find.fill("keeps the saved section");
 const row = verification.getByRole("button", {name:/The website keeps the saved section/});
 await expect(row).toContainText("Incomplete");
 await row.click();
 const editor = page.getByRole("dialog", {name:"Edit verification case",exact:true});
 await expect(editor.getByRole("textbox", {name:"Expected outcome",exact:true})).toHaveValue("The website keeps the saved section after reload.");
 await editor.getByRole("list", {name:"Covered work",exact:true}).getByRole("button", {name:/#3/}).click();
 const selectedArea = editor.getByRole("list", {name:"Verification areas",exact:true}).getByRole("button").first();
 await selectedArea.click();
 for (const [field, option] of [
   ["Check type", "Failure or rejection path"],
   ["Test environment","Real Git repository"],
   ["When this check must pass", "Before merge"],
 ]) {
   await editor.getByRole("button", {name:field,exact:true}).click();
   await page.getByRole("option", {name:option,exact:true}).click();
 }
 await editor.getByRole("button", {name:"Change group providing evidence",exact:true}).click();
 await page.getByRole("option", {name:/#3 - Implement the reviewed outcome/}).click();
 await expect(editor.getByText("Choose at least one verification area.",{exact:true})).toHaveCount(0);
 await expect.poll(() => savedCases().at(-1)).toEqual(expect.objectContaining({
   applies_to_work_item_ids: ["work-item-3"], polarity:"negative", fidelity:"real-git", target_readiness:"merge-ready",
   evidence_owner_landing_unit_id: "delivery-1-packet-authoring", dimension_ids: expect.arrayContaining([expect.any(String)]),
 }));
 await editor.getByRole("button", {name:"Done",exact:true}).click();
 await expect(row).toBeFocused();
 await expect(row).not.toContainText("Incomplete");
 await expect(verification.getByRole("button", {name:"Add verification case",exact:true})).toBeEnabled();
 await row.click();
 const remove = editor.getByRole("button", {name:"Remove case",exact:true});
 await remove.click();
 const confirm = page.getByRole("alertdialog", {name:"Remove this verification case?",exact:true});
 await confirm.getByRole("button", {name:"Cancel",exact:true}).click();
 await expect(remove).toBeFocused();
 expect(savedCases()).toHaveLength(101);
 await remove.click();
 await confirm.getByRole("button", {name:"Remove case",exact:true}).click();
 await expect(editor).not.toBeVisible();
 await expect.poll(() => savedCases().length).toBe(100);
 expect(state.requests).toEqual([]);
 expect(state.errors).toEqual([]);
});

test("large review lists and narrow scope use the available workspace", async ({page}) => {
 await page.setViewportSize({width:1280,height:720});
 const initialPlan=technicalPlanInput();
 initialPlan.conformance_plan.dimensions.push("command-and-acknowledgement-semantics");
 const template=initialPlan.conformance_plan.cases[0];
 initialPlan.conformance_plan.cases=Array.from({length:72},(_,index)=>({
  ...template,id:`case:verification-${index+1}`,expected_outcome:`Expected result ${index+1} from the verified source${index===71
   ? "\n\nRisk 1393: confirm **User Story #4** before using the literal identifier `User story #5`." : ""}`,
 }));
 const {modal}=await open(page,{initialPlan});
 await step(modal,"Review & record").click();
 const covered=modal.getByRole("button",{name:"View covered work",exact:true});
 await covered.click();
 const scopeReader=page.getByRole("dialog",{name:"Covered work",exact:true});
 await scopeReader.getByRole("textbox",{name:"Find covered work",exact:true}).fill("3");
 await expect(scopeReader.getByRole("listitem")).toHaveCount(1);
 await scopeReader.getByRole("button",{name:"Close review details",exact:true}).click();
 await expect(covered).toBeFocused();

 await modal.getByRole("button",{name:"Source revisions details",exact:true}).click();
 const sources=page.getByRole("dialog",{name:"Source revisions",exact:true});
 const revisionSearch=sources.getByRole("textbox",{name:"Find source revisions",exact:true});
 await revisionSearch.fill("governance");
 await expect(sources.getByRole("button",{name:/governance-operations-console.*main · bbbbbbbbbbbb/})).toBeVisible();
 const revisionRow=sources.getByRole("button",{name:/governance-operations-console.*main · bbbbbbbbbbbb/});
 await revisionRow.click();
 await expect(sources.locator("[data-plan-review-entry]")).toBeVisible();
 await expect(sources.getByText("governance-operations-console",{exact:true})).toHaveCount(1);
 await sources.getByRole("button",{name:"Back to entries",exact:true}).click();
 await expect(revisionRow).toBeFocused();
 await expect(revisionSearch).toHaveValue("governance");
 expect((await sources.locator('[data-width="standard"][data-height="content"]').boundingBox()).height).toBeLessThan(450);
 await sources.getByRole("button",{name:"Close review details",exact:true}).click();
 await modal.getByRole("button",{name:"Review area",exact:true}).click();
 await page.getByRole("option",{name:"Verification",exact:true}).click();
 const sections=modal.getByRole("list",{name:"Review sections",exact:true});
 await expect(sections.getByRole("button")).toHaveCount(3);
 await sections.getByRole("button",{name:"Check coverage details",exact:true}).click();
 const coverage=page.getByRole("dialog",{name:"Check coverage",exact:true});
 await expect(coverage.getByText("Commands and acknowledgements",{exact:true})).toBeVisible();
 const areas = coverage.getByRole("heading",{name:"What the checks cover",exact:true});
 const assignments = coverage.getByRole("heading",{name:"Checks required for each work item",exact:true});
 expect((await assignments.boundingBox()).x).toBeGreaterThan((await areas.boundingBox()).x);
 await coverage.getByRole("button",{name:"Close review details",exact:true}).click();
 await expect(sections.getByRole("button",{name:"Connection and Git checks details",exact:true})).toBeEnabled();
 const section=modal.getByRole("button",{name:"Verification cases details",exact:true});
 await section.click();
 const reader=page.getByRole("dialog",{name:"Verification cases",exact:true});
 const list=reader.getByRole("list",{name:"Verification cases",exact:true});
 expect((await list.boundingBox()).height).toBeGreaterThan(450);
 const readerFrame = reader.locator('[data-height="fill"][data-width="large"]');
 const listFrameHeight = (await readerFrame.boundingBox()).height;
 const search=reader.getByRole("textbox",{name:"Find verification cases",exact:true});
 await search.fill("Expected result 72 ");
 const row=list.getByRole("button",{name:/Expected result 72/});
 await expect(row).toContainText("Success path · Before merge · 2 work items");
 await row.click();
 await expect(reader.getByText("Real Git repository",{exact:true})).toBeVisible();
 await expect(reader.locator('[class*="terasMetadataValue"]').getByText("User story #3",{exact:true})).toHaveCSS("color","rgb(255, 193, 90)");
 const expectedOutcome=reader.getByRole("article",{name:"Expected outcome",exact:true});
 for(const reference of ["Risk 1393","User Story #4"]){
  await expect(expectedOutcome.getByText(reference,{exact:true})).toHaveCSS("color","rgb(255, 193, 90)");
 }
 await expect(expectedOutcome.locator("code")).toHaveText("User story #5");
 const what = reader.getByRole("heading",{name:"What to verify",exact:true});
 const how = reader.getByRole("heading",{name:"How to verify",exact:true});
 await expect(what).toBeVisible();
 await expect(how).toBeVisible();
 expect((await how.boundingBox()).x).toBeGreaterThan((await what.boundingBox()).x);
 await expect(reader.getByRole("heading",{name:"Verification case 72",exact:true})).toBeInViewport();
 await expect(reader.locator("[data-plan-review-entry]")).toBeVisible();
 expect((await readerFrame.boundingBox()).height).toBeLessThan(listFrameHeight);
 await expect(reader.getByRole("heading",{name:"Expected outcome",exact:true})).toBeVisible();
 await expect(reader.getByText("Expected result 72 from the verified source",{exact:true})).toHaveCount(1);
 await reader.getByRole("button",{name:"Back to entries",exact:true}).click();
 await expect(row).toBeFocused();
 await expect(search).toHaveValue("Expected result 72 ");
 expect((await readerFrame.boundingBox()).height).toBe(listFrameHeight);
 await reader.getByRole("button",{name:"Close review details",exact:true}).click();
 await expect(section).toBeFocused();

 await page.setViewportSize({width:820,height:720});
 await step(modal,"Choose scope").click();
 const tree=modal.getByRole("region",{name:"Package work by Feature",exact:true});
 expect((await tree.boundingBox()).height).toBeGreaterThan(175);
 await expect(tree).toBeInViewport();
 await expect(modal.getByRole("textbox",{name:"Plan summary and justification",exact:true})).toBeInViewport();
});
