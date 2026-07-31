import {
  OPERATION_ARTIFACT_SCHEMA_VERSION,
  type OperationCrossDomainPacketEnvelope,
  type OperationPacketCustodyProjection,
  type OperationPacketCustodyState,
} from "./operation-runtime-types.ts";

export function createLocalOperationCrossDomainPacket<TPayload>({
  causationId,
  correlationId,
  createdAt,
  custodyOwner,
  packetId,
  payload,
  producerReceiptRef,
  sourceDomain,
  sourceOwner,
  sourceRecordId,
  sourceVersion,
  targetDomain,
}: Omit<
  OperationCrossDomainPacketEnvelope<TPayload>,
  "authority" | "schemaVersion"
>): OperationCrossDomainPacketEnvelope<TPayload> {
  return {
    authority: "prototype-local",
    causationId,
    correlationId,
    createdAt,
    custodyOwner,
    packetId,
    payload,
    producerReceiptRef,
    schemaVersion: OPERATION_ARTIFACT_SCHEMA_VERSION,
    sourceDomain,
    sourceOwner,
    sourceRecordId,
    sourceVersion,
    targetDomain,
  };
}

export function createLocalOperationPacketCustody({
  custodyOwner,
  packetId,
  receiptRef,
  recordedAt,
  state,
}: {
  custodyOwner: string;
  packetId: string;
  receiptRef: string | null;
  recordedAt: string;
  state: OperationPacketCustodyState;
}): OperationPacketCustodyProjection {
  return {
    custodyOwner,
    packetId,
    receiptRef,
    recordedAt,
    state,
  };
}

export function assertOperationPacketCustody<TPayload>({
  custody,
  packet,
}: {
  custody: OperationPacketCustodyProjection;
  packet: OperationCrossDomainPacketEnvelope<TPayload>;
}) {
  if (custody.packetId !== packet.packetId) {
    throw new Error(
      `Packet custody ${custody.packetId} does not match packet ${packet.packetId}.`,
    );
  }

  if (custody.custodyOwner !== packet.custodyOwner) {
    throw new Error(
      `Packet custody owner ${custody.custodyOwner} does not match packet owner ${packet.custodyOwner}.`,
    );
  }
}
