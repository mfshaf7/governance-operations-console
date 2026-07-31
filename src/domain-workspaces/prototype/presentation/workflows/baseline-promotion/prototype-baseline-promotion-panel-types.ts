import type { PrototypeBaselinePromotionDraft } from "./prototype-baseline-promotion-view-model.ts";

export type BaselineDraftPatchHandler = (
  patch: Partial<PrototypeBaselinePromotionDraft>,
) => void;
