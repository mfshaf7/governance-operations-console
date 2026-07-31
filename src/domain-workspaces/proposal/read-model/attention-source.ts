import type {
  ConsoleAttentionCandidate,
  ConsoleAttentionFreshness,
  ConsoleAttentionSource,
  ConsoleAttentionSourceSnapshot,
} from "../../../console-integration/attention-contract.ts";
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
