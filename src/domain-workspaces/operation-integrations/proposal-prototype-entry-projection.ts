import { createLocalOperationProjectionStore } from "../operation-runtime/local-operation-projection-store.ts";
import {
  createLocalOperationCrossDomainPacket,
  createLocalOperationPacketCustody,
} from "../operation-runtime/operation-packet-invariants.ts";

import type {
  PrototypeEntryPacketPayload,
  PrototypeEntryPacketProjection,
} from "../prototype/work-model/entry/prototype-entry-packet.ts";
import {
  proposalRouteSelectionHasRepositoryGate,
  proposalRouteSelectionSourceCustody,
  type ProposalRouteSelectionDraft,
} from "../proposal/work-model/proposal-disposition-model.ts";
import type { ProposalHandoffDraft } from "../proposal/work-model/proposal-handoff-model.ts";
import type { ProposalWorkspaceScenario } from "../proposal/read-model/proposal-workspace-read-model.ts";
import type { ProposalRepositoryGateResolution } from "./proposal-repository-request-projection.ts";

type ProposalPrototypeEntryState = {
  projections: Map<string, PrototypeEntryPacketProjection>;
};

const proposalPrototypeEntryStore = createLocalOperationProjectionStore<
  ProposalPrototypeEntryState,
  PrototypeEntryPacketProjection[]
>({
  initialState: {
    projections: new Map(),
  },
  projectSnapshot: (state) => Array.from(state.projections.values()),
  runtimeSource: {
    authority: "prototype-local",
    mode: "local",
    sourceOwner: "proposal-prototype-entry",
  },
});

export function recordProposalPrototypeEntryPacketFromHandoff({
  handoffDraft,
  producerReceipt,
  proposal,
  repositoryGateResolution,
  routeSelectionDraft,
}: {
  handoffDraft: ProposalHandoffDraft;
  producerReceipt: { receiptId: string; recordedAt: string };
  proposal: ProposalWorkspaceScenario;
  repositoryGateResolution: ProposalRepositoryGateResolution | null;
  routeSelectionDraft: ProposalRouteSelectionDraft;
}) {
  const projection = proposalPrototypeEntryProjectionFromHandoff({
    handoffDraft,
    producerReceipt,
    proposal,
    repositoryGateResolution,
    routeSelectionDraft,
  });

  if (!projection) {
    return null;
  }

  proposalPrototypeEntryStore.updateState((currentState) => {
    const currentProjection = currentState.projections.get(proposal.id);
    const nextProjection = proposalEntryProjectionWithPreservedCustody(
      projection,
      currentProjection,
    );

    if (nextProjection === currentProjection) {
      return currentState;
    }

    return {
      projections: new Map(currentState.projections).set(
        proposal.id,
        nextProjection,
      ),
    };
  });

  return proposalPrototypeEntryStore.getState().projections.get(proposal.id);
}

export function subscribeProposalPrototypeEntryPacketProjections(
  listener: () => void,
) {
  return proposalPrototypeEntryStore.subscribe(listener);
}

export function getProposalPrototypeEntryPacketProjections() {
  return proposalPrototypeEntryStore.getSnapshot();
}

