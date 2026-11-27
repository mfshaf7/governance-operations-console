import { resolvePlanSchema, type PlanSchema } from "./architecture-form-model.ts";
import { technicalPlanSectionBinding, technicalPlanSectionValue, type TechnicalPlanDraft } from "./technical-plan-model.ts";

export const technicalPlanGroups = [
  { id: "work", label: "Work & Changes", sections: ["architecture:landing_units", "repo_revisions"] },
  { id: "decisions", label: "Approvals & Decisions", sections: ["architecture:required_human_gates", "architecture:contradictions_open_decisions"] },
  { id: "sequence", label: "Sequence & Handoffs", sections: ["architecture:work_item_execution_plan", "architecture:source_landing_graph", "architecture:evidence_receipt_handoffs"] },
  { id: "operation", label: "Operation & Recovery", sections: ["architecture:rollback_cleanup_terminal_conditions", "architecture:lifecycle_state_model", "architecture:authorization_session_execution_model", "architecture:runtime_boundaries", "architecture:runtime_activation_chains"] },
  { id: "verification", label: "Verification", sections: ["conformance_plan:protocol_applicability", "conformance_plan:dimensions", "conformance_plan:work_item_dimension_applicability", "conformance_plan:git_causality", "conformance_plan:cases"] },
] as const;

export function technicalPlanGroup(section: string) {
  const group = technicalPlanGroups.find(group => group.sections.some(key => key === section));
  if (!group) throw Error("Choose an available planning area.");
  return group;
}

export const technicalPlanEmptyAnswers: Readonly<Record<string, string | undefined>> = {
  "architecture:evidence_receipt_handoffs": "No handoff needed",
  "architecture:required_human_gates": "No approvals needed",
  "architecture:contradictions_open_decisions": "No open decisions",
  "architecture:runtime_activation_chains": "No runtime activation steps",
};

