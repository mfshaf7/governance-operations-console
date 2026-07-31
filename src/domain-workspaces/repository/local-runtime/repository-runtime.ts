import { createLocalOperationRuntimeAdapter } from "../../operation-runtime/local-operation-runtime-adapter.ts";
import {
  createOperationCommandPreconditions,
  createPrototypeLocalOperationCommand,
  operationRunCanReportSuccess,
} from "../../operation-runtime/operation-runtime-invariants.ts";
import type {
  OperationCommandRunEnvelope,
  OperationReceiptEnvelope,
} from "../../operation-runtime/operation-runtime-types.ts";
import { repositoryOwnerRepoCatalogOptions } from "../../operation-integrations/repository-owner-repo-catalog-projection.ts";

import type { RepositoryWorkspaceRecord } from "../read-model/repository-workspace-read-model.ts";
import type { RepositoryRequestDraft } from "../work-model/request/repository-request-model.ts";
import { assertRepositoryGateResolutionDraft } from "../work-model/gate-resolution/repository-gate-resolution-model.ts";
import { repositoryRecordFromRequestDraft } from "./repository-request-record-factory.ts";
import {
  repositoryRuntimeReceiptFromRun,
  repositoryRuntimeRunFromCommand,
} from "./repository-runtime-command-handler.ts";
import {
  repositoryRuntimeSource,
  repositoryRecordSourceVersion,
  type RepositoryProposalGateResolutionReceipt,
  type RepositoryRuntimeCommand,
  type RepositoryRuntimeReceipt,
  type RepositoryRuntimeRun,
} from "./repository-runtime-model.ts";
import {
  getRepositoryLocalRequestRecordCount,
  getRepositoryRuntimeProjectionSnapshot,
  recordRepositoryLocalRequestRecord,
  recordRepositoryRuntimeReceipt,
  subscribeRepositoryRuntimeProjection,
} from "./repository-runtime-store.ts";

export {
  type RepositoryAdmissionReceipt,
  type RepositoryProposalGateResolutionReceipt,
  type RepositoryRequestReceipt,
  type RepositoryRetirementRequestReceipt,
  type RepositoryRuntimeReceipt,
  type RepositoryRuntimeProjectionSnapshot,
} from "./repository-runtime-model.ts";
export {
  emptyRepositoryRequestDraft,
  type RepositoryRequestDraft,
} from "../work-model/request/repository-request-model.ts";
export {
  getRepositoryRuntimeProjectionSnapshot,
  subscribeRepositoryRuntimeProjection,
};

const repositoryRecordIdByRequestId = new Map<string, string>();
let repositoryRequestSequence = 0;

const repositoryCommandRuntime = createLocalOperationRuntimeAdapter<
  RepositoryWorkspaceRecord,
  never,
  RepositoryRuntimeCommand,
  RepositoryRuntimeRun,
  RepositoryRuntimeReceipt
>({
  commandRunner: repositoryRuntimeRunFromCommand,
  receiptFactory({ command, run }) {
    const receipt = repositoryRuntimeReceiptFromRun({ command, run });

    return {
      durability: "prototype-local",
      receipt,
      receiptId: receipt.receiptId,
      recordedAt: run.updatedAt,
    };
  },
  runtimeSource: repositoryRuntimeSource,
});

export function createRepositoryRequestId() {
  repositoryRequestSequence += 1;
  return `repository-request-${repositoryRequestSequence}`;
}

export async function submitRepositoryRequestCommand(
  draft: RepositoryRequestDraft,
  options: {
    requestId?: string;
    submittedAt?: string;
  } = {},
) {
  const requestId = options.requestId ?? createRepositoryRequestId();
  const submittedAt = options.submittedAt ?? repositoryTimestamp();
  const localRecordIndex = repositoryRequestRecordIndex(requestId);
  const localRecord = repositoryRecordFromRequestDraft(draft, localRecordIndex);
  const { receipt, run } = await submitRepositoryRuntimeCommand({
    command: {
      draft,
      kind: "submit-request",
      record: localRecord,
      requestId,
    },
    commandName: "repository.submit-request",
    recordId: localRecord.id,
    sourceRecordVersion: repositoryRecordSourceVersion(localRecord),
    submittedAt,
  });

  recordRepositoryLocalRequestRecord(localRecord);

  return {
    receipt: repositoryReceiptOfKind(receipt, "request"),
    record: run.run.record ?? localRecord,
    submittedAt: receipt.recordedAt,
  };
}

export async function recordRepositoryAdmissionCommand(
  record: RepositoryWorkspaceRecord,
  submittedAt = repositoryTimestamp(),
) {
  const { receipt } = await submitRepositoryRuntimeCommand({
    command: {
      kind: "record-admission",
      record,
    },
    commandName: "repository.record-admission",
    recordId: record.id,
    sourceRecordVersion: repositoryRecordSourceVersion(record),
    submittedAt,
  });
  const admissionReceipt = repositoryReceiptOfKind(receipt, "admission");

  return admissionReceipt;
}

