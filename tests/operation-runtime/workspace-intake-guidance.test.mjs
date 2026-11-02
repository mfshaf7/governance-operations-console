import assert from "node:assert/strict";
import test from "node:test";
import { intakeOwnerSetup, guidedIntakeDraft, derivedIntakeRole } from "../../src/workspace-registry/model/workspace-intake-guidance.ts";
import { workspaceRegistryFixture, workspaceInventoryLifecyclePreparationFixture } from "../../src/workspace-registry/fixtures/workspace-registry.fixture.ts";
import { emptyDirectIntakeDraft, directWorkspaceIntakeCandidate } from "../../src/console-integration/workspace-intake/workspace-intake-direct-candidate.ts";
const record=workspaceRegistryFixture.records.find(r=>r.kind==="repo"),preparation=workspaceInventoryLifecyclePreparationFixture(record);
const setup=intakeOwnerSetup(preparation,record.name);
const draft={...emptyDirectIntakeDraft,notes:"A source-only product",platformOwner:record.name,runtimeOwner:record.name,securityOwner:record.name,sourceOwners:record.name,endpoint:"owner-managed-source",validationPosture:"covered-by-owner-repo",graphRole:"product-readiness-aggregate"};
test("guided registration collects owner evidence and validation context without user-entered technical references",async()=>{
 const resolved=guidedIntakeDraft("product",draft,setup),candidate=await directWorkspaceIntakeCandidate({kind:"product",name:"synthetic-guided-product"},resolved,[record.name],[]);
 assert.deepEqual(candidate.requested_record.validation_behavior.catalog_refs,[]);
 assert.match(candidate.requested_record.validation_behavior.notes,/Recorded owner plan:/);
 assert.match(candidate.requested_record.validation_behavior.notes,/not proof that this new item passed/);
 assert.ok(candidate.evidence_refs.includes(setup.evidenceRef));assert.equal(draft.evidence,"");assert.equal(draft.validationNotes,"");
 assert.ok(candidate.requested_record.validation_behavior.notes.includes("\n"));
});
test("registered check bindings are collected only for the selected check approach; explicit owner overrides remain explicit",()=>{
 assert.equal(guidedIntakeDraft("product",{...draft,validationPosture:"interface-contract-backed"},setup).catalogRefs,setup.catalogRefs.join(","));
 assert.equal(guidedIntakeDraft("product",{...draft,catalogRefs:"explicit-owner-check"},setup).catalogRefs,"explicit-owner-check");
 assert.throws(()=>guidedIntakeDraft("product",{...draft,validationPosture:"interface-contract-backed"},{...setup,catalogRefs:[]}),/no registered checks/);
});
test("owner lookup rejects a different repository, retired owner and malformed plan without pretending there are no checks",()=>{
 assert.throws(()=>intakeOwnerSetup(preparation,"another-repository"),/no longer an active owner/);
 assert.throws(()=>intakeOwnerSetup({...preparation,expected_state:{...preparation.expected_state,posture:"retired"}},record.name),/no longer an active owner/);
 assert.throws(()=>intakeOwnerSetup({...preparation,current_record:{...preparation.current_record,validation_behavior:null}},record.name),/no recorded validation plan/);
});
test("role derivation follows type and approach changes and never reuses a proposed role after changing back",()=>{
 assert.equal(derivedIntakeRole("product","","covered-by-owner-repo"),"product-readiness-aggregate");
 assert.equal(derivedIntakeRole("component","shared-platform","proposed-profile-gated"),"proposed-shared-platform-component");
 assert.equal(derivedIntakeRole("component","shared-platform","covered-by-owner-repo"),"shared-platform-component");
 assert.equal(derivedIntakeRole("component","context","proposed-profile-gated"),"context-packet-provider");
 assert.equal(derivedIntakeRole("component","custom","covered-by-owner-repo"),"");
});
