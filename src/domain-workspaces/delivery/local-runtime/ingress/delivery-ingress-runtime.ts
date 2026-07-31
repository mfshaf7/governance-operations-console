import { createLocalOperationProjectionStore } from "../../../operation-runtime/index.ts";
import {
  acknowledgeProposalDeliveryEntryPacket,
  getProposalDeliveryEntryPacketProjections,
  subscribeProposalDeliveryEntryPacketProjections,
} from "../../../operation-integrations/proposal-delivery-entry-projection.ts";
import {
  acknowledgePrototypeMovementRequestPacket,
  getPrototypeMovementRequestPacketProjections,
  subscribePrototypeMovementRequestPacketProjections,
} from "../../../operation-integrations/prototype-movement-request-projection.ts";

import type { DeliveryIntakeSource } from "../../domain/delivery-intake.ts";
import { deliveryIntakeSourceFromProposalEntryPacket } from "../../work-model/ingress/proposal-delivery-entry-packet.ts";
import { deliveryIntakeSourceFromPrototypeMovementPacket } from "../../work-model/ingress/prototype-movement-entry-packet.ts";

export type DeliveryIngressReceipt = {
  acceptedSourceId: string | null;
  outcome: "admitted" | "rejected";
  packetId: string;
  receiptId: string;
  recordedAt: string;
  sourceDomain: "proposal" | "prototype";
  summary: string;
};

type DeliveryIngressState = {
  intakeSourcesById: Record<string, DeliveryIntakeSource>;
  receiptsByPacketId: Record<string, DeliveryIngressReceipt>;
};

export type DeliveryIngressProjectionSnapshot = {
  intakeSources: DeliveryIntakeSource[];
  receipts: DeliveryIngressReceipt[];
};

const deliveryIngressStore = createLocalOperationProjectionStore<
  DeliveryIngressState,
  DeliveryIngressProjectionSnapshot
>({
  initialState: {
    intakeSourcesById: {},
    receiptsByPacketId: {},
  },
  projectSnapshot: (state) => ({
    intakeSources: Object.values(state.intakeSourcesById),
    receipts: Object.values(state.receiptsByPacketId),
  }),
  runtimeSource: {
    authority: "prototype-local",
    mode: "local",
    sourceOwner: "delivery-ingress",
  },
});

let deliveryIngressStarted = false;
let reconcilingDeliveryIngress = false;

export function getDeliveryIngressProjectionSnapshot() {
  ensureDeliveryIngressStarted();
  return deliveryIngressStore.getSnapshot();
}

export function subscribeDeliveryIngressProjection(listener: () => void) {
  ensureDeliveryIngressStarted();
  return deliveryIngressStore.subscribe(listener);
}

export function reconcileDeliveryIngress() {
  if (reconcilingDeliveryIngress) {
    return;
  }

  reconcilingDeliveryIngress = true;

  try {
    for (const projection of getProposalDeliveryEntryPacketProjections()) {
      admitDeliveryPacket({
        acknowledge: acknowledgeProposalDeliveryEntryPacket,
        createSource: () =>
          deliveryIntakeSourceFromProposalEntryPacket(projection),
        packetId: projection.packet.packetId,
        recordedAt: projection.packet.createdAt,
        sourceDomain: "proposal",
      });
    }

    for (const projection of getPrototypeMovementRequestPacketProjections()) {
      admitDeliveryPacket({
        acknowledge: acknowledgePrototypeMovementRequestPacket,
        createSource: () =>
          deliveryIntakeSourceFromPrototypeMovementPacket(projection),
        packetId: projection.packet.packetId,
        recordedAt: projection.packet.createdAt,
        sourceDomain: "prototype",
      });
    }
  } finally {
    reconcilingDeliveryIngress = false;
  }
}

function ensureDeliveryIngressStarted() {
  if (deliveryIngressStarted) {
    return;
  }

  deliveryIngressStarted = true;
  subscribeProposalDeliveryEntryPacketProjections(reconcileDeliveryIngress);
  subscribePrototypeMovementRequestPacketProjections(reconcileDeliveryIngress);
  reconcileDeliveryIngress();
}

function admitDeliveryPacket({
  acknowledge,
  createSource,
  packetId,
  recordedAt,
  sourceDomain,
}: {
  acknowledge: (input: {
    packetId: string;
    receiptRef: string;
    recordedAt: string;
    state: "admitted" | "rejected" | "returned";
  }) => unknown;
  createSource: () => DeliveryIntakeSource;
  packetId: string;
  recordedAt: string;
  sourceDomain: DeliveryIngressReceipt["sourceDomain"];
}) {
  if (deliveryIngressStore.getState().receiptsByPacketId[packetId]) {
    return;
  }

  const receiptId = `delivery-ingress-${packetSlug(packetId)}`;
  const receiptRef = `prototype-local://delivery-ingress/receipts/${receiptId}`;

  try {
    const source = createSource();
    const receipt: DeliveryIngressReceipt = {
      acceptedSourceId: source.accepted_source_id,
      outcome: "admitted",
      packetId,
      receiptId,
      recordedAt,
      sourceDomain,
      summary: `${source.title} admitted to Delivery Intake.`,
    };

    deliveryIngressStore.updateState((currentState) => ({
      intakeSourcesById: {
        ...currentState.intakeSourcesById,
        [source.accepted_source_id]: source,
      },
      receiptsByPacketId: {
        ...currentState.receiptsByPacketId,
        [packetId]: receipt,
      },
    }));
    acknowledge({
      packetId,
      receiptRef,
      recordedAt,
      state: "admitted",
    });
  } catch (error) {
    const receipt: DeliveryIngressReceipt = {
      acceptedSourceId: null,
      outcome: "rejected",
      packetId,
      receiptId,
      recordedAt,
      sourceDomain,
      summary:
        error instanceof Error
          ? error.message
          : "Delivery Intake rejected an invalid ingress packet.",
    };

    deliveryIngressStore.updateState((currentState) => ({
      ...currentState,
      receiptsByPacketId: {
        ...currentState.receiptsByPacketId,
        [packetId]: receipt,
      },
    }));
    acknowledge({
      packetId,
      receiptRef,
      recordedAt,
      state: "rejected",
    });
  }
}

function packetSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
