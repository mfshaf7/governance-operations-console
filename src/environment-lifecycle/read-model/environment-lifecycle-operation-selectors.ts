import type {
  EnvironmentLifecycleOperation,
  EnvironmentLifecycleOperationReceipt,
} from "../model/environment-lifecycle-command.ts";

export type EnvironmentLifecycleSubjectOperations = Readonly<{
  latestOperation: EnvironmentLifecycleOperation | null;
  latestReceipt: EnvironmentLifecycleOperationReceipt | null;
  operations: readonly EnvironmentLifecycleOperation[];
  receipts: readonly EnvironmentLifecycleOperationReceipt[];
}>;

export function selectEnvironmentLifecycleSubjectOperations({
  actions,
  correlationId,
  operations,
  receipts,
  subjectRef,
}: {
  actions?: readonly EnvironmentLifecycleOperation["action"][];
  correlationId?: string;
  operations: readonly EnvironmentLifecycleOperation[];
  receipts: readonly EnvironmentLifecycleOperationReceipt[];
  subjectRef: string;
}): EnvironmentLifecycleSubjectOperations {
  const subjectOperations = operations.filter(
    (operation) =>
      operation.subjectRef === subjectRef &&
      (!actions || actions.includes(operation.action)) &&
      (!correlationId || operation.correlationId === correlationId),
  );
  const subjectReceipts = receipts.filter(
    (receipt) =>
      receipt.subjectRef === subjectRef &&
      (!actions || actions.includes(receipt.action)) &&
      (!correlationId || receipt.correlationId === correlationId),
  );
  const latestOperation =
    subjectOperations[subjectOperations.length - 1] ?? null;
  const latestReceipt = latestOperation
    ? subjectReceipts.find(
        (receipt) =>
          receipt.operationId === latestOperation.operationId,
      ) ?? null
    : null;

  return {
    latestOperation,
    latestReceipt,
    operations: subjectOperations,
    receipts: subjectReceipts,
  };
}

export function environmentLifecycleOperationLabel(
  operation: EnvironmentLifecycleOperation,
): string {
  return operation.label;
}

export function environmentLifecycleOperationRecovery(
  operation: EnvironmentLifecycleOperation,
): string {
  if (operation.failureCode === "source-version-conflict") {
    return "Retry after refreshing the current subject projection.";
  }

  if (operation.failureCode === "command-contract-invalid") {
    return "Return to the draft, correct its inputs, and submit again.";
  }

  if (operation.state === "failed") {
    return `Retry through ${operation.workflowOwner}, or return the failure to that owner.`;
  }

  return "No recovery action is required.";
}
