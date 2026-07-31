import type {
  DeliveryRefinementApplyReceipt,
  DeliveryRefinementMetadataResolution,
  DeliveryRefinementStepId,
} from "../../domain/delivery-types.ts";

export type DeliveryRefinementModalStep =
  DeliveryRefinementStepId | "hub" | "receipt";

export type RefinementMetadataFieldResolution =
  DeliveryRefinementMetadataResolution;

export type RefinementMetadataFieldResolutionMap = Record<
  string,
  RefinementMetadataFieldResolution
>;

export type RefinementMetadataSelectionMode = "shared" | "single";

export type RefinementSessionMetadataDraft = {
  draftValues: Record<string, string>;
  fieldResolutions: RefinementMetadataFieldResolutionMap;
  selectedBulkNodeIds: string[];
  selectedFieldKey: string;
  selectionMode: RefinementMetadataSelectionMode;
};

export type RefinementSessionApplyReceipt = {
  receipt: DeliveryRefinementApplyReceipt | null;
};

export type RefinementPersistedSession = {
  activeStep: DeliveryRefinementModalStep;
  apply: RefinementSessionApplyReceipt;
  lastSavedAt: string;
  metadata: RefinementSessionMetadataDraft;
  packageId: string;
  packetId: string;
  refinementSessionId: string;
  schemaVersion: 1;
};
