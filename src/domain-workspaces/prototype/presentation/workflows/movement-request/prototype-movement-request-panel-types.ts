import type { TerasTone } from "@/teras";

import type { PrototypeMovementRequestLocalDraft } from "./prototype-movement-request-view-model.ts";

export type MovementDraftPatchHandler = (
  patch: Partial<PrototypeMovementRequestLocalDraft>,
) => void;

export type MovementStatus = {
  label: string;
  tone: TerasTone;
};

export type MovementGateFactStatus = {
  status: string;
};
