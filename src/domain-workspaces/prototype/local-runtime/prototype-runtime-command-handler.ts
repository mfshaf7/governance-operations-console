import type {
  OperationCommandEnvelope,
  OperationCommandRunEnvelope,
  OperationCommandRunResult,
} from "../../operation-runtime/operation-runtime-types.ts";

import type { PrototypeRecord } from "../read-model/prototype-workspace-read-model.ts";
import { getPrototypeCommandView } from "../work-model/commands/prototype-command-model.ts";
import {
  prototypeRecordAfterPreviewCheckCommand,
  prototypeRecordAfterPreviewProfileCommand,
  prototypeRecordAfterPreviewRuntimeCommand,
} from "../work-model/preview-runtime/prototype-preview-state-model.ts";
import { prototypeRecordAfterBaselinePromotion } from "../work-model/workflows/baseline-promotion/prototype-baseline-promotion-model.ts";
import { prototypeRecordAfterCandidatePromotion } from "../work-model/workflows/candidate-promotion/prototype-candidate-promotion-model.ts";
import { prototypeRecordAfterCloseoutRetirement } from "../work-model/workflows/closeout-retirement/prototype-closeout-retirement-model.ts";
import { prototypeRecordAfterLanding } from "../work-model/workflows/landing/prototype-landing-model.ts";
import { prototypeRecordAfterMovementRequest } from "../work-model/workflows/movement-request/prototype-movement-request-model.ts";
import type {
  PrototypeCommandInputById,
  PrototypeLocalReceipt,
  PrototypeRuntimeCommand,
  PrototypeRuntimeRun,
} from "./prototype-runtime-model.ts";

export function prototypeRuntimeRunFromCommand(
  command: OperationCommandEnvelope<PrototypeRuntimeCommand>,
): OperationCommandRunResult<PrototypeRuntimeRun> {
  const commandView = getPrototypeCommandView(
    command.command.record,
    command.command.commandId,
  );
  const receiptId = prototypeRuntimeReceiptId(
    command.command.commandId,
    command.idempotencyKey,
  );

  if (commandView.disabledReason) {
    return {
      run: {
        record: command.command.record,
        resultState: "blocked",
        summary: commandView.disabledReason,
        tone: "warn",
      },
      state: "blocked",
      summary: commandView.disabledReason,
      updatedAt: command.submittedAt,
    };
  }

  const record = prototypeRecordFromCommand({ command, receiptId });
  const resultState = prototypeResultState(
    command.command.commandId,
    command.command.record,
    record,
  );
  const summary = prototypeReceiptSummary(command.command, resultState);

  return {
    run: {
      record,
      resultState,
      summary,
      tone: resultState === "blocked" ? "warn" : commandView.tone,
    },
    state: resultState === "blocked" ? "blocked" : "completed",
    summary,
    updatedAt: command.submittedAt,
  };
}

export function prototypeRuntimeReceiptFromRun({
  command,
  run,
}: {
  command: OperationCommandEnvelope<PrototypeRuntimeCommand>;
  run: OperationCommandRunEnvelope<PrototypeRuntimeRun>;
}): PrototypeLocalReceipt {
  const commandView = getPrototypeCommandView(
    command.command.record,
    command.command.commandId,
  );

  return {
    actionLabel: commandView.label,
    appliedInput: command.command.input,
    appliedRecord: run.run.record,
    authority: "prototype-local",
    commandId: command.command.commandId,
    commandName: `prototype.${command.command.commandId}`,
    receiptId: prototypeRuntimeReceiptId(
      command.command.commandId,
      command.idempotencyKey,
    ),
    recordedAt: run.updatedAt,
    recordId: command.recordId,
    resultState: run.run.resultState,
    routeOwner: "prototype-operation",
    schemaVersion: 1,
    sourceVersion: command.preconditions.primary.version,
    summary: run.run.summary,
    tone: run.run.tone,
  } as PrototypeLocalReceipt;
}

export function prototypeRecordFromRuntimeRun(
  run: OperationCommandRunEnvelope<PrototypeRuntimeRun>,
) {
  return run.run.record;
}

