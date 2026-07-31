import type { OperationSurfaceStatusModel } from "../../../operation-contracts/surface-status.ts";
import type { OperationTone } from "../../../operation-contracts/operation-state.ts";
import type {
  OrchestrationDefinitionRecord,
  OrchestrationDefinitionSummaryMetric,
} from "../../domain/orchestration-definition-types.ts";
import type {
  OrchestrationRunEvent,
  OrchestrationRunRecord,
  OrchestrationRunSummaryMetric,
} from "../../domain/orchestration-run-types.ts";

export type OrchestrationHomeSummaryMetric = {
  id: string;
  label: "Active Runs" | "Blocked" | "Definition Work" | "Failed" | "Waiting";
  tone: OperationTone;
  value: string;
};

export type OrchestrationAttentionCondition =
  | "admission-review"
  | "blocked"
  | "definition-ready"
  | "failed"
  | "implementation-requested"
  | "qualification"
  | "waiting";

export type OrchestrationAttentionItem = {
  condition: OrchestrationAttentionCondition;
  detail: string;
  id: string;
  kind: "definition" | "run";
  label: string;
  owner: string;
  requiredMove: string;
  tone: OperationTone;
  updatedAt: string;
};

export type OrchestrationMaterialEvent = OrchestrationRunEvent & {
  definitionId: string;
  runId: string;
};

export type OrchestrationScenarioCoverage = {
  id: string;
  kind: "definition" | "run";
  label: string;
  recordId: string;
  sourceMode: "synthetic-or-contract-derived";
};

export type OrchestrationWorkspaceSummary = {
  definitions: OrchestrationDefinitionSummaryMetric[];
  home: OrchestrationHomeSummaryMetric[];
  runs: OrchestrationRunSummaryMetric[];
};

export type OrchestrationWorkspaceReadModel = {
  attention: OrchestrationAttentionItem[];
  definitions: OrchestrationDefinitionRecord[];
  inFlightRuns: OrchestrationRunRecord[];
  materialEvents: OrchestrationMaterialEvent[];
  runs: OrchestrationRunRecord[];
  scenarioCoverage: OrchestrationScenarioCoverage[];
  summary: OrchestrationWorkspaceSummary;
  workspaceStatus: OperationSurfaceStatusModel;
};
