import type {
  OperationCommandRunEvent,
  OperationRuntimeSource,
} from "../../operation-runtime/operation-runtime-types.ts";
import { createLocalOperationProjectionVersion } from "../../operation-runtime/operation-runtime-invariants.ts";
import type { ProposalRepositoryGateResolution } from "../../operation-contracts/proposal-repository-request.ts";

import type { RepositoryWorkspaceRecord } from "../read-model/repository-workspace-read-model.ts";

type RepositoryLocalReceipt<
  TCommandName extends string,
  TResultState extends string = "recorded",
> = {
  actionLabel: string;
  authority: "prototype-local";
  commandName: TCommandName;
  recordedAt: string;
  recordId: string;
  receiptId: string;
  resultState: TResultState;
  routeOwner: "repository-operation";
  schemaVersion: 1;
  sourceRecordVersion: string;
  summary: string;
};

export type RepositoryAdmissionReceipt =
  RepositoryLocalReceipt<"repository.record-admission"> & {
    kind: "admission";
    reviewedRecord: RepositoryWorkspaceRecord;
    runEvents: readonly OperationCommandRunEvent[];
  };

export type RepositoryRetirementRequestReceipt =
  RepositoryLocalReceipt<"repository.record-retirement-request"> & {
    kind: "retirement-request";
    requestedRecord: RepositoryWorkspaceRecord;
  };

export type RepositoryProposalGateResolutionReceipt =
  ProposalRepositoryGateResolution &
    RepositoryLocalReceipt<"repository.resolve-proposal-gate"> & {
      kind: "proposal-gate-resolution";
    };

export type RepositoryRuntimeCommand =
  | {
      kind: "record-admission";
      record: RepositoryWorkspaceRecord;
    }
  | {
      kind: "resolve-proposal-gate";
      notes: string;
      proposalId: string;
      proposalSourceVersion: string;
      repoRequestRef: string;
      resolvedOwner: string;
      resolvedRepoRef: string;
    };

export type RepositoryRuntimeRun = {
  submittedAt: string;
  summary: string;
};

export type RepositoryRuntimeReceipt =
  | RepositoryAdmissionReceipt
  | RepositoryProposalGateResolutionReceipt
  | RepositoryRetirementRequestReceipt;

export type RepositoryRuntimeProjectionState = {
  receiptsByRecord: Record<string, RepositoryRuntimeReceipt[]>;
};

export type RepositoryRuntimeProjectionSnapshot =
  RepositoryRuntimeProjectionState;

export const repositoryRuntimeSource = {
  authority: "prototype-local",
  mode: "local",
  sourceOwner: "repository-operation",
} satisfies OperationRuntimeSource & { mode: "local" };

export function repositoryRecordSourceVersion(
  record: RepositoryWorkspaceRecord,
) {
  return createLocalOperationProjectionVersion({
    projection: record,
    sourceOwner: repositoryRuntimeSource.sourceOwner,
  });
}
