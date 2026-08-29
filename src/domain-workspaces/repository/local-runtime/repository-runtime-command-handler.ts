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
  const progress =
    command.command.kind === "record-admission"
      ? [
          {
            state: "running" as const,
            summary:
              "Repository owner and admission posture loaded from the effective record.",
          },
          {
            state: "running" as const,
            summary:
              "Prototype-local boundary confirmed; no repository or workspace contract was mutated.",
          },
        ]
      : undefined;

  return {
    progress,
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
    case "record-admission":
      return {
        ...repositoryLocalReceipt({
          actionLabel: "Run Local Admission Review",
          command,
          commandName: "repository.record-admission",
          receiptId,
          run,
        }),
        kind: "admission",
        reviewedRecord: command.command.record,
        runEvents: [...run.events],
      };
    case "record-retirement-request":
      return {
        ...repositoryLocalReceipt({
          actionLabel: "Record Retirement Request",
          command,
          commandName: "repository.record-retirement-request",
          receiptId,
          run,
        }),
        kind: "retirement-request",
        requestedRecord: command.command.record,
      };
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
    case "record-admission":
      return "Prototype-local repository admission review receipt recorded.";
    case "record-retirement-request":
      return "Prototype-local repository retirement request recorded.";
    case "resolve-proposal-gate":
      return "Prototype-local Proposal repository gate resolution recorded.";
  }
}
