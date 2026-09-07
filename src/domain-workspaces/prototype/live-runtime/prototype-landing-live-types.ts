import type {
  PrototypeLandingDraft,
} from "../work-model/workflows/landing/prototype-landing-model.ts";
import type {
  PrototypeLandingSourcePosture,
  PrototypeRecord,
} from "../read-model/prototype-workspace-read-model.ts";

export type { PrototypeLandingSourcePosture };

export type PrototypeLandingCanonicalIngress =
  | "direct"
  | "existing-source"
  | "imported"
  | "proposal-routed";

export type PrototypeLandingCanonicalSupportProfile =
  | "custom"
  | "existing-source-review"
  | "external-dependency"
  | "interactive"
  | "local-runtime"
  | "simple";

export type PrototypeLandingExpectedState = Readonly<{
  record_digest: null;
  record_present: false;
  registry_digest: string;
  source_revision: string | null;
}>;

export type PrototypeLandingPreparation = Readonly<{
  authority_revision: string;
  canonical_authority: Readonly<{
    branch: "main";
    registry_path: "prototypes.yaml";
    repo: "workspace-prototype-studio";
  }>;
  canonical_mutation: false;
  expected_state: PrototypeLandingExpectedState;
  prototype_id: string;
  schema_version: 1;
  workflow_id: "prototype-landing";
}>;

export type PrototypeLandingSourceIntent = Readonly<{
  authority: string;
  imported_content_digest: string | null;
  origin_digest: string | null;
  posture: PrototypeLandingSourcePosture;
  ref: string;
  revision: string | null;
}>;

export type PrototypeLandingSubmissionIntent = Readonly<{
  accepted_at: string;
  draft: PrototypeLandingDraft;
  ingress_class: PrototypeLandingCanonicalIngress;
  prototype_id: string;
  request_id: string;
  reviewed_preparation: PrototypeLandingPreparation;
  source: PrototypeLandingSourceIntent;
  suggestions: Readonly<{
    name: string | null;
    objective: string | null;
    support_profile: PrototypeLandingCanonicalSupportProfile | null;
  }>;
}>;

export type PrototypeLandingHistoryEvent = Readonly<{
  at: string;
  details: Readonly<Record<string, unknown>> | null;
  sequence: number;
  status: string;
}>;

export type PrototypeLandingReview = Readonly<{
  base_branch: "main";
  base_commit: string;
  branch: string;
  head_commit: string;
  human_reviewed: boolean;
  merge_commit: string | null;
  merged: boolean;
  number: number;
  repository: "workspace-prototype-studio";
  state: "closed" | "open";
  url: string;
}>;

export type PrototypeLandingFailure = Readonly<{
  code: string;
  message: string;
  retryable: boolean;
}>;

export type PrototypeLandingReceipt = Readonly<{
  artifact_type: "prototype-landing-receipt";
  completed_at: string;
  next_action: Readonly<{
    code: "candidate-promotion" | "review-source";
    owner_ref: string;
  }>;
  outcome: "prepared" | "replayed" | "succeeded";
  phase: "merged-authority" | "source-preparation" | "source-replay";
  prototype_id: string;
  receipt_digest: string;
  receipt_id: string;
  schema_version: 1;
  source_result: Readonly<{
    branch: string;
    record_digest: string;
    registry_digest: string;
    repo: "workspace-prototype-studio";
    revision: string;
  }>;
}>;

export type PrototypeLandingReadback = Readonly<{
  artifact_type: "prototype-landing-readback";
  authority_state: "merged-authority" | "review-branch";
  observed_at: string;
  prototype_id: string;
  readback_digest: string;
  readback_id: string;
  record: Readonly<{
    id: string;
    ingress_class: PrototypeLandingCanonicalIngress;
    lifecycle: "exploring";
    name: string;
    next_action: "candidate-promotion";
    objective: string;
    project_phase: "incubating";
    setup: Readonly<{
      data_mode: string;
      mutation_boundary: string;
      preview_mode: string;
      scaffold_profile: string;
      support_profile: PrototypeLandingCanonicalSupportProfile;
      support_rows: readonly Readonly<{
        detail: string;
        dimension: string;
        generated: boolean;
        state: string;
      }>[];
      visibility: string;
    }>;
    source: Readonly<{
      custody: "dedicated-owner-repo" | "incubation-repo" | "shared-owner-repo";
      posture: PrototypeLandingSourcePosture;
      ref: string;
      revision: string;
    }>;
  }>;
  record_digest: string;
  registry_digest: string;
  schema_version: 1;
  source_branch: string;
  source_revision: string;
}>;

export type PrototypeLandingResult = Readonly<{
  apply: Readonly<Record<string, unknown>> | null;
  canonical_mutation: boolean;
  entry_packet: Readonly<Record<string, unknown>>;
  execution_ref: string;
  failure: PrototypeLandingFailure | null;
  history: readonly PrototypeLandingHistoryEvent[];
  next_action:
    | "candidate-promotion"
    | "complete"
    | "continue"
    | "inspect-review-or-cancel"
    | "restore-dependency-and-retry"
    | "review-and-merge"
    | "submit-corrected-request";
  plan: Readonly<Record<string, unknown>>;
  preparation: Readonly<Record<string, unknown>> | null;
  prototype_id: string;
  readback: PrototypeLandingReadback | null;
  readiness: Readonly<Record<string, unknown>> | null;
  receipt: PrototypeLandingReceipt | null;
  request: Readonly<Record<string, unknown>>;
  request_id: string;
  review: PrototypeLandingReview | null;
  revision: number;
  runtime_activation: false;
  schema_version: 1;
  session_ref: string;
  status:
    | "accepted"
    | "cancelled"
    | "cancelling"
    | "evaluating"
    | "preparing"
    | "rejected"
    | "requires-action"
    | "review-required"
    | "succeeded";
  workflow_id: "prototype-landing";
}>;

export type PrototypeLandingLiveProjection = Readonly<{
  draft: PrototypeLandingDraft;
  draftKey: string;
  recordId: string;
  result: PrototypeLandingResult;
}>;

export type PrototypeLandingLiveRunResult = Readonly<{
  draftKey: string;
  mode: "live";
  result: PrototypeLandingResult;
}>;

export type PrototypeLandingRunResult =
  | PrototypeLandingLiveRunResult
  | import("../local-runtime/prototype-landing-runtime.ts").PrototypeLandingSimulationResult;

export type PrototypeLandingRunInput = Readonly<{
  draft: PrototypeLandingDraft;
  draftKey: string;
  record: PrototypeRecord;
}>;

export type PrototypeLandingLiveApiError = Readonly<{
  code: string;
  error: string;
  retryable: boolean;
}>;
