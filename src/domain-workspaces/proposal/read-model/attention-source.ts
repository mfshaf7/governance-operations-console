import type {
  ConsoleAttentionCandidate,
  ConsoleAttentionFreshness,
  ConsoleAttentionSource,
  ConsoleAttentionSourceSnapshot,
} from "../../../console-integration/attention-contract.ts";
import { ownerAttentionSnapshot, type ConsoleOwnerRead } from "../../../console-integration/live-attention.ts";
import { assertProposalLiveSnapshot } from "../live-runtime/proposal-live-contract.ts";
import { projectProposalLiveRecords } from "../live-runtime/proposal-live-projection.ts";
import type { NativeLifecycleOutcome } from "../../../console-integration/native-lifecycle-outcome.ts";

export function projectProposalLifecycleOutcomes(payload: unknown): NativeLifecycleOutcome[] {
  const snapshot = assertProposalLiveSnapshot(payload);
  if (snapshot.mode !== "live" || snapshot.status !== "current") throw new Error("Proposal unavailable");
  return snapshot.records.flatMap(({ projection, history }) => {
    const handoff = projection.handoff;
    const target = projection.route?.target;
    if (handoff.state !== "applied" || (target !== "prototype" && target !== "delivery")) return [];
    const event = history.events.find(event => event.event_type === "handoff-applied" && Boolean(handoff.target_receipt_ref && event.receipt_refs.includes(handoff.target_receipt_ref)));
    return [{ id: `native:${target}:${projection.proposal_id}:${handoff.packet_ref ?? handoff.target_receipt_ref ?? "source-report"}`,
      routeId: target === "prototype" ? "proposal-to-prototype" as const : "proposal-to-delivery" as const,
      sourceId: projection.proposal_id, sourceVersion: handoff.packet_ref ?? projection.record_version,
      title: projection.title, owner: "workspace-proposals", sourceRef: projection.record_ref,
      targetRef: handoff.target_record_ref, receiptRef: handoff.target_receipt_ref,
      recordedAt: event?.occurred_at ?? projection.updated_at,
      observationKind: "source-acknowledgement" as const,
      evidenceRefs: [projection.record_ref, ...(handoff.target_receipt_ref ? [handoff.target_receipt_ref] : [])],
      detail: "Current Proposal owner readback reports the handoff applied. Original target receipt and journal validation/admission phases are not independently projected by this source acknowledgement.",
    }];
  });
}

export function projectProposalOwnerAttention(read: ConsoleOwnerRead | undefined) {
  return ownerAttentionSnapshot(registration, read, "workspace-proposals", (payload, observedAt) => {
    const snapshot = assertProposalLiveSnapshot(payload);
    if (snapshot.mode !== "live" || snapshot.status !== "current") throw new Error("Proposal unavailable");
    return projectProposalLiveRecords(snapshot.records)
      .filter(record => !["done", "parked", "waiting-on-repository"].includes(record.status))
      .map(record => proposalAttentionCandidate(record, observedAt, false));
  });
}
import { consoleAttentionSourceRegistrations } from "../../../console-integration/attention-source-registry.ts";
import {
  getProposalRepositoryGateResolutions,
  subscribeProposalRepositoryRequestPacketProjections,
} from "../../operation-integrations/proposal-repository-request-projection.ts";
import {
  getProposalPrototypeEntryPacketProjections,
  subscribeProposalPrototypeEntryPacketProjections,
} from "../../operation-integrations/proposal-prototype-entry-projection.ts";
import {
  getProposalDeliveryEntryPacketProjections,
  subscribeProposalDeliveryEntryPacketProjections,
} from "../../operation-integrations/proposal-delivery-entry-projection.ts";
import {
  getProposalRuntimeProjectionSnapshot,
  subscribeProposalRuntimeProjection,
} from "../local-runtime/proposal-runtime.ts";
import { projectProposalEffectiveProjection } from "../local-runtime/proposal-effective-projection.ts";
import { proposalRequiredMove } from "./proposal-required-move.ts";
import {
  proposalWorkspaceReadModel,
  type ProposalWorkspaceScenario,
} from "./proposal-workspace-read-model.ts";

