import type {
  OperationCrossDomainPacketEnvelope,
  OperationPacketCustodyProjection,
} from "../operation-runtime/operation-runtime-types.ts";
import type { OperationResolvedSourceCustody } from "./source-custody.ts";

export type PrototypeMovementRequestPacketPayload = {
  baselineReceiptRef: string | null;
  gateSnapshot: readonly {
    gateId: string;
    owner: string;
    status: string;
  }[];
  movementIntent: string;
  movementType: string;
  prototypeId: string;
  prototypeName: string;
  requestReason: string;
  sourceCustody: OperationResolvedSourceCustody;
  sourceRef: string;
  summary: string;
  targetLane: string;
  targetOwner: string;
};

export type PrototypeMovementRequestPacket =
  OperationCrossDomainPacketEnvelope<PrototypeMovementRequestPacketPayload>;

export type PrototypeMovementRequestPacketProjection = Readonly<{
  custody: OperationPacketCustodyProjection;
  packet: PrototypeMovementRequestPacket;
}>;
