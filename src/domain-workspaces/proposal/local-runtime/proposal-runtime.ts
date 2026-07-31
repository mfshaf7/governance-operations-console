import { createLocalOperationRuntimeAdapter } from "../../operation-runtime/local-operation-runtime-adapter.ts";
import {
  createLocalOperationProjectionVersion,
  createOperationCommandPreconditions,
  createPrototypeLocalOperationCommand,
  operationRunCanReportSuccess,
} from "../../operation-runtime/operation-runtime-invariants.ts";
import type {
  OperationCommandRunEnvelope,
  OperationReceiptEnvelope,
} from "../../operation-runtime/operation-runtime-types.ts";

import type { ProposalWorkspaceScenario } from "../read-model/proposal-workspace-read-model.ts";
import {
  proposalWorkflowApplySummary,
  type ProposalWorkflowApplyPayload,
} from "../work-model/proposal-workflow-command-model.ts";
import type { ProposalWorkflowSourceSnapshot } from "../work-model/proposal-source-projection-model.ts";
import { proposalRecordFromCaptureCommand } from "./proposal-capture-record-factory.ts";
import {
  proposalRuntimeSource,
  type ProposalRuntimeCommand,
  type ProposalRuntimeReceipt,
  type ProposalRuntimeRun,
  type ProposalWorkflowLocalReceipt,
} from "./proposal-runtime-model.ts";
import {
  getProposalLocalCaptureRecordCount,
  getProposalRuntimeProjectionSnapshot,
  recordProposalLocalCaptureRecord,
  recordProposalWorkflowReceipt,
  subscribeProposalRuntimeProjection,
} from "./proposal-runtime-store.ts";

export type {
  ProposalCaptureLocalReceipt,
  ProposalWorkflowLocalReceipt,
} from "./proposal-runtime-model.ts";
export type { ProposalRuntimeProjectionSnapshot } from "./proposal-runtime-store.ts";
export {
  getProposalRuntimeProjectionSnapshot,
  subscribeProposalRuntimeProjection,
};

const captureRecordIdByRequestId = new Map<string, string>();
let captureRequestSequence = 0;

const proposalCommandRuntime = createLocalOperationRuntimeAdapter<
  ProposalWorkspaceScenario,
  never,
  ProposalRuntimeCommand,
  ProposalRuntimeRun,
  ProposalRuntimeReceipt
>({
  commandRunner(command) {
    if (command.command.kind === "capture") {
      const capturedProposal = proposalRecordFromCaptureCommand({
        bodyPreview: command.command.bodyPreview,
        id: command.command.localRecordId,
        recordedAt: command.submittedAt,
        title: command.command.title,
      });

      return {
        run: {
          capturedProposal,
          step: null,
          summary: "Prototype-local Proposal capture recorded.",
        },
        state: "completed",
        summary: "Prototype-local Proposal capture recorded.",
      };
    }

    const summary = proposalWorkflowApplySummary(command.command.payload.step);
    return {
      run: {
        capturedProposal: null,
        step: command.command.payload.step,
        summary,
      },
      state: "completed",
      summary,
    };
  },
  receiptFactory({ command, run }) {
    if (command.command.kind === "capture") {
      const receiptId = `proposal-capture-${run.runId}`;
      return {
        durability: "prototype-local",
        receipt: {
          commandName: "proposal.capture",
          kind: "capture",
          proposalId: command.command.localRecordId,
          receiptId,
          recordedAt: run.updatedAt,
          requestId: command.command.captureRequestId,
          resultState: "recorded",
          schemaVersion: 1,
          summary: run.run.summary,
        },
        receiptId,
        recordedAt: run.updatedAt,
      };
    }

    const receiptId = `proposal-workflow-${run.runId}`;
    return {
      durability: "prototype-local",
      receipt: {
        commandName: `proposal.${command.command.payload.step}.apply`,
        kind: "workflow",
        payload: command.command.payload,
        proposalId: command.command.proposalId,
        receiptId,
        recordedAt: run.updatedAt,
        resultState: "recorded",
        schemaVersion: 1,
        sourceBackendRecordId: command.command.sourceBackendRecordId,
        sourceProjectionState: command.command.sourceProjectionState,
        sourceRecordVersion: command.command.sourceRecordVersion,
        step: command.command.payload.step,
        summary: run.run.summary,
      },
      receiptId,
      recordedAt: run.updatedAt,
    };
  },
  runtimeSource: proposalRuntimeSource,
});

