import type {
  OperationCommandEnvelope,
  OperationCommandRunEnvelope,
  OperationCommandRunResult,
} from "../../operation-runtime/operation-runtime-types.ts";

import type {
  RepositoryRuntimeCommand,
  RepositoryRuntimeReceipt,
  RepositoryRuntimeRun,
} from "./repository-runtime-model.ts";

export function repositoryRuntimeRunFromCommand(
  command: OperationCommandEnvelope<RepositoryRuntimeCommand>,
): OperationCommandRunResult<RepositoryRuntimeRun> {
  const summary = repositoryCommandSummary(command.command.kind);
  if (command.command.kind !== "resolve-proposal-gate") throw new Error("Local admission execution is retired. Complete repository onboarding in Workspace Registry.");

  return {
    run: {
      submittedAt: command.submittedAt,
      summary,
    },
    state: "completed",
    summary,
  };
}

export function repositoryRuntimeReceiptFromRun({
  command,
  run,
}: {
  command: OperationCommandEnvelope<RepositoryRuntimeCommand>;
  run: OperationCommandRunEnvelope<RepositoryRuntimeRun>;
}): RepositoryRuntimeReceipt {
  const receiptId = `repository-${command.command.kind}-${run.runId}`;

  switch (command.command.kind) {
    case "resolve-proposal-gate":
      return {
        ...repositoryLocalReceipt({
          actionLabel: "Record Repository Resolution",
          command,
          commandName: "repository.resolve-proposal-gate",
          receiptId,
          run,
        }),
        kind: "proposal-gate-resolution",
        notes: command.command.notes,
        proposalId: command.command.proposalId,
        repoRequestRef: command.command.repoRequestRef,
        resolvedOwner: command.command.resolvedOwner,
        resolvedRepoRef: command.command.resolvedRepoRef,
        result: "resolved",
        sourceVersion: command.command.proposalSourceVersion,
      };
  }
}

function repositoryLocalReceipt<TCommandName extends string>({
  actionLabel,
  command,
  commandName,
  receiptId,
  run,
}: {
  actionLabel: string;
  command: OperationCommandEnvelope<RepositoryRuntimeCommand>;
  commandName: TCommandName;
  receiptId: string;
  run: OperationCommandRunEnvelope<RepositoryRuntimeRun>;
}) {
  return {
    actionLabel,
    authority: "prototype-local" as const,
    commandName,
    recordedAt: run.updatedAt,
    recordId: command.recordId,
    receiptId,
    resultState: "recorded" as const,
    routeOwner: "repository-operation" as const,
    schemaVersion: 1 as const,
    sourceRecordVersion: command.preconditions.primary.version,
    summary: run.run.summary,
  };
}

function repositoryCommandSummary(kind: RepositoryRuntimeCommand["kind"]) {
  switch (kind) {
    case "resolve-proposal-gate":
      return "Prototype-local Proposal repository gate resolution recorded.";
  }
}
