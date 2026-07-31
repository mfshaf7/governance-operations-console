import type { DeliveryIntakeSource } from "../../../domain/delivery-types.ts";

export const deliveryIntakeSourceFixtures: DeliveryIntakeSource[] = [
  {
    accepted_source_id: "intake-source-394",
    consumed_at: null,
    delivery_package_id: null,
    evidence_refs: [
      "proposal:IDEA-394",
      "oos://accepted-proposals/IDEA-394",
      "wgcf://readiness/consume/IDEA-394",
    ],
    expected_backend_route: "POST /v1/ideas/IDEA-394/consume",
    gate_summary: "Accepted source is ready for one Delivery Epic shell.",
    intake_status: "needs_consume",
    owner: "workspace-prototype-studio",
    source_kind: "proposal",
    source_ref: "IDEA-394",
    source_custody: {
      classification: "new-repo-required",
      owner: "workspace-prototype-studio",
      rationale:
        "This is a new product-shaped delivery item. Repository admission resolved the durable source home before Delivery Intake.",
      repo_ref: "repo://client-insight-delivery",
      repository_gate_state: "resolved",
    },
    status_label: "Needs Consume",
    summary:
      "Accepted client insight proposal needs a top-level Delivery package shell before Work Design can begin.",
    title: "Client Insight Delivery Shell",
    tone: "warn",
    work_design_session_ref: null,
  },
  {
    accepted_source_id: "intake-source-402",
    consumed_at: "2026-05-26T11:24:00.000Z",
    consumed_by: "Workspace delivery operator via OOS",
    delivery_package_id: "pkg-design-712",
    evidence_refs: [
      "proposal:IDEA-402",
      "openproject://work_packages/712",
      "wgcf://workflows/delivery-work-design/712",
    ],
    expected_backend_route:
      "GET /v1/delivery-initiatives/pkg-design-712/planning",
    gate_summary:
      "Delivery Epic shell already exists; consume receipt is available for audit.",
    intake_status: "consumed",
    owner: "context-governance-gateway",
    source_kind: "proposal",
    source_ref: "IDEA-402",
    source_custody: {
      classification: "existing-repo",
      owner: "context-governance-gateway",
      rationale:
        "The delivery work changes an existing admitted owner repo; no new repository gate is needed.",
      repo_ref: "repo://context-governance-gateway",
      repository_gate_state: "resolved",
    },
    status_label: "Consumed",
    summary:
      "Accepted governance audit proposal has already been consumed into a Delivery shell.",
    title: "Context Admission Work Design",
    tone: "ok",
    work_design_session_ref: "wgcf://workflows/delivery-work-design/712",
  },
  {
    accepted_source_id: "intake-source-417",
    consumed_at: null,
    delivery_package_id: null,
    evidence_refs: [
      "proposal:IDEA-417",
      "oos://accepted-proposals/IDEA-417",
      "wgcf://readiness/consume/IDEA-417",
    ],
    expected_backend_route: "POST /v1/ideas/IDEA-417/consume",
    gate_summary:
      "Last consume attempt failed while writing the Delivery backlink; retry can reconcile the source after OOS confirms the Delivery shell.",
    intake_status: "consume_failed",
    owner: "security-architecture",
    source_kind: "proposal",
    source_ref: "IDEA-417",
    source_custody: {
      classification: "non-source-work",
      owner: "security-architecture",
      rationale:
        "This Delivery item is a security review consume/reconciliation path, not source implementation.",
      repo_ref: null,
      repository_gate_state: "not-required",
    },
    status_label: "Consume Failed",
    summary:
      "Accepted security review proposal needs consume retry or backlink repair after a failed shell-link attempt.",
    title: "Security Review Consume Retry",
    tone: "danger",
    work_design_session_ref: null,
  },
  {
    accepted_source_id: "intake-source-428",
    consumed_at: null,
    delivery_package_id: null,
    evidence_refs: [
      "proposal:IDEA-428",
      "oos://accepted-proposals/IDEA-428",
      "cgg://packets/intake-428-context",
    ],
    expected_backend_route: "POST /v1/ideas/IDEA-428/consume",
    gate_summary:
      "Context packet is attached; consume can create the shell only.",
    intake_status: "needs_consume",
    owner: "workspace-prototype-studio",
    source_kind: "proposal",
    source_ref: "IDEA-428",
    source_custody: {
      classification: "existing-repo",
      owner: "workspace-prototype-studio",
      rationale:
        "The console prototype source already lives in Workspace Prototype Studio for this local design pass.",
      repo_ref: "repo://workspace-prototype-studio",
      repository_gate_state: "resolved",
    },
    status_label: "Needs Consume",
    summary:
      "Console proposal is accepted and waiting for Delivery package shell confirmation.",
    title: "Operator Console Intake Split",
    tone: "warn",
    work_design_session_ref: null,
  },
  {
    accepted_source_id: "intake-source-431",
    consumed_at: null,
    delivery_package_id: null,
    evidence_refs: [
      "proposal:IDEA-431",
      "oos://accepted-proposals/IDEA-431",
      "wgcf://readiness/consume/IDEA-431",
    ],
    expected_backend_route: "POST /v1/ideas/IDEA-431/consume",
    gate_summary:
      "Accepted source can create the shell; Work Design will clarify telemetry scope and owner boundary.",
    intake_status: "needs_consume",
    owner: "platform-engineering",
    source_kind: "proposal",
    source_ref: "IDEA-431",
    source_custody: {
      classification: "platform-internal",
      owner: "platform-engineering",
      rationale:
        "Telemetry work belongs inside the existing platform-engineering source boundary rather than a new product repo.",
      repo_ref: "repo://platform-engineering",
      repository_gate_state: "not-required",
    },
    status_label: "Needs Consume",
    summary:
      "Accepted telemetry proposal is ready for a Delivery shell; design ownership is resolved after consume.",
    title: "Telemetry Delivery Shell",
    tone: "warn",
    work_design_session_ref: null,
  },
  {
    accepted_source_id: "intake-source-436",
    consumed_at: null,
    delivery_package_id: null,
    evidence_refs: [
      "proposal:IDEA-436",
      "oos://accepted-proposals/IDEA-436",
      "wgcf://readiness/consume/IDEA-436",
    ],
    expected_backend_route: "POST /v1/ideas/IDEA-436/consume",
    gate_summary: "Repository lifecycle proposal is ready for consume review.",
    intake_status: "needs_consume",
    owner: "workspace-governance",
    source_kind: "proposal",
    source_ref: "IDEA-436",
    source_custody: {
      classification: "existing-repo",
      owner: "workspace-governance",
      rationale:
        "Repository lifecycle policy changes are owned by the existing workspace-governance repo.",
      repo_ref: "repo://workspace-governance",
      repository_gate_state: "resolved",
    },
    status_label: "Needs Consume",
    summary:
      "Accepted repository lifecycle proposal needs a Delivery shell and Work Design session.",
    title: "Repository Lifecycle Intake",
    tone: "warn",
    work_design_session_ref: null,
  },
];
