import type { OperationRuntimeSource } from "../../operation-runtime/operation-runtime-types.ts";

import type { ProposalWorkspaceScenario } from "../read-model/proposal-workspace-read-model.ts";
import type {
  ProposalWorkflowApplyPayload,
  ProposalWorkflowCommandStep,
} from "../work-model/proposal-workflow-command-model.ts";
import type { ProposalWorkflowSourceSnapshot } from "../work-model/proposal-source-projection-model.ts";

export type ProposalCaptureRuntimeCommand = {
  bodyPreview: string;
  captureRequestId: string;
  kind: "capture";
  localRecordId: string;
  title: string;
};

export type ProposalWorkflowRuntimeCommand = {
  kind: "apply-workflow";
  payload: ProposalWorkflowApplyPayload;
  proposalId: string;
  sourceBackendRecordId: ProposalWorkflowSourceSnapshot["backendRecordId"];
  sourceProjectionState: ProposalWorkflowSourceSnapshot["projectionState"];
  sourceRecordVersion: ProposalWorkflowSourceSnapshot["recordVersion"];
};

export type ProposalRuntimeCommand =
  ProposalCaptureRuntimeCommand | ProposalWorkflowRuntimeCommand;

export type ProposalRuntimeRun = {
  capturedProposal: ProposalWorkspaceScenario | null;
  step: ProposalWorkflowCommandStep | null;
  summary: string;
};

export type ProposalCaptureLocalReceipt = {
  commandName: "proposal.capture";
  kind: "capture";
  proposalId: string;
  receiptId: string;
  recordedAt: string;
  requestId: string;
  resultState: "recorded";
  schemaVersion: 1;
  summary: string;
};

export type ProposalWorkflowLocalReceipt = {
  commandName: `proposal.${ProposalWorkflowCommandStep}.apply`;
  kind: "workflow";
  payload: ProposalWorkflowApplyPayload;
  proposalId: string;
  receiptId: string;
  recordedAt: string;
  resultState: "recorded";
  schemaVersion: 1;
  sourceBackendRecordId: ProposalWorkflowSourceSnapshot["backendRecordId"];
  sourceProjectionState: ProposalWorkflowSourceSnapshot["projectionState"];
  sourceRecordVersion: ProposalWorkflowSourceSnapshot["recordVersion"];
  step: ProposalWorkflowCommandStep;
  summary: string;
};

export type ProposalRuntimeReceipt =
  ProposalCaptureLocalReceipt | ProposalWorkflowLocalReceipt;

export const proposalRuntimeSource = {
  authority: "prototype-local",
  mode: "local",
  sourceOwner: "proposal-operation",
} satisfies OperationRuntimeSource & { mode: "local" };
