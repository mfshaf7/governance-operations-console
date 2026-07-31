import { createLocalOperationProjectionStore } from "../operation-runtime/local-operation-projection-store.ts";
import {
  createLocalOperationCrossDomainPacket,
  createLocalOperationPacketCustody,
} from "../operation-runtime/operation-packet-invariants.ts";

import {
  proposalRepositoryRequestRefValid,
  proposalRouteSelectionDraftFromProposal,
  proposalRouteSelectionSourceCustody,
  type ProposalRouteSelectionDraft,
} from "../proposal/work-model/proposal-disposition-model.ts";
import {
  proposalWorkspaceReadModel,
  type ProposalWorkspaceScenario,
} from "../proposal/read-model/proposal-workspace-read-model.ts";
import type {
  ProposalRepositoryGateResolution,
  ProposalRepositoryRequestPacketPayload,
  ProposalRepositoryRequestPacketProjection,
} from "../operation-contracts/proposal-repository-request.ts";

export type { ProposalRepositoryGateResolution } from "../operation-contracts/proposal-repository-request.ts";

type ProposalRepositoryRequestState = {
  localPacketProjections: Map<
    string,
    ProposalRepositoryRequestPacketProjection
  >;
  repositoryGateResolutions: Map<string, ProposalRepositoryGateResolution>;
};

type ProposalRepositoryRequestSnapshot = {
  packetProjections: ProposalRepositoryRequestPacketProjection[];
  resolutions: Record<string, ProposalRepositoryGateResolution>;
};

let cachedPacketProjectionMap:
  ProposalRepositoryRequestState["localPacketProjections"] | null = null;
let cachedPacketProjections: ProposalRepositoryRequestPacketProjection[] = [];
let cachedResolutionMap:
  ProposalRepositoryRequestState["repositoryGateResolutions"] | null = null;
let cachedResolutions: Record<string, ProposalRepositoryGateResolution> = {};

const readModelPacketProjections = proposalWorkspaceReadModel.proposals
  .map((proposal) => proposalRepositoryPacketFromReadModel(proposal))
  .filter(
    (projection): projection is ProposalRepositoryRequestPacketProjection =>
      Boolean(projection),
  );

const proposalRepositoryRequestStore = createLocalOperationProjectionStore<
  ProposalRepositoryRequestState,
  ProposalRepositoryRequestSnapshot
>({
  initialState: {
    localPacketProjections: new Map(
      readModelPacketProjections.map((projection) => [
        projection.packet.payload.proposalId,
        projection,
      ]),
    ),
    repositoryGateResolutions: new Map(),
  },
  projectSnapshot: proposalRepositoryRequestSnapshot,
  runtimeSource: {
    authority: "prototype-local",
    mode: "local",
    sourceOwner: "proposal-repository-gate",
  },
});

export function recordProposalRepositoryRequestPacketFromDisposition({
  producerReceipt,
  proposal,
  routeSelectionDraft,
}: {
  producerReceipt: { receiptId: string; recordedAt: string };
  proposal: ProposalWorkspaceScenario;
  routeSelectionDraft: ProposalRouteSelectionDraft | null;
}) {
  const appliedRouteSelectionDraft = routeSelectionDraft
    ? {
        ...routeSelectionDraft,
        appliedAt: producerReceipt.recordedAt,
        appliedReceiptId: producerReceipt.receiptId,
        savedAt: producerReceipt.recordedAt,
        sourceBackendRecordId: proposal.backendRecordId,
        sourceProjectionState: proposal.projectionState,
        sourceRecordVersion: proposal.recordVersion,
      }
    : null;
  const projection = proposalRepositoryPacketFromRouteDraft(
    proposal,
    appliedRouteSelectionDraft,
  );

  proposalRepositoryRequestStore.updateState((currentState) => {
    const currentProjection = currentState.localPacketProjections.get(
      proposal.id,
    );

    if (!projection) {
      if (!currentProjection) {
        return currentState;
      }

      const nextProjections = new Map(currentState.localPacketProjections);
      nextProjections.delete(proposal.id);

      return {
        ...currentState,
        localPacketProjections: nextProjections,
      };
    }

    const nextProjection = proposalRepositoryProjectionWithPreservedCustody(
      projection,
      currentProjection,
    );

    if (nextProjection === currentProjection) {
      return currentState;
    }

    return {
      ...currentState,
      localPacketProjections: new Map(currentState.localPacketProjections).set(
        proposal.id,
        nextProjection,
      ),
    };
  });

  return (
    proposalRepositoryRequestStore
      .getState()
      .localPacketProjections.get(proposal.id) ?? null
  );
}

