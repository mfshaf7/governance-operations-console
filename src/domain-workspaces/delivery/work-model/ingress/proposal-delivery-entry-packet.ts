import { assertOperationPacketCustody } from "../../../operation-runtime/operation-packet-invariants.ts";
import type {
  OperationCrossDomainPacketEnvelope,
  OperationPacketCustodyProjection,
} from "../../../operation-runtime/operation-runtime-types.ts";
import type { OperationResolvedSourceCustody } from "../../../operation-contracts/source-custody.ts";

import type { DeliveryIntakeSource } from "../../domain/delivery-types.ts";

export type ProposalDeliveryEntryPacketPayload = {
  acceptedSourceId: string;
  proposalRef: string;
  routeReason: string;
  sourceCustody: OperationResolvedSourceCustody;
  summary: string;
  title: string;
};

export type ProposalDeliveryEntryPacket =
  OperationCrossDomainPacketEnvelope<ProposalDeliveryEntryPacketPayload>;

export type ProposalDeliveryEntryPacketProjection = Readonly<{
  custody: OperationPacketCustodyProjection;
  packet: ProposalDeliveryEntryPacket;
}>;

export function deliveryIntakeSourceFromProposalEntryPacket(
  projection: ProposalDeliveryEntryPacketProjection,
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
    accepted_source_id: payload.acceptedSourceId,
    consumed_at: null,
    delivery_package_id: null,
    evidence_refs: [
      packet.packetId,
      ...(packet.producerReceiptRef ? [packet.producerReceiptRef] : []),
    ],
    expected_backend_route: `POST /v1/ideas/${payload.proposalRef}/consume`,
    gate_summary:
      "Accepted Proposal packet has resolved source custody and is ready for Delivery Intake verification.",
    intake_status: "needs_consume",
    owner: payload.sourceCustody.owner,
    source_kind: "proposal",
    source_ref: payload.proposalRef,
    source_custody: payload.sourceCustody,
    status_label: "Needs Consume",
    summary: payload.summary,
    title: payload.title,
    tone: "warn",
    work_design_session_ref: null,
  };
}
