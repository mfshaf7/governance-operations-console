export type OosOrchestrationDefinition = Readonly<{
  admission: Readonly<{ start_allowed: boolean; gates: readonly Readonly<{ detail: string; gate_id: string; owner: string; satisfied: boolean }>[] }>;
  approval_requirements: readonly string[];
  business_owner: string;
  cancellation_boundary: string;
  completion_condition: string;
  definition_id: string;
  definition_version: number;
  evidence_and_retention: Readonly<Record<string, unknown>>;
  execution_graph: readonly Readonly<Record<string, unknown>>[];
  execution_owner: string;
  expected_receipt: string;
  implementation_repo: string;
  lifecycle: "active" | "admission-review";
  purpose: string;
  qualification: "durable-candidate";
  return_projection: string;
  rollout_and_rollback: Readonly<Record<string, unknown>>;
  schema_version: 1;
  security_requirements: Readonly<Record<string, unknown>>;
  source_domain: string;
  source_record_type: string;
  title: string;
  trigger: Readonly<Record<string, unknown>>;
}>;

export type OosOrchestrationRun = Readonly<Record<string, unknown>> & Readonly<{
  definition_id: string;
  definition_version: number;
  request_id: string;
  run_id: string;
  schema_version: 1;
  state: "blocked" | "cancelled" | "completed" | "failed" | "queued" | "running" | "waiting";
}>;

export type OrchestrationLiveSnapshot = Readonly<{
  error: Readonly<{ code: string; message: string }> | null;
  mode: "disconnected-preview" | "live" | "unavailable";
  observedAt: string;
  readModel: import("../read-model/workspace/orchestration-workspace-types.ts").OrchestrationWorkspaceReadModel | null;
  status: "current" | "loading" | "offline";
}>;
