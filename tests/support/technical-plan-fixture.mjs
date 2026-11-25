// Synthetic protocol fixture for isolated browser tests. Not a live owner result.
export function technicalPlanInput(status = "draft") {
  return {
    architecture: {
      authorization_session_execution_model: { summary: "Server-bound execution." },
      contradictions_open_decisions: [],
      descendant_owner_map: [
        {
          owner_repo: "governance-operations-console",
          work_item_id: "work-item-3",
          work_item_type: "User story",
          parent_work_item_id: "work-item-1",
        },
        { owner_repo: "website-contracts", work_item_id: "work-item-4", work_item_type: "User story", parent_work_item_id: "work-item-1" },
      ],
      evidence_receipt_handoffs: [{
        handoff_id: "handoff:compatibility-report",
        producer: "website-contracts",
        consumer: "governance-operations-console",
        producer_landing_unit_id: "delivery-1-contract",
        consumer_landing_unit_id: "delivery-1-packet-authoring",
        producer_work_item_id: "work-item-4",
        consumer_work_item_id: "work-item-3",
        integration_point: "Before merging the site change",
        artifact: "Compatibility report",
        acceptance: "The report checks the exact source revision.",
      }],
      landing_units: [
        {
          covered_work_item_ids: ["work-item-3"],
          id: "delivery-1-packet-authoring",
          owner_repo: "governance-operations-console",
          source_backed: true,
        },
        { covered_work_item_ids: ["work-item-4"], id: "delivery-1-contract", owner_repo: "website-contracts", source_backed: true },
      ],
      lifecycle_state_model: {
        states: ["ready", "published"],
        transitions: [{ from: "ready", to: "published", authority: "governance-operations-console", evidence: "Reviewed build" }],
      },
      required_human_gates: [],
      rollback_cleanup_terminal_conditions: { terminal_conditions: ["Evidence is durable."] },
      runtime_activation_chains: [],
      runtime_boundaries: [
        {
          allowed_capability_ids: ["console.submit-operator-intent"],
          owner_repo: "governance-operations-console",
          prohibited_capability_ids: ["console.own-lifecycle-truth"],
        },
      ],
      source_landing_graph: {
        edges: [{ prerequisite_landing_unit_id: "delivery-1-contract", dependent_landing_unit_id: "delivery-1-packet-authoring" }],
        nodes: ["delivery-1-contract", "delivery-1-packet-authoring"],
      },
      work_item_execution_plan: [
        {
          close_after_work_item_ids: [],
          emits_human_gate_ids: [],
          start_after_work_item_ids: [],
          work_item_id: "work-item-3",
        },
        { close_after_work_item_ids: [], emits_human_gate_ids: [], start_after_work_item_ids: [], work_item_id: "work-item-4" },
      ],
    },
    conformance_plan: {
      cases: ["positive", "negative"].map(polarity => ({
        applies_to_work_item_ids: ["work-item-3", "work-item-4"],
        dimension_ids: ["Compatibility"],
        evidence_owner_landing_unit_id: "delivery-1-packet-authoring",
        expected_outcome: polarity === "positive" ? "The page builds against the compatible revision." : "The build reports an incompatible revision.",
        fidelity: "real-git",
        id: `case:compatibility-${polarity}`,
        polarity,
        target_readiness: "merge-ready",
      })),
      dimensions: ["Compatibility"],
      git_causality: { applies: false, rationale: "Revision ordering has a separate check.", claims: [] },
      protocol_applicability: { applies: false, rationale: "No protocol change." },
      required: true,
      work_item_dimension_applicability: [
        {
          dimension_ids: ["Compatibility"],
          work_item_id: "work-item-3",
        },
        { dimension_ids: ["Compatibility"], work_item_id: "work-item-4" },
      ],
    },
    covered_work_item_ids: ["work-item-3", "work-item-4"],
    decision: {
      rationale: "Use the existing OOS and WGCF authority boundary for architecture authoring.",
      status,
    },
    delivery_id: "delivery-1",
    repo_revisions: [
      {
        base_ref: "origin/main",
        commit: "b".repeat(40),
        repo: "governance-operations-console",
      },
      { base_ref: "origin/main", commit: "c".repeat(40), repo: "website-contracts" },
    ],
    schema_version: 1,
  };
}

export function technicalPlanArtifact(input, durable=false) {
 return { architecture:input.architecture, conformance_plan:input.conformance_plan,covered_work_item_ids:input.covered_work_item_ids, delivery_id:input.delivery_id,
   artifact_id:"architecture-packet:delivery-1:test",artifact_type:"delivery_art_architecture_packet",schema_version:6,
   created_at:"2026-11-17T01:00:00Z",operator:{id:"operator:test",decision_source:"operator"},
   custody:{backend:durable?"wgcf-artifact-registry":"local-filesystem",state:durable?"durable":"local-draft",uri:durable?"wgcf://artifacts/delivery-art/sha256/"+"a".repeat(64):"local://delivery-art/test.json"},
   integrity:{content_digest:"sha256:"+"a".repeat(64)},decision:{rationale:input.decision.rationale,status:input.decision.status,decided_by:input.decision.status==="draft"?null:"operator:test",decided_at:input.decision.status==="draft"?null:"2026-11-17T01:00:00Z"},
   source_snapshot:{art_digest:"sha256:"+"b".repeat(64),art_ref:"openproject://work_packages/1",captured_at:"2026-11-17T01:00:00Z",repo_revisions:input.repo_revisions}};
}