export function technicalPlanVerificationCoverage(editor: TechnicalPlanDraft) {
  try {
    const cases = technicalPlanSectionValue(editor, "conformance_plan:cases");
    const caseSchema = technicalPlanSectionBinding("conformance_plan:cases").schema.items ?? {};
    const coverage = new Map<string, Set<string>>();
    for (const entry of Array.isArray(cases) ? cases : []) {
      if (!["positive", "negative"].includes(entry?.polarity) || !Array.isArray(entry.applies_to_work_item_ids) ||
          technicalPlanMissingCaseFields(entry, caseSchema).length) continue;
      for (const id of entry.applies_to_work_item_ids) {
        const kinds = coverage.get(id) ?? new Set<string>();
        kinds.add(entry.polarity);
        coverage.set(id, kinds);
      }
    }
    return editor.coveredWorkItemIds.flatMap(id => {
      const kinds = coverage.get(id);
      const missing = (["positive", "negative"] as const).filter(kind => !kinds?.has(kind));
      return missing.length ? [{ id, missing }] : [];
    });
  } catch { return []; }
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
export function technicalPlanMissingCaseFields(value: unknown, input: PlanSchema) {
  const schema = resolvePlanSchema(input);
  const row = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return (schema.required ?? []).filter(key => {
    const field = resolvePlanSchema(schema.properties?.[key] ?? {});
    return field.enum ? !field.enum.includes(row[key]) : needsInput(row[key], field);
  });
}

/** Local input guidance only. Owner validation and approval remain separate. */
export function technicalPlanInputState(editor: TechnicalPlanDraft, section: string): "Empty" | "Draft" | "Needs attention" | "None applies" {
  try {
    const value = technicalPlanSectionValue(editor, section);
    if (value === undefined && section === "architecture:runtime_boundaries") return "None applies";
    if (section === "architecture:required_human_gates" && Array.isArray(value) && value.length > 0) {
      const rows = technicalPlanSectionValue(editor, "architecture:work_item_execution_plan");
      const groups = technicalPlanSectionValue(editor, "architecture:landing_units");
      if (value.some(gate => {
        const row = Array.isArray(rows) ? rows.find(entry => entry?.work_item_id === gate?.authority_work_item_id) : undefined;
        const start = Array.isArray(row?.start_after_work_item_ids) ? row.start_after_work_item_ids : [];
        const close = Array.isArray(row?.close_after_work_item_ids) ? row.close_after_work_item_ids : [];
        if (Array.isArray(gate?.evidence_prerequisite_work_item_ids) &&
            gate.evidence_prerequisite_work_item_ids.some((id: string) => !start.includes(id) && !close.includes(id))) return true;
        const sourceApproval = gate?.blocked_transition === "before_source_merge" || gate?.blocked_transition === "before_runtime_activation";
        return sourceApproval && Array.isArray(gate.affected_landing_unit_ids) && gate.affected_landing_unit_ids.some((id: string) =>
          !Array.isArray(groups) || !groups.some(group => group?.id === id && group.source_backed === true));
      })) return "Needs attention";
    }
    if (value === null && (section === "architecture:lifecycle_state_model" ||
        section === "architecture:authorization_session_execution_model")) return "None applies";
    if (section === "conformance_plan:protocol_applicability" && JSON.parse(editor.conformanceJson).required === false) return "Needs attention";
    if (technicalPlanEmptyAnswers[section] && Array.isArray(value) && value.length === 0) {
      if (section === "architecture:runtime_activation_chains") {
        const gates = technicalPlanSectionValue(editor, "architecture:required_human_gates");
        if (Array.isArray(gates) && gates.some(gate => gate?.blocked_transition === "before_runtime_activation")) return "Needs attention";
      }
      return "None applies";
    }
    if (!hasInput(value)) return "Empty";
    return needsInput(value, technicalPlanSectionBinding(section).schema) ? "Needs attention" : "Draft";
  } catch { return "Needs attention"; }
}
export function technicalPlanGroupState(editor: TechnicalPlanDraft, group: typeof technicalPlanGroups[number]) {
  const states = group.sections.map(section => technicalPlanInputState(editor, section));
  if (group.id === "verification") {
    try { const required = JSON.parse(editor.conformanceJson).required;
      if (required !== true) states.push("Needs attention");
    } catch { return "Needs attention"; }
  }
  return states.includes("Needs attention") ? "Needs attention" : states.every(state => state === "Empty") ? "Empty" : "Draft";
}

export function technicalPlanRepositoryLookupFields(section: string): readonly string[] {
  switch (section) {
    case "architecture:landing_units":
    case "architecture:descendant_owner_map":
    case "architecture:runtime_boundaries":
      return ["owner_repo"];
    case "architecture:lifecycle_state_model":
      return ["authority"];
    default:
      return [];
  }
}

export const technicalPlanOptionLabels: Readonly<Record<string, string>> = {
  positive: "Success path", negative: "Failure or rejection path",
  "merge-ready": "Before merge", "operating-ready": "Before putting the change into use",
  before_implementation: "Before implementation", before_source_merge: "Before merging code",
  before_runtime_activation: "Before activating the runtime", before_operating_ready: "Before putting the change into use",
  "source-ready": "The source already allows activation", "owner-source-change-required": "A source change must land first",
  "pure-unit": "Unit test", filesystem: "Filesystem test", "real-git": "Real Git repository",
  "process-crash": "Process crash test", "sandbox-runtime": "Sandbox runtime", "live-backend": "Live backend",
};

export const technicalPlanVerificationReaders = {
  coverage: "Check coverage",
  settings: "Connection and Git checks",
} as const;

export function technicalPlanCaseEntry(value: unknown, index: number, titles: Record<string, string>) {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const label = technicalPlanEntryName(value, index, titles);
  const work = Array.isArray(row.applies_to_work_item_ids) ? row.applies_to_work_item_ids.map(id =>
    titles[id] ?? String(id).replace(/^work-item-([1-9]\d*)$/, "Work item #$1")) : [];
  const polarity = typeof row.polarity === "string" ? technicalPlanOptionLabels[row.polarity] ?? row.polarity : undefined;
  const timing = typeof row.target_readiness === "string" ? technicalPlanOptionLabels[row.target_readiness] ?? row.target_readiness : undefined;
  const scope = work.length === 1 ? work[0] : work.length > 1 ? `${work.length} work items` : undefined;
  const detail = [polarity, timing, scope].filter(Boolean).join(" · ");
  return { index, label, detail, searchText: [label, detail, ...work].join(" ") };
}

export function technicalPlanEntryName(value: unknown, index: number, titles: Record<string, string>) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    if (typeof row.uri === "string" && typeof row.digest === "string") {
      const document = row.uri.split(/[?#]/, 1)[0].split("/").filter(Boolean).at(-1);
      return document && !/^[a-f0-9]{40,64}$/i.test(document) ? document : `Authorization record ${index + 1}`;
    }
    const relationship = (from: string, to: string) => {
      const first = row[from], second = row[to];
      return typeof first === "string" && first && typeof second === "string" && second
        ? `${titles[first] ?? first} → ${titles[second] ?? second}` : null;
    };
    const pair = relationship("from", "to") || relationship("prerequisite_landing_unit_id", "dependent_landing_unit_id");
    if (pair) return pair;
    if ("producer_landing_unit_id" in row) {
      if (typeof row.artifact === "string" && row.artifact.trim()) return row.artifact;
      return relationship("producer", "consumer") ?? `Handoff ${index + 1}`;
    }
    if (typeof row.authority_work_item_id === "string" && row.authority_work_item_id) {
      const work = titles[row.authority_work_item_id] ?? row.authority_work_item_id;
      return typeof row.blocked_transition === "string" && row.blocked_transition
        ? `Approval ${row.blocked_transition.replaceAll("_", " ")} · ${work}` : work;
    }
    for (const key of ["title", "name", "work_item_id", "summary", "expected_outcome", "chain_id", "id", "gate_id", "case_id", "dimension_id", "repo", "owner_repo", "state", "from_state"]) {
      const text = row[key];
      if (typeof text === "string" && text.trim() && !/-[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(text)) {
        return titles[text] ?? text;
      }
    }
  }
  return typeof value === "string" && value ? titles[value] ?? value : `Untitled entry ${index + 1}`;
}
