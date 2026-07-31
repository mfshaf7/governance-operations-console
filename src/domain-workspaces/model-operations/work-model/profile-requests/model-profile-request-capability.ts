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
  actionSemantic: "unavailable";
  availability: "planned";
  backendOwner: "platform-engineering";
  requiredBeforeEnable: string[];
  securityOwner: "security-architecture";
  workflowOwner: "operator-orchestration-service";
};

export const modelProfileRequestCapability: ModelProfileRequestCapability = {
  actionSemantic: "unavailable",
  availability: "planned",
  backendOwner: "platform-engineering",
  requiredBeforeEnable: [
    "request schema",
    "operator workflow API",
    "security review route",
    "command and receipt contract",
    "profile registry fulfillment adapter",
    "source-version reconciliation",
    "projection refresh",
    "rollback behavior",
  ],
  securityOwner: "security-architecture",
  workflowOwner: "operator-orchestration-service",
};
