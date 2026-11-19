import {test,expect} from "../support/filled-surface-layout.mjs";
import {createRequire} from "node:module";
import {technicalPlanInput,technicalPlanArtifact} from "../support/technical-plan-fixture.mjs";
const require=createRequire(import.meta.url),{projectCanonicalDeliveryOverview}=require("../../src/domain-workspaces/delivery/live-runtime/delivery-overview-live-projection.ts");
const base=process.env.CONSOLE_TEST_BASE_URL??"http://127.0.0.1:3320";
test.setTimeout(120000);test.use({viewport:{width:1700,height:1050}});
async function open(page,{recorded=false,staleApproval=false,history=false,validationErrors=[]}={}){
 const state={requests:[],advisor:[],errors:[],staleApproval,recorded};
 const epic={id:1,type:"Epic",status:"in-progress",subject:"Technical Plan Exercise",record_ref:"openproject://work_packages/1",owner_repo:"governance-operations-console",target_pi:null,architecture_anchor_ref:null,required_upstream_ref:null};
 const task={id:3,type:"User story",status:"ready",subject:"Implement the reviewed outcome",description:"Build the bounded requested change.",owner_repo:"governance-operations-console",ready_contract_satisfied:true,children:[]};
 const model=projectCanonicalDeliveryOverview({schema_version:1,workflow_id:"delivery-console-overview",project:{identifier:"workspace-delivery-art"},roots:[epic],deferred_history_refs:[],mutation_authority:"none",operational_initiatives:[{epic,execution_tree:{...epic,children:[task]},summary:{open_descendant_count:1}}]},"test-revision",new Date().toISOString());
 page.on("pageerror",error=>state.errors.push(error.message));
 await page.route("**/api/**",async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(path==="/api/console/capabilities")return route.fulfill({json:{artifactType:"console-runtime-capability-projection",schemaVersion:1,mode:"live",capabilities:[]}});
  if(path==="/api/delivery/workspace")return route.fulfill({json:{mode:"live",projection:model}});
  if(path.startsWith("/api/saved-work/"))return route.fulfill({json:{mode:"disconnected-preview"}});
  if(path==="/api/delivery/architecture-packets/delivery-1"){
   if(!state.recorded)return route.fulfill({status:404,json:{mode:"live",status:"offline",code:"delivery_art_reference_missing",error:"No recorded plan"}});
   return route.fulfill({json:{mode:"live",status:"current",observedAt:new Date().toISOString(),error:null,result:{workflow_id:"delivery-art-architecture-packet-current",artifact:technicalPlanArtifact(technicalPlanInput("architecture-ready"),true),contract_posture:"current",custody_receipt:{},projected_reference:{}}}});
  }
  if(path==="/api/advisor-interaction"){
   const body=req.postDataJSON();state.advisor.push(body);
   return route.fulfill({json:{intent:body.prompt.startsWith("Draft")?"draft":"answer",message:"Synthetic governed response for this manual request.",edits:body.prompt.startsWith("Draft")?[{field:"sectionJson",value:JSON.stringify([{work_item_id:"work-item-3",work_item_type:"User story",parent_work_item_id:"work-item-1",owner_repo:"governance-operations-console"}])}]:[],evidence:{profileId:"agent-console-assistant-v1",auditRef:"audit:test",contextRef:"context:test"}}});
  }
  if(path==="/api/delivery/architecture-packets/draft"){
   const body=req.postDataJSON();state.requests.push({path,body});
   if(validationErrors.length)return route.fulfill({status:422,json:{mode:"live",status:"offline",code:"delivery_art_authoring_contract_invalid",error:"This plan needs correction.",issues:validationErrors}});
   const approved=body.input.decision.status==="architecture-ready";
   return route.fulfill({json:{mode:"live",status:"current",observedAt:new Date().toISOString(),error:null,result:{workflow_id:"delivery-art-architecture-packet-draft",architecture_packet:technicalPlanArtifact(body.input),source_snapshot:{art_digest:"sha256:"+(approved&&state.staleApproval?"c":"b").repeat(64),covered_record_count:1,dependency_record_count:0,relation_count:0}}}});
  }
  if(path==="/api/delivery/architecture-packets/persist"){
   const body=req.postDataJSON();state.requests.push({path,body});state.recorded=true;
   const artifact={...body.artifact,custody:{backend:"wgcf-artifact-registry",state:"durable",uri:"wgcf://artifacts/delivery-art/sha256/"+"a".repeat(64)}};
   return route.fulfill({json:{mode:"live",status:"current",observedAt:new Date().toISOString(),error:null,result:{workflow_id:"delivery-art-architecture-packet-persist",artifact,custody_receipt:{ref:"receipt:test"},owner_receipt:{ref:"owner:test"}}}});
  }
  return route.fulfill({status:503,json:{mode:"live",status:"offline",projection:null,error:"Isolated owner unavailable"}});
 });
 await page.goto(base,{waitUntil:"domcontentloaded"});await page.waitForFunction(()=>{const button=document.querySelector('button[title="Open DELIVERY"]');return button&&Object.keys(button).some(key=>key.startsWith("__reactProps$"));});
 await page.locator('button[title="Open DELIVERY"]').click();const workspace=page.getByRole("dialog",{name:"Delivery Workspace",exact:true});await workspace.locator('[data-delivery-workspace-section="execution-board"]').click();
 if(history)await workspace.getByRole("radio",{name:"History",exact:true}).click();
 await workspace.getByRole("button",{name:"Open Technical Plan",exact:true}).click();
 return {state,workspace,modal:page.getByRole("dialog",{name:"Technical Plan & Approval",exact:true})};
}
test("owner validation findings remain inspectable and editing clears the failed attempt",async({page})=>{
 const findings=["Work dependencies must be acyclic.","A source-activation approval requires an owner chain."];
 const {state,modal}=await open(page,{validationErrors:findings});
 await fillPlan(page,modal);
 await modal.getByRole("button",{name:"Validate Plan",exact:true}).click();
 const action=modal.locator('[data-technical-plan-action="true"]');
 await expect(action).toContainText("This plan needs correction.");
 await action.getByText("Plan checks requiring attention · 2",{exact:true}).click();
 for(const finding of findings)await expect(action).toContainText(finding);
 await page.screenshot({path:test.info().outputPath("technical-plan-validation-findings.png")});
 await expect(modal.getByRole("button",{name:"Approve Plan",exact:true})).toHaveCount(0);
 await modal.getByRole("button",{name:"Edit Summary",exact:true}).click();
 await modal.getByRole("textbox",{name:"Plan summary and justification",exact:true}).fill("Revised reviewed rationale, with the dependency correction still to validate.");
 await expect(action).not.toContainText("Plan checks requiring attention");
 expect(state.requests).toHaveLength(1);
 expect(state.requests[0].body.input.decision.status).toBe("draft");
 expect(state.errors).toEqual([]);
});
async function fillPlan(page,modal,input=technicalPlanInput()){
 await modal.getByRole("radio",{name:"Prepare Plan",exact:true}).click();
 await modal.getByRole("button",{name:"Edit Scope",exact:true}).click();
 await modal.getByRole("button",{name:"Covered work item 1",exact:true}).click();await page.getByRole("option",{name:/^User story 3 ·/}).click();
 await modal.getByRole("button",{name:"Close Scope",exact:true}).click();
 await modal.getByText("Technical data · JSON import and export",{exact:true}).click();
 for(const [label,value]of[["Architecture design JSON",input.architecture],["Verification plan JSON",input.conformance_plan],["Repository revisions JSON",input.repo_revisions]])await modal.getByRole("textbox",{name:label,exact:true}).fill(JSON.stringify(value));
 await modal.getByRole("button",{name:"Edit Summary",exact:true}).click();
 await modal.getByRole("textbox",{name:"Plan summary and justification",exact:true}).fill(input.decision.rationale);
 await modal.getByRole("button",{name:"Close Summary",exact:true}).click();
 await modal.getByText("Technical data · JSON import and export",{exact:true}).click();
}
test("package entry and advisor are scoped, manual and undoable without canonical mutation",async({page},info)=>{
 const {state,modal}=await open(page);await expect(modal).toContainText("Technical Plan Exercise");await expect(modal).toContainText("No approved plan is recorded");expect(state.advisor).toEqual([]);
 await expect(modal.getByText("Ask me to explain this plan or draft work responsibilities. Approval and recording remain your decisions.",{exact:true})).toBeVisible();
 await modal.getByRole("radio",{name:"Prepare Plan",exact:true}).click();
 await modal.getByRole("button",{name:"Edit Scope",exact:true}).click();
 await modal.getByRole("button",{name:"Covered work item 1",exact:true}).click();await page.getByRole("option",{name:/^User story 3 ·/}).click();
 await modal.getByRole("button",{name:"Close Scope",exact:true}).click();
 const prompt=modal.getByRole("textbox",{name:"Technical plan advisor prompt",exact:true});await prompt.fill("Explain this section");
 // Shared advisor form uses its explicit submit action.
 await prompt.locator("xpath=ancestor::form").getByRole("button",{name:"run",exact:true}).click();
 await expect.poll(()=>state.advisor.length).toBe(1);expect(state.advisor[0].scope.role).toBe("execution-architecture");expect(state.requests).toEqual([]);
 await prompt.fill("Draft the work responsibilities from recorded facts");
 await prompt.locator("xpath=ancestor::form").getByRole("button",{name:"run",exact:true}).click();
 await expect.poll(()=>state.advisor.length).toBe(2);await expect(modal).toContainText("requested draft edit");expect(state.requests).toEqual([]);
 for(const [width,height]of[[1700,1050],[1280,720]]){await page.setViewportSize({width,height});await modal.screenshot({path:info.outputPath(`technical-plan-advisor-${width}.png`)});expect(await modal.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
   const shown=await prompt.evaluate(element=>{let {top,bottom}=element.getBoundingClientRect();for(let parent=element.parentElement;parent;parent=parent.parentElement){if(getComputedStyle(parent).overflowY!=="visible"){const rect=parent.getBoundingClientRect();top=Math.max(top,rect.top);bottom=Math.min(bottom,rect.bottom);}}return bottom-top;});expect(shown).toBeGreaterThanOrEqual(25);
   expect(await prompt.evaluate(element=>{const panel=element.closest("section"),stack=element.closest('[data-teras-panel-stack="true"]');return panel&&stack?panel.getBoundingClientRect().bottom-stack.getBoundingClientRect().bottom:0;})).toBeLessThanOrEqual(1);}
 await modal.getByRole("button",{name:"Undo advisor edit",exact:true}).click();await expect(modal).toContainText("Advisor draft edits undone");
 await modal.getByRole("button",{name:"Plan section",exact:true}).click();await page.getByRole("option",{name:/^Source revisions ·/}).click();
 await prompt.fill("Draft repository revisions");await prompt.locator("xpath=ancestor::form").getByRole("button",{name:"run",exact:true}).click();
 await expect.poll(()=>state.advisor.length).toBe(3);expect(state.advisor.at(-1).scope.readOnly).toBe(true);
 await expect(modal).toContainText("read-only; no edits are allowed");expect(state.requests).toEqual([]);
 expect(state.errors).toEqual([]);
});
test("readable review separates explicit approval from recording and sequence remains derived",async({page},info)=>{
 const {state,modal}=await open(page);await fillPlan(page,modal);await modal.getByRole("radio",{name:"Implementation Sequence",exact:true}).click();
 await expect(modal.getByRole("button",{name:/Inspect delivery-1-packet-authoring/})).toBeVisible();
 await modal.getByRole("button",{name:"Zoom in",exact:true}).click();await modal.screenshot({path:info.outputPath("technical-plan-sequence.png")});
 await modal.getByRole("button",{name:"Validate Plan",exact:true}).click();await expect(modal.getByRole("button",{name:"Approve Plan",exact:true})).toBeDisabled();
 await modal.locator("summary").filter({hasText:/^Work responsibilities details$/}).click();await expect(modal).toContainText("governance-operations-console");
 await modal.getByRole("radio",{name:"I approve this technical plan for the covered work",exact:true}).click();await modal.getByRole("button",{name:"Approve Plan",exact:true}).click();
 expect(state.requests).toHaveLength(2);expect(state.requests.every(item=>item.path.endsWith("/draft"))).toBe(true);
 await modal.getByRole("button",{name:"Record Approved Plan",exact:true}).click();await expect(modal).toContainText("Approval recorded");
 expect(state.requests).toHaveLength(3);expect(state.requests[2].body.artifact.decision.status).toBe("architecture-ready");expect(state.errors).toEqual([]);
});
test("changed source prevents recording and History exposes no approval actions",async({page})=>{
 const {state,modal}=await open(page,{staleApproval:true});await fillPlan(page,modal);await modal.getByRole("button",{name:"Validate Plan",exact:true}).click();
 await modal.getByRole("radio",{name:"I approve this technical plan for the covered work",exact:true}).click();await modal.getByRole("button",{name:"Approve Plan",exact:true}).click();
 await expect(modal).toContainText("Source facts changed during approval");expect(state.requests.some(item=>item.path.endsWith("/persist"))).toBe(false);expect(state.errors).toEqual([]);
 const retained=await open(page,{recorded:true,history:true});
 await expect(retained.modal.getByRole("radio",{name:"Prepare Plan",exact:true})).toHaveCount(0);
 for(const name of ["Validate Plan","Approve Plan","Record Approved Plan","Revise Current Plan"])await expect(retained.modal.getByRole("button",{name,exact:true})).toHaveCount(0);
 expect(retained.state.requests).toEqual([]);
});

test("preparation keeps grouped forms, nested edits and written reasoning clear across all plan views",async({page},info)=>{
 const {architectureFormContract,planFieldInitialValue}=require("../../src/domain-workspaces/delivery/work-model/execution/architecture-form-model.ts");
 const {technicalPlanGroups}=require("../../src/domain-workspaces/delivery/work-model/execution/technical-plan-preparation.ts");
 const {technicalPlanSections}=require("../../src/domain-workspaces/delivery/work-model/execution/technical-plan-model.ts");
 const {state,modal}=await open(page);
 const input=technicalPlanInput();
 input.architecture=planFieldInitialValue(architectureFormContract.properties.architecture);
 input.conformance_plan=planFieldInitialValue(architectureFormContract.properties.conformance_plan);
 input.architecture.descendant_owner_map=[{work_item_id:"work-item-3",work_item_type:"User story",parent_work_item_id:"work-item-1",owner_repo:"governance-operations-console"}];
 input.architecture.landing_units=[{id:"ui-change",owner_repo:"governance-operations-console",source_backed:true,covered_work_item_ids:["work-item-3"]},{id:"docs-change",owner_repo:"governance-operations-console",source_backed:true,covered_work_item_ids:["work-item-3"]}];
 await fillPlan(page,modal,input);
 const navigation=modal.locator('[aria-label="Planning areas"]');
 for(const group of technicalPlanGroups){
   await navigation.getByRole("button").filter({hasText:group.label}).click();
   for(const key of group.sections){
     const label=technicalPlanSections.find(([section])=>section===key)[1];
     await modal.getByRole("button",{name:"Plan section",exact:true}).click();
     await page.getByRole("option").filter({hasText:new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")} ·`)}).click();
     await expect(modal.getByRole("heading",{name:label,exact:true})).toBeVisible();
     // Inspect nested entry editors, not just the section heading. Only one entry
     // in each list is open at once; track paths to avoid cycling sibling rows.
     const seen=new Set();
     for(let attempt=0;attempt<30;attempt++){
       const rows=modal.locator('[data-plan-entry-path]');let opened=false;
       for(let at=0;at<await rows.count();at++){
         const row=rows.nth(at),path=await row.getAttribute("data-plan-entry-path");
         if(seen.has(path))continue;seen.add(path);
         const edit=row.getByRole("button",{name:/^Edit Entry [0-9]+$/}).first();
         if(await edit.count()){await edit.click();opened=true;break;}
       }
       if(!opened)break;
     }
     await modal.screenshot({path:info.outputPath(`prepare-section-${key.replaceAll(":","-")}-1700.png`)});
     // Section switching preserves the original source data and never calls a provider.
     expect(state.advisor).toEqual([]);expect(state.requests).toEqual([]);
   }
   await modal.screenshot({path:info.outputPath(`prepare-area-${group.id}-1700.png`)});
 }
 // One repeated entry editor at a time, and edits survive group navigation.
 await navigation.getByRole("button").filter({hasText:"Work & Changes"}).click();
 await modal.getByRole("button",{name:"Plan section",exact:true}).click();await page.getByRole("option",{name:/^Changes that land together ·/}).click();
 await modal.getByRole("button",{name:"Edit Entry 1",exact:true}).click();
 await modal.getByRole("textbox",{name:"Identifier",exact:true}).fill("reviewed-ui-change");
 await modal.getByRole("button",{name:"Edit Entry 2",exact:true}).click();
 await expect(modal.getByRole("button",{name:"Close Entry 1",exact:true})).toHaveCount(0);
 await expect(modal.getByRole("textbox",{name:"Identifier",exact:true})).toHaveValue("docs-change");
 await modal.getByRole("button",{name:"Close Entry 2",exact:true}).click();
 await modal.getByRole("button",{name:"Plan section",exact:true}).click();await page.getByRole("option",{name:/^Work responsibilities ·/}).click();
 await modal.getByRole("button",{name:"Edit Entry 1",exact:true}).click();
 await expect(modal.getByRole("button",{name:"Work type",exact:true})).toHaveCount(0);
 await modal.getByRole("button",{name:"Edit Work Details",exact:true}).click();
 await expect(modal.getByRole("button",{name:"Work type",exact:true})).toBeVisible();
 await modal.screenshot({path:info.outputPath("prepare-work-details-1700.png")});
 await navigation.getByRole("button").filter({hasText:"Operation & Recovery"}).click();
 await modal.getByRole("button",{name:"Plan section",exact:true}).click();await page.getByRole("option",{name:/^Access and execution ·/}).click();
 const summary=modal.getByRole("textbox",{name:"Summary",exact:true});
 await summary.fill("Only an explicitly accepted operator action can execute.\nA model suggestion cannot authorize execution.");
 await modal.screenshot({path:info.outputPath("prepare-operation-1700.png")});
 await navigation.getByRole("button").filter({hasText:"Verification"}).click();
 await modal.getByRole("button",{name:"Verification required",exact:true}).click();await page.getByRole("option",{name:"No",exact:true}).click();
 await page.setViewportSize({width:1280,height:720});
 await modal.getByRole("button",{name:"Planning area",exact:true}).click();await page.getByRole("option",{name:"Operation & Recovery",exact:true}).click();
 await modal.getByRole("button",{name:"Plan section",exact:true}).click();await page.getByRole("option",{name:/^Access and execution ·/}).click();
 await expect(summary).toHaveValue("Only an explicitly accepted operator action can execute.\nA model suggestion cannot authorize execution.");
 await summary.scrollIntoViewIfNeeded();
 await modal.screenshot({path:info.outputPath("prepare-operation-1280.png")});
 const prompt=modal.getByRole("textbox",{name:"Technical plan advisor prompt",exact:true});
 expect(await prompt.evaluate(element=>{let{top,bottom}=element.getBoundingClientRect();for(let parent=element.parentElement;parent;parent=parent.parentElement){if(getComputedStyle(parent).overflowY!=="visible"){const r=parent.getBoundingClientRect();top=Math.max(top,r.top);bottom=Math.min(bottom,r.bottom);}}return bottom-top;})).toBeGreaterThanOrEqual(25);
 await modal.getByText("Technical data · JSON import and export",{exact:true}).click();
 const architecture=JSON.parse(await modal.getByRole("textbox",{name:"Architecture design JSON",exact:true}).inputValue());
 expect(architecture.landing_units.map(row=>row.id)).toEqual(["reviewed-ui-change","docs-change"]);
 expect(JSON.parse(await modal.getByRole("textbox",{name:"Verification plan JSON",exact:true}).inputValue()).required).toBe(false);
 await modal.getByRole("textbox",{name:"Architecture design JSON",exact:true}).fill("{");
 await expect(modal).toContainText("Your original input is retained");
 await modal.getByRole("textbox",{name:"Architecture design JSON",exact:true}).fill(JSON.stringify(architecture));
 await modal.getByText("Technical data · JSON import and export",{exact:true}).click();
 for(const label of ["Overview","System Architecture","Implementation Sequence","Review Plan"]){
   await modal.getByRole("radio",{name:label,exact:true}).click();
   await modal.screenshot({path:info.outputPath(`technical-plan-view-${label.replaceAll(" ","-")}-1280.png`)});
   expect(await modal.evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);
 }
 expect(state.advisor).toEqual([]);expect(state.requests).toEqual([]);expect(state.errors).toEqual([]);
});

test("overview explains conditional planning and the board entry leads to real work checks",async({page},info)=>{
 const {state,workspace,modal}=await open(page);
 await expect(modal.getByRole("list",{name:"How a technical plan is used",exact:true})).toBeVisible();
 await expect(modal.getByText("Delivering an API and its web interface",{exact:true})).toBeVisible();
 await expect(modal.getByRole("heading",{name:"Plan requirement not checked",exact:true})).toBeVisible();
 const action=modal.locator('[data-technical-plan-action="true"]');
 await expect(action).toHaveAttribute("data-treatment","rail");
 await expect(action).toContainText("Choose a work item, then review its execution requirements");
 for(const [width,height]of[[1700,1050],[1280,720]]){
   await page.setViewportSize({width,height});
   await modal.screenshot({path:info.outputPath(`technical-plan-overview-${width}.png`)});
   expect(await modal.evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);
 }
 await modal.getByRole("button",{name:"Back to Execution Board",exact:true}).click();
 const entry=workspace.getByRole("button",{name:"Open Technical Plan",exact:true});
 await entry.scrollIntoViewIfNeeded();
 await expect(workspace.getByText("Plan requirement not checked",{exact:true})).toBeVisible();
 await expect(workspace.getByRole("button",{name:"Prepare Technical Plan",exact:true})).toHaveCount(0);
 await workspace.screenshot({path:info.outputPath("execution-technical-plan-entry-1280.png")});
 await entry.click();
 await modal.getByRole("radio",{name:"Prepare Plan",exact:true}).click();
 await expect(action.getByRole("button",{name:"Validate Plan",exact:true})).toBeDisabled();
 await expect(action).toContainText("Covered work items must be unique work-item identifiers.");
 await modal.getByRole("button",{name:"Edit Summary",exact:true}).click();
 await modal.getByRole("textbox",{name:"Plan summary and justification",exact:true}).fill("Retain this local draft while checking the next work requirement.");
 await modal.getByRole("radio",{name:"Overview",exact:true}).click();
 await modal.getByRole("button",{name:"Choose Work Item",exact:true}).click();
 const guard=page.getByRole("alertdialog",{name:"Discard technical plan edits?",exact:true});
 await expect(guard).toBeVisible();await guard.getByRole("button",{name:"Keep Editing",exact:true}).click();
 await expect(modal).toBeVisible();
 await modal.getByRole("button",{name:"Choose Work Item",exact:true}).click();
 await guard.getByRole("button",{name:"Discard Draft",exact:true}).click();
 await expect(modal).toHaveCount(0);await expect(page.getByRole("button",{name:"Work path",exact:true})).toBeVisible();
 expect(state.requests).toEqual([]);expect(state.advisor).toEqual([]);expect(state.errors).toEqual([]);
});
