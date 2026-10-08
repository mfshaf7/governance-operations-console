export type PrototypePreviewOwnerRuntimeState = "running" | "stale" | "stopped";

export type PrototypePreviewOwnerReceiptRef = Readonly<{
  digest: string;
  ref: string;
}>;

export type PrototypePreviewOwnerProjection = Readonly<{
  boundary: Readonly<{
    data_mode: "mock" | "synthetic";
    external_network: false;
    mutation_boundary: "none";
    persistence_model: "runtime-metadata-only";
    public_ingress: false;
    visibility_tier: "operator-review" | "private-internal";
  }>;
  endpoint: string | null;
  instance_id: string | null;
  latest_receipt: PrototypePreviewOwnerReceiptRef | null;
  maturity_claim: "prototype-preview-only";
  operator_actions: readonly ["start", "status", "restart", "stop", "proof"];
  profile_digest: string;
  profile_id: string;
  prototype_id: string;
  runtime_state: PrototypePreviewOwnerRuntimeState;
  schema_version: 1;
  source_digest: string;
  source_revision: string;
}>;

export type PrototypePreviewOwnerReceipt = Readonly<{
  action: "restart" | "start" | "stop";
  after_state: PrototypePreviewOwnerRuntimeState;
  before_state: PrototypePreviewOwnerRuntimeState;
  completed_at: string;
  outcome: "applied";
  profile_digest: string;
  profile_id: string;
  prototype_id: string;
  receipt_digest: string;
  receipt_id: string;
  request_id: string;
  schema_version: 1;
  source_digest: string;
  source_revision: string;
}>;

export type PrototypePreviewOwnerCommandResult = Readonly<{
  receipt: PrototypePreviewOwnerReceipt;
  schema_version: 1;
  status: "applied" | "replayed";
}>;

export type PrototypePreviewOwnerProof = Readonly<{
  health_digest: string;
  negative_checks: Readonly<Record<string, true>>;
  positive_checks: readonly string[];
  profile_id: string;
  projection_digest: string;
  prototype_id: string;
  receipt: PrototypePreviewOwnerReceiptRef;
  schema_version: 1;
  security_decision: "evaluated-by-oos-before-operating-ready";
  security_gate: "gate:preview-runtime-operating-acceptance";
  status: "proven";
}>;

export type PrototypePreviewExpectedState = Readonly<{
  instance_id: string | null;
  profile_digest: string;
  runtime_state: PrototypePreviewOwnerRuntimeState;
  source_revision: string;
}>;

export type PrototypePreviewCommandIntent = Readonly<{
  action: "restart" | "start" | "stop";
  expected: PrototypePreviewExpectedState;
  request_id: string;
}>;

export type PrototypePreviewCommandResponse = Readonly<{
  command: PrototypePreviewOwnerCommandResult;
  projection: PrototypePreviewOwnerProjection;
}>;

export type PrototypePreviewLiveApiError = Readonly<{
  code: string;
  error: string;
  retryable: boolean;
}>;
