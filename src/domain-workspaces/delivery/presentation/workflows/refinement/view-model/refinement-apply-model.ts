import type { TerasMetadataItem } from "@/teras";
import type {
  DeliveryRefinementApplyOperation,
  DeliveryRefinementApplyReceipt,
  DeliveryRefinementPacket,
  DeliveryTone,
} from "../../../../read-model/index.ts";

export type RefinementApplyRuntimeLine = {
  marker: string;
  text: string;
  timestamp: string;
  tone: DeliveryTone;
};

export function refinementApplyRuntimeLines({
  activeReceipt,
  canApply,
  packet,
  routeSummary,
  uniqueRoutes,
}: {
  activeReceipt: DeliveryRefinementApplyReceipt | null;
  canApply: boolean;
  packet: DeliveryRefinementPacket;
  routeSummary: string;
  uniqueRoutes: string[];
}): RefinementApplyRuntimeLine[] {
  const recordedReceipt = activeReceipt ?? packet.receipt;

  if (recordedReceipt) {
    return [
      {
        marker: "[ok]",
        text: `Receipt ${recordedReceipt.receipt_id} accepted the Refinement apply run.`,
        timestamp: recordedReceipt.applied_at,
        tone: "ok",
      },
      ...recordedReceipt.lines.map<RefinementApplyRuntimeLine>((line) => ({
        marker: "[ok]",
        text: line,
        timestamp: recordedReceipt.applied_at,
        tone: "ok",
      })),
    ];
  }

  return [
    {
      marker: "[plan]",
      text: `Apply plan loaded from ${packet.packet_id}.`,
      timestamp: packet.last_saved_at,
      tone: "info",
    },
    {
      marker: "[routes]",
      text: `Bounded OOS routes staged: ${uniqueRoutes.length} route${uniqueRoutes.length === 1 ? "" : "s"} covering ${routeSummary}.`,
      timestamp: packet.last_saved_at,
      tone: "warn",
    },
    {
      marker: canApply ? "[armed]" : "[idle]",
      text: canApply
        ? "Footer Apply Refinement will record the local receipt and move to History."
        : "Apply is waiting for metadata review and readiness gates.",
      timestamp: packet.last_saved_at,
      tone: canApply ? "warn" : "muted",
    },
  ];
}

export function refinementApplyLogRows(
  runtimeLines: RefinementApplyRuntimeLine[],
) {
  return runtimeLines.map((line) => ({
    detail: line.text,
    formattedTimestamp: formatRefinementApplyTimestamp(line.timestamp),
    marker: line.marker,
    timestamp: line.timestamp,
    tone: line.tone,
  }));
}

export function refinementApplyOperationTone(
  operation: DeliveryRefinementApplyOperation,
): DeliveryTone {
  return operation.status === "planned" ? "warn" : "muted";
}

export function refinementApplyHeaderProjection({
  applyRecorded,
  canApply,
}: {
  applyRecorded: boolean;
  canApply: boolean;
}) {
  const applyTone: DeliveryTone = applyRecorded
    ? "ok"
    : canApply
      ? "warn"
      : "danger";

  return {
    description: applyRecorded
      ? "Receipt evidence is recorded in History. Reopen that archive for immutable apply details."
      : canApply
        ? "Review the bounded OOS operations before the footer submits Refinement."
        : "Apply stays locked until metadata decisions and readiness gates are reviewable.",
    statusLabel: applyRecorded ? "receipt" : canApply ? "armed" : "locked",
    statusTone: applyTone,
    title: applyRecorded ? "Apply Complete" : "OOS Apply Plan",
    tone: applyTone,
  };
}

export function refinementApplyInputsProjection({
  applyRecorded,
  canApply,
}: {
  applyRecorded: boolean;
  canApply: boolean;
}) {
  const tone: DeliveryTone = applyRecorded
    ? "ok"
    : canApply
      ? "warn"
      : "danger";

  return {
    readinessDetail: canApply
      ? "Metadata review and readiness gates allow operator apply."
      : "Return to Metadata Workbench or Readiness Review before applying.",
    readinessStatus: canApply ? "ready" : "locked",
    readinessTone: canApply ? ("ok" as const) : ("danger" as const),
    statusLabel: applyRecorded ? "checked" : canApply ? "ready" : "blocked",
    statusTone: tone,
    title: applyRecorded
      ? "Inputs Checked"
      : canApply
        ? "Inputs Ready"
        : "Inputs Blocked",
    tone,
  };
}

export function refinementApplyLogPanelProjection({
  applyRecorded,
  canApply,
}: {
  applyRecorded: boolean;
  canApply: boolean;
}) {
  const tone: DeliveryTone = applyRecorded ? "ok" : canApply ? "warn" : "muted";

  return {
    description: applyRecorded
      ? "Receipt events are available in History."
      : canApply
        ? "Press Apply Refinement in the footer to record the local apply receipt."
        : "Runtime log is idle until apply inputs are ready.",
    statusLabel: applyRecorded ? "complete" : canApply ? "armed" : "idle",
    statusTone: tone,
    tone,
  };
}

export function refinementApplyLogFacts({
  deliveryPackageName,
  packet,
  routeSummary,
}: {
  deliveryPackageName: string;
  packet: DeliveryRefinementPacket;
  routeSummary: string;
}): TerasMetadataItem[] {
  return [
    { label: "Package", value: deliveryPackageName },
    { label: "Packet", value: packet.packet_id },
    {
      label: "Work Design Receipt",
      value: packet.handoff.source_work_design_receipt_id,
    },
    { label: "Routes", value: routeSummary },
  ];
}

export function refinementApplyRouteSummary(uniqueRoutes: string[]) {
  const routeText = uniqueRoutes.join(" ");
  const scopes = [
    routeText.includes("/governance") ? "governance" : null,
    routeText.includes("/plan/apply") ? "plan apply" : null,
    routeText.includes("/bulk-update") || routeText.includes("/work-items/")
      ? "item metadata update"
      : null,
  ].filter(Boolean);

  if (scopes.length > 0) {
    return scopes.join(", ");
  }

  return "reviewed Refinement apply routes";
}

export function formatRefinementApplyTimestamp(isoValue: string) {
  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
