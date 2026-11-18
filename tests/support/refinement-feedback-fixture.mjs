// Synthetic owner transport only. No live work item or model invocation.
export function refinementFeedbackProjection(run = null) {
  const at = new Date().toISOString();
  return {
    schema_version: 1, package_ref: "delivery-package:760", source_revision: run?.receipt ? "version-22" : "version-21",
    projected_at: at, active_run: run && !["completed", "failed"].includes(run.state) ? run : null,
    latest_run: run, history: run ? [run] : [],
    packet: {
      schema_version: 1, packet_id: "refinement-packet:760", packet_revision: "packet-version-3",
      status: run?.receipt ? "applied" : "ready_for_review", active_step: "apply_refinement", last_saved_at: at,
      source: { delivery_id: "delivery-760", package_ref: "delivery-package:760", source_ref: "openproject://work_packages/760",
        source_revision: "version-21", source_work_design_receipt_id: "work-design-receipt:760",
        tree_snapshot_ref: "tree://delivery/760", finalized_brief_ref: "brief://work-design/760/final" },
      target_tree: { children: [], description: "Synthetic feedback inspection", draft_body: "Reviewed metadata",
        id: "760", kind: "Epic", remark: "Ready for Refinement", title: "Adapter Contract Metadata Repair" },
      apply_plan: { expected_routes: ["/v1/delivery/760/plan/apply"], summary: "Apply reviewed metadata only.",
        operations: [{ operation_id: "apply-target-pi", label: "Apply Target PI", detail: "Update reviewed Target PI",
          kind: "plan_apply", oos_route: "/v1/delivery/760/plan/apply", status: "planned", target: "delivery-760" }] },
      readiness_gates: [{ detail: "Handoff checked", gate_id: "work-design-handoff", label: "Work Design Handoff", status: "passed" }],
      draft_groups: [{ group_id: "planning", title: "Planning", summary: "Planning metadata", fields: [{
        field_key: "target_pi", backend_field: "target_pi", label: "Target PI", field_kind: "select", required: true,
        value: "PI-2026-03", allowed_values: ["PI-2026-03"], status: "complete", validation_hint: "Use an admitted Target PI",
        target_node_ids: ["760"], target_statuses: { 760: "complete" }, target_values: { 760: "PI-2026-03" },
        route_binding: { operation_kind: "plan_apply", oos_route: "/v1/delivery/760/plan/apply", payload_key: "target_pi", target: "initiative" },
      }] }],
    },
  };
}

export function refinementFeedbackRun(state = "running") {
  const start = "2026-11-01T01:00:02.000Z", finish = "2026-11-01T01:00:08.000Z";
  const completed = state === "completed";
  return {
    schema_version: 1, correlation_id: "correlation:synthetic-refinement", request_id: "request:synthetic-refinement",
    run_id: "refinement-run:760", poll_ref: "/v1/delivery-refinement/delivery-package:760/runs/refinement-run:760",
    replayed: false, state, submitted_at: start, updated_at: completed ? finish : start, failure: null,
    events: [{ event_id: "event:760:1", event_type: "accepted", message: "Synthetic backend acknowledged the original run.",
      recorded_at: start, sequence: 1, status: "running" }, ...(completed ? [{ event_id: "event:760:2", event_type: "readback_completed",
      message: "Synthetic canonical readback completed.", recorded_at: finish, sequence: 2, status: "completed" }] : [])],
    receipt: completed ? {
      accepted_draft_digest: "sha256:" + "a".repeat(64), receipt_digest: "sha256:" + "b".repeat(64),
      receipt_id: "refinement-receipt:760", receipt_ref: "oos://refinement-receipts/760", run_id: "refinement-run:760",
      applied_at: finish, applied_by: "operator:synthetic", source_work_design_receipt_id: "work-design-receipt:760",
      target: { created_refs: [], updated_refs: ["openproject://work_packages/760"], reused_refs: [],
        delivery_ref: "openproject://work_packages/760", readback_complete: true, source_revision: "version-22" },
    } : null,
  };
}
