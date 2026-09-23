import type { PrototypeRecord } from "../read-model/prototype-workspace-read-model.ts";
import { assertPrototypeDeliveryResultMatchesPacket } from "./prototype-delivery-live-contract.ts";
import type { PrototypeDeliveryApplicationProjection } from "./prototype-delivery-live-types.ts";

export function prototypeRecordSourceId(record: PrototypeRecord) {
  const sourceMatch = /^prototypes\.yaml\/([a-z0-9][a-z0-9-]*)$/.exec(
    record.sourceRef,
  );
  return sourceMatch?.[1] ?? record.id.replace(/^prototype-/, "");
}

export function projectPrototypeDeliveryApplication({
  projection,
  record,
}: {
  projection: PrototypeDeliveryApplicationProjection | undefined;
  record: PrototypeRecord;
}): PrototypeRecord {
  if (!projection) return record;

  const { packet, result } = projection;
  assertPrototypeDeliveryResultMatchesPacket({ packet, result });
  if (
    packet.content.source.prototype_id !== prototypeRecordSourceId(record) ||
    packet.content.source.record_ref !== record.sourceRef
  ) {
    throw new Error(
      "Prototype Delivery projection does not match the selected Prototype record.",
    );
  }

  const receiptExists = record.receipts.some(
    (receipt) => receipt.id === result.receipt.receipt_ref,
  );
  const targetExists = record.linkedRecords.some(
    (linkedRecord) => linkedRecord.ref === result.target.record_ref,
  );

  return {
    ...record,
    currentMove: {
      actionLabel: "Apply Delivery",
      detail:
        "OOS created the Delivery target and retained its receipt. Apply the verified handoff to Prototype Studio next.",
      id: "closeout-retirement",
      label: "Complete Delivery handoff",
      tone: "warn",
    },
    lastMovementReceiptRef: result.receipt.receipt_ref,
    lifecycle: "baseline-approved",
    linkedRecords: targetExists
      ? record.linkedRecords
      : [
          ...record.linkedRecords,
          {
            label: packet.content.work.title,
            level: "Epic",
            ref: result.target.record_ref,
            role: "Delivery target",
            system: "Workspace Delivery ART",
            tone: "ok",
          },
        ],
    movementRequest: {
      ...record.movementRequest,
      lastMovementReceiptRef: result.receipt.receipt_ref,
      requestReason: packet.content.rationale,
      state: "receipt-projected",
      targetHome: "Workspace Delivery ART",
      targetLane: "Delivery Intake",
      targetOwner: "Operator Orchestration Service",
    },
    projectionFreshness: "current OOS Delivery application",
    projectionVersion: result.receipt.content_digest,
    receipts: receiptExists
      ? record.receipts
      : [
          ...record.receipts,
          {
            authority: "source-projected",
            commandId: "apply-prototype-delivery",
            commandName: "prototype.apply-delivery-handoff",
            id: result.receipt.receipt_ref,
            label: "Apply Delivery Handoff",
            recordedAt: result.receipt.recorded_at,
            resultState: "recorded",
            schemaVersion: 1,
            summary: `${result.target.application_state === "created" ? "Created" : "Reused"} ${result.target.record_ref} with durable OOS receipt custody.`,
            tone: "ok",
          },
        ],
    tone: "ok",
  };
}
