export type DeliverySourceRealizationAction = "start" | "continue" | "cancel" | "recover";
export type DeliverySourceRealizationProjection = {
  schema_version: 1;
  workflow_id: "delivery-art-source-realization";
  session_id: string;
  work_item_id: string;
  revision: string;
  state: "not-started" | "accepted" | "draft-ready" | "applying" | "apply-unknown" | "source-created" | "cancelled" | "failed";
  attempt: null | {
    request_id: string;
    state: string;
    retry_of: string | null;
    objective_digest: string;
    model: { profile_id: string } | null;
    context: { packet_ref: string } | null;
    change_set: null | {
      digest: string;
      commit_message: string;
      operations: Array<{ action: "create" | "replace" | "delete"; path: string; content_digest: string | null; expected_digest: string | null }>;
    };
    source_receipt: null | { receipt_id: string; receipt_digest: string; head_commit: string; change_set_digest: string };
    failure: null | { code: string; retryable: boolean };
  };
  next_action: { authority: string; code: string; reason: string };
  replayed: boolean;
};

export type DeliverySourceRealizationInput = {
  commandId: string;
  requestedAt: string;
} & (
  | { action: "start"; expectedSessionRevision: string; objective: string; budgetTokens: number; retryOf: string | null }
  | { action: "continue"; expectedRevision: string; acceptedChangeSetDigest: string }
  | { action: "cancel"; expectedRevision: string; reason: string }
  | { action: "recover"; expectedRevision: string }
);
