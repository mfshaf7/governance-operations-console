import { documentContentBlocks as refinementDescriptionBlocks } from "../../src/teras/teras-document-content.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { refinementSessionContentKey } from "../../src/domain-workspaces/delivery/local-runtime/persistence/refinement-session-persistence.ts";
import { refinementItemSummary, refinementVisibleTreeIds, refinementValueError, refinementFieldReviewLabel } from "../../src/domain-workspaces/delivery/presentation/workflows/refinement/view-model/refinement-workbench-model.ts";
import { refinementMetadataTargets, refinementMetadataWorkbenchSummary, refinementSharedMetadataTargetGroups } from "../../src/domain-workspaces/delivery/presentation/workflows/refinement/view-model/refinement-metadata-model.ts";
import { refinementPacketFromProjection } from "../../src/domain-workspaces/delivery/live-runtime/refinement-live-contract.ts";
import { refinementIsBlocked } from "../../src/domain-workspaces/delivery/presentation/workflows/refinement/view-model/refinement-hub-model.ts";
import { refinementFeedbackProjection, refinementFeedbackRun } from "../support/refinement-feedback-fixture.mjs";

test("an earlier receipt and an unrelated child blocker do not lock a new Refinement gate", () => {
  const receipt = refinementFeedbackRun("completed");
  const projection = refinementFeedbackProjection(receipt);
  assert.equal(refinementPacketFromProjection(projection).receipt.receipt_id, receipt.receipt.receipt_id);
  projection.packet.status = "drafting";
  projection.packet.readiness_gates.push({ label: "Metadata Review", status: "open" });
  const packet = refinementPacketFromProjection(projection);
  assert.equal(packet.receipt, null);
  assert.equal(projection.history[0], receipt);
  const scopedPackage = { backend_status: "new", package_posture: "Blocked", execution_navigation: { blocked_work_item_ids: [761] } };
  assert.equal(refinementIsBlocked({ deliveryPackage: scopedPackage, packet }), false);
  assert.equal(refinementIsBlocked({ deliveryPackage: { ...scopedPackage, backend_status: "blocked" }, packet }), true);
});

test("idle persistence ignores only the timestamp, retaining changes to values, selection, review and receipts", () => {
  const saved = { lastSavedAt: "2026-11-01T00:00:00Z", metadata: { draftValues: { a: "one" }, fieldResolutions: {}, selectedFieldKey: "a" }, apply: { receipt: null } };
  assert.equal(refinementSessionContentKey(saved), refinementSessionContentKey({ ...saved, lastSavedAt: "2026-11-02T00:00:00Z" }));
  for (const patch of [{ metadata: { ...saved.metadata, draftValues: { a: "two" } } }, { metadata: { ...saved.metadata, fieldResolutions: { a: "repaired" } } }, { metadata: { ...saved.metadata, selectedFieldKey: "b" } }, { apply: { receipt: { receipt_id: "receipt:synthetic" } } }])
    assert.notEqual(refinementSessionContentKey(saved), refinementSessionContentKey({ ...saved, ...patch }));
});

test("full descriptions retain headings, paragraphs, lists and literal code while tree summaries stay bounded", () => {
  const original = "## Outcome\nA readable **outcome**.\n\n- First\n- Second\n\n## Evidence\n1. Check result\n2. Keep receipt\n\n```html\n<script>literal source only</script>\n```";
  const blocks = refinementDescriptionBlocks(original);
  assert.deepEqual(blocks.map(b => b.kind), ["heading", "paragraph", "list", "heading", "ordered", "code"]);
  assert.equal(blocks.at(-1).lines[0], "<script>literal source only</script>");
  assert.equal(refinementItemSummary(original).includes("##"), false);
  assert.ok(refinementItemSummary("## Goal\n\n" + "Meaningful outcome. ".repeat(100)).length <= 160);
});

test("tree filtering keeps matching descendants and their ancestry without unrelated branches", () => {
  const tree = { id: "1", kind: "Epic", title: "Root", description: "", children: [{ id: "2", kind: "Feature", title: "Group", description: "", children: [{ id: "3", kind: "User story", title: "Needle", description: "", children: [] }] }, { id: "4", kind: "Risk", title: "Other", description: "", children: [] }] };
  assert.deepEqual(new Set(refinementVisibleTreeIds(tree, [], {}, "Needle", false)), new Set(["1", "2", "3"]));
  assert.deepEqual(refinementVisibleTreeIds(tree, [], {}, "not found", false), []);
});

test("an edited current field is not ready until its valid draft is explicitly reviewed", () => {
  const packet = refinementPacketFromProjection(refinementFeedbackProjection());
  const target = refinementMetadataTargets(packet)[0];
  const draftValues = { [target.key]: "PI-2026-03" };
  assert.equal(refinementMetadataWorkbenchSummary({ packet, draftValues, resolutions: {} }).ready, true);
  target.field.allowed_values.push("PI-2026-04");
  draftValues[target.key] = "PI-2026-04";
  assert.equal(refinementMetadataWorkbenchSummary({ packet, draftValues, resolutions: {} }).ready, false);
  assert.equal(refinementMetadataWorkbenchSummary({ packet, draftValues, resolutions: { [target.key]: "repaired" } }).ready, true);
  draftValues[target.key] = "not an offered choice";
  assert.equal(refinementMetadataWorkbenchSummary({ packet, draftValues, resolutions: { [target.key]: "repaired" } }).ready, false);
});

