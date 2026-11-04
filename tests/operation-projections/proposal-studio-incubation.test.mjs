import assert from "node:assert/strict";
import test from "node:test";
import { proposalStudioSelection, proposalUsesPrototypeStudio, proposalRouteSelectionComplete,
  proposalRouteSelectionSourceCustody, proposalCanReviewSourceHome } from "../../src/domain-workspaces/proposal/work-model/proposal-disposition-model.ts";
import { proposalHandoffRepositoryGateLocked } from "../../src/domain-workspaces/proposal/work-model/proposal-handoff-model.ts";
import { proposalDispositionApplyPayload } from "../../src/domain-workspaces/proposal/work-model/proposal-workflow-command-model.ts";
import { projectProposalLiveRecords, projectProposalCanonicalDrafts } from "../../src/domain-workspaces/proposal/live-runtime/proposal-live-projection.ts";
import { proposalCompletionRecord } from "../support/proposal-completion-fixture.mjs";
import { recordProposalPrototypeEntryPacketFromHandoff } from "../../src/domain-workspaces/operation-integrations/proposal-prototype-entry-projection.ts";
import { prototypeRecordFromEntryPacket } from "../../src/domain-workspaces/prototype/work-model/entry/prototype-entry-packet-record.ts";

const selection = () => ({ proposalId:"idea-851", routeTarget:"Prototype", rationale:"Experiment before committing to a product repository.",
  ...proposalStudioSelection([{label:"workspace-prototype-studio",value:"repo://workspace-prototype-studio"}]) });

test("Studio incubation uses the existing repository and unchanged resolved custody, without a creation request", () => {
  const draft=selection();
  assert.equal(proposalUsesPrototypeStudio(draft),true);
  assert.equal(proposalRouteSelectionComplete(draft),true);
  assert.equal(proposalHandoffRepositoryGateLocked(draft),false);
  const custody=proposalRouteSelectionSourceCustody(draft);
  assert.equal(custody.classification,"existing-repo");
  assert.equal(custody.repository_gate_state,"resolved");
  assert.equal(custody.repo_ref,"repo://workspace-prototype-studio");
  const payload=proposalDispositionApplyPayload({decisionDraft:{proposalId:draft.proposalId,outcome:"accepted",notes:"Explore in the shared Studio."},routeSelectionDraft:draft});
  assert.equal(payload.route.repoMode,"existing");
  assert.equal(payload.route.repoRef,custody.repo_ref);
  assert.equal(JSON.stringify(payload).includes("repo-request://"),false);
});

test("Absent or unrelated Studio entries cannot fabricate an owner or a complete source decision", () => {
  for(const options of [[],[{label:"Unrelated",value:"repo://other"}]]) {
    const draft={...selection(),...proposalStudioSelection(options)};
    assert.equal(draft.repoOwner,"");
    assert.equal(proposalRouteSelectionComplete(draft),false);
    assert.equal(proposalHandoffRepositoryGateLocked(draft),true);
  }
});

test("No repository remains valid for Delivery but cannot authorize a Prototype handoff; alternatives keep their original gates", () => {
  const noRepo={...selection(),repoMode:"not-required",repoOwner:"",repoRef:""};
  assert.equal(proposalRouteSelectionComplete(noRepo),false);
  assert.equal(proposalHandoffRepositoryGateLocked(noRepo),true);
  assert.equal(proposalRouteSelectionComplete({...noRepo,routeTarget:"Delivery"}),true);
  assert.equal(proposalHandoffRepositoryGateLocked({...noRepo,routeTarget:"Delivery"}),false);
  assert.equal(proposalUsesPrototypeStudio({...selection(),repoRef:"repo://other"}),false);
  assert.equal(proposalHandoffRepositoryGateLocked({...selection(),repoMode:"new",repoRef:"repo-request://proposal/idea-851"}),true);
});

test("Studio choice carries into the Prototype entry and Landing's Studio folder without inventing landed or preview success", () => {
  const draft=selection();
  const [proposal]=projectProposalLiveRecords([proposalCompletionRecord({status:"triaged",title:"Studio incubation example"})]);
  const entry=recordProposalPrototypeEntryPacketFromHandoff({proposal,routeSelectionDraft:draft,repositoryGateResolution:null,
    handoffDraft:{proposalId:proposal.id,result:"ready",notes:"Explore the idea in Studio."},
    producerReceipt:{receiptId:"proposal-studio-incubation-test",recordedAt:"2026-11-04T08:00:00Z"}});
  assert.ok(entry);
  assert.equal(entry.packet.payload.sourceCustody.repo_ref,draft.repoRef);
  assert.equal(entry.packet.payload.sourceCustody.repository_gate_state,"resolved");
  const record=prototypeRecordFromEntryPacket(entry,0);
  assert.equal(record.landing.sourceHome,"new-prototype-folder");
  assert.equal(record.landing.state,"captured");
  assert.equal(record.landing.lastLandingReceiptRef,null);
  assert.equal(record.preview.proofState,"not-started");
});

test("Only the current active accepted Prototype no-source decision can be explicitly reviewed; owner history stays recorded", () => {
  const record=proposalCompletionRecord({status:"accepted",route:{target:"prototype",rationale:"Original decision",source_custody:{classification:"non-source-work",repository_mode:"not-required",repository_gate_state:"not-required",owner:"prototype",source_ref:null,rationale:"Original source handling"}}});
  const [proposal]=projectProposalLiveRecords([record]);
  const draft=projectProposalCanonicalDrafts([record]).routeSelectionDrafts[proposal.id];
  assert.ok(draft.appliedAt);
  assert.equal(draft.repoRef,"");
  assert.equal(proposalCanReviewSourceHome(proposal,draft),true);
  for(const changed of [{status:"done"},{status:"retired"},{sourceStatus:"implemented"},{projectionState:"stale"},{routeTarget:"Delivery"}])
    assert.equal(proposalCanReviewSourceHome({...proposal,...changed},draft),false);
  assert.equal(proposalCanReviewSourceHome(proposal,{...draft,sourceRecordVersion:"version-999"}),false);
  assert.equal(proposalCanReviewSourceHome(proposal,{...draft,...proposalStudioSelection([{label:"workspace-prototype-studio",value:"repo://workspace-prototype-studio"}])}),false);
  assert.ok(draft.appliedAt,"Inspecting eligibility must not reopen or rewrite the canonical decision");
});