const registration = consoleAttentionSourceRegistrations.proposal;
let cachedRuntime = getProposalRuntimeProjectionSnapshot();
let cachedRepositoryResolutions = getProposalRepositoryGateResolutions();
let cachedPrototypeEntryPackets = getProposalPrototypeEntryPacketProjections();
let cachedDeliveryEntryPackets = getProposalDeliveryEntryPacketProjections();
let cachedSnapshot = projectProposalAttentionSnapshot(
  cachedRuntime,
  cachedRepositoryResolutions,
  [...cachedPrototypeEntryPackets, ...cachedDeliveryEntryPackets],
);

export const proposalAttentionSource: ConsoleAttentionSource = {
  getSnapshot() {
    const runtime = getProposalRuntimeProjectionSnapshot();
    const repositoryResolutions = getProposalRepositoryGateResolutions();
    const prototypeEntryPackets = getProposalPrototypeEntryPacketProjections();
    const deliveryEntryPackets = getProposalDeliveryEntryPacketProjections();

    if (
      runtime !== cachedRuntime ||
      repositoryResolutions !== cachedRepositoryResolutions ||
      prototypeEntryPackets !== cachedPrototypeEntryPackets ||
      deliveryEntryPackets !== cachedDeliveryEntryPackets
    ) {
      cachedRuntime = runtime;
      cachedRepositoryResolutions = repositoryResolutions;
      cachedPrototypeEntryPackets = prototypeEntryPackets;
      cachedDeliveryEntryPackets = deliveryEntryPackets;
      cachedSnapshot = projectProposalAttentionSnapshot(
        runtime,
        repositoryResolutions,
        [...prototypeEntryPackets, ...deliveryEntryPackets],
      );
    }

    return cachedSnapshot;
  },
  registration,
  subscribe(listener) {
    const unsubscribeRuntime = subscribeProposalRuntimeProjection(listener);
    const unsubscribeRepository =
      subscribeProposalRepositoryRequestPacketProjections(listener);
    const unsubscribePrototype =
      subscribeProposalPrototypeEntryPacketProjections(listener);
    const unsubscribeDelivery =
      subscribeProposalDeliveryEntryPacketProjections(listener);

    return () => {
      unsubscribeRuntime();
      unsubscribeRepository();
      unsubscribePrototype();
      unsubscribeDelivery();
    };
  },
};

function projectProposalAttentionSnapshot(
  runtime: ReturnType<typeof getProposalRuntimeProjectionSnapshot>,
  repositoryResolutions: ReturnType<
    typeof getProposalRepositoryGateResolutions
  >,
  handoffPacketProjections = [
    ...getProposalPrototypeEntryPacketProjections(),
    ...getProposalDeliveryEntryPacketProjections(),
  ],
): ConsoleAttentionSourceSnapshot {
  const projection = projectProposalEffectiveProjection({
    handoffPacketProjections,
    repositoryGateResolutions: repositoryResolutions,
    runtimeProjection: runtime,
    sourceRecords: proposalWorkspaceReadModel.proposals,
  });
  const records = projection.records;
  const projectedAt = latestProposalTimestamp(records);
  const candidates = records.flatMap((proposal) => {
    if (
      proposal.status === "done" ||
      proposal.status === "parked" ||
      proposal.status === "waiting-on-repository"
    ) {
      return [];
    }

    return [
      proposalAttentionCandidate(
        proposal,
        projectedAt,
        Boolean(projection.workflowReceiptsByProposal[proposal.id]?.length) ||
          runtime.capturedProposals.some(
            (candidate) => candidate.id === proposal.id,
          ),
      ),
    ];
  });

  return {
    candidates,
    registration,
    schemaVersion: 1,
    source: {
      authority: "workspace-proposals",
      freshness: "current",
      mode: "prototype-local",
      observedAt: projectedAt,
      projectedAt,
      ref: "proposal://attention-projection",
      version: proposalAttentionVersion(
        records,
        projection.workflowReceiptsByProposal,
      ),
    },
  };
}

