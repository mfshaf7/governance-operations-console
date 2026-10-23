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
  const canonical = Boolean(recordedReceipt?.canonical_evidence);

  return {
    eventDescription: receiptRecorded
      ? "Read-only event trail for the projected packet and recorded apply receipt."
      : "Read-only event trail for the projected Refinement packet.",
    eventTitle: "Recorded Trail",
    historyTone,
    packetTimeLabel: canonical ? "Source Handoff Recorded" : "Packet Saved",
    packetTimeDescription: canonical
      ? "Work Design handoff time carried by the packet, not Refinement completion time."
      : "Last packet save before current archive view.",
    receiptDescription: receiptRecorded
      ? canonical
        ? "Canonical OOS receipt and accepted-value readback for this Refinement pass. This does not complete product delivery."
        : "Immutable local receipt archive for this Refinement pass."
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
  if (recordedReceipt?.canonical_evidence) {
    return recordedReceipt.canonical_evidence.events.map((event) => ({
      detail: event.message,
      label: event.event_type.replaceAll("_", " "),
      status: event.status,
      timestamp: event.recorded_at,
      tone: event.status === "failed" ? "danger" : "ok",
    }));
  }
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
      detail: recordedReceipt.canonical_evidence ? "Canonical OOS receipt identifier." : "Local immutable receipt identifier.",
      label: "Receipt ID",
      tone: recordedReceipt.tone,
      value: recordedReceipt.receipt_id,
    },
    {
      detail: recordedReceipt.canonical_evidence ? "Canonical apply outcome after backend readback." : "Apply outcome recorded by the local prototype.",
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
    ...(recordedReceipt.canonical_evidence ? [
      {label:"Authority",value:recordedReceipt.canonical_evidence.authority},
      {label:"Durable Receipt",value:recordedReceipt.canonical_evidence.receipt_ref},
      {label:"Receipt Digest",value:recordedReceipt.canonical_evidence.receipt_digest},
      {label:"Accepted Draft Digest",value:recordedReceipt.canonical_evidence.accepted_draft_digest},
      {label:"Run",value:recordedReceipt.canonical_evidence.run_id},
      {label:"Applied By",value:recordedReceipt.canonical_evidence.applied_by},
      {label:"Delivery",value:recordedReceipt.canonical_evidence.delivery_ref},
      {label:"Readback Revision",value:recordedReceipt.canonical_evidence.source_revision},
    ].map((row) => ({...row,detail:"Returned by the validated OOS canonical receipt; not browser-local evidence.",tone:"info" as DeliveryTone})) : []),
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
