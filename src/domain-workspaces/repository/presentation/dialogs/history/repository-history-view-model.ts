import type { TerasMetadataItem, TerasTone } from "@/teras";

import type { RepositoryRuntimeReceipt } from "../../../local-runtime/repository-runtime.ts";
import type { RepositoryLifecycleAudit } from "../../../live-runtime/repository-lifecycle-live-types.ts";
import type { RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";
import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import {
  repositoryRecordStatusLabel,
  repositoryRuntimeLaneStatusLabel,
  repositorySecurityBindingStatusLabel,
} from "../../shared/repository-display-model.ts";

export type RepositoryHistoryTimelineRow = {
  id: string;
  detail: string;
  label: string;
  status: string;
  timestamp: string;
  tone: TerasTone;
};

export function repositoryHistoryTimelineRows(
  receipts: RepositoryRuntimeReceipt[],
  lifecycleAudit: RepositoryLifecycleAudit | null = null,
  custodyResults: RepositoryCustodyWorkflowResult[] = [],
): RepositoryHistoryTimelineRow[] {
  const rows: RepositoryHistoryTimelineRow[] = [
    ...custodyResults.filter(result => result.receipt && result.receipt_ref).map(result => ({
      id: `custody:${result.receipt_ref!.digest}`,
      detail: `${result.provider_readback?.canonical_url ?? "Provider receipt"} · recorded ${result.request.action === "provision-new" ? "creation" : "linking"} evidence`,
      label: result.request.action === "provision-new" ? "Repository creation" : "Existing repository linked",
      status: historyOutcomeLabel(result.status),
      timestamp: result.receipt!.completed_at,
      tone: result.status === "succeeded" ? "ok" as const : "danger" as const,
    })),
    ...receipts.map(repositoryReceiptTimelineRow),
    ...(lifecycleAudit?.history.map((item) => ({
      id: `lifecycle:${item.receipt_ref.digest}`,
      detail: `Recorded lifecycle action · receipt ${item.receipt_ref.digest.slice(-12)}`,
      label: repositoryLifecycleHistoryLabel(item.action),
      status: historyOutcomeLabel(item.outcome),
      timestamp: item.completed_at,
      tone:
        item.outcome === "succeeded"
          ? ("ok" as const)
          : item.outcome === "failed" || item.outcome === "denied"
            ? ("danger" as const)
            : ("muted" as const),
    })) ?? []),
  ];
  return [...new Map(rows.map(row => [row.id, row])).values()].sort((left, right) =>
    Date.parse(left.timestamp) - Date.parse(right.timestamp) || left.id.localeCompare(right.id));
}

export function repositoryHistoryRecordFacts(
  repository: RepositoryWorkspaceRecord,
): TerasMetadataItem[] {
  return [
    { label: "Registration", value: repositoryRecordStatusLabel(repository) },
    { label: "Owner", value: repository.owner },
    { label: "Workspace lifecycle", value: repository.lifecycle },
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
  custodyResults: RepositoryCustodyWorkflowResult[] = [],
  includeLocal = true,
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
  const sortedCustody = [...custodyResults].filter(result => result.receipt && result.receipt_ref).sort((a, b) =>
    Date.parse(a.receipt!.completed_at) - Date.parse(b.receipt!.completed_at) || a.receipt_ref!.digest.localeCompare(b.receipt_ref!.digest));
  const latestCustodyResults = [...new Map(sortedCustody.map(result => [result.request.action, result])).values()];

  return [
    ...latestCustodyResults.filter(result => result.receipt_ref).map(result => ({
      label: result.request.action === "provision-new" ? "Provisioning" : "Existing Repository Link",
      title: result.receipt_ref!.uri,
      value: `${result.status} / ${result.receipt!.completed_at}`,
    })),
    ...(includeLocal ? [{
      label: "Local setup review",
      title: admissionReceipt?.receiptId,
      value: admissionReceipt
        ? repositoryReceiptReference(admissionReceipt)
        : "No local setup receipt",
    },
    {
      label: "Local Proposal resolution",
      title: gateReceipt?.receiptId,
      value: gateReceipt
        ? repositoryReceiptReference(gateReceipt)
        : "No local gate receipt",
    }] : []),
    {
      label: "Lifecycle",
      title: lifecycleAudit?.latest_terminal_receipt_ref?.uri,
      value:
        lifecycleAudit?.latest_terminal_receipt_ref?.digest ??
        (retirementReceipt
          ? repositoryReceiptReference(retirementReceipt)
          : "No recorded lifecycle action"),
    },
    {
      label: "Last recorded action",
      value:
        repositoryHistoryTimelineRows(receipts, lifecycleAudit, custodyResults).at(-1)
          ?.timestamp ?? "None loaded",
    },
    {
      label: "Source",
      value: lifecycleAudit || custodyResults.length
        ? "operator-orchestration-service"
        : receipts.length > 0
          ? "disconnected preview"
          : "source record",
    },
  ];
}

function repositoryLifecycleHistoryLabel(
  action: RepositoryLifecycleAudit["history"][number]["action"],
) {
  switch (action) {
    case "transfer-workspace-custody":
      return "Workspace ownership transferred";
    case "archive-provider":
      return "Provider repository archived";
    case "unarchive-provider":
      return "Provider repository unarchived";
    case "retire-workspace-record":
      return "Workspace record retired";
    case "restore-workspace-record":
      return "Workspace record restored";
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
        id: `local:${receipt.receiptId}`,
        detail: receipt.summary,
        label: "Local setup review",
        status: receipt.resultState,
        timestamp: receipt.recordedAt,
        tone: "ok",
      };
    case "proposal-gate-resolution":
      return {
        id: `local:${receipt.receiptId}`,
        detail: receipt.summary,
        label: "Local Proposal resolution",
        status: receipt.resultState,
        timestamp: receipt.recordedAt,
        tone: "ok",
      };
    case "retirement-request":
      return {
        id: `local:${receipt.receiptId}`,
        detail: receipt.summary,
        label: "Local retirement request",
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
        Date.parse(right.recordedAt) - Date.parse(left.recordedAt) ||
        right.receiptId.localeCompare(left.receiptId),
    )
    .find(
      (
        receipt,
      ): receipt is Extract<RepositoryRuntimeReceipt, { kind: TKind }> =>
        receipt.kind === kind,
    );
}

function historyOutcomeLabel(value: string) {
  return ({ succeeded: "Completed", failed: "Failed", denied: "Denied", cancelled: "Cancelled", applying: "In progress" } as Record<string, string>)[value] ?? value;
}
