// Synthetic OOS-shaped inputs reproduce historical closeout without live data.
export function proposalCompletionRecord(overrides = {}) {
  const projection = {
    schema_version: 1,
    proposal_id: "idea-851",
    record_ref: "openproject://work_packages/851",
    record_system: "openproject",
    record_project: "workspace-proposals",
    record_version: "version-17",
    projection_state: "current",
    status: "implemented",
    title: "Completed example proposal",
    body: "A synthetic completed project whose old route was not retained.",
    triage_summary: "The original proposal was reviewed.",
    decision_notes: "The accepted work was completed.",
    route: null,
    handoff: { state: "not-requested", packet_ref: null, target_receipt_ref: null, target_record_ref: null },
    source: { ingress: "system", surface: "synthetic-test", native_ref: {}, context_ref: {} },
    last_event_ref: null,
    updated_at: "2026-06-21T08:00:00Z",
    ...overrides,
  };
  return {
    createdAt: "2026-06-20T08:00:00Z",
    projection,
    history: { schema_version: 1, proposal_id: projection.proposal_id, record_version: projection.record_version, events: [], next_cursor: null },
  };
}

export function proposalCompletionRoute(target = "delivery") {
  return { target, rationale: "Recorded route to the existing source owner.", source_custody: {
    classification: "existing-repo", repository_mode: "existing", repository_gate_state: "resolved",
    owner: "example-owner", source_ref: "repo://example-owner", rationale: "Existing source ownership.",
  } };
}
