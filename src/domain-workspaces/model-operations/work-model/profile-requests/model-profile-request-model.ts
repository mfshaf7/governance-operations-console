import type {
  ModelProfileRequestDraft,
  ModelProfileRequestProjection,
} from "../../live-runtime/model-operations-live-types.ts";

export type ModelProfileRequestStep = "intent" | "receipt" | "review";

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
  return modelProfileIntentComplete(draft) && draft.justification.trim().length >= 12;
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
