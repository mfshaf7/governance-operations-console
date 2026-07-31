import type { OperationTone } from "../../../operation-contracts/operation-state.ts";

import type {
  PrototypeBasePlatform,
  PrototypeDataMode,
  PrototypeMutationBoundary,
  PrototypePreviewNeed,
  PrototypeSourceHome,
  PrototypeSupportProfile,
  PrototypeVisibilityTier,
} from "../../domain/prototype-types.ts";

export type PrototypeRequestDraft = {
  basePlatform: PrototypeBasePlatform;
  dataMode: PrototypeDataMode;
  mutationBoundary: PrototypeMutationBoundary;
  name: string;
  owner: string;
  previewNeed: PrototypePreviewNeed;
  prototypeObjective: string;
  sourceContext: string;
  sourceHome: PrototypeSourceHome;
  supportProfile: PrototypeSupportProfile;
  visibilityTier: PrototypeVisibilityTier;
};

export type PrototypeRequestReadinessRow = {
  detail: string;
  id:
    | "boundary"
    | "prototype-objective"
    | "source-context"
    | "studio-options"
    | "support-setup"
    | "request-identity";
  indexLabel: string;
  label: string;
  status: string;
  tone: OperationTone;
};

export const emptyPrototypeRequestDraft: PrototypeRequestDraft = {
  basePlatform: "custom-unassigned",
  dataMode: "synthetic",
  mutationBoundary: "none",
  name: "",
  owner: "",
  previewNeed: "static-review",
  prototypeObjective: "",
  sourceContext: "",
  sourceHome: "new-prototype-folder",
  supportProfile: "simple-prototype",
  visibilityTier: "private-internal",
};
