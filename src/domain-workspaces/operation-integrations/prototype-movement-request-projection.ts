import { createLocalOperationProjectionStore } from "../operation-runtime/local-operation-projection-store.ts";
import {
  createLocalOperationCrossDomainPacket,
  createLocalOperationPacketCustody,
} from "../operation-runtime/operation-packet-invariants.ts";

import type { PrototypeLocalReceipt } from "../prototype/local-runtime/prototype-runtime-model.ts";
import type { PrototypeRecord } from "../prototype/read-model/prototype-workspace-read-model.ts";
import type {
  PrototypeMovementRequestPacketPayload,
  PrototypeMovementRequestPacketProjection,
} from "../operation-contracts/prototype-movement-request.ts";
import type { OperationResolvedSourceCustody } from "../operation-contracts/source-custody.ts";

type PrototypeMovementRequestProjectionState = {
  projections: Map<string, PrototypeMovementRequestPacketProjection>;
};

type PrototypeMovementRequestReceipt = Extract<
  PrototypeLocalReceipt,
  { commandId: "prepare-movement-request" }
>;

const prototypeMovementRequestStore = createLocalOperationProjectionStore<
  PrototypeMovementRequestProjectionState,
  PrototypeMovementRequestPacketProjection[]
>({
  initialState: { projections: new Map() },
  projectSnapshot: (state) => Array.from(state.projections.values()),
  runtimeSource: {
    authority: "prototype-local",
    mode: "local",
    sourceOwner: "prototype-movement-request",
  },
});

export function recordPrototypeMovementRequestPacket(
  receipt: PrototypeLocalReceipt,
) {
  if (!prototypeMovementRequestReceiptCanDispatch(receipt)) {
    return null;
  }

  const draft = receipt.appliedInput;
  const record = receipt.appliedRecord;
  const sourceCustody = prototypeMovementSourceCustody(record);

  if (!sourceCustody) {
    return null;
  }

  const packetId = `prototype-movement://${packetSlug(receipt.receiptId)}`;
  const custodyOwner = "Delivery ingress";
  const packet =
    createLocalOperationCrossDomainPacket<PrototypeMovementRequestPacketPayload>(
      {
        causationId: receipt.receiptId,
        correlationId: record.id,
        createdAt: receipt.recordedAt,
        custodyOwner,
        packetId,
        payload: {
          baselineReceiptRef: record.baseline.lastPacketReceiptRef,
          gateSnapshot: record.movementRequest.gateSnapshot.map((gate) => ({
            gateId: gate.gateId,
            owner: gate.owner,
            status: gate.status,
          })),
          movementIntent: draft.movementIntent,
          movementType: record.movementRequest.movementType,
          prototypeId: record.id,
          prototypeName: record.name,
          requestReason: record.movementRequest.requestReason,
          sourceCustody,
          sourceRef: record.sourceRef,
          summary: record.summary,
          targetLane: record.movementRequest.targetLane,
          targetOwner: record.movementRequest.targetOwner,
        },
        producerReceiptRef: `prototype-local://prototype/${receipt.receiptId}`,
        sourceDomain: "prototype",
        sourceOwner: "workspace-prototype-studio",
        sourceRecordId: record.id,
        sourceVersion: receipt.sourceVersion,
        targetDomain: "delivery",
      },
    );
  const custody = createLocalOperationPacketCustody({
    custodyOwner,
    packetId,
    receiptRef: null,
    recordedAt: receipt.recordedAt,
    state: "dispatched",
  });
  const projection = { custody, packet };

  prototypeMovementRequestStore.updateState((currentState) => {
    const currentProjection = currentState.projections.get(record.id);
    const nextProjection = prototypeMovementProjectionWithPreservedCustody(
      projection,
      currentProjection,
    );

    if (nextProjection === currentProjection) {
      return currentState;
    }

    return {
      projections: new Map(currentState.projections).set(
        record.id,
        nextProjection,
      ),
    };
  });

  return prototypeMovementRequestStore.getState().projections.get(record.id);
}

function prototypeMovementRequestReceiptCanDispatch(
  receipt: PrototypeLocalReceipt,
): receipt is PrototypeMovementRequestReceipt {
  const movementRequest = receipt.appliedRecord.movementRequest;

  return (
    receipt.commandId === "prepare-movement-request" &&
    receipt.resultState === "recorded" &&
    receipt.recordId === receipt.appliedRecord.id &&
    movementRequest.state === "request-recorded" &&
    movementRequest.requestReason === receipt.appliedInput.requestReason &&
    movementRequest.targetLane === receipt.appliedInput.targetLane &&
    movementRequest.targetOwner === receipt.appliedInput.targetOwner
  );
}

export function getPrototypeMovementRequestPacketProjections() {
  return prototypeMovementRequestStore.getSnapshot();
}

export function subscribePrototypeMovementRequestPacketProjections(
  listener: () => void,
) {
  return prototypeMovementRequestStore.subscribe(listener);
}

export function acknowledgePrototypeMovementRequestPacket({
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
  let acknowledged: PrototypeMovementRequestPacketProjection | null = null;

  prototypeMovementRequestStore.updateState((currentState) => {
    for (const [prototypeId, projection] of currentState.projections) {
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
          prototypeId,
          acknowledged,
        ),
      };
    }

    return currentState;
  });

  return acknowledged;
}

export function prototypeMovementSourceCustody(
  record: PrototypeRecord,
): OperationResolvedSourceCustody | null {
  const custodyGate =
    record.movementRequest.gateSnapshot.find((gate) =>
      gate.gateKind.includes("repository/source custody"),
    ) ??
    record.movementRequest.gateSnapshot.find((gate) =>
      gate.gateKind.includes("source authority"),
    );

  if (
    !custodyGate ||
    !["not-required", "ready", "waived"].includes(custodyGate.status)
  ) {
    return null;
  }

  const classification = prototypeMovementSourceClassification(record);

  return {
    classification,
    owner: record.owner,
    rationale: custodyGate.summary,
    repo_ref: classification === "non-source-work" ? null : record.sourceRef,
    repository_gate_state:
      custodyGate.status === "not-required" || custodyGate.status === "waived"
        ? "not-required"
        : "resolved",
  };
}

function prototypeMovementSourceClassification(
  record: PrototypeRecord,
): OperationResolvedSourceCustody["classification"] {
  switch (record.landing.sourceHome) {
    case "existing-source":
      return "existing-repo";
    case "future-owner-repo":
      return "new-repo-required";
    case "docs-only":
      return "non-source-work";
    case "app-folder":
    case "console-domain-module":
    case "new-prototype-folder":
      return "platform-internal";
  }
}

function packetSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function prototypeMovementProjectionWithPreservedCustody(
  next: PrototypeMovementRequestPacketProjection,
  current: PrototypeMovementRequestPacketProjection | undefined,
) {
  if (
    current?.packet.packetId === next.packet.packetId &&
    JSON.stringify(current.packet) === JSON.stringify(next.packet)
  ) {
    return current;
  }

  return next;
}
