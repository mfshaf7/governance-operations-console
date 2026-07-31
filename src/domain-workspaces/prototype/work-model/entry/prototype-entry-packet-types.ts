import type { OperationTone } from "../../../operation-contracts/operation-state.ts";
import type { OperationSourceCustody } from "../../../operation-contracts/source-custody.ts";
import type {
  OperationCrossDomainPacketEnvelope,
  OperationPacketCustodyProjection,
} from "../../../operation-runtime/index.ts";

import type {
  PrototypeBasePlatform,
  PrototypeDataMode,
  PrototypeIngressClass,
  PrototypeMutationBoundary,
  PrototypePreviewNeed,
  PrototypeSourceHome,
  PrototypeSupportProfile,
  PrototypeVisibilityTier,
} from "../../domain/prototype-types.ts";

export type PrototypeEntryPacketMissingField =
  | "base-platform"
  | "data-mode"
  | "mutation-boundary"
  | "preview-need"
  | "prototype-name"
  | "source-home"
  | "support-profile"
  | "visibility-tier";

export type PrototypeEntryPacketEvidence = {
  detail: string;
  label: string;
  tone: OperationTone;
};

export type PrototypeEntryPacketPayload = {
  basePlatform: PrototypeBasePlatform;
  dataMode: PrototypeDataMode;
  entryId: string;
  evidence: PrototypeEntryPacketEvidence[];
  ingress: PrototypeIngressClass;
  missingFields: PrototypeEntryPacketMissingField[];
  mutationBoundary: PrototypeMutationBoundary;
  owner: string;
  previewNeed: PrototypePreviewNeed;
  routeReason: string;
  sourceContext: string;
  sourceCustody: OperationSourceCustody;
  sourceHome: PrototypeSourceHome;
  sourceRef: string;
  sourceTitle: string;
  suggestedPrototypeName: string | null;
  summary: string;
  supportProfile: PrototypeSupportProfile;
  visibilityTier: PrototypeVisibilityTier;
};

export type PrototypeEntryPacket =
  OperationCrossDomainPacketEnvelope<PrototypeEntryPacketPayload>;

export type PrototypeEntryPacketProjection = Readonly<{
  custody: OperationPacketCustodyProjection;
  packet: PrototypeEntryPacket;
}>;
