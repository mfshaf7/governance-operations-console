import type { TerasMetadataItem, TerasTone } from "@/teras";

import type { RepositoryRuntimeReceipt } from "../../../local-runtime/repository-runtime.ts";
import type { RepositoryLifecycleAudit } from "../../../live-runtime/repository-lifecycle-live-types.ts";
import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import {
  repositoryRecordStatusLabel,
  repositoryRuntimeLaneStatusLabel,
  repositorySecurityBindingStatusLabel,
} from "../../shared/repository-display-model.ts";

export type RepositoryHistoryTimelineRow = {
  detail: string;
  label: string;
  status: string;
  timestamp: string;
  tone: TerasTone;
};

export function repositoryHistoryTimelineRows(
  receipts: RepositoryRuntimeReceipt[],
  lifecycleAudit: RepositoryLifecycleAudit | null = null,
): RepositoryHistoryTimelineRow[] {
  return [
    ...receipts.map(repositoryReceiptTimelineRow),
    ...(lifecycleAudit?.history.map((item) => ({
      detail: `OOS lifecycle receipt ${item.receipt_ref.digest.slice(-12)}.`,
      label: repositoryLifecycleHistoryLabel(item.action),
      status: item.outcome,
      timestamp: item.completed_at,
      tone:
        item.outcome === "succeeded"
          ? ("ok" as const)
          : item.outcome === "failed" || item.outcome === "denied"
            ? ("danger" as const)
            : ("muted" as const),
    })) ?? []),
  ]
    .sort(
      (left, right) =>
        left.timestamp.localeCompare(right.timestamp) ||
        left.label.localeCompare(right.label),
    );
}

export function repositoryHistoryRecordFacts(
  repository: RepositoryWorkspaceRecord,
): TerasMetadataItem[] {
  return [
    { label: "Record", value: repository.id },
    { label: "Status", value: repositoryRecordStatusLabel(repository) },
    { label: "Owner", value: repository.owner },
    { label: "Lifecycle", value: repository.lifecycle },
    { label: "Route Source", value: repository.routeSource },
    { label: "Validation", value: repository.lastValidation },
  ];
}

export function repositoryHistoryControlFacts(
  repository: RepositoryWorkspaceRecord,
): TerasMetadataItem[] {
  return [
    {
      label: "Runtime Lane",
      value: repositoryRuntimeLaneStatusLabel(repository.runtimeLane.status),
    },
    {
      label: "Security Binding",
      value: repositorySecurityBindingStatusLabel(
        repository.securityBinding.status,
      ),
    },
    {
      label: "Repository Class",
      value: repository.repoClass,
    },
    {
      label: "Boundary",
      value: repository.boundary,
    },
  ];
}

export function repositoryHistoryReceiptFacts(
  receipts: RepositoryRuntimeReceipt[],
  lifecycleAudit: RepositoryLifecycleAudit | null = null,
): TerasMetadataItem[] {
  const admissionReceipt = latestRepositoryReceipt(receipts, "admission");
  const gateReceipt = latestRepositoryReceipt(
    receipts,
    "proposal-gate-resolution",
  );
  const retirementReceipt = latestRepositoryReceipt(
    receipts,
    "retirement-request",
  );

  return [
    {
      label: "Admission",
      title: admissionReceipt?.receiptId,
      value: admissionReceipt
        ? repositoryReceiptReference(admissionReceipt)
        : "No local admission receipt",
    },
    {
      label: "Gate Resolution",
      title: gateReceipt?.receiptId,
      value: gateReceipt
        ? repositoryReceiptReference(gateReceipt)
        : "No local gate receipt",
    },
    {
      label: "Lifecycle",
      title: lifecycleAudit?.latest_terminal_receipt_ref?.uri,
      value:
        lifecycleAudit?.latest_terminal_receipt_ref?.digest ??
        (retirementReceipt
          ? repositoryReceiptReference(retirementReceipt)
          : "No OOS lifecycle receipt"),
    },
    {
      label: "Last Receipt",
      value:
        repositoryHistoryTimelineRows(receipts, lifecycleAudit).at(-1)
          ?.timestamp ?? "none",
    },
    {
      label: "Source",
      value: lifecycleAudit
        ? "operator-orchestration-service"
        : receipts.length > 0
          ? "local runtime"
          : "source record",
    },
  ];
}

function repositoryLifecycleHistoryLabel(
  action: RepositoryLifecycleAudit["history"][number]["action"],
) {
  switch (action) {
    case "transfer-workspace-custody":
      return "Workspace Custody Transfer";
    case "archive-provider":
      return "Provider Archive";
    case "unarchive-provider":
      return "Provider Unarchive";
    case "retire-workspace-record":
      return "Workspace Record Retirement";
    case "restore-workspace-record":
      return "Workspace Record Restore";
  }
}

function repositoryReceiptReference(receipt: RepositoryRuntimeReceipt) {
  return `recorded / ${receipt.receiptId.slice(-8)}`;
}

function repositoryReceiptTimelineRow(
  receipt: RepositoryRuntimeReceipt,
): RepositoryHistoryTimelineRow {
  switch (receipt.kind) {
    case "admission":
      return {
        detail: receipt.summary,
        label: "Admission Review",
        status: receipt.resultState,
        timestamp: receipt.recordedAt,
        tone: "ok",
      };
    case "proposal-gate-resolution":
      return {
        detail: receipt.summary,
        label: "Proposal Gate Resolution",
        status: receipt.resultState,
        timestamp: receipt.recordedAt,
        tone: "ok",
      };
    case "retirement-request":
      return {
        detail: receipt.summary,
        label: "Retirement Request",
        status: receipt.resultState,
        timestamp: receipt.recordedAt,
        tone: "warn",
      };
  }
}

function latestRepositoryReceipt<
  TKind extends RepositoryRuntimeReceipt["kind"],
>(
  receipts: RepositoryRuntimeReceipt[],
  kind: TKind,
): Extract<RepositoryRuntimeReceipt, { kind: TKind }> | undefined {
  return [...receipts]
    .sort(
      (left, right) =>
        right.recordedAt.localeCompare(left.recordedAt) ||
        right.receiptId.localeCompare(left.receiptId),
    )
    .find(
      (
        receipt,
      ): receipt is Extract<RepositoryRuntimeReceipt, { kind: TKind }> =>
        receipt.kind === kind,
    );
}
