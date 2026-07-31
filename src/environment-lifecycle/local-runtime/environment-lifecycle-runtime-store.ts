import type {
  DevIntegrationProfile,
} from "../model/dev-integration-profile.ts";
import type {
  EnvironmentLifecycleCommandRequest,
  EnvironmentLifecycleOperation,
  EnvironmentLifecycleOperationReceipt,
} from "../model/environment-lifecycle-command.ts";
import {
  environmentLifecycleOperationCanRetry,
} from "../model/environment-lifecycle-command.ts";
import type {
  ProductReleaseCapability,
} from "../model/product-release-capability.ts";
import {
  projectEnvironmentLifecycleEffectiveState,
  type EnvironmentLifecycleEffectiveProjection,
} from "../read-model/environment-lifecycle-effective-projection.ts";
import {
  createEnvironmentLifecycleRetryCommand,
  environmentCommandSubjectRef,
} from "../work-model/commands/environment-lifecycle-command-factory.ts";
import {
  simulateEnvironmentLifecycleCommand,
  type EnvironmentLifecycleForcedFailure,
} from "./environment-lifecycle-command-simulator.ts";

export type EnvironmentLifecycleFailurePlan = Readonly<{
  action: EnvironmentLifecycleCommandRequest["action"];
  failure: EnvironmentLifecycleForcedFailure;
  remainingAttempts: number;
}>;

export type EnvironmentLifecycleRuntimeSnapshot = Readonly<{
  effective: EnvironmentLifecycleEffectiveProjection;
  operations: readonly EnvironmentLifecycleOperation[];
  receipts: readonly EnvironmentLifecycleOperationReceipt[];
  revision: number;
}>;

export type EnvironmentLifecycleReconciliation = Readonly<{
  correlationId: string;
  operation: EnvironmentLifecycleOperation | null;
  receipt: EnvironmentLifecycleOperationReceipt | null;
  state: "failed" | "in-flight" | "resolved" | "unknown";
}>;

export type EnvironmentLifecycleLocalRuntime = Readonly<{
  getSnapshot: () => EnvironmentLifecycleRuntimeSnapshot;
  reconcile: (
    correlationId: string,
  ) => EnvironmentLifecycleReconciliation;
  retry: (
    operationId: string,
    requestedAt: string,
  ) => Promise<EnvironmentLifecycleOperation>;
  submit: (
    command: EnvironmentLifecycleCommandRequest,
  ) => Promise<EnvironmentLifecycleOperation>;
  subscribe: (listener: () => void) => () => void;
}>;

export function createEnvironmentLifecycleLocalRuntime({
  failurePlans = [],
  products,
  profiles,
}: {
  failurePlans?: readonly EnvironmentLifecycleFailurePlan[];
  products: readonly ProductReleaseCapability[];
  profiles: readonly DevIntegrationProfile[];
}): EnvironmentLifecycleLocalRuntime {
  const sourceProducts = [...products];
  const sourceProfiles = [...profiles];
  const commandsByOperationId =
    new Map<string, EnvironmentLifecycleCommandRequest>();
  const operationIdByIdempotencyKey = new Map<string, string>();
  const operations: EnvironmentLifecycleOperation[] = [];
  const receipts: EnvironmentLifecycleOperationReceipt[] = [];
  const listeners = new Set<() => void>();
  const remainingFailurePlans = failurePlans.map((plan) => ({
    ...plan,
  }));
  let snapshot = buildSnapshot(0);

  return {
    getSnapshot() {
      return snapshot;
    },
    reconcile(correlationId) {
      const operation =
        [...operations]
          .reverse()
          .find(
            (candidate) =>
              candidate.correlationId === correlationId,
          ) ?? null;
      const receipt = operation
        ? receipts.find(
            (candidate) =>
              candidate.operationId === operation.operationId,
          ) ?? null
        : null;

      return {
        correlationId,
        operation,
        receipt,
        state: !operation
          ? "unknown"
          : operation.state === "failed"
            ? "failed"
            : operation.state === "succeeded" && receipt
              ? "resolved"
              : "in-flight",
      };
    },
    async retry(operationId, requestedAt) {
      const operation = operations.find(
        (candidate) => candidate.operationId === operationId,
      );
      const command = commandsByOperationId.get(operationId);

      if (
        !operation ||
        !command ||
        !environmentLifecycleOperationCanRetry(operation)
      ) {
        throw new Error(
          "Only a retryable failed Environment operation can be retried.",
        );
      }

      const subjectRef = environmentCommandSubjectRef(command);
      const expectedSourceVersion =
        snapshot.effective.subjectVersions[subjectRef] ??
        "unregistered";
      const retryCommand = createEnvironmentLifecycleRetryCommand({
        command,
        expectedSourceVersion,
        operationId,
        requestedAt,
      });

      return submit(retryCommand);
    },
    submit,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  async function submit(
    command: EnvironmentLifecycleCommandRequest,
  ): Promise<EnvironmentLifecycleOperation> {
    const existingOperationId = operationIdByIdempotencyKey.get(
      command.idempotencyKey,
    );
    if (existingOperationId) {
      const existingOperation = operations.find(
        (operation) => operation.operationId === existingOperationId,
      );
      if (existingOperation) {
        return existingOperation;
      }
    }

    const subjectRef = environmentCommandSubjectRef(command);
    const currentSourceVersion =
      snapshot.effective.subjectVersions[subjectRef] ??
      "unregistered";
    const failurePlan = remainingFailurePlans.find(
      (plan) =>
        plan.action === command.action &&
        plan.remainingAttempts > 0,
    );
    if (failurePlan) {
      failurePlan.remainingAttempts -= 1;
    }
    const result = simulateEnvironmentLifecycleCommand({
      command,
      currentSourceVersion,
      forcedFailure: failurePlan?.failure ?? null,
      products: snapshot.effective.products,
      profiles: snapshot.effective.profiles,
      receiptSequence: receipts.length + 1,
    });

    commandsByOperationId.set(result.operation.operationId, command);
    operationIdByIdempotencyKey.set(
      command.idempotencyKey,
      result.operation.operationId,
    );
    operations.push(result.operation);
    receipts.push(result.receipt);
    snapshot = buildSnapshot(snapshot.revision + 1);
    for (const listener of listeners) {
      listener();
    }

    return result.operation;
  }

  function buildSnapshot(
    revision: number,
  ): EnvironmentLifecycleRuntimeSnapshot {
    return {
      effective: projectEnvironmentLifecycleEffectiveState({
        receipts,
        sourceProducts,
        sourceProfiles,
      }),
      operations: [...operations],
      receipts: [...receipts],
      revision,
    };
  }
}
