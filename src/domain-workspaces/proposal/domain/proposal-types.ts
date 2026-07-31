import type { OperationEvidenceSignal } from "../../operation-contracts/operation-evidence.ts";
import type { OperationTone } from "../../operation-contracts/operation-state.ts";
import type { OperationSurfaceStatusModel } from "../../operation-contracts/surface-status.ts";

export type ProposalIngressKind = "agent" | "api" | "console" | "system";

export type ProposalWorkspaceScenarioStatus =
  | "captured"
  | "done"
  | "parked"
  | "ready-to-route"
  | "waiting-on-repository"
  | "waiting-on-source";

export type ProposalWorkspaceScenarioKind =
  | "handoff-review-current"
  | "operator-capture-current"
  | "parked-decision-revisitable"
  | "repository-gate-blocked"
  | "source-context-stale";

export type ProposalWorkspaceScenario = {
  backendRecordId: string;
  bodyPreview: string;
  evidence: ProposalWorkspaceScenarioEvidence[];
  handoffRule: string;
  id: string;
  ingress: ProposalIngressKind;
  lastEvent: string;
  lastProjectionUpdate: string;
  owner: string;
  projectionState: "current" | "error" | "offline" | "stale" | "syncing";
  recordVersion: string;
  repoGate: {
    detail: string;
    mode: "existing" | "new" | "not-required";
    owner: string | null;
    ref: string | null;
    state: "blocked" | "clear" | "not-required";
  };
  recordedAt: string;
  routeTarget: "Delivery" | "Prototype" | "Workspace Proposals";
  scenarioKind: ProposalWorkspaceScenarioKind;
  status: ProposalWorkspaceScenarioStatus;
  title: string;
  tone: OperationTone;
};

export type ProposalWorkspaceScenarioEvidence = OperationEvidenceSignal;

export type ProposalWorkspaceSummaryMetric = {
  id: string;
  label: string;
  tone: OperationTone;
  value: string;
};

export type ProposalWorkspaceActivityItem = {
  detail: string;
  label: string;
  tone: OperationTone;
  when: string;
};

export type ProposalWorkspaceScenarioCoverage = {
  kind: ProposalWorkspaceScenarioKind;
  operatorState: "blocked" | "current" | "read-only" | "ready" | "stale";
  proves: string;
  status: ProposalWorkspaceScenarioStatus;
};

export type ProposalWorkspaceReadModel = {
  activities: ProposalWorkspaceActivityItem[];
  proposals: ProposalWorkspaceScenario[];
  scenarioCoverage: ProposalWorkspaceScenarioCoverage[];
  summary: ProposalWorkspaceSummaryMetric[];
  workspaceStatus: OperationSurfaceStatusModel;
};
