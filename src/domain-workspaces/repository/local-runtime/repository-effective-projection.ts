import type { RepositoryWorkspaceRecord } from "../read-model/repository-workspace-read-model.ts";
import type {
  RepositoryAdmissionReceipt,
  RepositoryRetirementRequestReceipt,
  RepositoryRuntimeProjectionSnapshot,
  RepositoryRuntimeReceipt,
} from "./repository-runtime.ts";
import { repositoryRecordSourceVersion } from "./repository-runtime-model.ts";

export type RepositoryEffectiveRecordProjection = Readonly<{
  admissionReceipt: RepositoryAdmissionReceipt | null;
  record: RepositoryWorkspaceRecord;
  retirementRequestReceipt: RepositoryRetirementRequestReceipt | null;
}>;

type RepositoryEffectiveProjectionInput = {
  proposalRequestRecords: RepositoryWorkspaceRecord[];
  runtimeProjection: RepositoryRuntimeProjectionSnapshot;
  sourceRecords: RepositoryWorkspaceRecord[];
};

export function projectRepositoryEffectiveRecordProjections({
  proposalRequestRecords,
  runtimeProjection,
  sourceRecords,
}: RepositoryEffectiveProjectionInput): RepositoryEffectiveRecordProjection[] {
  const records = uniqueRepositoryRecords([
    ...proposalRequestRecords,
    ...sourceRecords,
  ]);

  return records.map((record) =>
    projectRepositoryEffectiveRecord({
      receipts: runtimeProjection.receiptsByRecord[record.id] ?? [],
      record,
    }),
  );
}

export function projectRepositoryEffectiveRecords(
  input: RepositoryEffectiveProjectionInput,
): RepositoryWorkspaceRecord[] {
  return projectRepositoryEffectiveRecordProjections(input).map(
    (projection) => projection.record,
  );
}

export function projectRepositoryEffectiveRecord({
  receipts,
  record,
}: {
  receipts: readonly RepositoryRuntimeReceipt[];
  record: RepositoryWorkspaceRecord;
}): RepositoryEffectiveRecordProjection {
  let admissionReceipt: RepositoryAdmissionReceipt | null = null;
  let projectedRecord = record;
  let retirementRequestReceipt: RepositoryRetirementRequestReceipt | null =
    null;

  for (const receipt of [...receipts].sort(
    (left, right) =>
      left.recordedAt.localeCompare(right.recordedAt) ||
      left.receiptId.localeCompare(right.receiptId),
  )) {
    if (
      receipt.recordId !== projectedRecord.id ||
      receipt.sourceRecordVersion !==
        repositoryRecordSourceVersion(projectedRecord)
    ) {
      continue;
    }

    if (receipt.kind === "admission") {
      admissionReceipt = receipt;
      projectedRecord = {
        ...projectedRecord,
        lastValidation: `local admission review receipt / ${receipt.recordedAt}`,
        nextAction:
          "Review the local admission evidence. Repository admission and workspace contract writes remain future owner-routed actions.",
      };
      continue;
    }

    if (receipt.kind === "retirement-request") {
      retirementRequestReceipt = receipt;
      projectedRecord = {
        ...projectedRecord,
        lastValidation: `local retirement request / ${receipt.recordedAt}`,
        nextAction:
          "Retirement request is recorded locally. The repository remains admitted until a future owner-routed workflow accepts retirement.",
      };
    }
  }

  return {
    admissionReceipt,
    record: projectedRecord,
    retirementRequestReceipt,
  };
}

function uniqueRepositoryRecords(records: RepositoryWorkspaceRecord[]) {
  const seenRecordIds = new Set<string>();

  return records.filter((record) => {
    if (seenRecordIds.has(record.id)) {
      return false;
    }

    seenRecordIds.add(record.id);
    return true;
  });
}
