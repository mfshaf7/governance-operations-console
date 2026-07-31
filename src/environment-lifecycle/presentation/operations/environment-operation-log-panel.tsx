"use client";

import { RotateCcw, Undo2 } from "lucide-react";
import { useState } from "react";

import {
  TerasActionButton,
  TerasActivityLogPanel,
  type TerasActivityLogEntry,
  type TerasMetadataItem,
  type TerasTone,
} from "@/teras";

import type {
  EnvironmentLifecycleOperation,
  EnvironmentLifecycleOperationReceipt,
} from "../../model/environment-lifecycle-command";
import { environmentLifecycleOperationCanRetry } from "../../model/environment-lifecycle-command";
import {
  environmentLifecycleOperationLabel,
  selectEnvironmentLifecycleSubjectOperations,
} from "../../read-model/environment-lifecycle-operation-selectors";

const operationStateLabels: Readonly<
  Record<EnvironmentLifecycleOperation["state"], string>
> = {
  cancelled: "Cancelled",
  failed: "Failed",
  queued: "Queued",
  requested: "Requested",
  running: "Running",
  succeeded: "Succeeded",
};

const operationStateTones: Readonly<
  Record<EnvironmentLifecycleOperation["state"], TerasTone>
> = {
  cancelled: "muted",
  failed: "danger",
  queued: "info",
  requested: "info",
  running: "warn",
  succeeded: "ok",
};

function formatOperationTime(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Pending";
}

function operationLogRows(
  operation: EnvironmentLifecycleOperation | null,
): TerasActivityLogEntry[] {
  if (!operation) {
    return [];
  }

  return operation.events.map((event) => ({
    detail: event.summary,
    formattedTimestamp: formatOperationTime(event.occurredAt),
    marker: String(event.sequence).padStart(2, "0"),
    timestamp: event.occurredAt,
    tone: operationStateTones[event.state],
  }));
}

function operationLogFacts(
  operation: EnvironmentLifecycleOperation,
  receipt: EnvironmentLifecycleOperationReceipt | null,
): TerasMetadataItem[] {
  return [
    {
      label: "Action",
      value: environmentLifecycleOperationLabel(operation),
    },
    {
      label: "Actor",
      value: operation.actorRef,
    },
    {
      label: "Workflow owner",
      value: operation.workflowOwner,
    },
    {
      label: "Adapter",
      value: operation.adapterRef,
    },
    {
      label: "Attempt",
      value: String(operation.attempt),
    },
    {
      label: "Operation",
      value: operation.operationId,
    },
    {
      label: "Correlation",
      value: operation.correlationId,
    },
    {
      label: "Completed",
      value: formatOperationTime(operation.completedAt),
    },
    {
      label: "Receipt",
      value: receipt?.receiptRef ?? "Pending",
    },
    {
      label: "Safe log",
      value: operation.safeLogRef ?? "No safe log reference",
    },
  ];
}

export function EnvironmentOperationLogPanel({
  actionScope,
  description,
  kicker = "Command Log",
  onReturnToDraft,
  onRetry,
  onRetrySucceeded,
  operations,
  receipts,
  subjectRef,
  title,
}: {
  actionScope: readonly EnvironmentLifecycleOperation["action"][];
  description: string;
  kicker?: string;
  onReturnToDraft?: () => void;
  onRetry: (
    operationId: string,
  ) => Promise<EnvironmentLifecycleOperation>;
  onRetrySucceeded?: (
    operation: EnvironmentLifecycleOperation,
  ) => void;
  operations: readonly EnvironmentLifecycleOperation[];
  receipts: readonly EnvironmentLifecycleOperationReceipt[];
  subjectRef: string;
  title: string;
}) {
  const [retrying, setRetrying] = useState(false);
  const { latestOperation, latestReceipt } =
    selectEnvironmentLifecycleSubjectOperations({
      actions: actionScope,
      operations,
      receipts,
      subjectRef,
    });
  const canRetry =
    latestOperation !== null &&
    environmentLifecycleOperationCanRetry(latestOperation);
  const logDescription =
    latestOperation?.failureDetail ?? description;
  const logRows = operationLogRows(latestOperation);
  const logTone = latestOperation
    ? operationStateTones[latestOperation.state]
    : "muted";

  async function retry() {
    if (!latestOperation || !canRetry) {
      return;
    }

    setRetrying(true);
    try {
      const retriedOperation = await onRetry(latestOperation.operationId);
      if (retriedOperation.state === "succeeded") {
        onRetrySucceeded?.(retriedOperation);
      }
    } finally {
      setRetrying(false);
    }
  }

  return (
    <TerasActivityLogPanel
      description={logDescription}
      footerActions={
        latestOperation?.state === "failed" ? (
          <>
            {onReturnToDraft ? (
              <TerasActionButton
                emphasis="secondary"
                onClick={onReturnToDraft}
              >
                <Undo2 aria-hidden="true" size={15} />
                Return to draft
              </TerasActionButton>
            ) : null}
            {canRetry ? (
              <TerasActionButton
                disabled={retrying}
                onClick={() => void retry()}
              >
                <RotateCcw aria-hidden="true" size={15} />
                {retrying ? "Retrying" : "Retry"}
              </TerasActionButton>
            ) : null}
          </>
        ) : undefined
      }
      fullLog={
        latestOperation
          ? {
              closeLabel: `Close ${title.toLowerCase()}`,
              description:
                "Structured command events and immutable receipt references for the latest operation.",
              facts: operationLogFacts(latestOperation, latestReceipt),
              title,
            }
          : undefined
      }
      kicker={kicker}
      rows={logRows}
      statusLabel={
        latestOperation
          ? operationStateLabels[latestOperation.state]
          : "Not started"
      }
      statusTone={logTone}
      title={title}
      tone={logTone}
    />
  );
}
