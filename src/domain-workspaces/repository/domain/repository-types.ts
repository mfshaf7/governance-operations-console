import type { OperationTone } from "../../operation-contracts/operation-state.ts";
import type { OperationSurfaceStatusModel } from "../../operation-contracts/surface-status.ts";

export type RepositoryWorkspaceRecordTone = OperationTone;

export type RepositoryAdmissionState =
  "admitted" | "blocked" | "ready" | "retired";

export type RepositoryWorkspacePostureItemState =
  | "accepted-local"
  | "blocked"
  | "clear"
  | "external"
  | "missing"
  | "pending"
  | "read-only"
  | "ready"
  | "reference"
  | "retired"
  | "review";

export type RepositoryWorkspaceRuntimeLaneStatus =
  | "blocked-by-proposal-gate"
  | "decision-needed"
  | "not-required"
  | "platform-authority"
  | "platform-promotion-path"
  | "product-channel-path"
  | "profile-active"
  | "profile-managed"
  | "prototype-lane"
  | "retired"
  | "runtime-enforcement-path";

export type RepositoryWorkspaceSecurityBindingStatus =
  | "authority-owner"
  | "baseline-linked"
  | "binding-required"
  | "not-applicable"
  | "not-evaluated"
  | "review-coverage"
  | "review-trigger-check-needed";

export type RepositoryWorkspaceRecord = {
  admissionPosture: RepositoryWorkspacePostureGroup[];
  admissionState: RepositoryAdmissionState;
  blockers: RepositoryWorkspaceRecordBlocker[];
  boundary: string;
  githubUrl: string;
  id: string;
  lastValidation: string;
  lifecycle: string;
  name: string;
  nextAction: string;
  owner: string;
  proposalGate?: RepositoryWorkspaceProposalGate;
  purpose: string;
  repoClass: string;
  role: string;
  routeSource: string;
  runtimeLane: RepositoryWorkspaceRuntimeLane;
  securityBinding: RepositoryWorkspaceSecurityBinding;
  tone: RepositoryWorkspaceRecordTone;
};

export type RepositoryWorkspaceProposalGate = {
  proposalId: string;
  repoRequestRef: string;
  resolvedAt?: string;
  resolvedOwner?: string;
  resolvedRepoRef?: string;
  sourceVersion: string;
  status: "pending" | "resolved";
};

export type RepositoryWorkspaceRecordBlocker = {
  action: string;
  detail: string;
  id: string;
  label: string;
  owner: string;
  severity: "blocked" | "review_required";
  sourceRef: string;
};

export type RepositoryWorkspacePostureGroup = {
  description: string;
  id: string;
  items: RepositoryWorkspacePostureItem[];
  kicker: string;
  title: string;
  tone: RepositoryWorkspaceRecordTone;
};

export type RepositoryWorkspacePostureItem = {
  detail: string;
  label: string;
  state: RepositoryWorkspacePostureItemState;
  tone: RepositoryWorkspaceRecordTone;
  value: string;
};

export type RepositoryWorkspaceRuntimeLane = {
  decision:
    | "dev-integration-required"
    | "local-only"
    | "no-runtime"
    | "stage-direct"
    | "pending";
  detail: string;
  profileRef?: string;
  runtimeOwner?: string;
  securityOwner?: string;
  status: RepositoryWorkspaceRuntimeLaneStatus;
  tone: RepositoryWorkspaceRecordTone;
};

export type RepositoryWorkspaceSecurityBinding = {
  detail: string;
  owner?: string;
  required: boolean;
  reviewRef?: string;
  status: RepositoryWorkspaceSecurityBindingStatus;
  subject: boolean;
  tone: RepositoryWorkspaceRecordTone;
};

export type RepositoryWorkspaceSummaryMetric = {
  id: string;
  label: string;
  tone: RepositoryWorkspaceRecordTone;
  value: string;
};

export type RepositoryWorkspaceReadModel = {
  records: RepositoryWorkspaceRecord[];
  source: {
    lastRead: string;
    mutationGateway: string;
    project: string;
    readModel: string;
    recordSystem: string;
  };
  summary: RepositoryWorkspaceSummaryMetric[];
  workspaceStatus: OperationSurfaceStatusModel;
};
