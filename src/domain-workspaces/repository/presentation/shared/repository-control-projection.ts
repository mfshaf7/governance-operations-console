import type { RepositoryWorkspaceRecord } from "../../read-model/repository-workspace-read-model.ts";
import type { RepositoryCustodyWorkflowResult } from "../../live-runtime/repository-custody-live-types.ts";

export function repositoryCanOpenRepositoryReview(
  record: RepositoryWorkspaceRecord,
) {
  return (
    record.admissionState === "admitted" ||
    (record.blockers.length === 0 && record.admissionState === "ready")
  );
}

export function repositoryCanResolveProposalGate(
  record: RepositoryWorkspaceRecord,
) {
  return record.proposalGate?.status === "pending";
}

export function repositoryCanLinkCustody(record: RepositoryWorkspaceRecord) {
  return Boolean(
    record.custody?.state === "unrecorded" &&
      record.providerIdentity?.repositoryId,
  );
}

export function repositorySelectedActionLabel(
  record: RepositoryWorkspaceRecord,
  custodyResult?: RepositoryCustodyWorkflowResult,
) {
  if (repositoryCanResolveProposalGate(record)) {
    return "Resolve Repository Gate";
  }

  if (repositoryCanLinkCustody(record)) {
    return custodyResult?.status === "succeeded"
      ? "Review Custody"
      : "Link Existing Repository";
  }

  if (repositoryIsAdmissionReady(record)) {
    return "Review Admission";
  }

  if (repositoryIsAdmitted(record)) {
    return "Review Repository";
  }

  return "Inspect Repository";
}

export function repositorySelectedActionTitle(
  record: RepositoryWorkspaceRecord,
  custodyResult?: RepositoryCustodyWorkflowResult,
) {
  if (repositoryCanResolveProposalGate(record)) {
    return "Blocked";
  }

  if (repositoryCanLinkCustody(record)) {
    return custodyResult?.status === "succeeded"
      ? "Custody Linked"
      : "Custody Required";
  }

  if (repositoryIsAdmissionReady(record)) {
    return "Admission Ready";
  }

  if (repositoryIsAdmitted(record)) {
    return "Admitted Repository";
  }

  return "Repository Inspection";
}

function repositoryIsAdmissionReady(record: RepositoryWorkspaceRecord) {
  return record.blockers.length === 0 && record.admissionState === "ready";
}

function repositoryIsAdmitted(record: RepositoryWorkspaceRecord) {
  return record.admissionState === "admitted";
}

export function repositorySummaryFromRecords(
  records: RepositoryWorkspaceRecord[],
) {
  const ready = records.filter(
    (record) => record.admissionState === "ready",
  ).length;
  const admitted = records.filter(
    (record) => record.admissionState === "admitted",
  ).length;
  const blocked = records.filter(
    (record) => record.admissionState === "blocked",
  ).length;
  const retired = records.filter(
    (record) => record.admissionState === "retired",
  ).length;

  return [
    {
      id: "total",
      label: "Total",
      value: String(records.length),
      tone: "info" as const,
    },
    {
      id: "ready",
      label: "Ready",
      value: String(ready),
      tone: "warn" as const,
    },
    {
      id: "admitted",
      label: "Admitted",
      value: String(admitted),
      tone: "ok" as const,
    },
    {
      id: "blocked",
      label: "Blocked",
      value: String(blocked),
      tone: "danger" as const,
    },
    {
      id: "retired",
      label: "Retired",
      value: String(retired),
      tone: "muted" as const,
    },
  ];
}
