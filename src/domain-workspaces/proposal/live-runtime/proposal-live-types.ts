import type { ProposalWorkflowApplyPayload } from "../work-model/proposal-workflow-command-model.ts";

export type ProposalOosLifecycleStatus =
  | "accepted"
  | "captured"
  | "implemented"
  | "parked"
  | "rejected"
  | "triaged";

export type ProposalOosSourceCustody = {
  classification:
    | "existing-repo"
    | "new-repo-required"
    | "non-source-work"
    | "platform-internal";
  owner: string | null;
  rationale: string;
  repository_gate_state: "not-required" | "pending" | "resolved";
  repository_mode: "existing" | "new" | "not-required";
  source_ref: string | null;
};

export type ProposalOosRoute = {
  rationale: string;
  source_custody: ProposalOosSourceCustody;
  target: "delivery" | "prototype";
};

export type ProposalOosProjection = {
  body: string | null;
  decision_notes: string | null;
  handoff: {
    packet_ref: string | null;
    state: "applied" | "blocked" | "not-requested" | "ready" | "waiting-on-target";
    target_receipt_ref: string | null;
    target_record_ref: string | null;
  };
  last_event_ref: string | null;
  projection_state: "current" | "error" | "offline" | "stale" | "syncing";
  proposal_id: string;
  record_project: "workspace-proposals";
  record_ref: string;
  record_system: "openproject";
  record_version: string;
  route: ProposalOosRoute | null;
  schema_version: 1;
  source: {
    context_ref: Record<string, boolean | number | string>;
    ingress: "agent" | "api" | "console" | "system";
    native_ref: Record<string, boolean | number | string>;
    surface: string;
  };
  status: ProposalOosLifecycleStatus;
  title: string;
  triage_summary: string | null;
  updated_at: string;
};

export type ProposalOosEvent = {
  actor: { id: string; kind: "operator" | "system" | "target" };
  command_id: string | null;
  event_id: string;
  event_type:
    | "captured"
    | "disposition-recorded"
    | "handoff-applied"
    | "handoff-blocked"
    | "handoff-prepared"
    | "implementation-reconciled"
    | "target-application-failed"
    | "triaged";
  occurred_at: string;
  proposal_id: string;
  receipt_refs: string[];
  record_version: string;
  schema_version: 1;
  status_after: ProposalOosLifecycleStatus;
  status_before: ProposalOosLifecycleStatus | null;
  summary: string;
};

export type ProposalOosHistory = {
  events: ProposalOosEvent[];
  next_cursor: string | null;
  proposal_id: string;
  record_version: string;
  schema_version: 1;
};

export type ProposalLiveRecord = {
  createdAt: string;
  history: ProposalOosHistory;
  projection: ProposalOosProjection;
};

export type ProposalLiveSnapshot = {
  error: string | null;
  mode: "disconnected-preview" | "live";
  observedAt: string;
  records: ProposalLiveRecord[];
  status: "current" | "offline";
};

export type ProposalLiveCommandRequest = {
  commandId: string;
  payload: ProposalWorkflowApplyPayload;
  proposalId: string;
  source: {
    projectionState: ProposalOosProjection["projection_state"];
    recordRef: string;
    recordVersion: string;
    status: ProposalOosLifecycleStatus;
  };
};

export type ProposalOosCommandResult = {
  command_id: string;
  event: ProposalOosEvent;
  history: ProposalOosHistory;
  projection: ProposalOosProjection;
  receipt: {
    owner: "operator-orchestration-service";
    receipt_ref: string;
    recorded_at: string;
    record_ref: string;
    record_version: string;
  };
  replayed: boolean;
  schema_version: 1;
};

export type ProposalLiveCaptureRequest = {
  body: string;
  requestId: string;
  title: string;
};

export type ProposalLiveApiError = {
  code: string;
  error: string;
  mode: "live";
  status: "offline";
};
