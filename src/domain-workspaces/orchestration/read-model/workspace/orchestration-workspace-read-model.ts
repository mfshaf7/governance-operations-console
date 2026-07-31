import { orchestrationWorkspaceFixture } from "./orchestration-workspace.fixture.ts";
import type { OrchestrationWorkspaceReadModel } from "./orchestration-workspace-types.ts";

export type {
  OrchestrationAttentionCondition,
  OrchestrationAttentionItem,
  OrchestrationHomeSummaryMetric,
  OrchestrationMaterialEvent,
  OrchestrationScenarioCoverage,
  OrchestrationWorkspaceReadModel,
  OrchestrationWorkspaceSummary,
} from "./orchestration-workspace-types.ts";

export type {
  OrchestrationAdmissionArea,
  OrchestrationAdmissionCheck,
  OrchestrationAdmissionCheckState,
  OrchestrationDefinitionClassification,
  OrchestrationDefinitionFilters,
  OrchestrationDefinitionLifecycle,
  OrchestrationDefinitionNode,
  OrchestrationDefinitionNodeType,
  OrchestrationDefinitionPosture,
  OrchestrationDefinitionRecord,
  OrchestrationDefinitionSource,
  OrchestrationDefinitionSourceMode,
  OrchestrationDefinitionSummaryMetric,
  OrchestrationDefinitionVersionHistoryEntry,
  OrchestrationQualificationProjection,
} from "../../domain/orchestration-definition-types.ts";
export type {
  OrchestrationRunBlocker,
  OrchestrationRunControl,
  OrchestrationRunControlId,
  OrchestrationRunEffectPosture,
  OrchestrationRunEvent,
  OrchestrationRunFailure,
  OrchestrationRunFilters,
  OrchestrationRunLifecycle,
  OrchestrationRunNode,
  OrchestrationRunNodeState,
  OrchestrationRunNodeType,
  OrchestrationRunPosture,
  OrchestrationRunReceipt,
  OrchestrationRunRecord,
  OrchestrationRunRetry,
  OrchestrationRunSource,
  OrchestrationRunSummaryMetric,
  OrchestrationRunWait,
  OrchestrationRuntimeDiagnostics,
} from "../../domain/orchestration-run-types.ts";

export const orchestrationWorkspaceReadModel: OrchestrationWorkspaceReadModel =
  orchestrationWorkspaceFixture;