function prototypeRecordFromCommand({
  command,
  receiptId,
}: {
  command: OperationCommandEnvelope<PrototypeRuntimeCommand>;
  receiptId: string;
}): PrototypeRecord {
  const receiptRef = `prototype-local://prototype/${receiptId}`;

  switch (command.command.commandId) {
    case "capture-prototype-request":
      return command.command.record;
    case "land-prototype-request":
      return prototypeRecordAfterLanding(
        command.command.record,
        command.command.input.draft,
        receiptRef,
      );
    case "record-candidate-promotion":
      return prototypeRecordAfterCandidatePromotion(
        command.command.record,
        receiptRef,
        command.command.input,
      );
    case "record-baseline-promotion":
      return prototypeRecordAfterBaselinePromotion(
        command.command.record,
        receiptRef,
        command.command.input,
      );
    case "prepare-movement-request":
      return prototypeRecordAfterMovementRequest(
        command.command.record,
        receiptRef,
        command.command.input,
      );
    case "record-closeout-retirement":
      return prototypeRecordAfterCloseoutRetirement(
        command.command.record,
        receiptRef,
        command.command.input,
      );
    case "confirm-preview-profile":
    case "save-preview-profile":
      return prototypeRecordAfterPreviewProfileCommand(
        command.command.record,
        command.command.input,
        command.command.commandId,
        receiptRef,
      );
    case "restart-preview":
    case "start-preview":
    case "stop-preview":
      return prototypeRecordAfterPreviewRuntimeCommand(
        command.command.record,
        command.command.commandId,
        receiptRef,
      );
    case "refresh-preview-proof":
      return prototypeRecordAfterPreviewCheckCommand(
        command.command.record,
        receiptRef,
        command.submittedAt,
      );
  }
}

function prototypeResultState(
  commandId: PrototypeRuntimeCommand["commandId"],
  sourceRecord: PrototypeRecord,
  appliedRecord: PrototypeRecord,
): PrototypeRuntimeRun["resultState"] {
  if (
    commandId !== "capture-prototype-request" &&
    appliedRecord === sourceRecord
  ) {
    return "blocked";
  }

  if (
    commandId === "land-prototype-request" &&
    appliedRecord.landing.state === "blocked"
  ) {
    return "blocked";
  }

  return "recorded";
}

function prototypeReceiptSummary(
  command: PrototypeRuntimeCommand,
  resultState: PrototypeRuntimeRun["resultState"],
) {
  if (command.commandId === "land-prototype-request") {
    return resultState === "blocked"
      ? "Prototype landing recorded a blocked local result."
      : "Prototype landing recorded locally and routed to Candidate Promotion.";
  }

  if (resultState === "blocked") {
    return "Prototype command did not produce an eligible local transition.";
  }

  switch (command.commandId) {
    case "record-candidate-promotion":
      return `${prototypeDecisionLabel(command.input.decision)} recorded for ${command.input.objective.trim()}.`;
    case "record-baseline-promotion":
      return `${prototypeDecisionLabel(command.input.decision)} recorded for ${command.input.baselineTitle.trim()}.`;
    case "prepare-movement-request":
      return `Movement request prepared: ${command.input.requestReason.trim()}`;
    case "record-closeout-retirement":
      return `${prototypeDecisionLabel(command.input.decision)} recorded: ${command.input.explanation.trim()}`;
    case "capture-prototype-request":
    case "confirm-preview-profile":
    case "refresh-preview-proof":
    case "restart-preview":
    case "save-preview-profile":
    case "start-preview":
    case "stop-preview":
      break;
  }

  return getPrototypeCommandView(command.record, command.commandId)
    .receiptSummary;
}

type PrototypeRecordedDecision =
  | PrototypeCommandInputById["record-baseline-promotion"]["decision"]
  | PrototypeCommandInputById["record-candidate-promotion"]["decision"]
  | PrototypeCommandInputById["record-closeout-retirement"]["decision"];

function prototypeDecisionLabel(decision: PrototypeRecordedDecision) {
  switch (decision) {
    case "approve-baseline":
      return "Approve Baseline";
    case "block-baseline":
      return "Block Baseline";
    case "block-promotion":
      return "Block Candidate Promotion";
    case "prepare-impacted-request":
      return "Prepare Impacted Closeout Request";
    case "promote-candidate":
      return "Promote To Candidate";
    case "retire-locally":
      return "Retire Locally";
    case "route-closeout":
      return "Route To Closeout";
  }
}

function prototypeRuntimeReceiptId(
  commandId: PrototypeRuntimeCommand["commandId"],
  idempotencyKey: string,
) {
  return `prototype-${commandId}-${idempotencyKey}`;
}
