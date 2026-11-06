import type {
  ModelProfileRequestDraft,
  ModelProfileRequestProjection,
} from "../../live-runtime/model-operations-live-types.ts";

export function emptyModelProfileRequestDraft(requestId = ""): ModelProfileRequestDraft {
  return {
    admittedContextDigest: "",
    admittedContextUri: "",
    dataClassification: "internal",
    displayName: "",
    environment: "dev-integration",
    justification: "",
    operationalExpectations: "",
    outputSchemaPath: "",
    outputSchemaRepo: "",
    outputSchemaVersion: "",
    ownerRepo: "",
    purpose: "",
    registeredCallers: "",
    requestId,
  };
}

export function modelProfileIntentComplete(draft: ModelProfileRequestDraft) {
  if(draft.workflowId)return Boolean(draft.setupDigest&&draft.displayName.trim()&&draft.purpose.trim());
  return [
    draft.admittedContextDigest,
    draft.admittedContextUri,
    draft.displayName,
    draft.operationalExpectations,
    draft.outputSchemaPath,
    draft.outputSchemaRepo,
    draft.outputSchemaVersion,
    draft.ownerRepo,
    draft.purpose,
    draft.registeredCallers,
  ].every((value) => value.trim().length > 0);
}

export function modelProfileReviewComplete(draft: ModelProfileRequestDraft) {
  return modelProfileIntentComplete(draft) && draft.justification.trim().length > 0;
}

export function modelProfileRequestReceiptItems(
  projection: ModelProfileRequestProjection,
) {
  return [
    { label: "Request", value: projection.request_id },
    { label: "Revision", value: String(projection.revision) },
    { label: "Review state", value: projection.review_state },
    { label: "Fulfillment", value: projection.fulfillment_state },
    { label: "Next action", value: projection.next_action },
    { label: "Receipt", value: projection.latest_receipt.receipt_id },
  ];
}


// Reuse reported references only; the new request keeps its own identity and choices.
export function modelProfileReferenceFields(source: ModelProfileRequestProjection): Partial<ModelProfileRequestDraft> {
  const intent=source.request.profile_intent;
  return {ownerRepo:intent.requesting_owner,
    registeredCallers:intent.registered_callers.map(item=>`${item.caller_id}=${item.owner_repo}`).join(", "),
    admittedContextUri:intent.admitted_context_ref.uri,admittedContextDigest:intent.admitted_context_ref.digest,
    outputSchemaRepo:intent.required_output_schema_ref.repo,outputSchemaPath:intent.required_output_schema_ref.path,outputSchemaVersion:intent.required_output_schema_ref.version,
  };
}

export function modelProfileRequestResultSummary(result:ModelProfileRequestProjection) {
  return [{label:"Review",value:result.review_state.replace(/-/g," ")},{label:"Implementation",value:result.fulfillment_state.replace(/-/g," ")},{label:"Next action",value:result.next_action.replace(/-/g," ")}];
}
export function modelProfileOriginalRequestMetadata(draft:ModelProfileRequestDraft) {return [{label:"Original request",value:draft.requestId}];}
