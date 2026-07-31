import { createLocalOperationProjectionStore } from "../operation-runtime/local-operation-projection-store.ts";
import {
  createLocalOperationCrossDomainPacket,
  createLocalOperationPacketCustody,
} from "../operation-runtime/operation-packet-invariants.ts";

import type {
  ProposalDeliveryEntryPacketPayload,
  ProposalDeliveryEntryPacketProjection,
} from "../delivery/work-model/ingress/proposal-delivery-entry-packet.ts";
import {
  proposalRouteSelectionSourceCustody,
  type ProposalRouteSelectionDraft,
} from "../proposal/work-model/proposal-disposition-model.ts";
import type { ProposalHandoffDraft } from "../proposal/work-model/proposal-handoff-model.ts";
import type { ProposalWorkspaceScenario } from "../proposal/read-model/proposal-workspace-read-model.ts";
import type { ProposalRepositoryGateResolution } from "./proposal-repository-request-projection.ts";
import type {
  OperationResolvedSourceCustody,
  OperationSourceCustody,
} from "../operation-contracts/source-custody.ts";

type ProposalDeliveryEntryState = {
  projections: Map<string, ProposalDeliveryEntryPacketProjection>;
};

const proposalDeliveryEntryStore = createLocalOperationProjectionStore<
  ProposalDeliveryEntryState,
  ProposalDeliveryEntryPacketProjection[]
>({
  initialState: { projections: new Map() },
  projectSnapshot: (state) => Array.from(state.projections.values()),
  runtimeSource: {
    authority: "prototype-local",
    mode: "local",
    sourceOwner: "proposal-delivery-entry",
  },
});

export function recordProposalDeliveryEntryPacketFromHandoff({
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
  if (
    routeSelectionDraft.routeTarget !== "Delivery" ||
    handoffDraft.result !== "ready"
  ) {
    return null;
  }

  const sourceCustody = proposalRouteSelectionSourceCustody(
    routeSelectionDraft,
    repositoryGateResolution,
  );
  const resolvedSourceCustody = proposalResolvedSourceCustody(sourceCustody);
  if (!resolvedSourceCustody) {
    return null;
  }

  const packetId = `proposal-delivery-${packetSlug(
    `${proposal.id}-${producerReceipt.receiptId}`,
  )}`;
  const custodyOwner = "delivery-intake";
  const routeReason =
    routeSelectionDraft.rationale.trim() ||
    proposal.handoffRule ||
    "Accepted proposal routed to Delivery.";
  const packet =
    createLocalOperationCrossDomainPacket<ProposalDeliveryEntryPacketPayload>({
      causationId: producerReceipt.receiptId,
      correlationId: proposal.backendRecordId,
      createdAt: producerReceipt.recordedAt,
      custodyOwner,
      packetId,
      payload: {
        acceptedSourceId: `proposal-${packetSlug(proposal.id)}`,
        proposalRef: proposal.backendRecordId,
        routeReason,
        sourceCustody: resolvedSourceCustody,
        summary: `${proposal.bodyPreview} ${routeReason}`.trim(),
        title: proposal.title,
      },
      producerReceiptRef: `prototype-local://proposal/${producerReceipt.receiptId}`,
      sourceDomain: "proposal",
      sourceOwner: "workspace-proposals",
      sourceRecordId: proposal.backendRecordId,
      sourceVersion: proposal.recordVersion,
      targetDomain: "delivery",
    });
  const custody = createLocalOperationPacketCustody({
    custodyOwner,
    packetId,
    receiptRef: null,
    recordedAt: producerReceipt.recordedAt,
    state: "dispatched",
  });
  const projection = { custody, packet };

  proposalDeliveryEntryStore.updateState((currentState) => {
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

  return proposalDeliveryEntryStore.getState().projections.get(proposal.id);
}

export function subscribeProposalDeliveryEntryPacketProjections(
  listener: () => void,
) {
  return proposalDeliveryEntryStore.subscribe(listener);
}

export function getProposalDeliveryEntryPacketProjections() {
  return proposalDeliveryEntryStore.getSnapshot();
}

export function acknowledgeProposalDeliveryEntryPacket({
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
  let acknowledged: ProposalDeliveryEntryPacketProjection | null = null;

  proposalDeliveryEntryStore.updateState((currentState) => {
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

function packetSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function proposalResolvedSourceCustody(
  custody: OperationSourceCustody,
): OperationResolvedSourceCustody | null {
  if (
    custody.repository_gate_state !== "resolved" &&
    custody.repository_gate_state !== "not-required"
  ) {
    return null;
  }

  return custody as OperationResolvedSourceCustody;
}

function proposalEntryProjectionWithPreservedCustody(
  next: ProposalDeliveryEntryPacketProjection,
  current: ProposalDeliveryEntryPacketProjection | undefined,
) {
  if (
    current?.packet.packetId === next.packet.packetId &&
    JSON.stringify(current.packet) === JSON.stringify(next.packet)
  ) {
    return current;
  }

  return next;
}