export function recordProposalRepositoryGateResolution(
  resolution: ProposalRepositoryGateResolution,
) {
  proposalRepositoryRequestStore.updateState((currentState) => {
    const currentResolution = currentState.repositoryGateResolutions.get(
      resolution.proposalId,
    );

    if (currentResolution?.receiptId === resolution.receiptId) {
      return currentState;
    }

    return {
      ...currentState,
      repositoryGateResolutions: new Map(
        currentState.repositoryGateResolutions,
      ).set(resolution.proposalId, resolution),
    };
  });

  return resolution;
}

export function subscribeProposalRepositoryRequestPacketProjections(
  listener: () => void,
) {
  return proposalRepositoryRequestStore.subscribe(listener);
}

export function getProposalRepositoryGateResolutions() {
  return proposalRepositoryRequestStore.getSnapshot().resolutions;
}

export function getProposalRepositoryRequestPacketProjections() {
  return proposalRepositoryRequestStore.getSnapshot().packetProjections;
}

export function acknowledgeProposalRepositoryRequestPacket({
  packetId,
  receiptRef,
  recordedAt,
  state,
}: {
  packetId: string;
  receiptRef: string;
  recordedAt: string;
  state: "admitted" | "rejected" | "returned";
}) {
  let acknowledged: ProposalRepositoryRequestPacketProjection | null = null;

  proposalRepositoryRequestStore.updateState((currentState) => {
    for (const [
      proposalId,
      projection,
    ] of currentState.localPacketProjections) {
      if (projection.packet.packetId !== packetId) {
        continue;
      }

      const custody = createLocalOperationPacketCustody({
        custodyOwner: projection.packet.custodyOwner,
        packetId,
        receiptRef,
        recordedAt,
        state,
      });
      acknowledged = { custody, packet: projection.packet };

      if (
        projection.custody.receiptRef === receiptRef &&
        projection.custody.state === state
      ) {
        return currentState;
      }

      return {
        ...currentState,
        localPacketProjections: new Map(
          currentState.localPacketProjections,
        ).set(proposalId, acknowledged),
      };
    }

    return currentState;
  });

  return acknowledged;
}

function proposalRepositoryRequestSnapshot({
  localPacketProjections,
  repositoryGateResolutions,
}: ProposalRepositoryRequestState): ProposalRepositoryRequestSnapshot {
  if (localPacketProjections !== cachedPacketProjectionMap) {
    cachedPacketProjectionMap = localPacketProjections;
    cachedPacketProjections = Array.from(localPacketProjections.values());
  }

  if (repositoryGateResolutions !== cachedResolutionMap) {
    cachedResolutionMap = repositoryGateResolutions;
    cachedResolutions = Object.fromEntries(repositoryGateResolutions);
  }

  return {
    packetProjections: cachedPacketProjections,
    resolutions: cachedResolutions,
  };
}

function proposalRepositoryPacketFromReadModel(
  proposal: ProposalWorkspaceScenario,
): ProposalRepositoryRequestPacketProjection | null {
  if (
    proposal.repoGate.mode !== "new" ||
    proposal.repoGate.state !== "blocked" ||
    !proposal.repoGate.ref ||
    !proposalRepositoryRequestRefValid(proposal.repoGate.ref) ||
    !proposalRouteTargetOwnsSource(proposal.routeTarget)
  ) {
    return null;
  }

  const routeSelectionDraft = proposalRouteSelectionDraftFromProposal(proposal);
  return proposalRepositoryPacketProjection({
    appliedAt: proposal.lastProjectionUpdate,
    causationId: `proposal-read-model-${proposal.id}-${proposal.recordVersion}`,
    producerReceiptRef: null,
    proposal,
    rationale: proposal.handoffRule,
    repoRef: proposal.repoGate.ref,
    routeSource: `${proposal.backendRecordId} / read-model repository gate`,
    routeTarget: proposal.routeTarget,
    sourceCustody: proposalRouteSelectionSourceCustody(routeSelectionDraft),
    sourceLabel: "read-model repository gate",
    sourceVersion: proposal.recordVersion,
  });
}

