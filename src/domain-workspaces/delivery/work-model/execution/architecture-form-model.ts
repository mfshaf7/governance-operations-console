import contract from "./architecture-form-schema.ts";

export type PlanSchema = {
  $ref?: string; type?: string | string[]; enum?: unknown[]; const?: unknown;
  properties?: Record<string, PlanSchema>; required?: string[]; items?: PlanSchema;
  oneOf?: PlanSchema[]; anyOf?: PlanSchema[]; minItems?: number;
  minLength?: number; maxLength?: number; pattern?: string;
};
export const architectureFormContract = contract as unknown as {
  sourceSha256: string; authoringVersion: number; requiredProtocolDimensions: string[]; $defs: Record<string, PlanSchema>;
  properties: Record<"architecture" | "conformance_plan" | "repo_revisions", PlanSchema>;
};
export function resolvePlanSchema(schema: PlanSchema): PlanSchema {
  if (!schema.$ref) return schema;
  const key = schema.$ref.split("/").at(-1)!;
  const { $ref: _ref, ...extra } = schema;
  return { ...resolvePlanSchema(architectureFormContract.$defs[key] ?? {}), ...extra };
}
export function planFieldInitialValue(input: PlanSchema): unknown {
  const schema = resolvePlanSchema(input);
  if (schema.const !== undefined) return schema.const;
  if (schema.oneOf || schema.anyOf) return planFieldInitialValue((schema.oneOf ?? schema.anyOf)!.find(item => item.type !== "null") ?? {});
  // Minimum counts describe completed input. A new entry starts with no selections.
  if (schema.type === "array") return [];
  if (schema.type === "object") return Object.fromEntries((schema.required ?? []).map(key => [key, planFieldInitialValue(schema.properties?.[key] ?? {})]));
  // Neither a permission nor an applicability decision is made by a form default.
  if (schema.type === "boolean" || schema.type === "integer" || schema.type === "number") return null;
  if (schema.type === "null") return null;
  return "";
}
const labels: Record<string, string> = {
  descendant_owner_map: "Work and repository responsibilities", owner_repo: "Repository",
  work_item_id: "Work item", parent_work_item_id: "Parent work item", work_item_type: "Work type",
  landing_units: "Change groups", landing_unit_id: "Change group", id: "Identifier",
  source_landing_graph: "Change merge order", work_item_execution_plan: "Work execution order",
  edges: "Merge dependencies",
  lifecycle_state_model: "Work states and transitions", authorization_session_execution_model: "Access and execution",
  evidence_receipt_handoffs: "Evidence exchanged between changes", runtime_boundaries: "Runtime responsibilities",
  required_human_gates: "Required approvals", runtime_activation_chains: "Activation order",
  rollback_cleanup_terminal_conditions: "Rollback, cleanup and completion", contradictions_open_decisions: "Open decisions",
  protocol_applicability: "Extra checks for system connections", dimensions: "What the checks cover",
  work_item_dimension_applicability: "Checks required for each work item", git_causality: "Source dependencies",
  cases: "Verification cases", required: "Verification required", repo_revisions: "Repository revisions",
  states: "States", transitions: "Transitions", from: "From state", to: "To state",
  authority: "Responsible repository", authority_refs: "Records that authorize this work", uri: "Evidence record link", digest: "SHA-256 from the record",
  session_binding: "Who can use a work session", execution_binding: "Who can approve or perform a change",
  start_after_work_item_ids: "Complete before starting", close_after_work_item_ids: "Complete before closing",
  emits_human_gate_ids: "Approvals produced", source_backed: "Changes repository files", covered_work_item_ids: "Covered work",
  prerequisite_landing_unit_id: "Merge this change first", dependent_landing_unit_id: "Before this change",
  producer_landing_unit_id: "Change group supplying evidence", consumer_landing_unit_id: "Change group using evidence",
  producer_work_item_id: "Work item supplying evidence", consumer_work_item_id: "Work item using evidence",
  affected_landing_unit_ids: "Affected change groups", authority_work_item_id: "Approval work item", authority_owner_repo: "Approval repository",
  evidence_prerequisite_work_item_ids: "Evidence required from", blocked_transition: "Approval required before", evidence_requirement: "Evidence to review",
  source_owner_repo: "Source repository", source_activation_posture: "Does source already allow activation?",
  source_activation_evidence: "Where activation is configured", observed_value: "Value in source", observed_posture: "Activation status in source", source_activation_landing_unit_id: "Source activation change group", commissioning_landing_unit_ids: "Runtime verification change groups",
  dimension_ids: "Verification areas", applies_to_work_item_ids: "Covered work", evidence_owner_landing_unit_id: "Change group providing evidence",
  target_readiness: "When this check must pass", expected_outcome: "Expected outcome", polarity: "Check type", fidelity: "Test environment",
  repo: "Repository", commit: "Exact commit", base_ref: "Base branch or reference", rationale: "Reason",
  producer: "Repository supplying evidence", consumer: "Repository using evidence", artifact: "Evidence to pass",
  integration_point: "When the evidence is needed", acceptance: "What makes the evidence acceptable",
  gate_id: "Runtime approval", claims: "Git dependencies to verify",
  terminal_conditions: "How to tell the work is complete", rollback_units: "What to roll back", cleanup_obligations: "What to clean up",
  allowed_capability_ids: "Allowed actions (capability IDs)", prohibited_capability_ids: "Prohibited actions (capability IDs)",
  "command-and-acknowledgement-semantics": "Commands and acknowledgements",
  "deterministic-identities-and-idempotency": "Stable IDs and repeat requests",
  "state-mutation-ordering": "Order of state changes",
  "retry-cancel-replay-and-recovery-semantics": "Retry, cancellation, replay, and recovery",
  "bounded-failure-mapping": "Expected failures and responses",
  "authorization-integrity-and-replay-resistance": "Authorization and replay protection",
  "session-scenario-and-execution-binding": "Work session and execution match",
  "result-and-owner-receipt-completeness": "Complete results and receipts",
  "immutable-baseline-and-restore-evidence": "Baseline integrity and restore proof",
  "lifecycle-state-matrix": "Allowed lifecycle transitions",
  "cross-artifact-timeline-ordering": "Order of linked records",
  "shared-validator-compatibility": "Agreement between validators",
};
export function planFieldLabel(key: string) {
  return labels[key] ?? key.replaceAll("_", " ").replace(/\bwgcf\b/gi, "WGCF").replace(/^./, c => c.toUpperCase());
}