function proposalPrototypeEntryProjectionFromHandoff({
  handoffDraft,
  producerReceipt,
  proposal,
  repositoryGateResolution,
  routeSelectionDraft,
}: {
  handoffDraft: ProposalHandoffDraft;
  producerReceipt: { receiptId: string; recordedAt: string };
  proposal: ProposalWorkspaceScenario;
  repositoryGateResolution: ProposalRepositoryGateResolution | null;
  routeSelectionDraft: ProposalRouteSelectionDraft;
}): PrototypeEntryPacketProjection | null {
  if (
    routeSelectionDraft.routeTarget !== "Prototype" ||
    handoffDraft.result !== "ready" ||
    proposalPrototypeRepositoryGateBlocked(
      routeSelectionDraft,
      repositoryGateResolution,
    )
  ) {
    return null;
  }

  const hasRepositoryGate =
    proposalRouteSelectionHasRepositoryGate(routeSelectionDraft);
  const repoOwner = hasRepositoryGate
    ? repositoryGateResolution?.resolvedOwner ||
      routeSelectionDraft.repoOwner ||
      proposal.repoGate.owner ||
      "workspace-prototype-studio"
    : "not required before handoff";
  const repoRef = hasRepositoryGate
    ? repositoryGateResolution?.resolvedRepoRef ||
      routeSelectionDraft.repoRef ||
      proposal.repoGate.ref ||
      "repo://workspace-prototype-studio"
    : "not required";
  const routeReason =
    routeSelectionDraft.rationale.trim() ||
    proposal.handoffRule ||
    "Accepted proposal routed to Prototype Studio.";
  const handoffNotes = handoffDraft.notes.trim();
  const sourceContext = [
    proposal.bodyPreview,
    `Route reason: ${routeReason}`,
    handoffNotes ? `Handoff notes: ${handoffNotes}` : null,
    `Repository gate: ${repoRef} / ${repoOwner}`,
  ]
    .filter(Boolean)
    .join(" ");
  const packetId = `proposal-prototype-${packetSlug(
    `${proposal.id}-${producerReceipt.receiptId}`,
  )}`;
  const custodyOwner = "prototype-landing";
  const packet =
    createLocalOperationCrossDomainPacket<PrototypeEntryPacketPayload>({
      causationId: producerReceipt.receiptId,
      correlationId: proposal.backendRecordId,
      createdAt: producerReceipt.recordedAt,
      custodyOwner,
      packetId,
      payload: {
        basePlatform: "custom-unassigned",
        dataMode: "synthetic",
        entryId: proposal.id,
        evidence: [
          {
            detail: `${proposal.backendRecordId} / ${proposal.recordVersion}`,
            label: "Proposal source",
            tone: "info",
          },
          {
            detail: routeReason,
            label: "Route reason",
            tone: "ok",
          },
          {
            detail: handoffNotes || "Handoff review was clear.",
            label: "Handoff review",
            tone: "ok",
          },
          {
            detail: `${repoRef} / ${repoOwner}`,
            label: "Repository gate",
            tone: "ok",
          },
        ],
        ingress: "proposal-routed",
        missingFields: [
          "base-platform",
          "preview-need",
          "source-home",
          "support-profile",
        ],
        mutationBoundary: "none",
        owner: "Prototype Studio",
        previewNeed: "static-review",
        routeReason,
        sourceContext,
        sourceCustody: proposalRouteSelectionSourceCustody(
          routeSelectionDraft,
          repositoryGateResolution,
        ),
        sourceHome: "new-prototype-folder",
        sourceRef: proposal.backendRecordId,
        sourceTitle: proposal.title,
        suggestedPrototypeName: proposal.title,
        summary: proposal.bodyPreview,
        supportProfile: "interactive-prototype",
        visibilityTier: "private-internal",
      },
      producerReceiptRef: `prototype-local://proposal/${producerReceipt.receiptId}`,
      sourceDomain: "proposal",
      sourceOwner: "workspace-proposals",
      sourceRecordId: proposal.backendRecordId,
      sourceVersion: proposal.recordVersion,
      targetDomain: "prototype",
    });
  const custody = createLocalOperationPacketCustody({
    custodyOwner,
    packetId,
    receiptRef: null,
    recordedAt: producerReceipt.recordedAt,
    state: "dispatched",
  });

  return { custody, packet };
}

export function acknowledgeProposalPrototypeEntryPacket({
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
  let acknowledged: PrototypeEntryPacketProjection | null = null;

  proposalPrototypeEntryStore.updateState((currentState) => {
    for (const [proposalId, projection] of currentState.projections) {
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
        projections: new Map(currentState.projections).set(
          proposalId,
          acknowledged,
        ),
      };
    }

    return currentState;
  });

  return acknowledged;
}

function proposalPrototypeRepositoryGateBlocked(
  routeSelectionDraft: ProposalRouteSelectionDraft,
  repositoryGateResolution: ProposalRepositoryGateResolution | null,
) {
  if (!proposalRouteSelectionHasRepositoryGate(routeSelectionDraft)) {
    return false;
  }

  if (routeSelectionDraft.repoMode === "new") {
    return !repositoryGateResolution;
  }

  return !(
    routeSelectionDraft.repoOwner.trim() && routeSelectionDraft.repoRef.trim()
  );
}

function packetSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function proposalEntryProjectionWithPreservedCustody(
  next: PrototypeEntryPacketProjection,
  current: PrototypeEntryPacketProjection | undefined,
) {
  if (
    current?.packet.packetId === next.packet.packetId &&
    JSON.stringify(current.packet) === JSON.stringify(next.packet)
  ) {
    return current;
  }

  return next;
}