export function createProposalCaptureRequestId() {
  captureRequestSequence += 1;
  return `proposal-capture-request-${captureRequestSequence}`;
}

export async function submitProposalCaptureCommand({
  bodyPreview,
  captureRequestId,
  submittedAt = proposalLocalTimestamp(),
  title,
}: {
  bodyPreview: string;
  captureRequestId: string;
  submittedAt?: string;
  title: string;
}) {
  const localRecordId = proposalCaptureRecordId(captureRequestId);
  const command: ProposalRuntimeCommand = {
    bodyPreview: bodyPreview.trim(),
    captureRequestId,
    kind: "capture",
    localRecordId,
    title: title.trim(),
  };
  const run = await proposalCommandRuntime.submitCommand(
    createPrototypeLocalOperationCommand({
      command,
      commandName: "proposal.capture",
      preconditions: createOperationCommandPreconditions({
        primary: {
          recordId: localRecordId,
          sourceOwner: proposalRuntimeSource.sourceOwner,
          version: createLocalOperationProjectionVersion({
            projection: command,
            sourceOwner: proposalRuntimeSource.sourceOwner,
          }),
        },
      }),
      recordId: localRecordId,
      runtimeSource: proposalRuntimeSource,
      submittedAt,
    }),
  );
  const receipt = await proposalReceiptForRun(run);
  const capturedProposal = run.run.capturedProposal;

  if (!capturedProposal || receipt.receipt.kind !== "capture") {
    throw new Error(
      "Proposal capture completed without matching local evidence.",
    );
  }

  recordProposalLocalCaptureRecord(capturedProposal);
  return { receipt, record: capturedProposal, run };
}

export async function submitProposalWorkflowApplyCommand({
  payload,
  proposalId,
  source,
  submittedAt = proposalLocalTimestamp(),
}: {
  payload: ProposalWorkflowApplyPayload;
  proposalId: string;
  source: ProposalWorkflowSourceSnapshot;
  submittedAt?: string;
}): Promise<{
  receipt: OperationReceiptEnvelope<ProposalWorkflowLocalReceipt>;
  run: OperationCommandRunEnvelope<ProposalRuntimeRun>;
}> {
  const run = await proposalCommandRuntime.submitCommand(
    createPrototypeLocalOperationCommand({
      command: {
        kind: "apply-workflow",
        payload,
        proposalId,
        sourceBackendRecordId: source.backendRecordId,
        sourceProjectionState: source.projectionState,
        sourceRecordVersion: source.recordVersion,
      },
      commandName: `proposal.${payload.step}.apply`,
      preconditions: createOperationCommandPreconditions({
        primary: {
          recordId: proposalId,
          sourceOwner: "workspace-proposals",
          version: source.recordVersion,
        },
      }),
      recordId: proposalId,
      runtimeSource: proposalRuntimeSource,
      submittedAt,
    }),
  );
  const receipt = await proposalReceiptForRun(run);

  if (
    receipt.receipt.kind !== "workflow" ||
    !operationRunCanReportSuccess(run, receipt)
  ) {
    throw new Error(
      "Proposal workflow command completed without matching local evidence.",
    );
  }

  recordProposalWorkflowReceipt(receipt.receipt);

  return {
    receipt: receipt as OperationReceiptEnvelope<ProposalWorkflowLocalReceipt>,
    run,
  };
}

export function getProposalRuntimeCapabilities() {
  return proposalCommandRuntime.getCapabilities();
}

export function listProposalRuntimeReceipts(recordId: string) {
  return proposalCommandRuntime.listReceipts(recordId);
}

export function proposalLocalTimestamp() {
  return new Date().toISOString();
}

function proposalCaptureRecordId(captureRequestId: string) {
  const existingRecordId = captureRecordIdByRequestId.get(captureRequestId);
  if (existingRecordId) {
    return existingRecordId;
  }

  const recordId = `PR-C-${String(
    getProposalLocalCaptureRecordCount() + 1,
  ).padStart(3, "0")}`;
  captureRecordIdByRequestId.set(captureRequestId, recordId);
  return recordId;
}

async function proposalReceiptForRun(
  run: OperationCommandRunEnvelope<ProposalRuntimeRun>,
) {
  const receipts = await proposalCommandRuntime.listReceipts(run.recordId);
  const receipt = receipts.find((candidate) => candidate.runId === run.runId);

  if (!receipt) {
    throw new Error("Proposal command completed without a local receipt.");
  }

  return receipt;
}
