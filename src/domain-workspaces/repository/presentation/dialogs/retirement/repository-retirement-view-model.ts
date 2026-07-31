import type { TerasMetadataItem } from "@/teras";

import type { RepositoryRetirementRequestReceipt } from "../../../local-runtime/repository-runtime.ts";
import {
  repositoryRuntimeLaneStatusLabel,
  type RepositoryWorkspaceRecord,
} from "../../../read-model/repository-workspace-read-model.ts";

export function repositoryRetirementRequestChecklist(
  receipt?: RepositoryRetirementRequestReceipt,
) {
  const done = Boolean(receipt);

  return [
    {
      detail:
        "Repository is already admitted and can be reviewed before a retirement request.",
      label: "Admitted source",
    },
    {
      detail:
        "Operator confirms no active route should continue before future retirement handling.",
      label: "Active routing",
    },
    {
      detail:
        "Real retirement requires the future OOS/WGCF owner-routed workflow.",
      label: "Owner route",
    },
    {
      detail:
        "This request records local confirmation only and does not retire the repository.",
      label: "Mutation boundary",
    },
  ].map((item) => ({
    ...item,
    status: done ? "done" : "confirm",
    tone: done ? ("ok" as const) : ("danger" as const),
  }));
}

export function repositoryRetirementMetadata(
  repository: RepositoryWorkspaceRecord,
): TerasMetadataItem[] {
  return [
    { label: "Owner", value: repository.owner },
    { label: "Class", value: repository.repoClass },
    {
      label: "Runtime",
      value: repositoryRuntimeLaneStatusLabel(repository.runtimeLane.status),
    },
    { label: "Route Source", value: repository.routeSource },
  ];
}

export function repositoryRetirementRequestPanelProjection(
  receipt?: RepositoryRetirementRequestReceipt,
) {
  return {
    description: receipt
      ? `${receipt.receiptId} recorded at ${receipt.recordedAt}.`
      : "Review the retirement request boundary before confirming the request.",
    kicker: receipt ? "Local Receipt" : "Confirmation",
    selected: Boolean(receipt),
    statusLabel: receipt ? "Recorded" : "Review",
    statusTone: receipt ? ("ok" as const) : ("danger" as const),
    title: receipt
      ? "Prototype retirement request"
      : "Retirement request checklist",
    tone: receipt ? ("ok" as const) : ("danger" as const),
  };
}

export function repositoryRetirementBoundaryProjection(
  receipt?: RepositoryRetirementRequestReceipt,
) {
  return {
    description: receipt
      ? "Retirement request was recorded in this prototype session only. The repository remains admitted until a real owner-routed retirement workflow accepts it."
      : "Record Retirement Request creates a local retirement-request receipt only. It does not delete, archive, retire, or mutate a GitHub repository or workspace contract.",
    kicker: receipt ? "Request Receipt" : "Mutation Boundary",
  };
}