function proposalRepositoryPacketFromRouteDraft(
  proposal: ProposalWorkspaceScenario,
  draft: ProposalRouteSelectionDraft | null | undefined,
): ProposalRepositoryRequestPacketProjection | null {
  if (
    !draft?.appliedAt ||
    !proposalRouteTargetOwnsSource(draft.routeTarget) ||
    draft.repoMode !== "new" ||
    !proposalRepositoryRequestRefValid(draft.repoRef)
  ) {
    return null;
  }

  const causationId =
    draft.appliedReceiptId ??
    `proposal-disposition-${proposal.id}-${draft.appliedAt}`;
  return proposalRepositoryPacketProjection({
    appliedAt: draft.appliedAt,
    causationId,
    producerReceiptRef: draft.appliedReceiptId
      ? `prototype-local://proposal/${draft.appliedReceiptId}`
      : null,
    proposal,
    rationale: draft.rationale,
    repoRef: draft.repoRef,
    routeSource: `${proposal.id} / local disposition repository gate`,
    routeTarget: draft.routeTarget,
    sourceCustody: proposalRouteSelectionSourceCustody(draft),
    sourceLabel: "local disposition repository gate",
    sourceVersion: draft.sourceRecordVersion ?? proposal.recordVersion,
  });
}

function proposalRepositoryPacketProjection({
  appliedAt,
  causationId,
  producerReceiptRef,
  proposal,
  rationale,
  repoRef,
  routeSource,
  routeTarget,
  sourceCustody,
  sourceLabel,
  sourceVersion,
}: {
  appliedAt: string;
  causationId: string;
  producerReceiptRef: string | null;
  proposal: ProposalWorkspaceScenario;
  rationale: string;
  repoRef: string;
  routeSource: string;
  routeTarget: "Delivery" | "Prototype";
  sourceCustody: ProposalRepositoryRequestPacketPayload["sourceCustody"];
  sourceLabel: string;
  sourceVersion: string;
}): ProposalRepositoryRequestPacketProjection {
  const packetId = `proposal-repository-${packetSlug(
    `${proposal.id}-${causationId}`,
  )}`;
  const custodyOwner = "repository-admission";
  const packet =
    createLocalOperationCrossDomainPacket<ProposalRepositoryRequestPacketPayload>(
      {
        causationId,
        correlationId: proposal.backendRecordId,
        createdAt: appliedAt,
        custodyOwner,
        packetId,
        payload: {
          appliedAt,
          bodyPreview: proposal.bodyPreview,
          proposalId: proposal.id,
          proposalTitle: proposal.title,
          rationale,
          repoGateDetail: proposal.repoGate.detail,
          repoGateOwner: proposal.repoGate.owner,
          repoRef,
          routeSource,
          routeTarget,
          sourceCustody,
          sourceLabel,
        },
        producerReceiptRef,
        sourceDomain: "proposal",
        sourceOwner: "workspace-proposals",
        sourceRecordId: proposal.backendRecordId,
        sourceVersion,
        targetDomain: "repository",
      },
    );
  const custody = createLocalOperationPacketCustody({
    custodyOwner,
    packetId,
    receiptRef: null,
    recordedAt: appliedAt,
    state: "dispatched",
  });

  return { custody, packet };
}

function proposalRouteTargetOwnsSource(
  routeTarget:
    | ProposalWorkspaceScenario["routeTarget"]
    | ProposalRouteSelectionDraft["routeTarget"],
): routeTarget is "Delivery" | "Prototype" {
  return routeTarget === "Delivery" || routeTarget === "Prototype";
}

function packetSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function proposalRepositoryProjectionWithPreservedCustody(
  next: ProposalRepositoryRequestPacketProjection,
  current: ProposalRepositoryRequestPacketProjection | undefined,
) {
  if (
    current?.packet.packetId === next.packet.packetId &&
    JSON.stringify(current.packet) === JSON.stringify(next.packet)
  ) {
    return current;
  }

  return next;
}
