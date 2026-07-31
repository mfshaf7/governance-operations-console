import type { TerasMetadataItem } from "@/teras";

import {
  repositoryRuntimeLaneStatusLabel,
  repositorySecurityBindingStatusLabel,
  type RepositoryWorkspaceRecord,
} from "../../read-model/repository-workspace-read-model.ts";

export {
  repositoryRuntimeLaneStatusLabel,
  repositorySecurityBindingStatusLabel,
};

export type RepositoryStatusFilter =
  RepositoryWorkspaceRecord["admissionState"] | "all";

export function repositoryStatusFilterOptions(
  records: RepositoryWorkspaceRecord[],
): Array<{ label: string; value: RepositoryStatusFilter }> {
  return [
    { label: "All statuses", value: "all" },
    ...Array.from(new Set(records.map((record) => record.admissionState))).map(
      (admissionState) => ({
        label: repositoryAdmissionStateFilterLabel(admissionState),
        value: admissionState,
      }),
    ),
  ];
}

function repositoryAdmissionStateFilterLabel(
  admissionState: RepositoryWorkspaceRecord["admissionState"],
) {
  switch (admissionState) {
    case "admitted":
      return "Admitted";
    case "blocked":
      return "Blocked";
    case "ready":
      return "Ready";
    case "retired":
      return "Retired";
  }
}

export function repositoryRecordDescription(record: RepositoryWorkspaceRecord) {
  return `${record.githubUrl} / ${record.routeSource}`;
}

export function repositoryRecordStatusLabel(record: RepositoryWorkspaceRecord) {
  if (record.admissionState === "ready") {
    return "Ready";
  }

  if (record.admissionState === "admitted") {
    return "Admitted";
  }

  if (record.admissionState === "blocked") {
    return "Blocked";
  }

  if (record.admissionState === "retired") {
    return "Retired";
  }

  return record.lifecycle;
}

export function repositoryRecordTone(record: RepositoryWorkspaceRecord) {
  if (record.admissionState === "blocked") {
    return "danger" as const;
  }

  if (record.admissionState === "retired" || record.lifecycle === "retired") {
    return "muted" as const;
  }

  if (record.admissionState === "ready") {
    return "warn" as const;
  }

  return record.tone;
}

export function repositoryRecordActionLabel(record: RepositoryWorkspaceRecord) {
  if (record.proposalGate?.status === "pending") {
    return "Resolve";
  }

  if (
    record.admissionState === "ready" ||
    record.admissionState === "admitted"
  ) {
    return "Review";
  }

  return "Inspect";
}

export function repositoryContextMetadata(
  repository: RepositoryWorkspaceRecord,
): TerasMetadataItem[] {
  return [
    { label: "Owner", value: repository.owner },
    { label: "Class", value: repository.repoClass },
    { label: "Lifecycle", value: repository.lifecycle },
    {
      label: "Runtime",
      value: repositoryRuntimeLaneStatusLabel(repository.runtimeLane.status),
    },
    {
      label: "Security",
      value: repositorySecurityBindingStatusLabel(
        repository.securityBinding.status,
      ),
    },
  ];
}

export function repositorySelectedPanelMetadata(
  repository: RepositoryWorkspaceRecord,
): TerasMetadataItem[] {
  return repositoryContextMetadata(repository);
}
