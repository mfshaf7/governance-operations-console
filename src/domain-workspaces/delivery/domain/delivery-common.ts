export type DeliverySourceTruth =
  "mock" | "OOS" | "OpenProject-backed OOS" | "Workspace Delivery backend";

export type DeliveryProjectionStatus =
  | "backend_unavailable"
  | "fresh"
  | "permission_denied"
  | "projection_sync_required"
  | "read_error"
  | "stale";

export type DeliveryBackendStatus =
  "blocked" | "done" | "in-progress" | "new" | "parked" | "ready" | "retired";

export type DeliveryPackagePosture =
  | "Blocked"
  | "Closeout Pending"
  | "Deferred"
  | "Done"
  | "In Progress"
  | "Ready"
  | "Retired";

export type DeliveryWorkflowPhase =
  "audit_only" | "execution" | "intake" | "refinement" | "work_design";

export type DeliveryComponentType =
  | "Defect"
  | "Epic"
  | "Feature"
  | "Milestone"
  | "PI Objective"
  | "Risk"
  | "Task"
  | "User story";

export type DeliveryTone =
  "danger" | "info" | "muted" | "ok" | "stale" | "warn";

export type DeliveryProjectionState = {
  checked_at: string;
  detail: string;
  source_revision: string;
  status: DeliveryProjectionStatus;
};
