import type { TerasMetadataItem, TerasTone } from "@/teras";

import type { RepositoryRuntimeReceipt } from "../../../local-runtime/repository-runtime.ts";
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
): RepositoryHistoryTimelineRow[] {
  return [...receipts]
    .sort(
      (left, right) =>
        left.recordedAt.localeCompare(right.recordedAt) ||
        left.receiptId.localeCompare(right.receiptId),
    )
    .map(repositoryReceiptTimelineRow);
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
): TerasMetadataItem[] {
  const requestReceipt = latestRepositoryReceipt(receipts, "request");
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
      label: "Request",
      title: requestReceipt?.receiptId,
      value: requestReceipt
        ? repositoryReceiptReference(requestReceipt)
        : "No local request receipt",
    },
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
      label: "Retirement Request",
      title: retirementReceipt?.receiptId,
      value: retirementReceipt
        ? repositoryReceiptReference(retirementReceipt)
        : "No local retirement receipt",
    },
    {
      label: "Last Receipt",
      value:
        repositoryHistoryTimelineRows(receipts).at(-1)?.timestamp ?? "none",
    },
    {
      label: "Source",
      value: receipts.length > 0 ? "local runtime" : "source record",
    },
  ];
}

function repositoryReceiptReference(receipt: RepositoryRuntimeReceipt) {
  return `recorded / ${receipt.receiptId.slice(-8)}`;
}

function repositoryReceiptTimelineRow(
  receipt: RepositoryRuntimeReceipt,
): RepositoryHistoryTimelineRow {
  switch (receipt.kind) {
    case "request":
      return {
        detail: receipt.summary,
        label: "Repository Request",
        status: receipt.resultState,
        timestamp: receipt.recordedAt,
        tone: "ok",
      };
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
