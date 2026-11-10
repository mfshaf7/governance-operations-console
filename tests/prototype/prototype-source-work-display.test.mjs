import test from "node:test";
import assert from "node:assert/strict";
import {prototypeSourceEligibility,prototypeSourceOutcomeUncertain} from "../../src/domain-workspaces/prototype/presentation/shared/prototype-source-work-display.ts";
import {prototypeWorkspaceReadModel} from "../../src/domain-workspaces/prototype/read-model/prototype-workspace-read-model.ts";
const record=()=>({...structuredClone(prototypeWorkspaceReadModel.records[0]),sourceRef:"record://prototypes/example",lifecycle:"exploring",landing:{state:"landed"},dataMode:"synthetic",visibilityTier:"private-internal",sourceEvidence:{authority:"workspace-prototype-studio",posture:"create-studio-source",revision:"a".repeat(40)}});
test("source authoring eligibility explains capture, moved custody and real-data limits",()=>{
 assert.equal(prototypeSourceEligibility(record()),null);
 assert.match(prototypeSourceEligibility({...record(),sourceRef:"record://prototype-captures/example"}),/Landing/);
 assert.match(prototypeSourceEligibility({...record(),lifecycle:"graduating"}),/Delivery/);
 assert.match(prototypeSourceEligibility({...record(),sourceEvidence:{posture:"reference-dedicated-owner-source"}}),/registered repository/);
 assert.match(prototypeSourceEligibility({...record(),dataMode:"real-readonly"}),/boundary/);
});
test("cancelled generation permits new work while uncertain source effects require original-operation recovery",()=>{
 const current={realization:{state:"cancelled"},source_delivery:{}};
 assert.equal(prototypeSourceOutcomeUncertain(current),false);
 for(const state of ["generating","applying","apply-unknown"])assert.equal(prototypeSourceOutcomeUncertain({...current,realization:{state}}),true);
 assert.equal(prototypeSourceOutcomeUncertain({...current,source_delivery:{publish:{state:"unknown"}}}),true);
});