export async function recordRepositoryRetirementRequestCommand(
  record: RepositoryWorkspaceRecord,
  submittedAt = repositoryTimestamp(),
) {
  const { receipt } = await submitRepositoryRuntimeCommand({
    command: {
      kind: "record-retirement-request",
      record,
    },
    commandName: "repository.record-retirement-request",
    recordId: record.id,
    sourceRecordVersion: repositoryRecordSourceVersion(record),
    submittedAt,
  });
  const retirementReceipt = repositoryReceiptOfKind(
    receipt,
    "retirement-request",
  );

  return retirementReceipt;
}

export async function recordRepositoryProposalGateResolutionCommand({
  notes,
  record,
  resolvedOwner,
  resolvedRepoRef,
  submittedAt = repositoryTimestamp(),
}: {
  notes: string;
  record: RepositoryWorkspaceRecord;
  resolvedOwner: string;
  resolvedRepoRef: string;
  submittedAt?: string;
}): Promise<RepositoryProposalGateResolutionReceipt> {
  assertRepositoryGateResolutionDraft({
    draft: {
      notes,
      resolvedOwner,
      resolvedRepoRef,
    },
    ownerRepositories: repositoryOwnerRepoCatalogOptions(),
    repository: record,
  });

  if (!record.proposalGate) {
    throw new Error("Repository proposal gate is unavailable.");
  }

  const sourceRecordVersion = repositoryRecordSourceVersion(record);
  const { receipt } = await submitRepositoryRuntimeCommand({
    command: {
      kind: "resolve-proposal-gate",
      notes: notes.trim(),
      proposalId: record.proposalGate.proposalId,
      proposalSourceVersion: record.proposalGate.sourceVersion,
      repoRequestRef: record.proposalGate.repoRequestRef,
      resolvedOwner: resolvedOwner.trim(),
      resolvedRepoRef: resolvedRepoRef.trim(),
    },
    commandName: "repository.resolve-proposal-gate",
    recordId: record.id,
    sourceRecordVersion,
    submittedAt,
  });

  return repositoryReceiptOfKind(receipt, "proposal-gate-resolution");
}

export function listRepositoryRuntimeReceipts(recordId: string) {
  return repositoryCommandRuntime.listReceipts(recordId);
}

export function getRepositoryRuntimeCapabilities() {
  return repositoryCommandRuntime.getCapabilities();
}

async function submitRepositoryRuntimeCommand({
  command,
  commandName,
  recordId,
  sourceRecordVersion,
  submittedAt,
}: {
  command: RepositoryRuntimeCommand;
  commandName: string;
  recordId: string;
  sourceRecordVersion: string;
  submittedAt: string;
}): Promise<{
  receipt: OperationReceiptEnvelope<RepositoryRuntimeReceipt>;
  run: OperationCommandRunEnvelope<RepositoryRuntimeRun>;
}> {
  const run = await repositoryCommandRuntime.submitCommand(
    createPrototypeLocalOperationCommand({
      command,
      commandName,
      preconditions: createOperationCommandPreconditions({
        primary: {
          recordId,
          sourceOwner: repositoryRuntimeSource.sourceOwner,
          version: sourceRecordVersion,
        },
      }),
      recordId,
      runtimeSource: repositoryRuntimeSource,
      submittedAt,
    }),
  );
  const receipts = await repositoryCommandRuntime.listReceipts(recordId);
  const receipt = receipts.find((candidate) => candidate.runId === run.runId);

  if (!receipt || !operationRunCanReportSuccess(run, receipt)) {
    throw new Error(
      "Repository command completed without matching local evidence.",
    );
  }

  recordRepositoryRuntimeReceipt(receipt.receipt);

  return { receipt, run };
}

function repositoryReceiptOfKind<
  TKind extends RepositoryRuntimeReceipt["kind"],
>(
  envelope: OperationReceiptEnvelope<RepositoryRuntimeReceipt>,
  kind: TKind,
): Extract<RepositoryRuntimeReceipt, { kind: TKind }> {
  if (envelope.receipt.kind !== kind) {
    throw new Error(`Expected Repository ${kind} receipt.`);
  }

  return envelope.receipt as Extract<RepositoryRuntimeReceipt, { kind: TKind }>;
}

function repositoryRequestRecordIndex(requestId: string) {
  const existingRecordId = repositoryRecordIdByRequestId.get(requestId);
  if (existingRecordId) {
    return Number(existingRecordId.split("-").at(-1)) - 1;
  }

  const index = getRepositoryLocalRequestRecordCount();
  const recordId = `repo-local-request-${String(index + 1).padStart(3, "0")}`;
  repositoryRecordIdByRequestId.set(requestId, recordId);
  return index;
}

function repositoryTimestamp() {
  return new Date().toISOString();
}
