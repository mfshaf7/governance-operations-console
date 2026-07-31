"use client";

import { FileText, History, RotateCcw, Undo2 } from "lucide-react";
import { useState } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasActivityLogDialog,
  TerasDialog,
  TerasEmptyState,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasTimeline,
  TerasTimelineItem,
  TerasUtilityButton,
  type TerasActivityLogEntry,
  type TerasTone,
} from "../../../teras/index.ts";
import type {
  EnvironmentLifecycleOperation,
  EnvironmentLifecycleOperationReceipt,
} from "../../model/environment-lifecycle-command.ts";
import {
  environmentLifecycleOperationCanRetry,
} from "../../model/environment-lifecycle-command.ts";
import {
  environmentLifecycleOperationLabel,
  environmentLifecycleOperationRecovery,
  selectEnvironmentLifecycleSubjectOperations,
} from "../../read-model/environment-lifecycle-operation-selectors.ts";

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

function receiptLabel(
  receipt: EnvironmentLifecycleOperationReceipt | null,
): string {
  if (!receipt) {
    return "Pending";
  }

  return receipt.outcome === "succeeded"
    ? "Recorded"
    : "Failure recorded";
}

function operationLogRows(
  operation: EnvironmentLifecycleOperation,
): TerasActivityLogEntry[] {
  return operation.events.map((event, index) => ({
    detail: event.summary,
    formattedTimestamp: formatOperationTime(event.occurredAt),
    marker: String(index + 1).padStart(2, "0"),
    timestamp: event.occurredAt,
    tone: operationStateTones[event.state],
  }));
}

