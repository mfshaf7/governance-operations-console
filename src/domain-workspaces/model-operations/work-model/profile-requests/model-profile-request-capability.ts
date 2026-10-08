export type ModelProfileRequestIntent =
  "activate" | "amend" | "create" | "exception" | "retire" | "suspend";

export type ModelProfileRequestReviewState =
  | "approved"
  | "changes-required"
  | "draft"
  | "rejected"
  | "submitted"
  | "under-review"
  | "withdrawn";

export type ModelProfileRequestFulfillmentState =
  "applied" | "failed" | "implementing" | "not-started";

export type ModelProfileRequestCapability = {
  actionSemantic: "submit";
  availability: "available";
  backendOwner: "platform-engineering";
  controls: string[];
  securityOwner: "security-architecture";
  workflowOwner: "operator-orchestration-service";
};

export const modelProfileRequestCapability: ModelProfileRequestCapability = {
  actionSemantic: "submit",
  availability: "available",
  backendOwner: "platform-engineering",
  controls: [
    "OOS owns request and review state",
    "Platform owns source fulfillment and runtime selection",
    "Security owns acceptance and exceptions",
    "Console stores no durable request or profile truth",
    "Activation remains a separate reviewed request",
  ],
  securityOwner: "security-architecture",
  workflowOwner: "operator-orchestration-service",
};
