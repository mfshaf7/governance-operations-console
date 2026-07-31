import assert from "node:assert/strict";
import test from "node:test";

import { getDeliveryEffectivePackagePosture } from "../../src/domain-workspaces/delivery/domain/delivery-package-posture.ts";
import { deliveryWorkspaceComponentStatuses } from "../../src/domain-workspaces/delivery/presentation/workspace/workspace-status-model.ts";
import { productPortfolioReadModel } from "../../src/domain-workspaces/portfolio/read-model/product-portfolio-read-model.ts";
import { productPortfolioWorkspaceStatuses } from "../../src/domain-workspaces/portfolio/presentation/workspace/product-portfolio-workspace-view-model.ts";
import { proposalWorkspaceStatus } from "../../src/domain-workspaces/proposal/read-model/fixtures/proposal-workspace-status.fixture.ts";
import { projectProposalEffectiveRecords } from "../../src/domain-workspaces/proposal/local-runtime/proposal-effective-projection.ts";
import { proposalWorkspaceSummaryMetrics } from "../../src/domain-workspaces/proposal/presentation/shared/proposal-display-model.ts";
import {
  prototypeSummaryMetrics,
  prototypeWorkspaceStatus,
} from "../../src/domain-workspaces/prototype/presentation/surface/prototype-control-view-model.ts";
import { repositoryWorkspaceStatus } from "../../src/domain-workspaces/repository/read-model/fixtures/repository-workspace-status.fixture.ts";
import { repositorySummaryFromRecords } from "../../src/domain-workspaces/repository/presentation/shared/repository-control-projection.ts";

test("proposal summary keeps blocked handoff and parked decisions out of Done", () => {
  const proposals = [
    proposal("PR-1", "waiting-on-repository"),
    proposal("PR-2", "parked"),
    proposal("PR-3", "captured"),
    { ...proposal("PR-4", "ready-to-route"), routeTarget: "Delivery" },
  ];
  const effectiveProposals = projectProposalEffectiveRecords({
    handoffPacketProjections: [
      {
        custody: {
          custodyOwner: "delivery-intake",
          packetId: "proposal-delivery-pr-4",
          receiptRef: "prototype-local://delivery-ingress/receipts/pr-4",
          recordedAt: "2026-07-11T00:00:00.000Z",
          state: "admitted",
        },
        packet: {
          createdAt: "2026-07-10T23:59:00.000Z",
          packetId: "proposal-delivery-pr-4",
          sourceRecordId: "proposal://PR-4",
          sourceVersion: "v1",
          targetDomain: "delivery",
        },
      },
    ],
    repositoryGateResolutions: {},
    runtimeProjection: {
      capturedProposals: [],
      workflowReceipts: {
      "PR-1": [proposalHandoffReceipt("PR-1", "blocked")],
      "PR-2": [proposalDispositionReceipt("PR-2", "parked")],
      "PR-3": [proposalDispositionReceipt("PR-3", "rejected")],
      "PR-4": [proposalHandoffReceipt("PR-4", "ready")],
      },
    },
    sourceRecords: proposals,
  });
  const summary = proposalWorkspaceSummaryMetrics(effectiveProposals);

  assert.deepEqual(metricValues(summary), {
    Done: "2",
    Parked: "1",
    Review: "0",
    Total: "4",
    Waiting: "1",
  });
});

test("repository summary partitions every admission state including admitted", () => {
  const summary = repositorySummaryFromRecords([
    { admissionState: "ready" },
    { admissionState: "admitted" },
    { admissionState: "blocked" },
    { admissionState: "retired" },
  ]);

  assert.deepEqual(metricValues(summary), {
    Admitted: "1",
    Blocked: "1",
    Ready: "1",
    Retired: "1",
    Total: "4",
  });
});

test("prototype summary keeps lifecycle metrics separate from record posture", () => {
  const summary = prototypeSummaryMetrics({
    baselineApproved: 1,
    blocked: 2,
    candidate: 3,
    exploring: 4,
    movementReady: 1,
    retired: 1,
    total: 8,
  });

  assert.deepEqual(metricValues(summary), {
    Baseline: 1,
    Candidate: 3,
    Exploring: 4,
    Retired: 1,
    Total: 8,
  });
});

