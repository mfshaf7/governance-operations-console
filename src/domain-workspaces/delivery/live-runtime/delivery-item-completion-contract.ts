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
  completed_child_count?: number;
  completed_child_evidence?: CompletedChildEvidence;
  recorded_completion?: Record<string, string>;
  source_session_active: boolean;
  completion_evidence_valid: boolean;
  can_complete: boolean;
  blocking_reasons: string[];
  pi_review?: {
    delivery_id: string;
    target_pi: string;
    planned_business_value: number | null;
    actual_business_value: number | null;
    review_outcome: string | null;
    review_outcomes?: string[];
    can_review: boolean;
  };
};

export type CompletedChildEvidence = {
  completed_child_count: number;
  matched_child_count: number;
  unavailable_child_count?: number;
  links: { url: string; work_items: { id: number; subject: string }[] }[];
};

export function assertCompletedChildEvidence(value: unknown): CompletedChildEvidence {
  const evidence = completionObject(value);
  const count = Number(evidence.completed_child_count), matched = Number(evidence.matched_child_count);
  if (!Number.isSafeInteger(evidence.completed_child_count) || !Number.isSafeInteger(evidence.matched_child_count) ||
    matched < 0 || count < matched || !Array.isArray(evidence.links)) throw new Error("Completed child evidence is invalid.");
  if (evidence.unavailable_child_count !== undefined &&
    (!Number.isSafeInteger(evidence.unavailable_child_count) || Number(evidence.unavailable_child_count) < 0 ||
      matched + Number(evidence.unavailable_child_count) > count)) throw new Error("Completed child evidence coverage is invalid.");
  const urls = new Set(), children = new Set();
  for (const value of evidence.links) {
    const link = completionObject(value);
    if (typeof link.url !== "string" || !/^https:\/\/github\.com\/[a-z0-9_.-]+\/[a-z0-9_.-]+\/pull\/[1-9][0-9]*$/i.test(link.url) ||
      urls.has(link.url) || !Array.isArray(link.work_items) || !link.work_items.length) throw new Error("A reviewed evidence link is invalid.");
    urls.add(link.url);
    const linkChildren = new Set();
    for (const value of link.work_items) {
      const item = completionObject(value);
      if (typeof item.id !== "number" || completionTargetId(item.id) !== item.id ||
        linkChildren.has(item.id) || typeof item.subject !== "string" || !item.subject.trim()) throw new Error("A reviewed child record is invalid.");
      linkChildren.add(item.id);
      children.add(item.id);
    }
  }
  if (children.size !== matched) throw new Error("Completed child evidence does not match its reported coverage.");
  return value as CompletedChildEvidence;
}

export type ItemPiReview = { actualBusinessValue: number; reviewOutcome: string; reviewNote: string };
export function itemPiReview(value: unknown): ItemPiReview {
  const body = completionObject(value);
  if (Object.keys(body).some(key => !["actualBusinessValue", "reviewOutcome", "reviewNote"].includes(key)) ||
    !Number.isSafeInteger(body.actualBusinessValue) || Number(body.actualBusinessValue) < 0 ||
    typeof body.reviewOutcome !== "string" || !body.reviewOutcome.trim() ||
    (body.reviewNote !== undefined && typeof body.reviewNote !== "string")) {
    throw new Error("Review requires a non-negative actual business value and native review outcome; the note is optional.");
  }
  return { actualBusinessValue: Number(body.actualBusinessValue), reviewOutcome: body.reviewOutcome.trim(), reviewNote: typeof body.reviewNote === "string" ? body.reviewNote.trim() : "" };
}

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
  if (evidence.completion_summary.startsWith("- ")) {
    throw new Error("Completion summary must use the broker's paragraph format, not a bullet list.");
  }
  if (evidence.changed_surfaces.split("\n").some(line => line.trim() && !line.trim().startsWith("- "))) {
    throw new Error("Changed outcomes must use the broker's flat bullets, for example - Product admission: actual change and owner evidence.");
  }
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
  if (body.completed_child_count !== undefined && (!Number.isSafeInteger(body.completed_child_count) ||
    Number(body.completed_child_count) < 0 || Number(body.completed_child_count) > Number(body.completed_related_count))) {
    throw new Error("The completed child count is invalid.");
  }
  if (body.completed_child_evidence !== undefined &&
    assertCompletedChildEvidence(body.completed_child_evidence).completed_child_count !== body.completed_child_count) {
    throw new Error("Reviewed evidence belongs to a different set of child work.");
  }
  if (body.recorded_completion !== undefined && (body.status !== "done" ||
    Object.entries(completionObject(body.recorded_completion)).some(([key, content]) =>
      !["Completion Summary", "Changed Surfaces", "Test Result Evidence", "Validation Evidence"].includes(key) ||
      typeof content !== "string" || !content.trim()))) {
    throw new Error("The saved Feature outcome is invalid.");
  }
  if (body.pi_review !== undefined) {
    const pi = completionObject(body.pi_review);
    if ((pi.review_outcomes !== undefined && (!Array.isArray(pi.review_outcomes) || pi.review_outcomes.length > 100 || pi.review_outcomes.some(value => typeof value !== "string" || !value.trim()) || new Set(pi.review_outcomes).size !== pi.review_outcomes.length)) ||
      typeof pi.delivery_id !== "string" || !/^delivery-[1-9][0-9]*$/.test(pi.delivery_id) ||
      typeof pi.target_pi !== "string" || !pi.target_pi.trim() ||
      [pi.planned_business_value, pi.actual_business_value].some(v => v !== null && (!Number.isSafeInteger(v) || Number(v) < 0)) ||
      !(pi.review_outcome === null || typeof pi.review_outcome === "string") || typeof pi.can_review !== "boolean" ||
      (pi.can_review && (body.source_session_active || ["done", "retired"].includes(String(body.status))))) {
      throw new Error("PI review is not bound to current native objective metadata.");
    }
  }
  return value as ItemCompletionContext;
}
