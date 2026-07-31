import type { OperationTone } from "../../operation-contracts/operation-state.ts";

export type PrototypeLifecycle =
  | "baseline-approved"
  | "candidate"
  | "exploring"
  | "graduated"
  | "graduating"
  | "retired";
export type PrototypeIngressClass =
  "existing-source" | "imported" | "local-entry" | "proposal-routed";
export type PrototypeBaselinePacketState =
  | "blocked"
  | "drafting"
  | "needs-evidence"
  | "not-started"
  | "ready-for-movement"
  | "receipt-projected"
  | "returned";
export type PrototypePreviewProfileState =
  "no-profile" | "profile-configured" | "profile-draft";
export type PrototypePreviewRuntimeState =
  "running" | "stopped" | "unavailable" | "unknown";
export type PrototypePreviewProofState =
  "not-started" | "proof-failed" | "proof-ready" | "stale";
export type PrototypeMovementRequestState =
  | "draft-ready"
  | "not-prepared"
  | "receipt-projected"
  | "request-recorded"
  | "returned";
export type PrototypeDataMode =
  "mock" | "real-readonly" | "real-mutable" | "synthetic";
export type PrototypeMutationBoundary =
  "external-sandbox" | "none" | "prototype-local" | "read-only" | "real-system";
export type PrototypeVisibilityTier =
  "client-review" | "operator-review" | "private-internal" | "public-demo";
export type PrototypeSupportProfile =
  | "custom-support"
  | "existing-source-review"
  | "external-dependency"
  | "interactive-prototype"
  | "local-runtime"
  | "simple-prototype";
export type PrototypeSupportAreaId =
  | "data"
  | "evidence"
  | "integration"
  | "interface"
  | "recovery"
  | "runtime"
  | "source"
  | "studio-home"
  | "tooling"
  | "visibility";
export type PrototypeSupportState =
  "blocked" | "needed" | "not-needed" | "ready" | "unknown";
export type PrototypeSupportRow = {
  detail: string;
  id: PrototypeSupportAreaId;
  label: string;
  state: PrototypeSupportState;
  summary: string;
  tone: OperationTone;
};
export type PrototypeSourceHome =
  | "app-folder"
  | "console-domain-module"
  | "docs-only"
  | "existing-source"
  | "future-owner-repo"
  | "new-prototype-folder";
export type PrototypeBasePlatform =
  | "container-compose"
  | "custom-unassigned"
  | "docs-only"
  | "existing-source"
  | "fastapi"
  | "flask"
  | "nextjs-app"
  | "node-express"
  | "static-site"
  | "vite-react";
export type PrototypePreviewNeed =
  | "future-dev-integration"
  | "local-backend-stub"
  | "local-dev-server"
  | "none"
  | "prototype-devint"
  | "static-review";
export type PrototypePreviewLaunchAdapter =
  | "container-compose"
  | "generic-command"
  | "node-npm"
  | "node-pnpm"
  | "none"
  | "python-pip"
  | "python-poetry"
  | "python-uv"
  | "static-server"
  | "unassigned";
export type PrototypeLandingState =
  "blocked" | "captured" | "drafting" | "landed";
export type PrototypeCandidateDecision =
  "block-promotion" | "promote-candidate" | "route-closeout";
export type PrototypeCandidateAudienceKind =
  "client-reviewer" | "external-user" | "internal-user" | "self" | "unassigned";
export type PrototypeCandidateProofMethod =
  | "demonstration"
  | "operator-review"
  | "technical-validation"
  | "unassigned"
  | "user-feedback";
export type PrototypeCandidateState =
  "blocked" | "candidate" | "closeout-routed" | "not-started";

export type PrototypeLinkedRecord = {
  label: string;
  level: string;
  parentRef?: string;
  ref: string;
  role: string;
  system: string;
  tone: OperationTone;
};

export type PrototypeEvidenceRef = {
  detail: string;
  id: string;
  label: string;
  status: string;
  tone: OperationTone;
};

export type PrototypeOpenIssue = {
  id: string;
  owner: string;
  requiredFix: string;
  status: "blocked" | "open" | "review" | "stale";
  title: string;
  tone: OperationTone;
};

export type PrototypeReceiptRef = {
  authority: "prototype-local" | "source-projected";
  commandId: string;
  commandName: string;
  id: string;
  label: string;
  recordedAt: string;
  resultState: "blocked" | "recorded" | "review-only";
  schemaVersion: 1;
  summary: string;
  tone: OperationTone;
};

