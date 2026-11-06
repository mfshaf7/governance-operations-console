const zeroDigest = `sha256:${"0".repeat(64)}`;
export function requestProjection({
  fulfillment = null,
  fulfillmentState = "not-started",
  requestId = "model-profile-request:console-test",
  revision: requestRevision,
  reviewState,
}) {
  const receiptDigest = `sha256:${String(requestRevision).padStart(64, "0")}`;
  return {
    schema_version: 1,
    workflow_id: "model-profile-request",
    request_id: requestId,
    revision: requestRevision,
    request: {
      schema_version: 1,
      request_id: requestId,
      intent: "create",
      requested_at: "2026-10-08T17:00:00Z",
      operator_id: "operator:workspace-owner",
      profile_intent: {
        profile_id: null,
        source: null,
        display_name: "Console test",
        intended_purpose: "bounded test",
        requesting_owner: "governance-operations-console",
        registered_callers: [{ caller_id: "governance-operations-console/model-operations", owner_repo: "governance-operations-console" }],
        requested_environments: ["dev-integration"],
        input_data_classification: "internal",
        admitted_context_ref: { uri: "https://context.local/test", digest: zeroDigest },
        required_output_schema_ref: { repo: "governance-operations-console", path: "contracts/test.json", version: "v1" },
        human_approval_required: true,
        operational_expectations: ["fail closed"],
        operator_justification: "bounded test request",
      },
      delivery_ref: null,
      correlation_id: "console-model-profile:test",
      causation_id: null,
      idempotency_key: "model-profile-request:test",
    },
    review_state: reviewState,
    fulfillment_state: fulfillmentState,
    requirements: [],
    decision_ref: reviewState === "approved" ? { uri: "https://security.local/decision/test", digest: zeroDigest } : null,
    fulfillment,
    latest_receipt: {
      schema_version: 1,
      receipt_id: "model-profile-receipt:aaaaaaaaaaaaaaaaaaaaaaaa",
      request_id: requestId,
      request_revision: requestRevision,
      intent: "create",
      review_state: reviewState,
      fulfillment_state: fulfillmentState,
      profile_id: null,
      actor: { caller_id: "governance-operations-console", operator_id: "operator:workspace-owner" },
      routed_owners: { workflow_owner: "operator-orchestration-service", fulfillment_owner: "platform-engineering", security_owner: "security-architecture" },
      delivery_ref: null,
      source_ref: null,
      prior_receipt_ref: null,
      recorded_at: "2026-10-08T17:00:00Z",
      digest: receiptDigest,
    },
    history: [{
      sequence: 1,
      event_type: "request-created",
      occurred_at: "2026-10-08T17:00:00Z",
      actor_id: "operator:workspace-owner",
      command_id: "model-profile-request:test",
      review_state_before: null,
      review_state_after: reviewState,
      fulfillment_state_before: null,
      fulfillment_state_after: fulfillmentState,
      summary: "test",
      receipt_ref: { uri: "oos://receipt/test", digest: receiptDigest },
    }],
    next_action: fulfillmentState === "applied" ? "refresh-authoritative-projections" : reviewState === "draft" ? "revise-or-submit" : reviewState === "submitted" ? "start-review" : "begin-platform-fulfillment",
    profile_lifecycle_changed: false,
  };
}


export function requestSummary(request) {
  return {request_id:request.request_id,revision:request.revision,display_name:request.request.profile_intent.display_name,requested_at:request.request.requested_at,review_state:request.review_state,fulfillment_state:request.fulfillment_state,next_action:request.next_action};
}
