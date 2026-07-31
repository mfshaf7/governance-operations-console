import { createOperationIdempotencyKey } from "../../../operation-runtime/operation-runtime-invariants.ts";
import type { OrchestrationRunRecord } from "../../domain/orchestration-run-types.ts";
import type {
  OrchestrationRunControlInput,
  OrchestrationRunControlRequest,
  OrchestrationRunControlValidation,
} from "./run-control-types.ts";

export class OrchestrationRunControlUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrchestrationRunControlUnavailableError";
  }
}

export function orchestrationRunControlValidation(
  run: OrchestrationRunRecord,
  input: OrchestrationRunControlInput,
): OrchestrationRunControlValidation {
  const control = run.controls.find(
    (candidate) => candidate.id === input.controlId,
  );
  const findings: string[] = [];

  if (!control?.available) {
    findings.push(
      control?.disabledReason ??
        "The source projection does not expose this control.",
    );
  }

  switch (input.controlId) {
    case "retry":
    case "resume":
      requireText(findings, input.reason, "A reason is required.");
      break;
    case "provide-signal":
      requireText(findings, input.signalName, "A signal name is required.");
      requireText(findings, input.signalRef, "A signal reference is required.");
      break;
    case "defer":
      requireText(findings, input.owner, "A deferral owner is required.");
      requireText(findings, input.reason, "A deferral reason is required.");
      requireText(
        findings,
        input.resumeCondition,
        "A resume condition is required.",
      );
      requireText(findings, input.reviewAt, "A review date is required.");
      break;
    case "cancel":
      requireText(findings, input.reason, "A cancellation reason is required.");
      if (input.acknowledgement !== "cancel-is-not-rollback") {
        findings.push("Cancellation must acknowledge that it is not rollback.");
      }
      break;
  }

  return {
    available: findings.length === 0,
    findings,
  };
}

export function createOrchestrationRunControlRequest({
  input,
  requestedAt,
  run,
}: {
  input: OrchestrationRunControlInput;
  requestedAt: string;
  run: OrchestrationRunRecord;
}): OrchestrationRunControlRequest {
  const validation = orchestrationRunControlValidation(run, input);
  const control = run.controls.find(
    (candidate) => candidate.id === input.controlId,
  );

  if (!validation.available || !control) {
    throw new OrchestrationRunControlUnavailableError(
      validation.findings.join(" "),
    );
  }

  const commandName = `orchestration.run.${input.controlId}`;
  const preconditions = {
    dependencies: [],
    primary: {
      recordId: run.runId,
      sourceOwner: run.source.authority,
      version: run.source.sourceVersion,
    },
  };

  return {
    commandName,
    controlId: input.controlId,
    expectedEffect: control.expectedEffect,
    idempotencyKey: createOperationIdempotencyKey({
      command: input,
      commandName,
      preconditions,
      recordId: run.runId,
    }),
    input,
    requestedAt,
    runId: run.runId,
    sourceOwner: run.source.authority,
    sourceVersion: run.source.sourceVersion,
  };
}

export function orchestrationRunControlResultState(
  input: OrchestrationRunControlInput,
) {
  switch (input.controlId) {
    case "retry":
      return "queued" as const;
    case "resume":
    case "provide-signal":
      return "running" as const;
    case "defer":
      return "waiting" as const;
    case "cancel":
      return "cancelled" as const;
  }
}

function requireText(findings: string[], value: string, message: string) {
  if (!value.trim()) {
    findings.push(message);
  }
}
