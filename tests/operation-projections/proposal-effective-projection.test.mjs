import assert from "node:assert/strict";
import test from "node:test";

import {
  projectProposalEffectiveProjection,
  projectProposalEffectiveRecords,
  proposalEffectiveRepositoryGateResolution,
} from "../../src/domain-workspaces/proposal/local-runtime/proposal-effective-projection.ts";
import { proposalWorkspaceSummaryMetrics } from "../../src/domain-workspaces/proposal/presentation/shared/proposal-display-model.ts";
import {
  proposalRepositoryRequestRef,
  proposalRepositoryRequestRefValid,
  proposalRouteSelectionComplete,
} from "../../src/domain-workspaces/proposal/work-model/proposal-disposition-model.ts";

test("Proposal projects matching receipts into every effective record consumer", () => {
  const proposal = proposalRecord();
  const runtimeProjection = {
    capturedProposals: [],
    workflowReceipts: {
      [proposal.id]: [dispositionReceipt(proposal, "parked")],
    },
  };
  const [effective] = projectProposalEffectiveRecords({
    repositoryGateResolutions: {},
    runtimeProjection,
    sourceRecords: [proposal],
  });

  assert.equal(effective.status, "parked");
  assert.equal(
    proposalWorkspaceSummaryMetrics([effective]).find(
      (metric) => metric.label === "Parked",
    )?.value,
    "1",
  );
});

test("Proposal retains stale receipts as evidence without applying them", () => {
  const proposal = proposalRecord();
  const staleReceipt = {
    ...dispositionReceipt(proposal, "parked"),
    sourceRecordVersion: "proposal-v0",
  };
  const [effective] = projectProposalEffectiveRecords({
    repositoryGateResolutions: {},
    runtimeProjection: {
      capturedProposals: [],
      workflowReceipts: { [proposal.id]: [staleReceipt] },
    },
    sourceRecords: [proposal],
  });

  assert.equal(effective.status, "captured");
});

test("Proposal applies current-source workflow receipts in deterministic chronology", () => {
  const proposal = proposalRecord();
  const olderReceipt = dispositionReceipt(proposal, "parked");
  const newerReceipt = {
    ...dispositionReceipt(proposal, "rejected"),
    receiptId: "receipt-disposition-2",
    recordedAt: "2026-07-11T00:06:00Z",
  };
  const projection = projectProposalEffectiveProjection({
    repositoryGateResolutions: {},
    runtimeProjection: {
      capturedProposals: [],
      workflowReceipts: {
        [proposal.id]: [newerReceipt, olderReceipt],
      },
    },
    sourceRecords: [proposal],
  });

  assert.equal(projection.records[0].status, "done");
  assert.deepEqual(
    projection.workflowReceiptsByProposal[proposal.id].map(
      (receipt) => receipt.receiptId,
    ),
    [olderReceipt.receiptId, newerReceipt.receiptId],
  );
});

test("Proposal effective receipt projection excludes stale source versions", () => {
  const proposal = proposalRecord();
  const projection = projectProposalEffectiveProjection({
    repositoryGateResolutions: {},
    runtimeProjection: {
      capturedProposals: [],
      workflowReceipts: {
        [proposal.id]: [
          {
            ...dispositionReceipt(proposal, "parked"),
            sourceRecordVersion: "proposal-v0",
          },
        ],
      },
    },
    sourceRecords: [proposal],
  });

  assert.deepEqual(projection.workflowReceiptsByProposal[proposal.id], []);
});

test("Proposal rejects a repository resolution from an older source version", () => {
  const proposal = waitingOnRepositoryProposal();
  const resolution = repositoryResolution(proposal, {
    sourceVersion: "proposal-v0",
  });
  const [effective] = projectProposalEffectiveRecords({
    repositoryGateResolutions: { [proposal.id]: resolution },
    runtimeProjection: {
      capturedProposals: [],
      workflowReceipts: {},
    },
    sourceRecords: [proposal],
  });

  assert.equal(effective.status, "waiting-on-repository");
  assert.equal(effective.repoGate.state, "blocked");
  assert.equal(
    proposalEffectiveRepositoryGateResolution(effective, resolution),
    null,
  );
});

test("Proposal exposes only the repository resolution applied to its effective gate", () => {
  const proposal = waitingOnRepositoryProposal();
  const resolution = repositoryResolution(proposal);
  const [effective] = projectProposalEffectiveRecords({
    repositoryGateResolutions: { [proposal.id]: resolution },
    runtimeProjection: {
      capturedProposals: [],
      workflowReceipts: {},
    },
    sourceRecords: [proposal],
  });

  assert.equal(effective.status, "ready-to-route");
  assert.equal(effective.repoGate.state, "clear");
  assert.equal(effective.repoGate.ref, resolution.resolvedRepoRef);
  assert.equal(
    proposalEffectiveRepositoryGateResolution(effective, resolution),
    resolution,
  );
});

test("Proposal ignores admitted handoff custody from the wrong source version", () => {
  const proposal = {
    ...proposalRecord(),
    routeTarget: "Delivery",
    status: "ready-to-route",
    tone: "warn",
  };
  const [effective] = projectProposalEffectiveRecords({
    handoffPacketProjections: [
      handoffPacketProjection(proposal, {
        sourceVersion: "proposal-v0",
      }),
    ],
    repositoryGateResolutions: {},
    runtimeProjection: {
      capturedProposals: [],
      workflowReceipts: {
        [proposal.id]: [handoffReceipt(proposal)],
      },
    },
    sourceRecords: [proposal],
  });

  assert.equal(effective.status, "ready-to-route");
  assert.equal(effective.tone, "warn");
});

