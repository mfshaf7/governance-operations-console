import { createLocalOperationProjectionVersion } from "../../operation-runtime/operation-runtime-invariants.ts";
import type { OperationRuntimeSource } from "../../operation-runtime/operation-runtime-types.ts";

import type { PrototypeRecord } from "../read-model/prototype-workspace-read-model.ts";
import type { PrototypeLandingCommandInput } from "../work-model/workflows/landing/prototype-landing-model.ts";
import type { PrototypeCommandId } from "../work-model/commands/prototype-command-model.ts";
import type { PrototypeRequestDraft } from "../work-model/entry/prototype-request-types.ts";
import type { PrototypePreviewProfileInput } from "../work-model/preview-runtime/prototype-preview-state-model.ts";
import type { PrototypeBaselinePromotionInput } from "../work-model/workflows/baseline-promotion/prototype-baseline-promotion-model.ts";
import type { PrototypeCandidatePromotionInput } from "../work-model/workflows/candidate-promotion/prototype-candidate-promotion-model.ts";
import type { PrototypeCloseoutInput } from "../work-model/workflows/closeout-retirement/prototype-closeout-retirement-model.ts";
import type { PrototypeMovementRequestDraftInput } from "../work-model/workflows/movement-request/prototype-movement-request-model.ts";

export type PrototypeCommandInputById = {
  "capture-prototype-request": {
    draft: PrototypeRequestDraft;
    requestId: string;
  };
  "confirm-preview-profile": PrototypePreviewProfileInput;
  "land-prototype-request": PrototypeLandingCommandInput;
  "prepare-movement-request": PrototypeMovementRequestDraftInput;
  "record-baseline-promotion": PrototypeBaselinePromotionInput;
  "record-candidate-promotion": PrototypeCandidatePromotionInput;
  "record-closeout-retirement": PrototypeCloseoutInput;
  "refresh-preview-proof": Record<string, never>;
  "restart-preview": Record<string, never>;
  "save-preview-profile": PrototypePreviewProfileInput;
  "start-preview": Record<string, never>;
  "stop-preview": Record<string, never>;
};

export type PrototypeRuntimeCommand = {
  [CommandId in PrototypeCommandId]: {
    commandId: CommandId;
    input: PrototypeCommandInputById[CommandId];
    record: PrototypeRecord;
  };
}[PrototypeCommandId];

export type PrototypeRuntimeRun = {
  record: PrototypeRecord;
  resultState: "blocked" | "recorded" | "review-only";
  summary: string;
  tone: PrototypeRecord["tone"];
};

type PrototypeReceiptBase<CommandId extends PrototypeCommandId> = {
  actionLabel: string;
  appliedInput: PrototypeCommandInputById[CommandId];
  appliedRecord: PrototypeRecord;
  authority: "prototype-local";
  commandId: CommandId;
  commandName: `prototype.${CommandId}`;
  receiptId: string;
  recordedAt: string;
  recordId: string;
  resultState: "blocked" | "recorded" | "review-only";
  routeOwner: "prototype-operation";
  schemaVersion: 1;
  sourceVersion: string;
  summary: string;
  tone: PrototypeRecord["tone"];
};

export type PrototypeLocalReceipt = {
  [CommandId in PrototypeCommandId]: PrototypeReceiptBase<CommandId>;
}[PrototypeCommandId];

export type PrototypeRuntimeProjectionState = {
  localRequestRecords: PrototypeRecord[];
  receiptsByRecord: Record<string, PrototypeLocalReceipt[]>;
};

export type PrototypeRuntimeProjectionSnapshot =
  PrototypeRuntimeProjectionState;

export const prototypeRuntimeSource = {
  authority: "prototype-local",
  mode: "local",
  sourceOwner: "prototype-operation",
} satisfies OperationRuntimeSource & { mode: "local" };

export function prototypeRecordSourceVersion(record: PrototypeRecord) {
  return createLocalOperationProjectionVersion({
    projection: record,
    sourceOwner: prototypeRuntimeSource.sourceOwner,
  });
}
