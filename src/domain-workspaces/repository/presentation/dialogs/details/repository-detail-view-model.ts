import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import { repositoryRecordTone } from "../../shared/repository-display-model.ts";

export function repositoryDetailDialogProjection(
  repository: RepositoryWorkspaceRecord | null,
) {
  const isRetiredRecord = repository?.admissionState === "retired";
  const repositoryTone = repository ? repositoryRecordTone(repository) : "info";

  return {
    closeLabel: repository
      ? `Close ${repository.name} repository details`
      : "Close repository details",
    description: repository?.purpose ?? "",
    postureKicker: isRetiredRecord ? "Retirement Posture" : "Admission Posture",
    postureSelected: repository?.admissionState === "ready",
    postureTitle: isRetiredRecord ? "Retired record posture" : "Control checks",
    postureTone: isRetiredRecord ? ("muted" as const) : repositoryTone,
    repositoryTone,
    title: repository?.name ?? "Repository",
  };
}
