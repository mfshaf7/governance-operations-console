import type { PrototypeRecord } from "../read-model/prototype-workspace-read-model.ts";
import type { PrototypeBaselinePromotionInput } from "../work-model/workflows/baseline-promotion/prototype-baseline-promotion-model.ts";
import type { PrototypeCandidatePromotionInput } from "../work-model/workflows/candidate-promotion/prototype-candidate-promotion-model.ts";

export type PrototypeMaturityTransition =
  | "candidate-promotion"
  | "baseline-promotion";

export type PrototypeMaturityDecision =
  | PrototypeCandidatePromotionInput["decision"]
  | PrototypeBaselinePromotionInput["decision"];

export type PrototypeMaturityInput =
  | Readonly<{
      input: PrototypeCandidatePromotionInput;
      transition: "candidate-promotion";
    }>
  | Readonly<{
      input: PrototypeBaselinePromotionInput;
      transition: "baseline-promotion";
    }>;

export type PrototypeMaturityExpectedState = Readonly<{
  lifecycle: "candidate" | "exploring";
  record_digest: string;
  source_revision: string;
}>;

export type PrototypeMaturityPreparation = Readonly<{
  authority_revision: string;
  canonical_authority: Readonly<{
    branch: "main";
    registry_path: "prototypes.yaml";
    repo: "workspace-prototype-studio";
  }>;
  canonical_mutation: false;
  expected_state: PrototypeMaturityExpectedState;
  prototype_id: string;
  schema_version: 1;
  transition: PrototypeMaturityTransition;
  workflow_id: "prototype-maturity";
}>;

export type PrototypeMaturitySubmissionIntent = Readonly<{
  accepted_at: string;
  input: PrototypeMaturityInput;
  prototype_id: string;
  record: Readonly<{
    accepted_scope: readonly string[];
    blocker: PrototypeMaturityBlocker | null;
    evidence_refs: readonly string[];
    excluded_scope: readonly string[];
    landing_receipt_ref: string;
    owner_ref: string;
    source_ref: string;
  }>;
  request_id: string;
  reviewed_preparation: PrototypeMaturityPreparation;
}>;

export type PrototypeMaturityArtifactRef = Readonly<{
  digest: string;
  id: string;
}>;

export type PrototypeMaturityRequest = Readonly<{
  artifact_type: "prototype-maturity-request";
  correlation_id: string;
  expected_state: PrototypeMaturityExpectedState;
  idempotency_key: string;
  inputs: Readonly<{
    editable_values: Readonly<Record<string, unknown>>;
    source_refs: readonly string[];
  }>;
  operator_ref: string;
  prototype_id: string;
  request_digest: string;
  request_id: string;
  requested_at: string;
  schema_version: 1;
  source_lifecycle: "candidate" | "exploring";
  target_lifecycle: "baseline-approved" | "candidate";
  transition: PrototypeMaturityTransition;
}>;

export type PrototypeMaturityPacket = Readonly<{
  artifact_type: "prototype-maturity-packet";
  assembled_at: string;
  packet_digest: string;
  packet_id: string;
  packet_kind: "baseline-packet" | "candidate-evidence-packet";
  prototype_id: string;
  request_ref: PrototypeMaturityArtifactRef;
  schema_version: 1;
  sections: readonly Readonly<{
    evidence_refs: readonly string[];
    id: string;
    note?: string;
    state: "blocked" | "deferred" | "missing" | "not-required" | "ready";
  }>[];
  transition: PrototypeMaturityTransition;
}>;

export type PrototypeMaturityBlocker = Readonly<{
  issue_ref: string;
  owner_ref: string;
  required_fix: string;
}>;

export type PrototypeMaturityHistoryEvent = Readonly<{
  at: string;
  details: Readonly<Record<string, unknown>> | null;
  sequence: number;
  status: string;
}>;

export type PrototypeMaturityReadback = Readonly<{
  artifact_type: "prototype-maturity-readback";
  authority_state: "merged-authority" | "unchanged-authority";
  decision: PrototypeMaturityDecision;
  decision_ref: PrototypeMaturityArtifactRef;
  observed_at: string;
  observed_lifecycle: "baseline-approved" | "candidate" | "exploring";
  prototype_id: string;
  readback_digest: string;
  readback_id: string;
  record_digest: string;
  record_ref: string;
  schema_version: 1;
  source_revision: string;
  transition: PrototypeMaturityTransition;
}>;

export type PrototypeMaturityReceipt = Readonly<{
  artifact_type: "prototype-maturity-receipt";
  completed_at: string;
  correlation_id: string;
  decision: PrototypeMaturityDecision;
  decision_ref: PrototypeMaturityArtifactRef;
  idempotency_key: string;
  next_action: Readonly<{ code: string; owner_ref: string }>;
  outcome: "blocked" | "failed" | "routed-closeout" | "succeeded";
  packet_ref: PrototypeMaturityArtifactRef;
  prototype_id: string;
  readback_ref: PrototypeMaturityArtifactRef;
  readiness_ref: PrototypeMaturityArtifactRef;
  receipt_digest: string;
  receipt_id: string;
  request_ref: PrototypeMaturityArtifactRef;
  resulting_lifecycle: "baseline-approved" | "candidate" | "exploring";
  schema_version: 1;
  transition: PrototypeMaturityTransition;
}>;

export type PrototypeMaturityResult = Readonly<{
  canonical_mutation: boolean;
  decision: Readonly<Record<string, unknown>> | null;
  execution_ref: string;
  failure: Readonly<{ code: string; message: string; retryable: boolean }> | null;
  history: readonly PrototypeMaturityHistoryEvent[];
  next_action: string;
  packet: PrototypeMaturityPacket;
  preparation: Readonly<Record<string, unknown>> | null;
  prototype_id: string;
  readback: PrototypeMaturityReadback | null;
  readiness: Readonly<Record<string, unknown>> | null;
  receipt: PrototypeMaturityReceipt | null;
  request: PrototypeMaturityRequest;
  request_id: string;
  review: Readonly<Record<string, unknown>> | null;
  revision: number;
  runtime_activation: false;
  schema_version: 1;
  session_ref: string;
  status:
    | "accepted"
    | "blocked"
    | "cancelled"
    | "cancelling"
    | "decision-required"
    | "evaluating"
    | "preparing"
    | "rejected"
    | "requires-action"
    | "review-required"
    | "routed-closeout"
    | "succeeded";
  transition: PrototypeMaturityTransition;
  workflow_id: "prototype-maturity";
}>;

export type PrototypeMaturityLiveProjection = Readonly<{
  input: PrototypeMaturityInput;
  inputKey: string;
  recordId: string;
  result: PrototypeMaturityResult;
}>;

export type PrototypeMaturityRunInput = Readonly<{
  input: PrototypeMaturityInput;
  inputKey: string;
  record: PrototypeRecord;
}>;

export type PrototypeMaturityLiveApiError = Readonly<{
  code: string;
  error: string;
  retryable: boolean;
}>;
