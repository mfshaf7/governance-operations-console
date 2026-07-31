import type { OperationTone } from "../../../../../operation-projections/index.ts";
import type {
  OrchestrationDefinitionLifecycle,
  OrchestrationDefinitionNode,
  OrchestrationDefinitionRecord,
} from "@/domain-workspaces/orchestration/domain/orchestration-definition-types";
import type { OrchestrationDefinitionInspectorId } from "../orchestration-definitions-view-model.ts";

export function orchestrationDefinitionNodeDetail(
  node: OrchestrationDefinitionNode,
) {
  const dependencyLabel =
    node.dependencies.length === 0
      ? "No dependencies"
      : `${node.dependencies.length} ${
          node.dependencies.length === 1 ? "dependency" : "dependencies"
        }`;

  return `${node.owner} / ${dependencyLabel}`;
}

export function orchestrationDefinitionInspectorPosture(
  record: OrchestrationDefinitionRecord,
  inspectorId: OrchestrationDefinitionInspectorId,
): {
  label: string;
  tone: OperationTone;
} {
  switch (inspectorId) {
    case "trigger-result":
      return {
        label:
          record.trigger && record.completionCondition
            ? "Available"
            : "Missing",
        tone: record.trigger && record.completionCondition ? "info" : "warn",
      };
    case "failure-controls":
      return {
        label: record.failureStrategy ? "Available" : "Missing",
        tone: record.failureStrategy ? "info" : "warn",
      };
    case "evidence-security":
      return {
        label:
          record.evidenceRequirements.length > 0
            ? `${record.evidenceRequirements.length} requirements`
            : "Source facts",
        tone: record.evidenceRequirements.length > 0 ? "info" : "muted",
      };
    case "version-history":
      return {
        label:
          record.versionHistory.length > 0
            ? `${record.versionHistory.length} ${
                record.versionHistory.length === 1 ? "version" : "versions"
              }`
            : "No history",
        tone: record.versionHistory.length > 0 ? "info" : "muted",
      };
  }
}

export function orchestrationDefinitionVersionHistoryTone(
  lifecycle: OrchestrationDefinitionLifecycle,
): OperationTone {
  switch (lifecycle) {
    case "active":
    case "definition-ready":
      return "ok";
    case "admission-review":
    case "candidate":
    case "suspended":
      return "warn";
    case "implementation-requested":
    case "qualified":
      return "info";
    case "retired":
      return "muted";
  }
}
