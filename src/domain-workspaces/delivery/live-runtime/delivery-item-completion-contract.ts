// Non-source intent uses the existing broker completion contract. These local
// checks improve review; the broker remains the readiness/narrative authority.
export type ItemCompletionEvidence = {
  completion_summary: string;
  changed_surfaces: string;
  test_result_evidence: string;
  validation_evidence: string;
  completion_note: string;
};

export type ItemCompletionContext = {
  work_item_id: number;
  record_ref: string;
  subject: string;
  status: string;
  owner_repo: string | null;
  revision: string;
  open_descendant_count: number;
  open_child_count: number;
  completed_related_count: number;
  source_session_active: boolean;
  completion_evidence_valid: boolean;
  can_complete: boolean;
  blocking_reasons: string[];
};

export function completionTargetId(value: unknown) {
  const id = typeof value === "string" && /^[1-9][0-9]*$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(id) || Number(id) < 1) throw new Error("An exact ART work item is required.");
  return Number(id);
}

export function completionEvidence(value: unknown): ItemCompletionEvidence {
  const body = completionObject(value);
  const fields = ["completion_summary", "changed_surfaces", "test_result_evidence", "validation_evidence", "completion_note"] as const;
  if (Object.keys(body).some(key => !fields.includes(key as typeof fields[number]))) {
    throw new Error("Completion accepts evidence prose only; source actions and attachments use their owner paths.");
  }
  const evidence = Object.fromEntries(fields.map(key => {
    if (key === "completion_note" && (body[key] === undefined || body[key] === "")) return [key, ""];
    if (typeof body[key] !== "string" || !body[key].trim()) throw new Error(`Completion requires ${key.replaceAll("_", " ")}.`);
    return [key, body[key].trim()];
  })) as ItemCompletionEvidence;
  for (const [key, prefixes] of [
    ["test_result_evidence", ["PASS", "FAIL", "NOT APPLICABLE", "Attached artifact"]],
    ["validation_evidence", ["PASS", "FAIL", "CHECK", "NOT APPLICABLE", "Attached artifact"]],
  ] as const) {
    if (evidence[key].split("\n").some(line => line.trim() && !prefixes.some(prefix => line.trim().startsWith(`- ${prefix}:`)))) {
      throw new Error(`${key.replaceAll("_", " ")} must use the broker's evidence bullet prefixes.`);
    }
  }
  return evidence;
}

export function completionObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Completion evidence is malformed.");
  return value as Record<string, unknown>;
}

export function assertCompletionContext(value: unknown): ItemCompletionContext {
  const body = completionObject(value);
  completionTargetId(body.work_item_id);
  if (body.record_ref !== `openproject://work_packages/${body.work_item_id}` ||
    typeof body.subject !== "string" || !body.subject.trim() || typeof body.status !== "string" ||
    typeof body.revision !== "string" || !/^sha256:[a-f0-9]{64}$/.test(body.revision) ||
    !(body.owner_repo === null || typeof body.owner_repo === "string") ||
    !Number.isSafeInteger(body.open_descendant_count) || Number(body.open_descendant_count) < 0 ||
    !Number.isSafeInteger(body.open_child_count) || Number(body.open_child_count) < 0 ||
    !Number.isSafeInteger(body.completed_related_count) || Number(body.completed_related_count) < 0 ||
    [body.source_session_active, body.completion_evidence_valid, body.can_complete].some(v => typeof v !== "boolean") ||
    !Array.isArray(body.blocking_reasons) || body.blocking_reasons.some(v => typeof v !== "string")) {
    throw new Error("The completion context is not bound to a valid canonical work item.");
  }
  if (body.can_complete && (body.status === "done" || body.source_session_active || body.open_descendant_count !== 0 || body.blocking_reasons.length !== 0)) {
    throw new Error("Completion eligibility contradicts its canonical prerequisites.");
  }
  return value as ItemCompletionContext;
}