test("optional blanks and constrained values expose truthful review state", () => {
  const packet = refinementPacketFromProjection(refinementFeedbackProjection()), target = refinementMetadataTargets(packet)[0];
  assert.equal(refinementFieldReviewLabel({ ...target, field: { ...target.field, required: false }, sourceValue: "" }, {}), "Optional · not set");
  assert.match(refinementValueError({ ...target.field, field_kind: "number" }, "-2"), /zero or more/);
  assert.match(refinementValueError({ ...target.field, field_kind: "number" }, "abc"), /zero or more/);
  assert.match(refinementValueError({ ...target.field, field_kind: "long_text", value_limit: 2 }, "abc"), /2 characters/);
});

test("shared editing intersects choices and lengths and excludes incompatible field types", () => {
  const packet = refinementPacketFromProjection(refinementFeedbackProjection()), target = refinementMetadataTargets(packet)[0];
  const a = { ...target, node: { ...target.node, id: "a" }, field: { ...target.field, value_limit: 40, allowed_values: ["A", "B"] } };
  const b = { ...target, node: { ...target.node, id: "b" }, field: { ...target.field, required: false, value_limit: 20, allowed_values: ["B", "C"] } };
  const groups = refinementSharedMetadataTargetGroups([a, b], ["a", "b"]);
  assert.deepEqual(groups[0].field.allowed_values, ["B"]);
  assert.equal(groups[0].field.value_limit, 20);
  assert.equal(groups[0].field.required, true);
  assert.equal(refinementSharedMetadataTargetGroups([a, { ...b, field: { ...b.field, field_kind: "number" } }], ["a", "b"]).length, 0);
});

test("AI edits remain unreviewed and typed dates/references reject malformed input", () => {
 const packet=refinementPacketFromProjection(refinementFeedbackProjection()), target=refinementMetadataTargets(packet)[0];
 target.field.allowed_values.push('PI-2026-04');
 const draftValues={[target.key]:'PI-2026-04'};
 assert.equal(refinementMetadataWorkbenchSummary({packet,draftValues,resolutions:{[target.key]:'ai_drafted'}}).ready,false);
 assert.match(refinementFieldReviewLabel(target,{[target.key]:'ai_drafted'},draftValues),/review needed/);
 for(const key of ['risk_review_date','architecture_anchor_ref']) assert.ok(refinementValueError({...target.field,field_kind:'short_text',route_binding:{...target.field.route_binding,payload_key:key}},'nonsense'));
});

// Owner rules travel in the packet; the form never invents a PI catalogue or
// treats the selected parent's PI as automatic child commitment.
test("planning controls retain source counterparts and filter choices by supplied rules", async () => {
 const {refinementPlanningValueError,refinementPlanningField}=await import('../../src/domain-workspaces/delivery/presentation/workflows/refinement/view-model/refinement-workbench-model.ts');
 const packet=refinementPacketFromProjection(refinementFeedbackProjection()),base=refinementMetadataTargets(packet)[0];
 const node={...base.node,id:'child',kind:'Feature',planning:{status:'new',target_pi:'PI-test',iteration:'PI-test / Iteration 1',owner_repo:'repo'}};
 const pi={...base,key:'pi',node,field:{...base.field,backend_field:'target_pi'},sourceValue:'PI-test'};
 const iteration={...base,key:'iteration',node,field:{...base.field,backend_field:'iteration',field_kind:'select',allowed_values:['PI-test / Iteration 1','PI-next / Iteration 1','Program-wide / Review','Backlog']},sourceValue:'PI-test / Iteration 1'};
 const rules={backlog_iteration_label:'Backlog',iteration_prefix_templates:['<target_pi> / ','Program-wide / ']},targets=[pi,iteration];
 assert.equal(refinementPlanningValueError(pi,targets,{},rules),null);
 assert.match(refinementPlanningValueError(pi,targets,{pi:'PI-next'},rules),/belong/);
 assert.equal(refinementPlanningValueError(pi,targets,{pi:'PI-next',iteration:'PI-next / Iteration 1'},rules),null);
 assert.deepEqual(refinementPlanningField(iteration,targets,{},rules).allowed_values,['PI-test / Iteration 1','Program-wide / Review']);
 // The saved read-only PI is still available when that control isn't mutable.
 assert.deepEqual(refinementPlanningField(iteration,[iteration],{},rules).allowed_values,['PI-test / Iteration 1','Program-wide / Review']);
});


test("individual and selected-set fields use their own native choices rather than the entire group intersection", () => {
 const projection=refinementFeedbackProjection(), field=projection.packet.draft_groups[0].fields[0];
 const child={...projection.packet.target_tree,id:"761",kind:"Feature",children:[]};
 projection.packet.target_tree.children=[child];
 field.route_binding.target="work_item";field.target_node_ids=["760","761"];
 field.allowed_values=[];field.target_allowed_values={760:["A","Shared"],761:["B","Shared"]};
 const targets=refinementMetadataTargets(refinementPacketFromProjection(projection));
 assert.deepEqual(targets[0].field.allowed_values,["A","Shared"]);
 assert.equal(refinementValueError(targets[0].field,"A"),null);
 assert.deepEqual(refinementSharedMetadataTargetGroups(targets,["760","761"])[0].field.allowed_values,["Shared"]);
});

test("integer review cannot silently accept fractions or numeric prefixes; decimal controls retain valid fractions", () => {
 const field=refinementMetadataTargets(refinementPacketFromProjection(refinementFeedbackProjection()))[0].field;
 const integer={...field,backend_field:"planned_business_value",field_kind:"number",numeric_type:"integer"};
 for(const value of ["1.5","0x10","1e3","9007199254740993"])assert.match(refinementValueError(integer,value),/whole number/);
 assert.equal(refinementValueError(integer,"12"),null);
 assert.equal(refinementValueError({...integer,backend_field:"effort",numeric_type:"decimal"},"1.5"),null);
});
