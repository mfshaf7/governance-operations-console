import type { ModelOperationsOperatingProjection, ModelProfileRequestProjection } from "../../../live-runtime/model-operations-live-types.ts";
import { modelProfileRequestReceiptItems } from "../../../work-model/profile-requests/model-profile-request-model.ts";

export function modelProfileRequestHistoryMetadata(request: ModelProfileRequestProjection) {
  return [...modelProfileRequestReceiptItems(request),
            { label: "Display name", value: request.request.profile_intent.display_name },
            { label: "Purpose", value: request.request.profile_intent.intended_purpose },
            { label: "Requesting owner", value: request.request.profile_intent.requesting_owner },
            { label: "Environments", value: request.request.profile_intent.requested_environments.join(", ") },
            { label: "Data classification", value: request.request.profile_intent.input_data_classification },
            { label: "Caller bindings", value: request.request.profile_intent.registered_callers.map(c => `${c.caller_id} = ${c.owner_repo}`).join("; ") },
            { label: "Output contract", value: `${request.request.profile_intent.required_output_schema_ref.repo} / ${request.request.profile_intent.required_output_schema_ref.path} @ ${request.request.profile_intent.required_output_schema_ref.version}` },
            { label: "Admitted context", value: `${request.request.profile_intent.admitted_context_ref.uri} / ${request.request.profile_intent.admitted_context_ref.digest}` },
            { label: "Operational expectations", value: request.request.profile_intent.operational_expectations.join("; ") },
            { label: "Justification", value: request.request.profile_intent.operator_justification },
            { label: "Operator", value: request.request.operator_id },
            { label: "Profile source authority", value: "Platform Engineering; distinct fulfillment identity" }];
}

export function modelProfileRequirementMetadata(r: Record<string, unknown>) {
  return [{ label: "Requested change", value: String(r.summary ?? "Unavailable") }, { label: "Owner", value: String(r.owner_repo ?? "Unavailable") }, { label: "Next action", value: String(r.next_action ?? "Unavailable") }];
}

export function modelProfileFulfillmentMetadata(projection: ModelOperationsOperatingProjection) {
  return [{ label: "Verified request", value: projection.oos_request_ref.request_id }, { label: "Fulfillment", value: "Complete for this request; current registry is a separate projection" }, { label: "Original merged source", value: projection.platform_source_ref.source_version }, { label: "Lifecycle receipt", value: projection.platform_source_ref.lifecycle_receipt_digest }, { label: "Merged readback", value: projection.platform_source_ref.merged_readback_digest }];
}

export function modelProfileRequestTimelineMetadata(request: ModelProfileRequestProjection) {
  return request.history.map(event => ({ label: `${event.sequence}. ${event.event_type}`, value: `${event.summary} · ${event.occurred_at} · ${event.receipt_ref.uri}` }));
}
