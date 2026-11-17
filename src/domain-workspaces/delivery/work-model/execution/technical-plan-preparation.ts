import { resolvePlanSchema, type PlanSchema } from "./architecture-form-model.ts";
import { technicalPlanSectionBinding, technicalPlanSectionValue, type TechnicalPlanDraft } from "./technical-plan-model.ts";

export const technicalPlanGroups = [
  { id: "work", label: "Work & Changes", sections: ["architecture:descendant_owner_map", "architecture:landing_units", "repo_revisions"] },
  { id: "sequence", label: "Sequence & Handoffs", sections: ["architecture:source_landing_graph", "architecture:work_item_execution_plan", "architecture:evidence_receipt_handoffs", "architecture:runtime_activation_chains"] },
  { id: "operation", label: "Operation & Recovery", sections: ["architecture:lifecycle_state_model", "architecture:authorization_session_execution_model", "architecture:runtime_boundaries", "architecture:rollback_cleanup_terminal_conditions"] },
  { id: "decisions", label: "Approvals & Decisions", sections: ["architecture:required_human_gates", "architecture:contradictions_open_decisions"] },
  { id: "verification", label: "Verification", sections: ["conformance_plan:protocol_applicability", "conformance_plan:dimensions", "conformance_plan:work_item_dimension_applicability", "conformance_plan:git_causality", "conformance_plan:cases"] },
] as const;

export function technicalPlanGroup(section: string) {
  const group = technicalPlanGroups.find(group => group.sections.some(key => key === section));
  if (!group) throw Error("Choose an available planning area.");
  return group;
}

function hasInput(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return Boolean(value.trim());
  if (Array.isArray(value)) return value.some(hasInput);
  if (typeof value === "object") return Object.values(value).some(hasInput);
  return true; // false and zero are explicit input, not missing decisions.
}
function needsInput(value: unknown, input: PlanSchema): boolean {
  const schema = resolvePlanSchema(input), variants = schema.oneOf ?? schema.anyOf;
  if (variants) return !variants.some(variant => !needsInput(value, variant));
  if (schema.type === "null") return value !== null;
  if (value === null || value === undefined) return true;
  if (schema.type === "object") return typeof value !== "object" || Array.isArray(value) ||
    Object.entries(schema.properties ?? {}).some(([key, child]) =>
      (schema.required?.includes(key) || key in value) && needsInput((value as Record<string, unknown>)[key], child));
  if (schema.type === "array") return !Array.isArray(value) || value.length < (schema.minItems ?? 0) || value.some(item => needsInput(item, schema.items ?? {}));
  if (schema.type === "string") return typeof value !== "string" || !value.trim();
  if (schema.type === "boolean") return typeof value !== "boolean";
  if (schema.type === "integer") return !Number.isInteger(value);
  if (schema.type === "number") return typeof value !== "number" || !Number.isFinite(value);
  return false;
}
/** Local input guidance only. Owner validation and approval remain separate. */
export function technicalPlanInputState(editor: TechnicalPlanDraft, section: string): "Empty" | "Draft" | "Needs attention" {
  try {
    const value = technicalPlanSectionValue(editor, section);
    if (!hasInput(value)) return "Empty";
    return needsInput(value, technicalPlanSectionBinding(section).schema) ? "Needs attention" : "Draft";
  } catch { return "Needs attention"; }
}
export function technicalPlanGroupState(editor: TechnicalPlanDraft, group: typeof technicalPlanGroups[number]) {
  const states = group.sections.map(section => technicalPlanInputState(editor, section));
  if (group.id === "verification") {
    try { const required = JSON.parse(editor.conformanceJson).required;
      if (typeof required === "boolean") states.push("Draft");
      else if (states.some(state => state !== "Empty")) states.push("Needs attention");
    } catch { return "Needs attention"; }
  }
  return states.includes("Needs attention") ? "Needs attention" : states.every(state => state === "Empty") ? "Empty" : "Draft";
}

export function technicalPlanNeedsRepositories(section: string) {
  const visit = (input: PlanSchema): boolean => {
    if (input.$ref?.endsWith("/repoName")) return true;
    const schema = resolvePlanSchema(input);
    return Object.values(schema.properties ?? {}).some(visit) || Boolean(schema.items && visit(schema.items)) || (schema.oneOf ?? schema.anyOf ?? []).some(visit);
  };
  return visit(technicalPlanSectionBinding(section).schema);
}

export function technicalPlanEntryName(value: unknown, index: number, titles: Record<string, string>) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    if (typeof row.from === "string" && row.from && typeof row.to === "string" && row.to) return `${row.from} → ${row.to}`;
    for (const key of ["title", "name", "handoff_id", "chain_id", "work_item_id", "id", "gate_id", "case_id", "dimension_id", "repo", "owner_repo", "state", "from_state"])
      if (typeof row[key] === "string" && row[key]) return titles[row[key]] ?? row[key];
  }
  return typeof value === "string" && value ? titles[value] ?? value : `Untitled entry ${index + 1}`;
}

