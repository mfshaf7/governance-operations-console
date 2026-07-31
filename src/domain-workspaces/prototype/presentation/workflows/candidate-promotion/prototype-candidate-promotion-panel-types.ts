import type { PrototypeCandidatePromotionDraft } from "./prototype-candidate-promotion-view-model.ts";

export type CandidateDraftPatchHandler = (
  patch: Partial<PrototypeCandidatePromotionDraft>,
) => void;
