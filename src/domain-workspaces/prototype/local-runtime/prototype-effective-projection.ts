import type {
  PrototypeRecord,
  PrototypeWorkspaceReadModel,
} from "../read-model/prototype-workspace-read-model.ts";
import type { PrototypeRuntimeProjectionSnapshot } from "./prototype-runtime.ts";
import { prototypeRecordSourceVersion } from "./prototype-runtime-model.ts";
import { prototypeProjectedReceipts } from "./prototype-receipt-projection.ts";
import type { PrototypeProjectedReceipt } from "../read-model/prototype-workspace-read-model.ts";
import { projectPrototypeDeliveryApplication } from "../live-runtime/prototype-delivery-live-projection.ts";
import type { PrototypeDeliveryApplicationProjection } from "../live-runtime/prototype-delivery-live-types.ts";

export type PrototypeEffectiveProjection = {
  readModel: PrototypeWorkspaceReadModel;
  receiptsByRecord: Record<string, PrototypeProjectedReceipt[]>;
};

export function projectPrototypeEffectiveReadModel({
  deliveryApplicationsByPrototypeId = {},
  proposalEntryRecords,
  runtimeProjection,
  sourceReadModel,
}: {
  deliveryApplicationsByPrototypeId?: Readonly<
    Record<string, PrototypeDeliveryApplicationProjection>
  >;
  proposalEntryRecords: PrototypeRecord[];
  runtimeProjection: PrototypeRuntimeProjectionSnapshot;
  sourceReadModel: PrototypeWorkspaceReadModel;
}): PrototypeEffectiveProjection {
  const sourceRecords = uniquePrototypeRecords([
    ...runtimeProjection.localRequestRecords,
    ...proposalEntryRecords,
    ...sourceReadModel.records,
  ]);

  const records = sourceRecords.map((record) => {
    const localRecord = projectPrototypeEffectiveRecord({
      receipts: runtimeProjection.receiptsByRecord[record.id] ?? [],
      record,
    });
    return projectPrototypeDeliveryApplication({
      projection: deliveryApplicationsByPrototypeId[record.id],
      record: localRecord,
    });
  });
  const readModel = {
    ...sourceReadModel,
    records,
  };

  return {
    readModel,
    receiptsByRecord: Object.fromEntries(
      records.map((record) => [
        record.id,
        prototypeProjectedReceipts(
          record,
          runtimeProjection.receiptsByRecord[record.id] ?? [],
        ),
      ]),
    ),
  };
}

export function projectPrototypeEffectiveRecord({
  receipts,
  record,
}: {
  receipts: PrototypeRuntimeProjectionSnapshot["receiptsByRecord"][string];
  record: PrototypeRecord;
}) {
  return [...receipts]
    .sort(
      (left, right) =>
        left.recordedAt.localeCompare(right.recordedAt) ||
        left.receiptId.localeCompare(right.receiptId),
    )
    .reduce((projectedRecord, receipt) => {
      if (
        receipt.commandId === "capture-prototype-request" ||
        receipt.recordId !== projectedRecord.id ||
        receipt.sourceVersion !==
          prototypeRecordSourceVersion(projectedRecord) ||
        receipt.appliedRecord.id !== projectedRecord.id
      ) {
        return projectedRecord;
      }

      return receipt.appliedRecord;
    }, record);
}

function uniquePrototypeRecords(records: PrototypeRecord[]) {
  const seenRecordIds = new Set<string>();

  return records.filter((record) => {
    if (seenRecordIds.has(record.id)) {
      return false;
    }

    seenRecordIds.add(record.id);
    return true;
  });
}
