import type {
  DeliveryRefinementApplyReceipt,
  DeliveryRefinementPacket,
  DeliveryTone,
} from "../../../../read-model/index.ts";

export type RefinementHistoryTimelineRow = {
  detail: string;
  label: string;
  status: string;
  timestamp: string;
  tone: DeliveryTone;
};

export type RefinementHistoryReceiptRow = {
  detail: string;
  label: string;
  tone: DeliveryTone;
  value: string;
};

export function refinementHistoryViewProjection(
  recordedReceipt: DeliveryRefinementApplyReceipt | null,
) {
  const receiptRecorded = Boolean(recordedReceipt);
  const historyTone: DeliveryTone = recordedReceipt?.tone ?? "info";

  return {
    eventDescription: receiptRecorded
      ? "Read-only event trail for the projected packet and recorded apply receipt."
      : "Read-only event trail for the projected Refinement packet.",
    eventTitle: "Recorded Trail",
    historyTone,
    receiptDescription: receiptRecorded
      ? "Immutable local receipt archive for this Refinement pass."
      : "Apply Refinement must complete before immutable receipt evidence exists.",
    receiptRecorded,
    receiptStatusLabel: receiptRecorded ? "receipt" : "empty",
    receiptStatusTone: receiptRecorded
      ? historyTone
      : ("muted" as DeliveryTone),
    receiptTitle: receiptRecorded
      ? "Refinement Applied"
      : "No Receipt Recorded",
  };
}

export function refinementHistoryTimelineRows({
  packet,
  recordedReceipt,
}: {
  packet: DeliveryRefinementPacket;
  recordedReceipt: DeliveryRefinementApplyReceipt | null;
}): RefinementHistoryTimelineRow[] {
  const rows: RefinementHistoryTimelineRow[] = [
    {
      detail: `Source receipt ${packet.handoff.source_work_design_receipt_id}; ${packet.apply_plan.operations.length} planned operations across ${new Set(packet.apply_plan.expected_routes).size} bounded routes.`,
      label: "Refinement Packet Projected",
      status: packet.status,
      timestamp: packet.last_saved_at,
      tone: "info",
    },
  ];

  if (!recordedReceipt) {
    return rows;
  }

  rows.push({
    detail: `Receipt ${recordedReceipt.receipt_id} recorded with outcome ${recordedReceipt.outcome}.`,
    label: "Receipt Recorded",
    status: recordedReceipt.outcome,
    timestamp: recordedReceipt.applied_at,
    tone: recordedReceipt.tone,
  });

  return rows;
}

export function refinementHistoryReceiptRows({
  packet,
  recordedReceipt,
}: {
  packet: DeliveryRefinementPacket;
  recordedReceipt: DeliveryRefinementApplyReceipt | null;
}): RefinementHistoryReceiptRow[] {
  if (!recordedReceipt) {
    return [
      {
        detail: "Source Work Design receipt already carried into the packet.",
        label: "Source Receipt",
        tone: "info",
        value: packet.handoff.source_work_design_receipt_id,
      },
      {
        detail: "Current immutable Refinement packet identity.",
        label: "Packet",
        tone: "info",
        value: packet.packet_id,
      },
    ];
  }

  return [
    {
      detail: "Local immutable receipt identifier.",
      label: "Receipt ID",
      tone: recordedReceipt.tone,
      value: recordedReceipt.receipt_id,
    },
    {
      detail: "Apply outcome recorded by the local prototype.",
      label: "Outcome",
      tone: recordedReceipt.tone,
      value: recordedReceipt.outcome,
    },
    {
      detail: "Apply completion timestamp.",
      label: "Applied At",
      tone: recordedReceipt.tone,
      value: formatRefinementHistoryDateTime(recordedReceipt.applied_at),
    },
    {
      detail: "Work Design receipt that fed this Refinement packet.",
      label: "Source Receipt",
      tone: "info",
      value: recordedReceipt.source_work_design_receipt_id,
    },
    {
      detail: "Receipt line count captured in the event trail.",
      label: "Receipt Lines",
      tone: recordedReceipt.tone,
      value: recordedReceipt.lines.length.toString(),
    },
  ];
}

export function formatRefinementHistoryDateTime(isoValue: string) {
  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
