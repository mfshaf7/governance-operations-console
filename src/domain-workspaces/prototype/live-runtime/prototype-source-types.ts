import type { EffectiveModelSelection } from "../../../console-integration/governed-ai/model-selection.ts";
export type PrototypeSourceAction = "session" | "generate" | "accept" | "recover" | "cancel-attempt" | "publish" | "review" | "merge" | "close";
import type { PrototypeDeliverySourceCustody } from "../domain/prototype-delivery.ts";

export type PrototypePreviewPreparation = {
  kind: "preview-profile"; port: number; support_profile: "interactive" | "unattended";
  runtime_activation: boolean; ttl_seconds: number; decision_ref: string;
};
export type PrototypeDeliveryPreparation = {
  kind: "delivery-packet"; work: { title: string; objective: string; included_scope: string[]; excluded_scope: string[]; remaining_work: string[] };
  custody: PrototypeDeliverySourceCustody; evidence_refs: string[]; rationale: string; decision_ref: string;
};
export type PrototypeOwnerPreparation = PrototypePreviewPreparation | PrototypeDeliveryPreparation;
export type PrototypeSourceRequest = {
  schema_version: 1; request_id: string; prototype_id: string;
  expected_registry_revision: string; expected_source_revision: string;
  objective: string; requested_at: string;
  owner_preparation?: PrototypeOwnerPreparation;
};
export type PrototypeGenerationRequest = {
  schema_version: 1; request_id: string; execution_id: string; expected_revision: string;
  budget_tokens: number; retry_of: string | null; requested_at: string; source_intent_ref: string;
};
export type PrototypeSourceCommand = {
  schema_version: 1; command_id: string; expected_revision: string; requested_at: string;
  expected_pull_request: { url: string; head_commit: string } | null;
};
export type PrototypeSourceOperation = {
  action: "create" | "replace" | "delete"; path: string; expected_digest: string | null;
  content_digest: string | null;
};
export type PrototypeSourceSummary = {
  request_id: string; prototype_id: string; session_id: string | null; state: string;
  created_at: string; updated_at: string; source_start_digest: string;
  source_scope: { source_root: string; design_profile: string };
  landing_unit: { landing_unit_id: string; branch: string; fetched_base: string };
  next_action: { code: string; authority: string; reason?: string };
};
export type PrototypeSourceProjection = PrototypeSourceSummary & {
  source_request: PrototypeSourceRequest; source_intent_ref: string | null;
  source_delivery: Partial<Record<"publish" | "review" | "merge" | "close", {
    command: PrototypeSourceCommand; state: "pending" | "unknown" | "succeeded";
    pull_request: { url: string; head_commit: string } | null; failure: string | null;
  }>>;
  realization: null | {
    session_id: string; revision: string; state: string;
    attempt: null | {
      request: PrototypeGenerationRequest; request_id: string; execution_id: string;
      retry_of: string | null; state: string; objective_digest: string;
      context_packet_ref: string | null; model_profile_id: string | null; failure: string | null;
      effective_model_selection?: EffectiveModelSelection;
      owner_preparation: null | { plan_digest: string; request_digest: string };
      change_set: null | { digest: string; commit_message: string; operations: PrototypeSourceOperation[] };
      source_receipt: null | { head_commit: string; receipt_digest: string };
    };
  };
};
export type PrototypeSourceDraft = {
  request_id: string; session_id: string; revision: string; digest: string; accepted: boolean;
  change_set: { commit_message: string; operations: {
    action: "create" | "replace" | "delete"; path: string; content: string | null; expected_digest: string | null;
  }[] };
};
export type PrototypeSourceIntent = {
  action: PrototypeSourceAction; commandId: string; requestedAt: string;
  sourceIntentRef: string | null; expectedRevision: string; reason?: string; acceptedChangeSetDigest?: string;
};