test("Proposal completes only from admitted custody for its current route and version", () => {
  const proposal = {
    ...proposalRecord(),
    routeTarget: "Delivery",
    status: "ready-to-route",
    tone: "warn",
  };
  const [effective] = projectProposalEffectiveRecords({
    handoffPacketProjections: [
      handoffPacketProjection(proposal, { targetDomain: "prototype" }),
      handoffPacketProjection(proposal),
    ],
    repositoryGateResolutions: {},
    runtimeProjection: {
      capturedProposals: [],
      workflowReceipts: {
        [proposal.id]: [handoffReceipt(proposal)],
      },
    },
    sourceRecords: [proposal],
  });

  assert.equal(effective.status, "done");
  assert.equal(effective.tone, "ok");
});

test("Proposal generates and validates canonical repository request identity", () => {
  const repoRef = proposalRepositoryRequestRef("PR 846 / Candidate");
  const draft = {
    proposalId: "PR-846",
    rationale: "A new owner repository is required before handoff.",
    repoMode: "new",
    repoOwner: "Repository Operation",
    repoRef,
    routeTarget: "Delivery",
  };

  assert.equal(repoRef, "repo-request://proposal/pr-846-candidate");
  assert.equal(proposalRepositoryRequestRefValid(repoRef), true);
  assert.equal(proposalRouteSelectionComplete(draft), true);
  assert.equal(
    proposalRouteSelectionComplete({ ...draft, repoRef: "free text request" }),
    false,
  );
});

function proposalRecord() {
  return {
    backendRecordId: "proposal-1",
    bodyPreview: "Proposal context",
    evidence: [],
    handoffRule: "Triage before routing.",
    id: "PR-1",
    ingress: "api",
    lastEvent: "Captured",
    lastProjectionUpdate: "2026-07-11T00:00:00Z",
    owner: "Workspace Proposals",
    projectionState: "current",
    recordVersion: "proposal-v1",
    recordedAt: "2026-07-11T00:00:00Z",
    repoGate: {
      detail: "Not evaluated",
      mode: "not-required",
      owner: null,
      ref: null,
      state: "not-required",
    },
    routeTarget: "Workspace Proposals",
    scenarioKind: "operator-capture-current",
    status: "captured",
    title: "Projection test",
    tone: "info",
  };
}

function waitingOnRepositoryProposal() {
  const proposal = proposalRecord();

  return {
    ...proposal,
    repoGate: {
      detail: "Repository custody is required.",
      mode: "new",
      owner: "Repository Operation",
      ref: "repo-request://proposal/pr-1",
      state: "blocked",
    },
    routeTarget: "Delivery",
    status: "waiting-on-repository",
    tone: "warn",
  };
}

function repositoryResolution(proposal, overrides = {}) {
  return {
    notes: "Repository request resolved.",
    proposalId: proposal.id,
    recordedAt: "2026-07-11T00:10:00Z",
    receiptId: "repo-resolution-1",
    repoRequestRef: proposal.repoGate.ref,
    resolvedOwner: "Workspace Delivery",
    resolvedRepoRef: "repo://workspace-delivery",
    result: "resolved",
    sourceVersion: proposal.recordVersion,
    ...overrides,
  };
}

function handoffPacketProjection(proposal, overrides = {}) {
  const packetId = `proposal-delivery-${proposal.id}`;

  return {
    custody: {
      custodyOwner: "delivery-intake",
      packetId,
      receiptRef: "prototype-local://delivery-ingress/receipt-1",
      recordedAt: "2026-07-11T00:15:00Z",
      state: "admitted",
    },
    packet: {
      createdAt: "2026-07-11T00:14:00Z",
      packetId,
      sourceRecordId: proposal.backendRecordId,
      sourceVersion: proposal.recordVersion,
      targetDomain: "delivery",
      ...overrides,
    },
  };
}

function dispositionReceipt(proposal, outcome) {
  return {
    commandName: "proposal.disposition.apply",
    kind: "workflow",
    payload: {
      decision: {
        advisorDraft: "",
        advisorPrompt: "",
        notes: "Decision recorded.",
        outcome,
      },
      route: null,
      step: "disposition",
    },
    proposalId: proposal.id,
    receiptId: "receipt-disposition-1",
    recordedAt: "2026-07-11T00:05:00Z",
    resultState: "recorded",
    schemaVersion: 1,
    sourceBackendRecordId: proposal.backendRecordId,
    sourceProjectionState: proposal.projectionState,
    sourceRecordVersion: proposal.recordVersion,
    step: "disposition",
    summary: "Disposition recorded.",
  };
}

function handoffReceipt(proposal) {
  return {
    commandName: "proposal.handoff.apply",
    kind: "workflow",
    payload: {
      notes: "Handoff reviewed.",
      result: "ready",
      step: "handoff",
    },
    proposalId: proposal.id,
    receiptId: "receipt-handoff-1",
    recordedAt: "2026-07-11T00:12:00Z",
    resultState: "recorded",
    schemaVersion: 1,
    sourceBackendRecordId: proposal.backendRecordId,
    sourceProjectionState: proposal.projectionState,
    sourceRecordVersion: proposal.recordVersion,
    step: "handoff",
    summary: "Handoff recorded.",
  };
}
