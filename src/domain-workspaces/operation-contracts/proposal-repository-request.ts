import type {
  OperationCrossDomainPacketEnvelope,
  OperationPacketCustodyProjection,
} from "../operation-runtime/operation-runtime-types.ts";

import type { OperationSourceCustody } from "./source-custody.ts";

export type ProposalRepositoryRequestPacketPayload = {
  appliedAt: string;
  bodyPreview: string;
  proposalId: string;
  proposalTitle: string;
  rationale: string;
  repoGateDetail: string;
  repoGateOwner: string | null;
  repoRef: string;
  routeSource: string;
  routeTarget: "Delivery" | "Prototype";
  sourceCustody: OperationSourceCustody;
  sourceLabel: string;
};

export type ProposalRepositoryRequestPacket =
  OperationCrossDomainPacketEnvelope<ProposalRepositoryRequestPacketPayload>;

export type ProposalRepositoryRequestPacketProjection = Readonly<{
  custody: OperationPacketCustodyProjection;
  packet: ProposalRepositoryRequestPacket;
}>;

export type ProposalRepositoryGateResolution = {
  notes: string;
  proposalId: string;
  recordedAt: string;
  receiptId: string;
  repoRequestRef: string;
  resolvedOwner: string;
  resolvedRepoRef: string;
  result: "resolved";
  sourceVersion: string;
};
