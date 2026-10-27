import type { ModelProfileRequestDraft, ModelProfileRequestProjection, ModelProfileReviewAction } from "../../live-runtime/model-operations-live-types.ts";

// These are the existing OOS review transitions. The service remains the final
// authority; a displayed option grants neither approval nor fulfillment.
export function modelProfileReviewActions(request: ModelProfileRequestProjection): ModelProfileReviewAction[] {
  switch (request.review_state) {
    case "draft": return ["revise", "submit", "withdraw"];
    case "submitted": return ["start-review", "withdraw"];
    case "under-review": return ["approve", "request-changes", "reject", "withdraw"];
    case "changes-required": return ["revise", "withdraw"];
    default: return [];
  }
}

export function modelProfileReviewActionLabel(action: ModelProfileReviewAction) {
  return ({ "start-review": "Start review", approve: "Approve request", reject: "Reject request", "request-changes": "Request changes", withdraw: "Withdraw request", revise: "Revise intent", submit: "Submit for review" })[action];
}

export function modelProfileDraftFromRequest(request: ModelProfileRequestProjection): ModelProfileRequestDraft {
  const intent = request.request.profile_intent;
  return {
    requestId: request.request_id, admittedContextDigest: intent.admitted_context_ref.digest,
    admittedContextUri: intent.admitted_context_ref.uri, dataClassification: intent.input_data_classification,
    displayName: intent.display_name, environment: intent.requested_environments[0] ?? "dev-integration",
    justification: intent.operator_justification, operationalExpectations: intent.operational_expectations.join("\n"),
    outputSchemaPath: intent.required_output_schema_ref.path, outputSchemaRepo: intent.required_output_schema_ref.repo,
    outputSchemaVersion: intent.required_output_schema_ref.version, ownerRepo: intent.requesting_owner,
    purpose: intent.intended_purpose, registeredCallers: intent.registered_callers.map(caller => `${caller.caller_id}=${caller.owner_repo}`).join("\n"),
  };
}
