import type { TerasTone } from "@/teras";

import type { CloseoutDraft } from "./prototype-closeout-retirement-view-model.ts";

export type CloseoutDraftPatchHandler = (patch: Partial<CloseoutDraft>) => void;

export type CloseoutStatus = {
  label: string;
  panelTone?: TerasTone;
  tone: TerasTone;
};
