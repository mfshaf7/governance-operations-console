import contract from "./architecture-form-schema.ts";

export type PlanSchema = {
  $ref?: string; type?: string | string[]; enum?: unknown[]; const?: unknown;
  properties?: Record<string, PlanSchema>; required?: string[]; items?: PlanSchema;
  oneOf?: PlanSchema[]; anyOf?: PlanSchema[]; minItems?: number;
  minLength?: number; maxLength?: number; pattern?: string;
};
export const architectureFormContract = contract as unknown as {
  sourceSha256: string; authoringVersion: number; $defs: Record<string, PlanSchema>;
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
  if (schema.type === "array") return Array.from({ length: schema.minItems ?? 0 }, () => planFieldInitialValue(schema.items ?? {}));
  if (schema.type === "object") return Object.fromEntries((schema.required ?? []).map(key => [key, planFieldInitialValue(schema.properties?.[key] ?? {})]));
  // Neither a permission nor an applicability decision is made by a form default.
  if (schema.type === "boolean" || schema.type === "integer" || schema.type === "number") return null;
  if (schema.type === "null") return null;
  return "";
}
const labels: Record<string, string> = {
  descendant_owner_map: "Work and repository responsibilities", owner_repo: "Repository",
  work_item_id: "Work item", parent_work_item_id: "Parent work item", work_item_type: "Work type",
  landing_units: "Changes that land together", landing_unit_id: "Change group", id: "Identifier",
  source_landing_graph: "Repository landing order", work_item_execution_plan: "Work execution order",
  lifecycle_state_model: "Work states and transitions", authorization_session_execution_model: "Access and execution",
  evidence_receipt_handoffs: "Evidence exchanged between changes", runtime_boundaries: "Runtime responsibilities",
  required_human_gates: "Required approvals", runtime_activation_chains: "Activation order",
  rollback_cleanup_terminal_conditions: "Rollback, cleanup and completion", contradictions_open_decisions: "Open decisions",
  protocol_applicability: "When these checks apply", dimensions: "What the checks cover",
  work_item_dimension_applicability: "Checks required for each work item", git_causality: "Source dependencies",
  cases: "Verification cases", required: "Verification required", repo_revisions: "Repository revisions",
  states: "States", transitions: "Transitions", from: "From state", to: "To state",
  authority: "Responsible repository", authority_refs: "Authority evidence", uri: "Evidence reference", digest: "Evidence fingerprint",
  session_binding: "Session authorization", execution_binding: "Execution authorization",
  start_after_work_item_ids: "Complete before starting", close_after_work_item_ids: "Complete before closing",
  emits_human_gate_ids: "Approvals produced", source_backed: "Changes repository files", covered_work_item_ids: "Covered work",
  prerequisite_landing_unit_id: "Prerequisite change group", dependent_landing_unit_id: "Dependent change group",
  producer_landing_unit_id: "Producing change group", consumer_landing_unit_id: "Receiving change group",
  producer_work_item_id: "Producing work item", consumer_work_item_id: "Receiving work item",
  affected_landing_unit_ids: "Affected change groups", authority_work_item_id: "Approval work item", authority_owner_repo: "Approval repository",
  evidence_prerequisite_work_item_ids: "Evidence required from", blocked_transition: "Approval required before", evidence_requirement: "Evidence to review",
  allowed_capability_ids: "Permitted capabilities", prohibited_capability_ids: "Prohibited capabilities",
  source_owner_repo: "Source repository", source_activation_landing_unit_id: "Source activation change group", commissioning_landing_unit_ids: "Runtime verification change groups",
  dimension_ids: "Verification areas", applies_to_work_item_ids: "Covered work", evidence_owner_landing_unit_id: "Change group providing evidence",
  target_readiness: "Required readiness", expected_outcome: "Expected outcome", polarity: "Check type", fidelity: "Test environment",
  repo: "Repository", commit: "Exact commit", base_ref: "Base reference", rationale: "Reason",
};
export function planFieldLabel(key: string) {
  return labels[key] ?? key.replaceAll("_", " ").replace(/\bwgcf\b/gi, "WGCF").replace(/^./, c => c.toUpperCase());
}
