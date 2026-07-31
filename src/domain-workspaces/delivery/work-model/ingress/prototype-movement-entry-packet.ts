import { assertOperationPacketCustody } from "../../../operation-runtime/operation-packet-invariants.ts";

import type { DeliveryIntakeSource } from "../../domain/delivery-intake.ts";
import type { PrototypeMovementRequestPacketProjection } from "../../../operation-contracts/prototype-movement-request.ts";

export function deliveryIntakeSourceFromPrototypeMovementPacket(
  projection: PrototypeMovementRequestPacketProjection,
): DeliveryIntakeSource {
  const { custody, packet } = projection;
  assertOperationPacketCustody({ custody, packet });

  if (packet.targetDomain !== "delivery") {
    throw new Error(
      `Delivery Intake cannot project packet ${packet.packetId} for ${packet.targetDomain}.`,
    );
  }

  const payload = packet.payload;

  return {
    accepted_source_id: `prototype-${sourceSlug(payload.prototypeId)}`,
    consumed_at: null,
    delivery_package_id: null,
    evidence_refs: [
      packet.packetId,
      ...(packet.producerReceiptRef ? [packet.producerReceiptRef] : []),
      ...(payload.baselineReceiptRef ? [payload.baselineReceiptRef] : []),
    ],
    expected_backend_route: "delivery.ingress.prototype-movement (future)",
    gate_summary:
      "Prototype baseline and movement gates are ready for Delivery Intake verification.",
    intake_status: "needs_consume",
    owner: payload.sourceCustody.owner,
    source_custody: payload.sourceCustody,
    source_kind: "prototype",
    source_ref: payload.sourceRef,
    status_label: "Needs Consume",
    summary: payload.summary,
    title: payload.prototypeName,
    tone: "warn",
    work_design_session_ref: null,
  };
}

function sourceSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
