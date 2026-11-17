import test from "node:test";
import assert from "node:assert/strict";
import { architectureFormContract, planFieldInitialValue, resolvePlanSchema } from "../../src/domain-workspaces/delivery/work-model/execution/architecture-form-model.ts";
import { architecturePacketDraftIssues } from "../../src/domain-workspaces/delivery/live-runtime/architecture-packet-live-contract.ts";

test("the guided form retains current architecture coverage without resurrecting superseded topology", () => {
  assert.equal(architectureFormContract.authoringVersion,6);
  assert.match(architectureFormContract.sourceSha256,/^[a-f0-9]{64}$/);
  const schema=architectureFormContract.properties.architecture;
  for(const key of ["descendant_owner_map","work_item_execution_plan","landing_units","source_landing_graph","runtime_activation_chains","required_human_gates"]){
    assert.ok(schema.required.includes(key));assert.ok(schema.properties[key]);
  }
  assert.equal(schema.properties.dependency_merge_dag,undefined);
  assert.equal(schema.properties.work_dependency_graph,undefined);
  const gates=resolvePlanSchema(schema.properties.required_human_gates);
  assert.ok(gates.items.required.includes("evidence_prerequisite_work_item_ids"));
});
test("empty guided fields cannot silently approve applicability or create a valid technical plan", () => {
  const architecture=planFieldInitialValue(architectureFormContract.properties.architecture);
  const conformance_plan=planFieldInitialValue(architectureFormContract.properties.conformance_plan);
  assert.equal(conformance_plan.required,null);
  assert.equal(conformance_plan.protocol_applicability.applies,null);
  const issues=architecturePacketDraftIssues({schema_version:1,delivery_id:"delivery-71",covered_work_item_ids:["work-item-72"],
    repo_revisions:[],architecture,conformance_plan,decision:{status:"draft",rationale:""}});
  assert.ok(issues.length>0);
  assert.ok(issues.some(issue=>/Repository revisions/.test(issue)));
  assert.ok(issues.some(issue=>/Conformance requirement/.test(issue)));
});
