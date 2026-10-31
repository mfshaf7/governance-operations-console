import assert from "node:assert/strict";
import test from "node:test";
import { proposalCompletionRecord, proposalCompletionRoute } from "../support/proposal-completion-fixture.mjs";
import { proposalWorkspaceSummaryMetrics } from "../../src/domain-workspaces/proposal/presentation/shared/proposal-display-model.ts";
import { projectProposalCanonicalDrafts, projectProposalLiveRecords } from "../../src/domain-workspaces/proposal/live-runtime/proposal-live-projection.ts";
import { proposalWorkflowSessionState } from "../../src/domain-workspaces/proposal/presentation/workflows/session/proposal-workflow-session-state.ts";

function stateFor(record, step = "hub", extra = {}) {
  const [proposal] = projectProposalLiveRecords([record]);
  const drafts = projectProposalCanonicalDrafts([record]);
  const id = proposal.id;
  return proposalWorkflowSessionState({ activeWorkflowStep: step, proposal,
    triageDraft: drafts.triageDrafts[id] ?? null, decisionDraft: drafts.decisionDrafts[id] ?? null,
    routeSelectionDraft: drafts.routeSelectionDrafts[id] ?? null, handoffDraft: drafts.handoffDrafts[id] ?? null,
    repositoryGateResolution: drafts.repositoryGateResolutions[id] ?? null, ...extra });
}

test("implemented proposals with missing historical routes stay complete in every workflow step", () => {
  const record = proposalCompletionRecord();
  for (const step of ["hub", "triage", "disposition", "handoff", "history"]) {
    const state = stateFor(record, step);
    assert.equal(state.hubProjection.status.pillLabel, "Done");
    assert.equal(state.hubProjection.currentMove.target, "history");
    assert.equal(state.dispositionReadOnly, true);
    assert.equal(state.triageReadOnly, true);
    assert.equal(state.handoffReadOnly, true);
    assert.equal(state.triageCanApply || state.dispositionCanApply || state.handoffCanApply, false);
    assert.ok(state.progressSteps.every(s => s.stateLabel === "Archive"));
    assert.equal(state.progressSteps.find(s => s.id === "handoff").detail, "Not recorded");
    assert.equal(state.progressSteps.find(s => s.id === "handoff").available, false);
    assert.equal(state.progressSteps.find(s => s.id === "disposition").available, true);
    if (["triage", "disposition", "handoff"].includes(step)) assert.equal(state.footerMove.action, "view-history");
  }
  assert.equal(record.projection.route, null);
  assert.equal(record.history.events.length, 0);
});

test("recorded handoffs and rejected proposals remain inspectable without becoming active again", () => {
  for (const target of ["delivery", "prototype"]) {
    const record = proposalCompletionRecord({status: "accepted", route: proposalCompletionRoute(target),
      handoff: {state: "applied", packet_ref: "proposal-handoff:example", target_receipt_ref: "receipt:example", target_record_ref: "record:example"}});
    const state = stateFor(record);
    assert.equal(state.hubProjection.status.pillLabel, "Done");
    assert.equal(state.hubProjection.currentMove.target, "history");
    assert.equal(state.progressSteps.find(s => s.id === "handoff").available, true);
  }
  const state = stateFor(proposalCompletionRecord({status: "rejected"}));
  assert.equal(state.hubProjection.currentMove.target, "history");
  assert.equal(state.dispositionReadOnly, true);
  assert.equal(state.handoffCanApply, false);
  const routeOnly = stateFor(proposalCompletionRecord({route: proposalCompletionRoute(), decision_notes: null}));
  assert.equal(routeOnly.progressSteps.find(s => s.id === "disposition").available, true);
  assert.equal(routeOnly.dispositionReadOnly, true);
});

test("completion supersedes unfinished drafts while unavailable sources still fail closed", () => {
  const state = stateFor(proposalCompletionRecord(), "disposition", {decisionDraft: {
    proposalId: "idea-851", outcome: "accepted", notes: "Old unsent decision", savedAt: "2026-06-19T00:00:00Z",
    sourceRecordVersion: "version-1", sourceBackendRecordId: "openproject://work_packages/851", sourceProjectionState: "current",
  }});
  assert.equal(state.sourceReviewRequired, false);
  assert.equal(state.hasPendingDispositionDraft, false);
  assert.equal(state.hubProjection.currentMove.target, "history");
  for (const projection_state of ["stale", "offline", "error"]) {
    const stale = stateFor(proposalCompletionRecord({projection_state}));
    assert.equal(stale.sourceReviewRequired, true);
    assert.equal(stale.hubProjection.status.title, "Source Review Required");
    assert.equal(stale.dispositionCanApply || stale.handoffCanApply || stale.triageCanApply, false);
  }
});

test("active accepted and parked proposals retain their route and revisit paths", () => {
  const missing = stateFor(proposalCompletionRecord({status: "accepted"}));
  assert.equal(missing.hubProjection.status.pillLabel, "Route Needed");
  assert.equal(missing.hubProjection.currentMove.target, "disposition");
  assert.equal(missing.dispositionReadOnly, false);
  const routed = stateFor(proposalCompletionRecord({status: "accepted", route: proposalCompletionRoute()}));
  assert.equal(routed.hubProjection.currentMove.target, "handoff");
  const parked = stateFor(proposalCompletionRecord({status: "parked", decision_notes: null}));
  assert.equal(parked.hubProjection.currentMove.target, "disposition");
  assert.equal(parked.dispositionReadOnly, false);
});

test("existing Delivery links close routing while retaining done, retired and unavailable owner outcomes", () => {
  const records = ["done", "retired", "in-progress", null].map(status => ({
    ...proposalCompletionRecord({status:"accepted",delivery_ref:"openproject://work_packages/901"}),
    deliveryLink:{recordRef:"openproject://work_packages/901",status,sourceState:status?"current":"unavailable",observedAt:"2026-06-21T08:00:00Z"},
  }));
  for(const record of records){
    const state=stateFor(record,"disposition");
    assert.equal(state.hubProjection.currentMove.target,"history");
    assert.equal(state.dispositionCanApply||state.handoffCanApply,false);
    assert.equal(record.projection.status,"accepted");
    assert.equal(record.projection.route,null);
    assert.equal(record.history.events.length,0);
  }
  const done=stateFor(records[0]);
  assert.equal(done.hubProjection.status.title,"Delivery Complete");
  assert.match(done.hubProjection.status.description,/source closeout is pending/);
  const retired=stateFor(records[1]);
  assert.equal(retired.hubProjection.status.title,"Delivery Retired");
  assert.match(retired.hubProjection.status.description,/not implementation evidence/);
  assert.equal(stateFor(records[3]).hubProjection.status.title,"Delivery Outcome Unavailable");
  const metrics=proposalWorkspaceSummaryMetrics(projectProposalLiveRecords(records));
  assert.equal(metrics.find(m=>m.id==="review").value,"0");
  assert.equal(metrics.some(m=>m.id==="retired"),false);
  const retainedRoute=projectProposalLiveRecords([{...records[0],projection:{...records[0].projection,route:proposalCompletionRoute("prototype")}}])[0];
  assert.equal(retainedRoute.routeTarget,"Prototype");
  assert.equal(retainedRoute.deliveryLink.recordRef,"openproject://work_packages/901");
});
