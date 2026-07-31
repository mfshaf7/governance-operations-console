import type { TerasTone } from "@/teras";

import type { PrototypePreviewLaunchAdapter } from "../../../read-model/prototype-workspace-read-model.ts";

export type PrototypePreviewProofResult = {
  currentStep: string;
  logRef: string;
  receiptRef: string;
  requiredMove: string;
  statusLabel: string;
  summary: string;
  title: string;
  tone: TerasTone;
};

export type PrototypePreviewRecoveryRow = {
  detail: string;
  label: string;
  status: string;
  tone: TerasTone;
};

export type PrototypePreviewRuntimeTab = "evidence" | "profile" | "runtime";

export const prototypePreviewRuntimeTabOptions: Array<{
  label: string;
  value: PrototypePreviewRuntimeTab;
}> = [
  {
    label: "Runtime",
    value: "runtime",
  },
  {
    label: "Profile",
    value: "profile",
  },
  {
    label: "Evidence",
    value: "evidence",
  },
];

export type PrototypePreviewRuntimeActionId =
  | "check-status"
  | "open-blocker"
  | "prepare-proof"
  | "restart-preview"
  | "start-preview"
  | "stop-preview";

export type PrototypePreviewRuntimeAction = {
  detail: string;
  disabled?: boolean;
  id: PrototypePreviewRuntimeActionId;
  label: string;
  tone: TerasTone;
};

export type PrototypePreviewRuntimeFact = {
  label: string;
  value: string;
};

export type PrototypePreviewRuntimeRow = {
  detail: string;
  label: string;
  status: string;
  tone: TerasTone;
};

export type PrototypePreviewRuntimeActionDetail = {
  facts: PrototypePreviewRuntimeFact[];
  primaryAction: string;
  primaryBehavior?:
    | "close"
    | "record-preview-check"
    | "restart-preview"
    | "start-preview"
    | "stop-preview";
  rows: PrototypePreviewRuntimeRow[];
  secondaryAction?: string;
  summary: string;
  title: string;
  tone: TerasTone;
};

export type PrototypePreviewActionDialogShell = {
  description?: string;
  title: string;
};

export type PrototypePreviewMetric = {
  label: string;
  tone: TerasTone;
  value: string;
};

export type PrototypePreviewPanelProjection = {
  statusLabel: string;
  tone: TerasTone;
};

export type PrototypePreviewRuntimeMutationActionId = Extract<
  PrototypePreviewRuntimeActionId,
  "restart-preview" | "start-preview" | "stop-preview"
>;

export type PrototypePreviewProfileDraft = {
  command: string;
  healthcheckPath: string;
  host: string;
  launchAdapter: PrototypePreviewLaunchAdapter;
  port: string;
  profileRef: string;
  profileSource: string;
  workingDirectory: string;
};

export type PrototypePreviewProfileMutationActionId =
  "confirm-preview-profile" | "save-preview-profile";
