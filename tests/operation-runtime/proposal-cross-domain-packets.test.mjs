import assert from "node:assert/strict";
import test from "node:test";

import {
  getProposalPrototypeEntryPacketProjections,
  recordProposalPrototypeEntryPacketFromHandoff,
} from "../../src/domain-workspaces/operation-integrations/proposal-prototype-entry-projection.ts";
import { getPrototypeEntryPacketProjections } from "../../src/domain-workspaces/prototype/local-runtime/prototype-entry-runtime.ts";
import {
  getProposalRepositoryGateResolutions,
  getProposalRepositoryRequestPacketProjections,
  recordProposalRepositoryGateResolution,
  recordProposalRepositoryRequestPacketFromDisposition,
} from "../../src/domain-workspaces/operation-integrations/proposal-repository-request-projection.ts";
import {
  getProposalRepositoryRequestRecords,
  reconcileRepositoryIngress,
} from "../../src/domain-workspaces/repository/local-runtime/ingress/repository-ingress-runtime.ts";
import {
  getProposalDeliveryEntryPacketProjections,
  recordProposalDeliveryEntryPacketFromHandoff,
} from "../../src/domain-workspaces/operation-integrations/proposal-delivery-entry-projection.ts";
import { submitProposalWorkflowIntegrationCommand } from "../../src/domain-workspaces/operation-integrations/proposal-workflow-integration-runtime.ts";
import {
  getDeliveryIngressProjectionSnapshot,
  reconcileDeliveryIngress,
} from "../../src/domain-workspaces/delivery/local-runtime/ingress/delivery-ingress-runtime.ts";
import { prototypeRecordFromEntryPacket } from "../../src/domain-workspaces/prototype/work-model/entry/prototype-entry-packet-record.ts";

test("proposal handoff produces a versioned Prototype packet with custody", () => {
  const proposal = proposalRecord({
    id: "PR-PACKET-PROTOTYPE",
    repoGate: {
      detail: "Existing owner repository is selected.",
      mode: "existing",
      owner: "workspace-prototype-studio",
      ref: "repo://workspace-prototype-studio",
      state: "clear",
    },
    routeTarget: "Prototype",
  });
  const projection = recordProposalPrototypeEntryPacketFromHandoff({
    handoffDraft: {
      notes: "Send the accepted proposal to Prototype Landing.",
      proposalId: proposal.id,
      result: "ready",
    },
    producerReceipt: {
      receiptId: "proposal-handoff-receipt-prototype",
      recordedAt: "2026-07-10T13:00:00.000Z",
    },
    proposal,
    repositoryGateResolution: null,
    routeSelectionDraft: {
      proposalId: proposal.id,
      rationale: "Explore the accepted proposal before Delivery.",
      repoMode: "existing",
      repoOwner: "workspace-prototype-studio",
      repoRef: "repo://workspace-prototype-studio",
      routeTarget: "Prototype",
    },
  });

  assert.ok(projection);
  assert.equal(projection.packet.schemaVersion, "1");
  assert.equal(projection.packet.sourceVersion, proposal.recordVersion);
  assert.equal(projection.packet.targetDomain, "prototype");
  assert.equal(projection.custody.state, "dispatched");
  assert.equal(projection.custody.receiptRef, null);
  assert.equal(projection.custody.packetId, projection.packet.packetId);
  assert.equal(
    projection.packet.payload.sourceCustody.classification,
    "existing-repo",
  );
  assert.equal(
    getProposalPrototypeEntryPacketProjections().some(
      (candidate) => candidate.packet.packetId === projection.packet.packetId,
    ),
    true,
  );

  const admittedProjection = getPrototypeEntryPacketProjections().find(
    (candidate) => candidate.packet.packetId === projection.packet.packetId,
  );
  assert.ok(admittedProjection);
  assert.equal(admittedProjection.custody.state, "admitted");
  assert.match(admittedProjection.custody.receiptRef, /prototype-entry/);
  assert.equal(
    getPrototypeEntryPacketProjections(),
    getPrototypeEntryPacketProjections(),
    "Prototype ingress must preserve snapshot identity until its source changes",
  );

  const record = prototypeRecordFromEntryPacket(admittedProjection, 0);
  assert.match(record.projectionVersion, /PR-PACKET-PROTOTYPE/i);
  assert.match(record.projectionFreshness, /admitted/);
});

