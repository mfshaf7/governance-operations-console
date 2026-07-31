import assert from "node:assert/strict";
import test from "node:test";

import {
  acknowledgePrototypeMovementRequestPacket,
  getPrototypeMovementRequestPacketProjections,
  recordPrototypeMovementRequestPacket,
  subscribePrototypeMovementRequestPacketProjections,
} from "../../src/domain-workspaces/operation-integrations/prototype-movement-request-projection.ts";

test("Prototype Movement request dispatches a Delivery packet without claiming target admission", () => {
  const draft = {
    movementIntent: "governed-delivery",
    requestReason: "Move the approved baseline to governed Delivery.",
    targetLane: "delivery-intake",
    targetOwner: "Delivery ingress",
  };
  const appliedRecord = {
    baseline: { lastPacketReceiptRef: "baseline-receipt-1" },
    id: "prototype-movement-1",
    landing: { sourceHome: "new-prototype-folder" },
    movementRequest: {
      gateSnapshot: [
        {
          gateId: "baseline",
          gateKind: "source authority",
          owner: "Prototype Studio",
          status: "ready",
          summary: "Prototype source custody is explicit.",
        },
      ],
      movementType: "baseline",
      requestReason: draft.requestReason,
      state: "request-recorded",
      targetLane: draft.targetLane,
      targetOwner: draft.targetOwner,
    },
    name: "Movement Fixture",
    owner: "Prototype Studio",
    sourceRef: "prototype://movement-1",
    summary: "A baseline-approved prototype ready for Delivery Intake.",
  };
  const receipt = {
    appliedInput: draft,
    appliedRecord,
    commandId: "prepare-movement-request",
    receiptId: "prototype-movement-receipt-1",
    recordedAt: "2026-07-10T16:00:00.000Z",
    recordId: "prototype-movement-1",
    resultState: "recorded",
    sourceVersion: "prototype-v3",
    summary: "Movement request recorded locally.",
    tone: "ok",
  };
  const projection = recordPrototypeMovementRequestPacket(receipt);

  assert.equal(projection.packet.targetDomain, "delivery");
  assert.equal(projection.custody.custodyOwner, "Delivery ingress");
  assert.equal(projection.packet.sourceVersion, "prototype-v3");
  assert.equal(projection.custody.state, "dispatched");
  assert.equal(projection.custody.receiptRef, null);
  assert.equal(
    getPrototypeMovementRequestPacketProjections().some(
      (candidate) => candidate.packet.packetId === projection.packet.packetId,
    ),
    true,
  );

  const admitted = acknowledgePrototypeMovementRequestPacket({
    packetId: projection.packet.packetId,
    receiptRef: "prototype-local://delivery-ingress/receipts/movement-1",
    recordedAt: "2026-07-10T16:00:01.000Z",
    state: "admitted",
  });
  const snapshotAfterAdmission =
    getPrototypeMovementRequestPacketProjections();
  let duplicateEmissions = 0;
  const unsubscribe = subscribePrototypeMovementRequestPacketProjections(
    () => {
      duplicateEmissions += 1;
    },
  );
  const repeated = recordPrototypeMovementRequestPacket(receipt);
  unsubscribe();

  assert.equal(repeated, admitted);
  assert.equal(repeated.custody.state, "admitted");
  assert.equal(
    getPrototypeMovementRequestPacketProjections(),
    snapshotAfterAdmission,
  );
  assert.equal(duplicateEmissions, 0);

  assert.equal(
    recordPrototypeMovementRequestPacket({
      ...receipt,
      appliedRecord: {
        ...appliedRecord,
        id: "prototype-movement-other",
      },
    }),
    null,
  );
  assert.equal(
    recordPrototypeMovementRequestPacket({
      ...receipt,
      appliedInput: {
        ...draft,
        targetLane: "stale-target",
      },
    }),
    null,
  );
});
