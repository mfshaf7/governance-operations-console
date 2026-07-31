import type { TerasTone } from "@/teras";

import type {
  PrototypeProjectedReceipt,
  PrototypeRecord,
} from "../../../read-model/prototype-workspace-read-model.ts";
import {
  prototypeReceiptsNewestFirst,
  prototypeReceiptsOldestFirst,
} from "../../../read-model/selectors/prototype-workspace-selectors.ts";
import {
  prototypeBaselineStatus,
  prototypeIngressLabel,
  prototypeLandingStatus,
  prototypeMovementStateLabel,
  prototypePreviewStatus,
} from "../../shared/prototype-record-display-model.ts";

export type PrototypeHistoryReceipt = PrototypeProjectedReceipt;

export type PrototypeHistoryTimelineRow = {
  detail: string;
  label: string;
  status: string;
  timestamp: string;
  tone: TerasTone;
};

export function prototypeHistoryTimelineRows(
  _record: PrototypeRecord,
  receipts: PrototypeHistoryReceipt[],
): PrototypeHistoryTimelineRow[] {
  return prototypeReceiptsOldestFirst(receipts).map(
    prototypeHistoryReceiptTimelineRow,
  );
}

export function prototypeHistoryEvidenceRows(record: PrototypeRecord) {
  const rows = [
    ...record.evidence.map((evidence) => ({
      detail: evidence.detail,
      label: evidence.label,
      status: evidence.status,
      tone: evidence.tone,
    })),
    ...record.baseline.evidenceRefs.map((ref) => ({
      detail: "Baseline Packet evidence reference retained by the read model.",
      label: ref,
      status: "baseline evidence",
      tone: "info" as TerasTone,
    })),
  ];

  if (record.preview.lastProofRef) {
    rows.push({
      detail: record.preview.lastCheckLogRef ?? "No check log ref retained.",
      label: record.preview.lastProofRef,
      status: "preview proof",
      tone: "ok",
    });
  }

  for (const linkedRecord of record.linkedRecords) {
    rows.push({
      detail: `${linkedRecord.system} / ${linkedRecord.level} / ${linkedRecord.ref}`,
      label: linkedRecord.label,
      status: linkedRecord.role,
      tone: linkedRecord.tone,
    });
  }

  if (rows.length === 0) {
    rows.push({
      detail:
        "No retained evidence, baseline refs, preview proof, or linked records are available.",
      label: "Archive",
      status: "empty",
      tone: "muted" as TerasTone,
    });
  }

  return rows;
}

export function prototypeHistoryRecordEvidenceTone(
  record: PrototypeRecord,
): TerasTone {
  return record.evidence.length > 0 ? "info" : "muted";
}

export function prototypeHistoryEvidenceRowsTone(
  rows: ReturnType<typeof prototypeHistoryEvidenceRows>,
): TerasTone {
  return rows.length > 0 ? "info" : "muted";
}

export function prototypeHistoryArchiveFacts({
  lifecycleStatusLabel,
  record,
  terminal,
}: {
  lifecycleStatusLabel: string;
  record: PrototypeRecord;
  terminal: boolean;
}) {
  return [
    { label: "Lifecycle", value: lifecycleStatusLabel },
    {
      label: "Ingress",
      value: prototypeIngressLabel(record.ingress),
    },
    {
      label: "Landing",
      value:
        record.landing.lastLandingReceiptRef ??
        prototypeLandingStatus(record).label,
    },
    {
      label: "Preview",
      value:
        record.preview.lastProofRef ?? prototypePreviewStatus(record).label,
    },
    {
      label: "Baseline",
      value:
        record.baseline.lastPacketReceiptRef ??
        prototypeBaselineStatus(record).label,
    },
    {
      label: "Movement",
      value:
        record.movementRequest.lastMovementReceiptRef ??
        record.lastMovementReceiptRef ??
        prototypeMovementStateLabel(record.movementRequest.state),
    },
    {
      label: "Closeout",
      value: terminal ? "closed" : "not recorded",
    },
  ];
}

export function prototypeHistoryReceiptFacts(
  receipts: PrototypeHistoryReceipt[],
) {
  return prototypeReceiptsNewestFirst(receipts)
    .slice(0, 6)
    .map((receipt) => ({
      label: receipt.label,
      value: `${receipt.resultState} / ${receipt.sourceLabel}`,
    }));
}

function prototypeHistoryReceiptTimelineRow(
  receipt: PrototypeHistoryReceipt,
): PrototypeHistoryTimelineRow {
  return {
    detail: receipt.summary,
    label: receipt.label,
    status: receipt.resultState,
    timestamp: receipt.recordedAt,
    tone: receipt.tone,
  };
}
