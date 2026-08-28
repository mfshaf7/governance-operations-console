import { createLocalOperationRuntimeAdapter } from "../../../operation-runtime/local-operation-runtime-adapter.ts";
import {
  createOperationCommandPreconditions,
  createPrototypeLocalOperationCommand,
  operationRunCanReportSuccess,
} from "../../../operation-runtime/operation-runtime-invariants.ts";
import type {
  OperationCommandRunEnvelope,
  OperationReceiptEnvelope,
  OperationRuntimeSource,
} from "../../../operation-runtime/operation-runtime-types.ts";

import type {
  DeliveryApplyIntent,
  DeliveryAvailableAction,
  DeliveryPackageSummary,
} from "../../read-model/index.ts";

import type {
  ExecutionActionContract,
  ExecutionActionReceipt,
} from "../../work-model/execution/execution-action-contracts.ts";
import { executionActionIntentBlockers } from "../../work-model/execution/execution-action-eligibility.ts";

type ExecutionActionRuntimeCommand = {
  action: DeliveryAvailableAction;
  actionContract: ExecutionActionContract;
  applyIntent: DeliveryApplyIntent;
  packageSummary: DeliveryPackageSummary;
};

type ExecutionActionRuntimeRun = {
  blockers: string[];
  summary: string;
};

const executionActionRuntimeSource = {
  authority: "prototype-local",
  mode: "local",
  sourceOwner: "delivery-execution-board",
} satisfies OperationRuntimeSource & { mode: "local" };

const executionActionRuntime = createLocalOperationRuntimeAdapter<
  never,
  never,
  ExecutionActionRuntimeCommand,
  ExecutionActionRuntimeRun,
  ExecutionActionReceipt
>({
  commandRunner(command) {
    const blockers = executionActionIntentBlockers(command.command.applyIntent);
    const completed = blockers.length === 0;
    const summary = completed
      ? `${command.command.action.label} recorded through the prototype-local execution runtime.`
      : blockers.join(" ");

    return {
      run: { blockers, summary },
      state: completed ? "completed" : "blocked",
      summary,
    };
  },
  receiptFactory({ command, run }) {
    if (run.state !== "completed") {
      return null;
    }

    const receiptId = `execution-${run.runId}`;
    const receipt: ExecutionActionReceipt = {
      actionLabel: command.command.action.label,
      actionType: command.command.action.action_type,
      appliedIntent: cloneExecutionApplyIntent(command.command.applyIntent),
      authority: "prototype-local",
      category:
        command.command.applyIntent.receipt_category ??
        command.command.actionContract.receiptCategory,
      packageId: command.command.packageSummary.delivery_package_id,
      projectionResult: command.command.actionContract.receiptProjection,
      recordedAt: run.updatedAt,
      receiptId,
      resultState: "recorded",
      schemaVersion: 1,
      sourceRevision: command.command.applyIntent.source_revision,
      summary: run.run.summary,
      commandName: `delivery.execution.${command.command.action.action_type}`,
    };

    return {
      durability: "prototype-local",
      receipt,
      receiptId,
      recordedAt: run.updatedAt,
    };
  },
  runtimeSource: executionActionRuntimeSource,
});

export async function submitExecutionActionCommand({
  action,
  actionContract,
  applyIntent,
  packageSummary,
  submittedAt = new Date().toISOString(),
}: ExecutionActionRuntimeCommand & { submittedAt?: string }): Promise<{
  receipt: OperationReceiptEnvelope<ExecutionActionReceipt> | null;
  run: OperationCommandRunEnvelope<ExecutionActionRuntimeRun>;
}> {
  const run = await executionActionRuntime.submitCommand(
    createPrototypeLocalOperationCommand({
      command: { action, actionContract, applyIntent, packageSummary },
      commandName: `delivery.execution.${action.action_type}`,
      preconditions: createOperationCommandPreconditions({
        primary: {
          recordId: packageSummary.delivery_package_id,
          sourceOwner: "openproject-delivery-art",
          version: applyIntent.source_revision,
        },
      }),
      recordId: packageSummary.delivery_package_id,
      runtimeSource: executionActionRuntimeSource,
      submittedAt,
    }),
  );
  const receipts = await executionActionRuntime.listReceipts(
    packageSummary.delivery_package_id,
  );
  const receipt =
    receipts.find((candidate) => candidate.runId === run.runId) ?? null;

  if (
    run.state === "completed" &&
    !operationRunCanReportSuccess(run, receipt)
  ) {
    throw new Error(
      "Execution action completed without matching receipt evidence.",
    );
  }

  return { receipt, run };
}

export function getExecutionActionRuntimeCapabilities() {
  return executionActionRuntime.getCapabilities();
}

export function listExecutionActionRuntimeReceipts(recordId: string) {
  return executionActionRuntime.listReceipts(recordId);
}

function cloneExecutionApplyIntent(
  applyIntent: DeliveryApplyIntent,
): DeliveryApplyIntent {
  return {
    ...applyIntent,
    artifacts: [...applyIntent.artifacts],
    gate_checks: applyIntent.gate_checks.map((gate) => ({ ...gate })),
    operator_payload: { ...applyIntent.operator_payload },
    required_payload_fields: [...applyIntent.required_payload_fields],
  };
}
