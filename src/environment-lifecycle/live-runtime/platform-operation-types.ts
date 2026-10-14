export type PlatformOperationAction =
  | "dev-integration.request-profile"
  | "dev-integration.start"
  | "dev-integration.status"
  | "dev-integration.access"
  | "dev-integration.smoke"
  | "dev-integration.stop"
  | "dev-integration.reset"
  | "dev-integration.promote-check"
  | "governed-release.execute-step"
  | "governed-release.change-runtime-lifecycle";

export type PlatformOperationCapability = Readonly<{
  action: PlatformOperationAction;
  approval_required: boolean;
  available: boolean;
  capability_id: string;
  destructive: boolean;
  required_capability: string;
  unavailable_reason: string | null;
}>;

export type PlatformOperationSubject = Readonly<{
  capabilities: readonly PlatformOperationCapability[];
  kind:
    | "dev-integration-profile"
    | "profile-request"
    | "product-release"
    | "product-runtime-lifecycle";
  owner: string;
  ref: string;
  source_version: string;
}>;

export type PlatformOperationCatalog = Readonly<{
  catalog_id: string;
  freshness: "current" | "stale" | "unavailable";
  observed_at: string;
  schema_version: 1;
  source_version: string;
  subjects: readonly PlatformOperationSubject[];
}>;

export type PlatformOperationState =
  | "blocked"
  | "cancelled"
  | "failed"
  | "queued"
  | "requested"
  | "running"
  | "succeeded";

export type PlatformOperationRecord = Readonly<{
  command: Readonly<{
    actor_ref: string;
    action: PlatformOperationAction;
    approval: Readonly<{
      decided_at: string;
      decision: "approved";
      decision_ref: string;
      intent_digest: string;
      operator_id: string;
    }>;
    causation_id: string | null;
    capability_id: string;
    command_id: string;
    correlation_id: string;
    idempotency_key: string;
    input: Readonly<Record<string, unknown>>;
    intent_digest: string;
    requested_at: string;
    schema_version: 1;
    subject: Readonly<{
      expected_source_version: string;
      kind: PlatformOperationSubject["kind"];
      ref: string;
    }>;
  }>;
  controls: readonly Readonly<{
    action: "cancel" | "retry";
    control_id: string;
    idempotency_key: string;
    request_digest: string;
    requested_at: string;
    status: "confirmed" | "dispatching" | "unknown";
  }>[];
  created_at: string;
  next_action: Readonly<{
    authority: string;
    code: string;
    reason: string;
  }>;
  operation_id: string;
  provider_operation: Readonly<{
    action: PlatformOperationAction;
    attempt: number;
    blocker: Readonly<{
      code: string;
      next_action: string;
      owner: string;
      reason: string;
      supported_dispositions: readonly string[];
    }> | null;
    cancel_available: boolean;
    capability_id: string;
    command_id: string;
    correlation_id: string;
    events: readonly Readonly<{
      event_id: string;
      occurred_at: string;
      sequence: number;
      state: PlatformOperationState;
      summary: string;
    }>[];
    failure: Readonly<{ code: string; detail: string; owner: string }> | null;
    receipt: Readonly<{
      effect: "none" | "partial" | "verified";
      outcome: "cancelled" | "failed" | "succeeded";
      receipt_ref: string;
      recorded_at: string;
      source_version: string;
    }> | null;
    retryable: boolean;
    safe_log_ref: string | null;
    schema_version: 1;
    state: PlatformOperationState;
    subject_ref: string;
    updated_at: string;
  }>;
  reconciled: boolean;
  replayed: boolean;
  schema_version: 1;
  security_decision: Readonly<{ digest: string; revision: string; uri: string }>;
  state: PlatformOperationState;
  updated_at: string;
  workflow_id: "platform-operation";
}>;

export type PlatformOperationsLiveSnapshot = Readonly<{
  catalog: PlatformOperationCatalog | null;
  error: Readonly<{ code: string; message: string }> | null;
  mode: "disconnected-preview" | "live" | "unavailable";
  observedAt: string;
  operations: readonly PlatformOperationRecord[];
  status: "current" | "loading" | "offline";
}>;