export function EnvironmentOperationPanel({
  correlationId,
  description = "Latest prototype-local command result and immutable receipt for this record.",
  onReturnToDraft,
  onRetry,
  onRetrySucceeded,
  operations,
  receipts,
  showHistory = false,
  subjectRef,
  title = "Latest operation",
}: {
  correlationId?: string;
  description?: string;
  onReturnToDraft?: () => void;
  onRetry: (
    operationId: string,
  ) => Promise<EnvironmentLifecycleOperation>;
  onRetrySucceeded?: (
    operation: EnvironmentLifecycleOperation,
  ) => void;
  operations: readonly EnvironmentLifecycleOperation[];
  receipts: readonly EnvironmentLifecycleOperationReceipt[];
  showHistory?: boolean;
  subjectRef: string;
  title?: string;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const {
    latestOperation,
    latestReceipt,
    operations: subjectOperations,
    receipts: subjectReceipts,
  } =
    selectEnvironmentLifecycleSubjectOperations({
      correlationId,
      operations,
      receipts,
      subjectRef,
    });
  const logRows = latestOperation
    ? operationLogRows(latestOperation)
    : [];

  async function retry() {
    if (
      !latestOperation ||
      !environmentLifecycleOperationCanRetry(latestOperation)
    ) {
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
    <>
      <TerasPanel
        fit="content"
        frame="padded"
        layout={latestOperation ? "header-body-footer" : "header-body"}
        spacing="normal"
        tone={
          latestOperation
            ? operationStateTones[latestOperation.state]
            : "muted"
        }
        treatment="rail"
      >
        <TerasPanelHeader
          description={latestOperation?.failureDetail ?? description}
          kicker="Operation"
          statusLabel={
            latestOperation
              ? operationStateLabels[latestOperation.state]
              : "Not started"
          }
          statusTone={
            latestOperation
              ? operationStateTones[latestOperation.state]
              : "muted"
          }
          title={title}
        />
        {latestOperation ? (
          <>
            <TerasMetadataList
              items={[
                {
                  label: "Action",
                  value: environmentLifecycleOperationLabel(latestOperation),
                },
                {
                  label: "State",
                  tone: operationStateTones[latestOperation.state],
                  value: operationStateLabels[latestOperation.state],
                },
                {
                  label: "Attempt",
                  value: String(latestOperation.attempt),
                },
                {
                  label: "Receipt",
                  tone:
                    latestReceipt?.outcome === "succeeded"
                      ? "ok"
                      : latestReceipt
                        ? "danger"
                        : "muted",
                  value: receiptLabel(latestReceipt),
                },
                ...(latestOperation.state === "failed"
                  ? [
                      {
                        label: "Failure owner",
                        value: latestOperation.workflowOwner,
                      },
                      {
                        label: "Failure source",
                        value: latestOperation.adapterRef,
                      },
                      {
                        label: "Safe next action",
                        value:
                          environmentLifecycleOperationRecovery(
                            latestOperation,
                          ),
                      },
                    ]
                  : []),
              ]}
              topOffset="compact"
            />
            <TerasActionRow spacing="normal">
              {latestOperation.state === "failed" && onReturnToDraft ? (
                <TerasActionButton
                  emphasis="secondary"
                  onClick={onReturnToDraft}
                >
                  <Undo2 aria-hidden="true" size={15} />
                  Return to draft
                </TerasActionButton>
              ) : null}
              {showHistory && subjectOperations.length > 1 ? (
                <TerasUtilityButton
                  onClick={() => setHistoryOpen(true)}
                >
                  <History aria-hidden="true" size={15} />
                  History
                </TerasUtilityButton>
              ) : null}
              <TerasUtilityButton
                onClick={() => setLogOpen(true)}
              >
                <FileText aria-hidden="true" size={15} />
                View log
              </TerasUtilityButton>
              {environmentLifecycleOperationCanRetry(latestOperation) ? (
                <TerasActionButton
                  disabled={retrying}
                  onClick={() => void retry()}
                >
                  <RotateCcw aria-hidden="true" size={15} />
                  {retrying ? "Retrying" : "Retry"}
                </TerasActionButton>
              ) : null}
            </TerasActionRow>
          </>
        ) : (
          <TerasEmptyState>
            No command has been submitted for this record.
          </TerasEmptyState>
        )}
      </TerasPanel>
      <TerasActivityLogDialog
        closeLabel="Close environment operation log"
        description="Structured prototype-local events and receipt references for the latest command."
        facts={
          latestOperation
            ? [
                {
                  label: "Actor",
                  value: latestOperation.actorRef,
                },
                {
                  label: "Workflow owner",
                  value: latestOperation.workflowOwner,
                },
                {
                  label: "Required capability",
                  value: latestOperation.requiredCapability,
                },
                {
                  label: "Adapter",
                  value: latestOperation.adapterRef,
                },
                {
                  label: "Operation",
                  value: latestOperation.operationId,
                },
                {
                  label: "Correlation",
                  value: latestOperation.correlationId,
                },
                {
                  label: "Caused by",
                  value:
                    latestOperation.causationId ??
                    "Initial command",
                },
                {
                  label: "Completed",
                  value: formatOperationTime(
                    latestOperation.completedAt,
                  ),
                },
                {
                  label: "Receipt",
                  value: latestReceipt?.receiptRef ?? "Pending",
                },
                {
                  label: "Safe log",
                  value:
                    latestOperation.safeLogRef ??
                    "No safe log reference",
                },
              ]
            : []
        }
        kicker="Safe log"
        onClose={() => setLogOpen(false)}
        open={logOpen && latestOperation !== null}
        rows={logRows}
        title="Environment operation log"
      />
      <TerasDialog
        contentOverflow="auto"
        height="content"
        closeLabel="Close environment operation history"
        description="Ordered operation outcomes and correlated receipt references for this record."
        kicker="Operation history"
        onClose={() => setHistoryOpen(false)}
        open={historyOpen && subjectOperations.length > 1}
        title="Environment operation history"
        width="large"
      >
        <TerasTimeline ariaLabel="Environment operation history">
          {[...subjectOperations].reverse().map((operation) => {
            const receipt =
              subjectReceipts.find(
                (candidate) =>
                  candidate.operationId === operation.operationId,
              ) ?? null;
            const timestamp =
              operation.completedAt ?? operation.requestedAt;

            return (
              <TerasTimelineItem
                detail={
                  operation.failureDetail ??
                  `Receipt: ${receipt?.receiptRef ?? "Pending"}`
                }
                displayTimestamp={`${formatOperationTime(timestamp)} · attempt ${
                  operation.attempt
                }`}
                key={operation.operationId}
                label={environmentLifecycleOperationLabel(operation)}
                status={operationStateLabels[operation.state]}
                timestamp={timestamp}
                tone={operationStateTones[operation.state]}
              />
            );
          })}
        </TerasTimeline>
      </TerasDialog>
    </>
  );
}
