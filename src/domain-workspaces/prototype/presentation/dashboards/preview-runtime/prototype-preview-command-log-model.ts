import type { PrototypeProjectedReceipt } from "../../../read-model/prototype-workspace-read-model.ts";
import type {
  PrototypeCommandId,
  PrototypeCommandView,
} from "../../../work-model/commands/prototype-command-model.ts";

const previewCommandLogIds = new Set<string>([
  "confirm-preview-profile",
  "refresh-preview-proof",
  "restart-preview",
  "save-preview-profile",
  "start-preview",
  "stop-preview",
] satisfies PrototypeCommandId[]);

export function prototypePreviewCommandLogRows(
  receipts: PrototypeProjectedReceipt[],
) {
  const previewReceipts = receipts.filter((receipt) =>
    previewCommandLogIds.has(receipt.commandId),
  );

  if (previewReceipts.length === 0) {
    return [];
  }

  return previewReceipts.map((receipt, index) => ({
    detail: `${receipt.label}: ${receipt.summary}`,
    formattedTimestamp: receipt.recordedAt,
    marker: String(index + 1).padStart(2, "0"),
    timestamp: receipt.recordedAt,
    tone: receipt.tone,
  }));
}

export function prototypePreviewCommandLogProjection(
  commandRows: ReturnType<typeof prototypePreviewCommandLogRows>,
) {
  const idle = commandRows.length === 0;

  return {
    idle,
    statusLabel: idle
      ? "idle"
      : `${commandRows.length} event${commandRows.length === 1 ? "" : "s"}`,
    statusTone: idle ? ("muted" as const) : ("info" as const),
  };
}

export function prototypePreviewCommandTone(command: PrototypeCommandView) {
  return command.disabledReason ? "warn" : command.tone;
}