test("proposal repository gate produces a packet before Repository projection", () => {
  const proposal = proposalRecord({
    id: "PR-PACKET-REPOSITORY",
    repoGate: {
      detail: "A new repository is required before handoff.",
      mode: "new",
      owner: null,
      ref: "repo-request://packet-repository",
      state: "blocked",
    },
    routeTarget: "Delivery",
  });
  const routeDraft = {
    appliedAt: "2026-07-10T14:00:00.000Z",
    appliedReceiptId: "proposal-disposition-receipt-repository",
    proposalId: proposal.id,
    rationale: "Delivery requires a durable source home.",
    repoMode: "new",
    repoOwner: "",
    repoRef: "repo-request://packet-repository",
    routeTarget: "Delivery",
    sourceBackendRecordId: proposal.backendRecordId,
    sourceProjectionState: "current",
    sourceRecordVersion: proposal.recordVersion,
  };

  recordProposalRepositoryRequestPacketFromDisposition({
    producerReceipt: {
      receiptId: routeDraft.appliedReceiptId,
      recordedAt: routeDraft.appliedAt,
    },
    proposal,
    routeSelectionDraft: routeDraft,
  });

  const resolutionsBeforeIngress = getProposalRepositoryGateResolutions();
  const projection = getProposalRepositoryRequestPacketProjections().find(
    (candidate) => candidate.packet.payload.proposalId === proposal.id,
  );
  const blockedRecord = getProposalRepositoryRequestRecords().find(
    (record) => record.proposalGate?.proposalId === proposal.id,
  );

  assert.ok(projection);
  assert.equal(projection.packet.targetDomain, "repository");
  assert.equal(projection.packet.sourceVersion, proposal.recordVersion);
  assert.equal(projection.custody.state, "dispatched");
  assert.equal(projection.custody.receiptRef, null);

  reconcileRepositoryIngress();
  const admittedProjection = getProposalRepositoryRequestPacketProjections().find(
    (candidate) => candidate.packet.packetId === projection.packet.packetId,
  );

  assert.ok(admittedProjection);
  assert.equal(admittedProjection.custody.state, "admitted");
  assert.match(admittedProjection.custody.receiptRef, /repository-ingress/);
  assert.equal(
    getProposalRepositoryGateResolutions(),
    resolutionsBeforeIngress,
    "packet custody updates must not invalidate the independent resolution snapshot",
  );
  assert.equal(
    projection.packet.producerReceiptRef,
    "prototype-local://proposal/proposal-disposition-receipt-repository",
  );
  assert.equal(blockedRecord?.admissionState, "blocked");

  recordProposalRepositoryRequestPacketFromDisposition({
    producerReceipt: {
      receiptId: routeDraft.appliedReceiptId,
      recordedAt: routeDraft.appliedAt,
    },
    proposal,
    routeSelectionDraft: routeDraft,
  });
  const resyncedProjection =
    getProposalRepositoryRequestPacketProjections().find(
      (candidate) => candidate.packet.packetId === projection.packet.packetId,
    );

  assert.equal(
    resyncedProjection?.custody.state,
    "admitted",
    "producer reconciliation must preserve downstream custody",
  );
  assert.equal(
    resyncedProjection?.custody.receiptRef,
    admittedProjection.custody.receiptRef,
  );

  recordProposalRepositoryGateResolution({
    notes: "Stale repository resolution must remain evidence only.",
    proposalId: proposal.id,
    receiptId: "repository-gate-resolution-packet-repository-stale",
    recordedAt: "2026-07-10T00:01:00.000Z",
    repoRequestRef: "repo-request://packet-repository",
    resolvedOwner: "packet-repository-owner",
    resolvedRepoRef: "repo://packet-repository",
    result: "resolved",
    sourceVersion: "proposal-v0",
  });
  const staleResolutionRecord = getProposalRepositoryRequestRecords().find(
    (record) => record.proposalGate?.proposalId === proposal.id,
  );

  assert.equal(staleResolutionRecord?.admissionState, "blocked");
  assert.equal(staleResolutionRecord?.proposalGate?.status, "pending");

  recordProposalRepositoryGateResolution({
    notes: "Repository owner and reference were selected.",
    proposalId: proposal.id,
    receiptId: "repository-gate-resolution-packet-repository",
    recordedAt: "2026-07-10T00:02:00.000Z",
    repoRequestRef: "repo-request://packet-repository",
    resolvedOwner: "packet-repository-owner",
    resolvedRepoRef: "repo://packet-repository",
    result: "resolved",
    sourceVersion: proposal.recordVersion,
  });
  const readyRecord = getProposalRepositoryRequestRecords().find(
    (record) => record.proposalGate?.proposalId === proposal.id,
  );

  assert.equal(readyRecord?.admissionState, "ready");
  assert.equal(readyRecord?.proposalGate?.status, "resolved");
});