export type PrototypeProjectedReceipt = PrototypeReceiptRef & {
  recordId: string;
  sourceLabel: "prototype-local" | "source record";
  sourceVersion: string | null;
};

export type PrototypeCandidateBrief = {
  audience: {
    kind: PrototypeCandidateAudienceKind;
    label: string;
  };
  decision: PrototypeCandidateDecision | null;
  lastReceiptRef: string | null;
  objective: string;
  proof: {
    criterion: string;
    method: PrototypeCandidateProofMethod;
  };
  scope: {
    excluded: string[];
    included: string[];
  };
  state: PrototypeCandidateState;
};

export type PrototypePreviewProfile = {
  address: string;
  command: string;
  healthcheckPath: string;
  lastCheckLogRef: string | null;
  lastCheckedAt: string | null;
  lastProofRef: string | null;
  launchAdapter: PrototypePreviewLaunchAdapter;
  port: string;
  profileRef: string;
  profileSource: string;
  profileState: PrototypePreviewProfileState;
  proofState: PrototypePreviewProofState;
  runtimeState: PrototypePreviewRuntimeState;
  workingDirectory: string;
};

export type PrototypeBaselinePacket = {
  acceptedSummary: string;
  baselineStatement: string;
  baselineTitle: string;
  evidenceRefs: string[];
  evidenceDisposition: string;
  excludedSummary: string;
  issueDisposition: string;
  lastPacketReceiptRef: string | null;
  missingItems: string[];
  openIssueRefs: string[];
  state: PrototypeBaselinePacketState;
};

export type PrototypeMovementGate = {
  authority: string;
  gateId: string;
  gateKind: string;
  owner: string;
  requiredFix?: string;
  status:
    | "blocked"
    | "missing"
    | "not-required"
    | "ready"
    | "review"
    | "stale"
    | "waived";
  summary: string;
  tone: OperationTone;
};

export type PrototypeMovementRequestDraft = {
  gateSnapshot: PrototypeMovementGate[];
  lastMovementReceiptRef: string | null;
  movementType:
    | "accepted-risk"
    | "baseline"
    | "defer"
    | "graduation"
    | "retire"
    | "suspend";
  requestReason: string;
  state: PrototypeMovementRequestState;
  targetHome: string;
  targetLane: string;
  targetOwner: string;
};

export type PrototypeCurrentMoveId =
  | "archive"
  | "baseline-promotion"
  | "closeout-retirement"
  | "history"
  | "landing"
  | "movement-request"
  | "preview-proof"
  | "candidate-promotion";

export type PrototypeCurrentMove = {
  actionLabel: string;
  detail: string;
  id: PrototypeCurrentMoveId;
  label: string;
  tone: OperationTone;
};

export type PrototypeLandingPlan = {
  basePlatform: PrototypeBasePlatform;
  blockedItems: string[];
  firstRequiredMove: PrototypeCurrentMoveId;
  lastLandingReceiptRef: string | null;
  previewNeed: PrototypePreviewNeed;
  requiredEvidence: string[];
  setupItems: string[];
  securityTriggers: string[];
  sourceHome: PrototypeSourceHome;
  state: PrototypeLandingState;
  supportProfile: PrototypeSupportProfile;
  supportRows: PrototypeSupportRow[];
  validationPlan: string[];
};

export type PrototypeRecord = {
  baseline: PrototypeBaselinePacket;
  candidate: PrototypeCandidateBrief;
  currentMove: PrototypeCurrentMove;
  dataMode: PrototypeDataMode;
  evidence: PrototypeEvidenceRef[];
  id: string;
  ingress: PrototypeIngressClass;
  landing: PrototypeLandingPlan;
  lastMovementReceiptRef: string | null;
  lifecycle: PrototypeLifecycle;
  linkedRecords: PrototypeLinkedRecord[];
  mutationBoundary: PrototypeMutationBoundary;
  name: string;
  openIssues: PrototypeOpenIssue[];
  origin: string;
  owner: string;
  preview: PrototypePreviewProfile;
  projectionFreshness: string;
  projectionVersion: string;
  receipts: PrototypeReceiptRef[];
  sourcePath: string;
  sourceRef: string;
  summary: string;
  tone: OperationTone;
  visibilityTier: PrototypeVisibilityTier;
  movementRequest: PrototypeMovementRequestDraft;
};

export type PrototypeWorkspaceSource = {
  lastRead: string;
  mutationGateway: string;
  project: string;
  recordSystem: string;
  registry: string;
};

export type PrototypeWorkspaceReadModel = {
  records: PrototypeRecord[];
  source: PrototypeWorkspaceSource;
};