test("Product Portfolio keeps catalog lifecycle separate from publication state", () => {
  assert.deepEqual(productPortfolioReadModel.summary, {
    listed: 10,
    managed: 13,
    retired: 2,
    unlisted: 1,
  });
  assert.deepEqual(productPortfolioReadModel.publicationSummary, {
    published: 9,
    captured: 1,
    needsReview: 2,
    rejected: 1,
  });
});

test("delivery ignores a local workflow posture from the wrong phase", () => {
  const sourceRecord = {
    package_posture: "Ready",
    workflow_phase: "work_design",
  };
  const mismatched = {
    ...sourceRecord,
    local_workflow_projection: {
      status_label: "Done",
      workflow_phase: "refinement",
    },
  };
  const matching = {
    ...sourceRecord,
    local_workflow_projection: {
      status_label: "Done",
      workflow_phase: "work_design",
    },
  };

  assert.equal(getDeliveryEffectivePackagePosture(mismatched), "Ready");
  assert.equal(getDeliveryEffectivePackagePosture(matching), "Done");
});

test("completed operation status models identify fixture-backed authority as local", () => {
  const prototypeStatus = prototypeWorkspaceStatus({
    records: [],
    source: {
      lastRead: "fixture",
      mutationGateway: "prototype-local",
      project: "Prototype Studio",
      recordSystem: "registry-shaped fixtures",
      registry: "prototypes.yaml contract shape",
    },
  }, {
    baselineApproved: 0,
    blocked: 0,
    candidate: 0,
    exploring: 0,
    movementReady: 0,
    retired: 0,
    total: 0,
  });
  const deliveryStatuses = deliveryWorkspaceComponentStatuses({
    generated_at: "2026-07-10T00:00:00.000Z",
    projection_state: {
      checked_at: "2026-07-10T00:00:00.000Z",
      detail: "Current fixture projection.",
      source_revision: "fixture-v1",
      status: "fresh",
    },
    source_truth: "mock",
  });

  assert.equal(proposalWorkspaceStatus.items[0].state, "local");
  assert.equal(repositoryWorkspaceStatus.items[0].state, "local");
  assert.equal(
    productPortfolioWorkspaceStatuses(productPortfolioReadModel)[0].state,
    "local",
  );
  assert.equal(
    prototypeStatus.items.find((item) => item.id === "source-projection")?.state,
    "local",
  );
  assert.equal(deliveryStatuses[0].state, "local");
  assert.equal(deliveryStatuses[0].facts[1].value, "not connected");
});

function metricValues(metrics) {
  return Object.fromEntries(metrics.map((metric) => [metric.label, metric.value]));
}

function proposal(id, status) {
  return {
    backendRecordId: `proposal://${id}`,
    id,
    recordVersion: "v1",
    repoGate: {
      detail: "Test gate",
      mode: status === "waiting-on-repository" ? "new" : "not-required",
      owner: null,
      ref: status === "waiting-on-repository" ? `repo-${id}` : null,
      state: status === "waiting-on-repository" ? "blocked" : "not-required",
    },
    routeTarget: "Workspace Proposals",
    status,
    tone: "warn",
  };
}

function proposalDispositionReceipt(proposalId, outcome) {
  return {
    commandName: "proposal.disposition.apply",
    kind: "workflow",
    payload: {
      decision: {
        advisorDraft: "",
        advisorPrompt: "",
        notes: "Recorded decision.",
        outcome,
      },
      route: null,
      step: "disposition",
    },
    proposalId,
    receiptId: `${proposalId}-disposition`,
    recordedAt: "2026-07-10T00:00:00.000Z",
    resultState: "recorded",
    schemaVersion: 1,
    sourceBackendRecordId: `proposal://${proposalId}`,
    sourceProjectionState: "current",
    sourceRecordVersion: "v1",
    step: "disposition",
    summary: "Disposition recorded.",
  };
}

function proposalHandoffReceipt(proposalId, result) {
  return {
    commandName: "proposal.handoff.apply",
    kind: "workflow",
    payload: {
      notes: "Recorded handoff.",
      result,
      step: "handoff",
    },
    proposalId,
    receiptId: `${proposalId}-handoff`,
    recordedAt: "2026-07-10T00:00:00.000Z",
    resultState: "recorded",
    schemaVersion: 1,
    sourceBackendRecordId: `proposal://${proposalId}`,
    sourceProjectionState: "current",
    sourceRecordVersion: "v1",
    step: "handoff",
    summary: "Handoff recorded.",
  };
}