test("proposal workflow integration emits repository custody after disposition", async () => {
  const proposal = proposalRecord({
    id: "PR-INTEGRATED-REPOSITORY",
    repoGate: {
      detail: "A new repository is required before handoff.",
      mode: "new",
      owner: null,
      ref: "repo-request://integrated-repository",
      state: "blocked",
    },
    routeTarget: "Delivery",
  });
  const input = {
    payload: {
      decision: {
        advisorDraft: "",
        advisorPrompt: "",
        notes: "Accept the proposal for governed Delivery.",
        outcome: "accepted",
      },
      route: {
        rationale: "Delivery needs a durable source home.",
        repoMode: "new",
        repoOwner: "",
        repoRef: "repo-request://integrated-repository",
        routeTarget: "Delivery",
      },
      step: "disposition",
    },
    proposal,
    proposalId: proposal.id,
    source: {
      backendRecordId: proposal.backendRecordId,
      projectionState: proposal.projectionState,
      recordVersion: proposal.recordVersion,
    },
  };
  const result = await submitProposalWorkflowIntegrationCommand({
    ...input,
    submittedAt: "2026-07-10T14:30:00.000Z",
  });
  const projection = getProposalRepositoryRequestPacketProjections().find(
    (candidate) => candidate.packet.payload.proposalId === proposal.id,
  );

  assert.ok(projection);
  assert.equal(
    projection.packet.causationId,
    result.receipt.receipt.receiptId,
  );
  assert.equal(
    projection.packet.producerReceiptRef,
    `prototype-local://proposal/${result.receipt.receipt.receiptId}`,
  );

  reconcileRepositoryIngress();
  const admittedProjection =
    getProposalRepositoryRequestPacketProjections().find(
      (candidate) => candidate.packet.packetId === projection.packet.packetId,
    );
  assert.equal(admittedProjection?.custody.state, "admitted");

  await submitProposalWorkflowIntegrationCommand({
    ...input,
    submittedAt: "2026-07-10T14:35:00.000Z",
  });
  const retriedProjection =
    getProposalRepositoryRequestPacketProjections().find(
      (candidate) => candidate.packet.packetId === projection.packet.packetId,
    );

  assert.equal(retriedProjection?.custody.state, "admitted");
  assert.equal(
    retriedProjection?.custody.receiptRef,
    admittedProjection?.custody.receiptRef,
  );
});

