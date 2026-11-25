import test from "node:test";
import assert from "node:assert/strict";
import { technicalPlanAddDependencyRows, technicalPlanFillRecordedFacts, technicalPlanPrepareDraft, technicalPlanReplaceScope, technicalPlanAdvisorEdit, technicalPlanOverviewFacts, technicalPlanSectionContract, technicalPlanSectionValue, technicalPlanSetSection } from "../../src/domain-workspaces/delivery/work-model/execution/technical-plan-model.ts";
import { technicalPlanSequence, technicalPlanSequenceLayout, technicalPlanSequenceSvg } from "../../src/domain-workspaces/delivery/work-model/execution/technical-plan-sequence.ts";
const editor=()=>({deliveryId:"delivery-1",coveredWorkItemIds:["work-item-3"],architectureJson:"{}",conformanceJson:"{}",repoRevisionsJson:"[]",rationale:""});
const node=(id,type,children=[])=>({id:`work-item-${id}`,legacy_work_package_id:id,component_type:type,title:`Work ${id}`,owner_repo:"sample-source",children});
test("Review shows the scope, planned checks, and open decisions in the displayed plan", () => {
  const plan = {
    ...editor(),
    architectureJson: JSON.stringify({
      landing_units: [{ source_backed: true }, { source_backed: false }],
      contradictions_open_decisions: [{ status: "open" }, { status: "resolved" }],
    }),
    conformanceJson: JSON.stringify({ cases: [{ case_id: "first" }, { case_id: "second" }] }),
  };
  assert.deepEqual(technicalPlanOverviewFacts(plan), {
    workItems: 1, sourceGroups: 1, openDecisions: 1, verificationCases: 2,
  });
  assert.equal(technicalPlanOverviewFacts({ ...plan, architectureJson: "{" }).openDecisions, null);
  assert.equal(technicalPlanOverviewFacts({ ...plan, conformanceJson: '{"cases":[]}' }).verificationCases, 0);
});
test("Delivery owns work facts, while plan decisions survive draft reconciliation",()=>{
  const root=node(1,"Epic",[node(2,"Feature",[node(3,"User story")])]);
  const model={packages:[{delivery_package_id:"delivery-1",tree_root_id:root.id}],art_tree:{roots:[root]},selected_packages:[]};
  const first=technicalPlanFillRecordedFacts(editor(),model),row=JSON.parse(first.architectureJson).descendant_owner_map[0];
  assert.equal(row.work_item_id,"work-item-3");assert.equal(row.parent_work_item_id,null);assert.equal(row.owner_repo,"sample-source");
  const changed={...first,coveredWorkItemIds:["work-item-3","work-item-2"],
    architectureJson:JSON.stringify({descendant_owner_map:[{...row,work_item_type:"Defect",owner_repo:"operator-choice"}],required_human_gates:[{gate_id:"manual"}]})};
  const second=technicalPlanPrepareDraft(changed,model);
  assert.deepEqual(JSON.parse(second.architectureJson).descendant_owner_map[0],{
    ...row,parent_work_item_id:"work-item-2",
  });
  assert.deepEqual(JSON.parse(second.architectureJson).required_human_gates,[{gate_id:"manual"}]);assert.equal(second.repoRevisionsJson,"[]");
  const reduced=technicalPlanReplaceScope(second,["work-item-3"],model);
  assert.deepEqual(JSON.parse(reduced.architectureJson).descendant_owner_map,[row]);
});
test("advisor edits are transactional local section drafts and cannot author source pins or approval",()=>{
  const before=editor(),section="architecture:landing_units",rows=[{id:"web",owner_repo:"sample-source",source_backed:true,covered_work_item_ids:["work-item-3"]}];
  const next=technicalPlanAdvisorEdit(before,section,[{field:"sectionJson",value:JSON.stringify(rows)}]);
  assert.deepEqual(technicalPlanSectionValue(next,section),rows);assert.equal(next.rationale,"");assert.equal(next.repoRevisionsJson,"[]");assert.equal(before.architectureJson,"{}");
  for(const edits of [[{field:"approve",value:true}],[{field:"sectionJson",value:"{}"}],[{field:"sectionJson",value:JSON.stringify(rows)},{field:"scope",value:[]}],[{field:"sectionJson",value:'[{"__proto__":{"polluted":true}}]'}]])
    assert.throws(()=>technicalPlanAdvisorEdit(before,section,edits));
  assert.throws(()=>technicalPlanAdvisorEdit(before,"repo_revisions",[{field:"sectionJson",value:'[{"commit":"invented"}]'}]),/cannot author source revision/);
  assert.throws(()=>technicalPlanAdvisorEdit(before,"architecture:descendant_owner_map",[{field:"sectionJson",value:"[]"}]),/Delivery record/);
  const contract=technicalPlanSectionContract(section);assert.equal(contract.version,6);assert.ok(contract.definitions.landingUnitId);assert.ok(contract.schema.items.required.includes("covered_work_item_ids"));
});
test("source order derives source nodes and retains relationships for validation", () => {
  const section = "architecture:source_landing_graph";
  const groups = "architecture:landing_units";
  const edge = { prerequisite_landing_unit_id: "api", dependent_landing_unit_id: "web" };
  let plan = technicalPlanSetSection(editor(), groups, [
    { id: "api", source_backed: true }, { id: "web", source_backed: true }, { id: "review", source_backed: false },
  ]);
  plan = technicalPlanSetSection(plan, section, { nodes: ["unrelated"], edges: [edge] });
  assert.deepEqual(technicalPlanSectionValue(plan, section), { nodes: ["api", "web"], edges: [edge] });
  plan = technicalPlanSetSection(plan, groups, [{ id: "web", source_backed: true }]);
  assert.deepEqual(technicalPlanSectionValue(plan, section), { nodes: ["web"], edges: [edge] });
});
test("add remaining work copies recorded in-scope prerequisites and preserves existing rows", () => {
  const section = "architecture:work_item_execution_plan";
  const reviewedRow = {
    work_item_id: "work-item-3", start_after_work_item_ids: [], close_after_work_item_ids: [],
    emits_human_gate_ids: ["operator-approval"],
  };
  const draft = technicalPlanSetSection({ ...editor(), coveredWorkItemIds: ["work-item-3", "work-item-4"] }, section, [reviewedRow]);
  const nodes = [node(2, "User story"), node(3, "User story"), { ...node(4, "User story"), depends_on_work_package_ids: [2, 3] }];
  assert.deepEqual(technicalPlanSectionValue(technicalPlanAddDependencyRows(draft, nodes), section), [
    reviewedRow,
    { work_item_id: "work-item-4", start_after_work_item_ids: ["work-item-3"], close_after_work_item_ids: [], emits_human_gate_ids: [] },
  ]);
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
import { technicalPlanGroups, technicalPlanGroup, technicalPlanInputState, technicalPlanGroupState, technicalPlanRepositoryLookupFields, technicalPlanEntryName } from "../../src/domain-workspaces/delivery/work-model/execution/technical-plan-preparation.ts";
test("preparation groups surface plan choices while work facts come from Delivery",()=>{
  const grouped=technicalPlanGroups.flatMap(group=>group.sections);
  assert.deepEqual([...grouped].sort(),technicalPlanSections.map(([key])=>key)
    .filter(key=>key!=="architecture:descendant_owner_map").sort());
  assert.equal(new Set(grouped).size,grouped.length);
  const {properties}=architectureFormContract;
  for(const parent of ["architecture","conformance_plan"]){
    const surfaced=grouped.filter(key=>key.startsWith(`${parent}:`)).map(key=>key.split(":")[1]);
    if(parent==="architecture")surfaced.push("descendant_owner_map"); // Captured by Choose scope.
    if(parent==="conformance_plan")surfaced.push("required"); // Verification is required for approval.
    assert.deepEqual(surfaced.sort(),Object.keys(properties[parent].properties).sort());
  }
  for(const key of grouped)assert.ok(technicalPlanGroup(key).sections.includes(key));
  assert.deepEqual(technicalPlanRepositoryLookupFields("repo_revisions"), []);
  assert.deepEqual(technicalPlanRepositoryLookupFields("architecture:lifecycle_state_model"), ["authority"]);
  assert.deepEqual(technicalPlanRepositoryLookupFields("architecture:runtime_boundaries"), ["owner_repo"]);
  assert.deepEqual(technicalPlanRepositoryLookupFields("architecture:runtime_activation_chains"), []);
  assert.deepEqual(technicalPlanRepositoryLookupFields("architecture:evidence_receipt_handoffs"), []);
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
  assert.equal(technicalPlanGroupState({...empty,conformanceJson:'{"required":false}'},technicalPlanGroups.find(group=>group.id==="verification")),"Needs attention");
  assert.equal(empty.conformanceJson,"{}");
});

test("approval guidance detects missing recorded dependencies and a group that cannot merge source", () => {
  const section = "architecture:required_human_gates";
  const architecture = {
    required_human_gates: [{
      gate_id: "gate:review", authority_work_item_id: "work-item-3", authority_owner_repo: "sample-source",
      blocked_transition: "before_source_merge", affected_landing_unit_ids: ["change-source"],
      evidence_requirement: "Review the prerequisite result", evidence_prerequisite_work_item_ids: ["work-item-4"],
    }],
    work_item_execution_plan: [{ work_item_id: "work-item-3", start_after_work_item_ids: [], close_after_work_item_ids: [] }],
    landing_units: [{ id: "change-source", source_backed: false }],
  };
  const status = () => technicalPlanInputState({ ...editor(), architectureJson: JSON.stringify(architecture) }, section);
  assert.equal(status(), "Needs attention");
  architecture.work_item_execution_plan[0].close_after_work_item_ids.push("work-item-4");
  assert.equal(status(), "Needs attention");
  architecture.landing_units[0].source_backed = true;
  assert.equal(status(), "Draft");
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


test("draft preparation derives approval ownership, prerequisites and protocol checks without assigning outcomes", () => {
  const first = node(3, "User story");
  const second = { ...node(4, "User story"), depends_on_work_package_ids: [3, 5] };
  const root = node(1, "Epic", [first, second]);
  const model = { packages: [{ delivery_package_id: "delivery-1", tree_root_id: root.id }], art_tree: { roots: [root] }, selected_packages: [] };
  const formerCommit = "a".repeat(40), newCommit = "b".repeat(40);
  const plan = technicalPlanFillRecordedFacts({
    ...editor(),
    coveredWorkItemIds: [first.id, second.id],
    architectureJson: JSON.stringify({
      required_human_gates: [{ gate_id: "review", authority_work_item_id: first.id, authority_owner_repo: "old-owner",
        blocked_transition: "before_runtime_activation", affected_landing_unit_ids: ["commission"] }],
      work_item_execution_plan: [
        { work_item_id: first.id, start_after_work_item_ids: [], close_after_work_item_ids: [second.id], emits_human_gate_ids: ["old"] },
        { work_item_id: second.id, start_after_work_item_ids: [], close_after_work_item_ids: [first.id], emits_human_gate_ids: [] },
      ],
      runtime_activation_chains: [{ gate_id: "review", source_owner_repo: "sample-source", source_activation_evidence: {
        repo: "sample-source", revision: formerCommit, observed_value: false,
      } }],
    }),
    repoRevisionsJson: JSON.stringify([{ repo: "sample-source", base_ref: "origin/main", commit: newCommit }]),
    conformanceJson: JSON.stringify({ protocol_applicability: { applies: true }, dimensions: ["operator-check"],
      work_item_dimension_applicability: [{ work_item_id: first.id, dimension_ids: ["operator-check"] }] }),
  }, model);
  const prepared = technicalPlanPrepareDraft(plan, model);
  const architecture = JSON.parse(prepared.architectureJson);
  const verification = JSON.parse(prepared.conformanceJson);
  assert.equal(architecture.required_human_gates[0].authority_owner_repo, "sample-source");
  assert.deepEqual(architecture.work_item_execution_plan.map(row => row.emits_human_gate_ids), [["review"], []]);
  assert.deepEqual(architecture.work_item_execution_plan[0].close_after_work_item_ids, []);
  assert.deepEqual(architecture.work_item_execution_plan[1].start_after_work_item_ids, []);
  assert.deepEqual(architecture.work_item_execution_plan[1].close_after_work_item_ids, [first.id]);
  assert.deepEqual(architecture.runtime_activation_chains[0].commissioning_landing_unit_ids, ["commission"]);
  assert.equal(architecture.runtime_activation_chains[0].source_activation_evidence.revision, formerCommit);
  assert.equal(verification.dimensions.length, 13);
  assert.deepEqual(verification.work_item_dimension_applicability.map(row => row.dimension_ids), [["operator-check"], []]);
  assert.equal(verification.cases, undefined);
  assert.equal(technicalPlanPrepareDraft(prepared, model), prepared);
  const reduced = technicalPlanReplaceScope(prepared, [first.id], model);
  assert.equal(technicalPlanSectionValue(reduced, "architecture:work_item_execution_plan").length, 1);
  assert.equal(technicalPlanSectionValue(reduced, "conformance_plan:work_item_dimension_applicability").length, 1);
});

test("advisor cannot invent observed activation or authorization evidence", () => {
  const draft = editor();
  const patch = value => [{ field: "sectionJson", value: JSON.stringify(value) }];
  assert.throws(() => technicalPlanAdvisorEdit(draft, "architecture:runtime_activation_chains",
    patch([{ chain_id: "activation", source_owner_repo: "sample-source", source_activation_evidence: { observed_value: true } }])),
    /Read setting to verify/);
  assert.throws(() => technicalPlanAdvisorEdit(draft, "architecture:authorization_session_execution_model",
    patch({ summary: "Gate decides.", authority_refs: [{ uri: "invented", digest: "invented" }] })), /authorization lookup/);
});

test("authorization evidence entries use the document name or a readable record label", () => {
  const digest = "sha256:" + "a".repeat(64);
  assert.equal(technicalPlanEntryName({ uri: "https://github.com/example/source/blob/commit/authorization.md", digest }, 0, {}), "authorization.md");
  assert.equal(technicalPlanEntryName({ uri: "wgcf://artifacts/delivery-art/sha256/" + "a".repeat(64), digest }, 1, {}), "Authorization record 2");
});

test("technical plan advice uses the selected work and recorded relationships, with a stable basis for a starter", async () => {
  const { technicalPlanGuidanceScope } = await import("../../src/domain-workspaces/delivery/work-model/execution/technical-plan-guidance.ts");
  const selected = { ...node(3, "User story"), backend_status: "ready", planning: { targetPI: "PI-2026-11", iteration: "Iteration 2" }, depends_on_work_package_ids: [4] };
  const prerequisite = { ...node(4, "User story"), planning: { targetPI: "PI-2026-11", iteration: "Iteration 1" } };
  const unrelated = { ...node(5, "User story"), planning: { ...selected.planning } };
  const root = node(1, "Epic", [selected, prerequisite, unrelated]);
  const model = { source_truth: "OpenProject-backed OOS", projection_state: { source_revision: "current" },
    packages: [{ delivery_package_id: "delivery-1", tree_root_id: root.id }], art_tree: { roots: [root] },
    planning_external_dependencies: [{ id: 6, title: "Downstream", status: "ready", target_pi: "PI-2026-12", iteration: "Iteration 1", requires: [3] }],
  };
  const scope = technicalPlanGuidanceScope(model, "delivery-1", 3);
  assert.equal(scope.work.id, 3);
  const sourceContext = { revision: "scoped-current", tree: {
    id: 1, children: [{ id: 3, record_ref: "openproject://work_packages/3", status: "ready",
      subject: "Scoped title", description: "Canonical work instructions.", target_pi: "PI-2026-11", iteration: "Iteration 2", children: [] }],
  } };
  const scoped = technicalPlanGuidanceScope(model, "delivery-1", 3, sourceContext);
  assert.equal(scoped.work.description, "Canonical work instructions.");
  assert.equal(scoped.work.title, "Scoped title");
  assert.equal(scoped.sourceRevision, "scoped-current");
  assert.equal(scoped.basis, scope.basis);
  assert.equal(technicalPlanGuidanceScope(model, "delivery-1", 3, { ...sourceContext,
    tree: { ...sourceContext.tree, id: 7 },
  }).sourceRevision, "current");
  assert.deepEqual(scope.prerequisites.map(({ id, iteration }) => [id, iteration]), [[4, "Iteration 1"]]);
  assert.deepEqual(scope.dependentWork.map(({ id, targetPI }) => [id, targetPI]), [[6, "PI-2026-12"]]);
  unrelated.planning.iteration = "Iteration 3";
  assert.equal(technicalPlanGuidanceScope(model, "delivery-1", 3).basis, scope.basis);
  selected.planning.iteration = "Iteration 3";
  assert.notEqual(technicalPlanGuidanceScope(model, "delivery-1", 3).basis, scope.basis);
  selected.planning.iteration = "Iteration 2";
  prerequisite.planning.iteration = "Iteration 4";
  assert.notEqual(technicalPlanGuidanceScope(model, "delivery-1", 3).basis, scope.basis);
  assert.equal(technicalPlanGuidanceScope(model, "delivery-99", 3), null);
});

test("technical plan guidance accepts only read-only advice and bounded starter text", async () => {
  const { parseTechnicalPlanGuidance, parseTechnicalPlanStarter } = await import("../../src/domain-workspaces/delivery/work-model/execution/technical-plan-guidance.ts");
  const answer = message => ({ intent: "answer", message, edits: [] });
  assert.equal(parseTechnicalPlanGuidance(answer("## **Plan recommended:**\n\nUse the recorded compatibility dependency.")).recommendPlan, true);
  assert.equal(parseTechnicalPlanGuidance(answer("LIGHTWEIGHT APPROACH\n\nThis change is isolated.")).recommendPlan, false);
  assert.throws(() => parseTechnicalPlanGuidance(answer("APPROVED\n\nIt is ready.")));
  const starter = { rationale: "Change the page then verify the captured dependency.", verification: "Compatibility",
    success: "The page opens.", failure: "An incompatible revision is rejected.", rollback: ["Restore the prior page."] };
  assert.deepEqual(parseTechnicalPlanStarter(answer(JSON.stringify(starter))), starter);
  assert.throws(() => parseTechnicalPlanStarter(answer(JSON.stringify({ ...starter, approval: true }))));
  assert.throws(() => parseTechnicalPlanStarter({ ...answer(JSON.stringify(starter)), edits: [{field: "scope", value: "other"}] }));
});
