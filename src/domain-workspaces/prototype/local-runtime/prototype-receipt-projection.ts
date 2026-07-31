import type {
  PrototypeProjectedReceipt,
  PrototypeRecord,
} from "../read-model/prototype-workspace-read-model.ts";
import { prototypeReceiptsOldestFirst } from "../read-model/selectors/prototype-workspace-selectors.ts";
import type { PrototypeLocalReceipt } from "./prototype-runtime-model.ts";

export function prototypeProjectedReceipts(
  record: PrototypeRecord,
  localReceipts: PrototypeLocalReceipt[],
): PrototypeProjectedReceipt[] {
  const projectedReceipts = new Map<string, PrototypeProjectedReceipt>();

  for (const receipt of record.receipts) {
    projectedReceipts.set(receipt.id, {
      ...receipt,
      recordId: record.id,
      sourceLabel: "source record",
      sourceVersion: null,
    });
  }

  for (const receipt of localReceipts) {
    projectedReceipts.set(receipt.receiptId, {
      authority: receipt.authority,
      commandId: receipt.commandId,
      commandName: receipt.commandName,
      id: receipt.receiptId,
      label: receipt.actionLabel,
      recordedAt: receipt.recordedAt,
      recordId: receipt.recordId,
      resultState: receipt.resultState,
      schemaVersion: receipt.schemaVersion,
      sourceLabel: "prototype-local",
      sourceVersion: receipt.sourceVersion,
      summary: receipt.summary,
      tone: receipt.tone,
    });
  }

  return prototypeReceiptsOldestFirst([...projectedReceipts.values()]);
}
