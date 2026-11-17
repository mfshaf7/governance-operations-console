import test from "node:test";
import assert from "node:assert/strict";
import { technicalPlanFillRecordedFacts, technicalPlanAdvisorEdit, technicalPlanSectionContract, technicalPlanSectionValue } from "../../src/domain-workspaces/delivery/work-model/execution/technical-plan-model.ts";
import { technicalPlanSequence, technicalPlanSequenceLayout, technicalPlanSequenceSvg } from "../../src/domain-workspaces/delivery/work-model/execution/technical-plan-sequence.ts";
const editor=()=>({deliveryId:"delivery-1",coveredWorkItemIds:["work-item-3"],architectureJson:"{}",conformanceJson:"{}",repoRevisionsJson:"[]",rationale:""});
const node=(id,type,children=[])=>({id:`work-item-${id}`,legacy_work_package_id:id,component_type:type,title:`Work ${id}`,owner_repo:"sample-source",children});
test("recorded details fill scope facts while preserving explicit operator decisions",()=>{
  const root=node(1,"Epic",[node(2,"Feature",[node(3,"User story")])]);
  const model={packages:[{delivery_package_id:"delivery-1",tree_root_id:root.id}],art_tree:{roots:[root]},selected_packages:[]};
  const first=technicalPlanFillRecordedFacts(editor(),model),row=JSON.parse(first.architectureJson).descendant_owner_map[0];
  assert.equal(row.work_item_id,"work-item-3");assert.equal(row.parent_work_item_id,"work-item-2");assert.equal(row.owner_repo,"sample-source");
  const changed={...first,architectureJson:JSON.stringify({descendant_owner_map:[{...row,owner_repo:"operator-choice"}],required_human_gates:[{gate_id:"manual"}]})};
  const second=technicalPlanFillRecordedFacts(changed,model);assert.equal(JSON.parse(second.architectureJson).descendant_owner_map[0].owner_repo,"operator-choice");
  assert.deepEqual(JSON.parse(second.architectureJson).required_human_gates,[{gate_id:"manual"}]);assert.equal(second.repoRevisionsJson,"[]");
});
test("advisor edits are transactional local section drafts and cannot author source pins or approval",()=>{
  const before=editor(),section="architecture:landing_units",rows=[{id:"web",owner_repo:"sample-source",source_backed:true,covered_work_item_ids:["work-item-3"]}];
  const next=technicalPlanAdvisorEdit(before,section,[{field:"sectionJson",value:JSON.stringify(rows)}]);
  assert.deepEqual(technicalPlanSectionValue(next,section),rows);assert.equal(next.rationale,"");assert.equal(next.repoRevisionsJson,"[]");assert.equal(before.architectureJson,"{}");
  for(const edits of [[{field:"approve",value:true}],[{field:"sectionJson",value:"{}"}],[{field:"sectionJson",value:JSON.stringify(rows)},{field:"scope",value:[]}],[{field:"sectionJson",value:'[{"__proto__":{"polluted":true}}]'}]])
    assert.throws(()=>technicalPlanAdvisorEdit(before,section,edits));
  assert.throws(()=>technicalPlanAdvisorEdit(before,"repo_revisions",[{field:"sectionJson",value:'[{"commit":"invented"}]'}]),/cannot author source revision/);
  const contract=technicalPlanSectionContract(section);assert.equal(contract.version,6);assert.ok(contract.definitions.landingUnitId);assert.ok(contract.schema.items.required.includes("covered_work_item_ids"));
});
test("sequence keeps source landing, work dependencies and approvals distinct without inventing progress",()=>{
  const data={landing_units:[{id:"api",owner_repo:"backend"},{id:"web",owner_repo:"frontend"}],source_landing_graph:{nodes:["api","web"],edges:[{prerequisite_landing_unit_id:"api",dependent_landing_unit_id:"web"}]},
    required_human_gates:[{gate_id:"security-review",authority_owner_repo:"security",affected_landing_unit_ids:["web"],blocked_transition:"before_source_merge",evidence_requirement:"Review exact source"}],
    work_item_execution_plan:[{work_item_id:"work-item-3",start_after_work_item_ids:[],close_after_work_item_ids:[]},{work_item_id:"work-item-4",start_after_work_item_ids:["work-item-3"],close_after_work_item_ids:[]}]};
  const source=technicalPlanSequence(data,"changes");assert.equal(source.nodes.length,3);assert.deepEqual(source.edges.map(edge=>edge.label),["land before","before source merge"]);
  assert.equal(technicalPlanSequenceLayout(source).cyclic,false);assert.equal(source.nodes.some(node=>"status"in node),false);
  const work=technicalPlanSequence(data,"work",{"work-item-3":"Build API"});assert.equal(work.nodes[0].title,"Build API");assert.deepEqual(work.edges,[{from:"work-item-3",to:"work-item-4",label:"complete before start"}]);
  const cycle={...source,edges:[...source.edges,{from:"web",to:"api",label:"land before"}]};assert.equal(technicalPlanSequenceLayout(cycle).cyclic,true);
  const svg=technicalPlanSequenceSvg({...source,nodes:[...source.nodes,{id:"unsafe",title:'<script>alert("x")</script>',detail:"&danger",kind:"change",facts:{}}]});
  assert.doesNotMatch(svg,/<script>/);assert.match(svg,/&lt;script&gt;/);
  assert.ok(technicalPlanSequence({...data,source_landing_graph:{nodes:["unknown"],edges:[]}},"changes").issues.length);
});