function proposalAttentionCandidate(
  proposal: ProposalWorkspaceScenario,
  projectedAt: string,
  local: boolean,
): ConsoleAttentionCandidate {
  const move = proposalRequiredMove(proposal);
  const requiredMoveId = proposalRequiredMoveId(proposal);
  const freshness = proposalFreshness(proposal);

  return {
    attentionClass:
      proposal.status === "waiting-on-source" ? "recovery" : "review",
    candidateId: `proposal:${proposal.id}:${requiredMoveId}`,
    correlationRef: proposal.backendRecordId,
    dedupeKey: `${proposal.id}:${requiredMoveId}`,
    dueAt: null,
    evidenceRefs: proposal.evidence.map(
      (evidence) => evidence.source.ref ?? `proposal-evidence://${evidence.id}`,
    ),
    owner: {
      label: proposal.owner,
      ref: `owner://${proposal.owner}`,
    },
    ownerRank: proposal.status === "waiting-on-source" ? 10 : 40,
    reason: move.description,
    receiptRefs: [],
    requiredMove: {
      id: requiredMoveId,
      label: move.title,
    },
    reviewAt: null,
    route: {
      availability: "available",
      entryIntent: {
        mode: proposal.status === "captured" ? "resume" : "review",
        requiredMoveRef: requiredMoveId,
        subjectRef: proposal.id,
        target: {
          id: "workbench:proposal",
          kind: "workbench-domain",
          surfaceLabel: "PROPOSAL",
        },
      },
      externalHref: null,
      label: "Open Proposal",
      unavailableReason: null,
    },
    schemaVersion: 1,
    source: {
      authority: "workspace-proposals",
      freshness,
      mode: local ? "prototype-local" : "synthetic",
      observedAt: proposalTimestamp(proposal.lastProjectionUpdate),
      projectedAt,
      ref: proposal.backendRecordId,
      version: proposal.recordVersion,
    },
    subject: {
      kind: "proposal",
      ref: proposal.id,
      title: proposal.title,
    },
    urgency: proposal.status === "waiting-on-source" ? "high" : "normal",
  };
}

function proposalRequiredMoveId(proposal: ProposalWorkspaceScenario) {
  switch (proposal.status) {
    case "captured":
      return "proposal.triage";
    case "triaged":
      return "proposal.disposition";
    case "ready-to-route":
      return "proposal.handoff-review";
    case "waiting-on-source":
      return "proposal.source-review";
    case "waiting-on-repository":
      return "repository.resolve-proposal-gate";
    case "parked":
      return "proposal.revisit-disposition";
    case "done":
      return "proposal.history";
  }
}

function proposalFreshness(
  proposal: ProposalWorkspaceScenario,
): ConsoleAttentionFreshness {
  switch (proposal.projectionState) {
    case "current":
      return "current";
    case "stale":
      return "stale";
    case "offline":
      return "unavailable";
    case "error":
    case "syncing":
      return "unverified";
  }
}

function latestProposalTimestamp(
  records: readonly ProposalWorkspaceScenario[],
) {
  return (
    records
      .map((record) => proposalTimestamp(record.lastProjectionUpdate))
      .sort()
      .at(-1) ?? "2026-06-21T00:00:00.000Z"
  );
}

function proposalTimestamp(timestamp: string) {
  const parsed = Date.parse(timestamp);

  return Number.isNaN(parsed)
    ? "2026-06-21T00:00:00.000Z"
    : new Date(parsed).toISOString();
}

function proposalAttentionVersion(
  records: readonly ProposalWorkspaceScenario[],
  workflowReceiptsByProposal: Record<string, readonly { receiptId: string }[]>,
) {
  const receiptCount = Object.values(workflowReceiptsByProposal).reduce(
    (count, receipts) => count + receipts.length,
    0,
  );

  return `proposal-attention-v1:${records.length}:${receiptCount}`;
}