test("proposal workflow integration emits handoff from the applied route", async () => {
  const proposal = proposalRecord({
    id: "PR-INTEGRATED-PROTOTYPE",
    repoGate: {
      detail: "Existing Prototype owner repository is selected.",
      mode: "existing",
      owner: "workspace-prototype-studio",
      ref: "repo://workspace-prototype-studio",
      state: "clear",
    },
    routeTarget: "Prototype",
  });
  const source = {
    backendRecordId: proposal.backendRecordId,
    projectionState: proposal.projectionState,
    recordVersion: proposal.recordVersion,
  };

  await submitProposalWorkflowIntegrationCommand({
    payload: {
      decision: {
        advisorDraft: "",
        advisorPrompt: "",
        notes: "Accept the proposal for Prototype exploration.",
        outcome: "accepted",
      },
      route: {
        rationale: "Explore the accepted proposal before Delivery.",
        repoMode: "existing",
        repoOwner: "workspace-prototype-studio",
        repoRef: "repo://workspace-prototype-studio",
        routeTarget: "Prototype",
      },
      step: "disposition",
    },
    proposal,
    proposalId: proposal.id,
    source,
    submittedAt: "2026-07-10T14:40:00.000Z",
  });
  const result = await submitProposalWorkflowIntegrationCommand({
    payload: {
      notes: "Send the accepted proposal to Prototype Landing.",
      result: "ready",
      step: "handoff",
    },
    proposal,
    proposalId: proposal.id,
    source,
    submittedAt: "2026-07-10T14:45:00.000Z",
  });
  const projection = getProposalPrototypeEntryPacketProjections().find(
    (candidate) =>
      candidate.packet.sourceRecordId === proposal.backendRecordId,
  );

  assert.ok(projection);
  assert.equal(
    projection.packet.causationId,
    result.receipt.receipt.receiptId,
  );
  assert.equal(projection.packet.targetDomain, "prototype");
});

test("proposal Delivery handoff carries resolved source custody", () => {
  const proposal = proposalRecord({
    id: "PR-PACKET-DELIVERY",
    repoGate: {
      detail: "Existing Delivery owner repository is selected.",
      mode: "existing",
      owner: "delivery-owner",
      ref: "repo://delivery-owner",
      state: "clear",
    },
    routeTarget: "Delivery",
  });
  const projection = recordProposalDeliveryEntryPacketFromHandoff({
    handoffDraft: {
      notes: "Delivery Intake should verify the accepted packet.",
      proposalId: proposal.id,
      result: "ready",
    },
    producerReceipt: {
      receiptId: "proposal-handoff-receipt-delivery",
      recordedAt: "2026-07-10T15:00:00.000Z",
    },
    proposal,
    repositoryGateResolution: null,
    routeSelectionDraft: {
      proposalId: proposal.id,
      rationale: "The accepted work is ready for governed Delivery design.",
      repoMode: "existing",
      repoOwner: "delivery-owner",
      repoRef: "repo://delivery-owner",
      routeTarget: "Delivery",
    },
  });

  assert.ok(projection);
  assert.equal(projection.packet.targetDomain, "delivery");
  assert.equal(
    projection.packet.payload.sourceCustody.repository_gate_state,
    "resolved",
  );
  assert.equal(
    getProposalDeliveryEntryPacketProjections().some(
      (candidate) => candidate.packet.packetId === projection.packet.packetId,
    ),
    true,
  );

  assert.equal(projection.custody.state, "dispatched");
  assert.equal(projection.custody.receiptRef, null);

  reconcileDeliveryIngress();
  const admittedProjection = getProposalDeliveryEntryPacketProjections().find(
    (candidate) => candidate.packet.packetId === projection.packet.packetId,
  );
  const intakeSource = getDeliveryIngressProjectionSnapshot().intakeSources.find(
    (source) => source.source_ref === proposal.backendRecordId,
  );
  assert.ok(admittedProjection);
  assert.equal(admittedProjection.custody.state, "admitted");
  assert.match(admittedProjection.custody.receiptRef, /delivery-ingress/);
  assert.ok(intakeSource);
  assert.equal(intakeSource.intake_status, "needs_consume");
  assert.equal(intakeSource.source_custody.owner, "delivery-owner");
  assert.equal(intakeSource.source_ref, proposal.backendRecordId);
});

function proposalRecord({ id, repoGate, routeTarget }) {
  return {
    backendRecordId: `proposal://${id}`,
    bodyPreview: "A cross-domain packet should preserve source and custody truth.",
    handoffRule: "Route only after the repository gate is clear.",
    id,
    lastProjectionUpdate: "2026-07-10T12:00:00.000Z",
    projectionState: "current",
    recordVersion: "v-packet-1",
    repoGate,
    routeTarget,
    title: `Packet ${id}`,
  };
}