import { architectureFormContract } from "../../src/domain-workspaces/delivery/work-model/execution/architecture-form-model.ts";
import { technicalPlanSections } from "../../src/domain-workspaces/delivery/work-model/execution/technical-plan-model.ts";
import { technicalPlanGroups, technicalPlanGroup, technicalPlanInputState, technicalPlanGroupState, technicalPlanNeedsRepositories, technicalPlanEntryName } from "../../src/domain-workspaces/delivery/work-model/execution/technical-plan-preparation.ts";
test("preparation groups cover every owner section once without adding readiness decisions",()=>{
  const grouped=technicalPlanGroups.flatMap(group=>group.sections);
  assert.deepEqual([...grouped].sort(),technicalPlanSections.map(([key])=>key).sort());
  assert.equal(new Set(grouped).size,grouped.length);
  const {properties}=architectureFormContract;
  for(const parent of ["architecture","conformance_plan"]){
    const surfaced=grouped.filter(key=>key.startsWith(`${parent}:`)).map(key=>key.split(":")[1]);
    if(parent==="conformance_plan")surfaced.push("required"); // Explicit choice in the Verification area.
    assert.deepEqual(surfaced.sort(),Object.keys(properties[parent].properties).sort());
  }
  for(const key of grouped)assert.ok(technicalPlanGroup(key).sections.includes(key));
  assert.equal(technicalPlanNeedsRepositories("repo_revisions"),true);
  assert.equal(technicalPlanNeedsRepositories("architecture:lifecycle_state_model"),true);
  assert.equal(technicalPlanNeedsRepositories("conformance_plan:protocol_applicability"),false);
  assert.equal(technicalPlanNeedsRepositories("architecture:source_landing_graph"),false);
  assert.equal(technicalPlanEntryName({work_item_id:"work-item-3"},0,{"work-item-3":"Story 3 · Build"}),"Story 3 · Build");
});
test("local indicators preserve explicit false and flag incomplete input without certifying it",()=>{
  const empty=editor(),section="conformance_plan:protocol_applicability";
  assert.equal(technicalPlanInputState(empty,section),"Empty");
  const incomplete={...empty,conformanceJson:JSON.stringify({protocol_applicability:{applies:false,rationale:""}})};
  assert.equal(technicalPlanInputState(incomplete,section),"Needs attention");
  const explicit={...empty,conformanceJson:JSON.stringify({protocol_applicability:{applies:false,rationale:"This protocol does not apply to these notes."}})};
  assert.equal(technicalPlanInputState(explicit,section),"Draft");
  assert.equal(technicalPlanInputState({...empty,conformanceJson:"{"},section),"Needs attention");
  assert.equal(technicalPlanGroupState({...empty,conformanceJson:'{"required":false}'},technicalPlanGroups.find(group=>group.id==="verification")),"Draft");
  assert.equal(empty.conformanceJson,"{}");
});

import { technicalPlanRequirement } from "../../src/domain-workspaces/delivery/work-model/execution/technical-plan-requirement.ts";
const requirementProjection=(options={})=>({delivery_id:"delivery-1",work_item_id:"work-item-3",state:"configured-path-ready",next_action:{code:"work-session-start-ready",reason:"Owner check accepted",authority:"operator-orchestration-service"},...options});
test("plan entry never treats a missing record, generated draft, unrelated scope or unavailable owner as an exemption",()=>{
  const evaluate=projection=>technicalPlanRequirement({deliveryId:"delivery-1",projection,workItemId:3});
  assert.equal(evaluate(null).status,"unknown");
  assert.equal(evaluate(requirementProjection({decision_draft:{architecture:{required:false}}})).status,"unknown");
  assert.equal(evaluate(requirementProjection({delivery_id:"delivery-2"})).status,"unknown");
  assert.equal(evaluate(requirementProjection({work_item_id:"work-item-4"})).status,"unknown");
  assert.equal(technicalPlanRequirement({deliveryId:"delivery-1",projection:requirementProjection(),available:false}).status,"unknown");
  const ready={ready:true,status:"implementation-ready",architecture:{required:false}};
  assert.equal(evaluate(requirementProjection({configured_path:ready})).status,"not-required");
  assert.equal(evaluate(requirementProjection({configured_path:{...ready,ready:false}})).status,"unknown");
  const bound={...ready,architecture:{required:true,decision_status:"architecture-ready",custody_state:"durable"}};
  assert.equal(evaluate(requirementProjection({configured_path:bound})).status,"covered");
  assert.equal(evaluate(requirementProjection({configured_path:{...bound,architecture:{...bound.architecture,custody_state:"local"}}})).status,"unknown");
});
test("plan entry preserves required, existing-binding and recovery distinctions",()=>{
  const evaluate=code=>technicalPlanRequirement({deliveryId:"delivery-1",projection:requirementProjection({next_action:{code,reason:"Exact owner explanation",authority:"operator-orchestration-service"}})});
  assert.equal(evaluate("architecture-packet-required").status,"required");
  assert.equal(evaluate("architecture-binding-required").status,"binding");
  assert.equal(evaluate("architecture-recovery-required").status,"review");
  assert.equal(evaluate("architecture-compatible-refresh-required").actionLabel,"Review Technical Plan");
  assert.equal(evaluate("architecture-binding-required").ownerReason,"Exact owner explanation");
});
