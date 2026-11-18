import type { TerasMetadataItem } from "@/teras";
import type {
  DeliveryRefinementApplyOperation,
  DeliveryRefinementApplyReceipt,
  DeliveryRefinementPacket,
  DeliveryTone,
} from "../../../../read-model/index.ts";
import type { RefinementOosRun } from "../../../../live-runtime/refinement-live-types.ts";

export type RefinementApplyRuntimeLine = {
  marker: string;
  text: string;
  timestamp: string;
  tone: DeliveryTone;
};

export function refinementApplyRuntimeLines({
  applyStartedAt = null,
  runtimeErrorAt = null,
  activeReceipt,
  canApply,
  packet,
  routeSummary,
  runtimeError,
  runtimeRun,
  uniqueRoutes,
}: {
  applyStartedAt?: string | null;
  runtimeErrorAt?: string | null;
  activeReceipt: DeliveryRefinementApplyReceipt | null;
  canApply: boolean;
  packet: DeliveryRefinementPacket;
  routeSummary: string;
  runtimeError: string | null;
  runtimeRun: RefinementOosRun | null;
  uniqueRoutes: string[];
}): RefinementApplyRuntimeLine[] {
  const recordedReceipt = activeReceipt ?? packet.receipt;
  // Retained receipts already contain the original owner event timestamps.
  // Receipt summaries are not a substitute for those events.
  const retainedEvents = recordedReceipt?.canonical_evidence?.events;
  const events = recordedReceipt
    ? retainedEvents?.length ? retainedEvents
      : recordedReceipt.canonical_evidence?.run_id === runtimeRun?.run_id
        ? runtimeRun?.events ?? [] : []
    : runtimeRun?.events ?? [];
  const lines: RefinementApplyRuntimeLine[] = applyStartedAt ? [{
    marker: "[send]", text: "Apply requested; waiting for backend acknowledgement.",
    timestamp: applyStartedAt, tone: "info",
  }] : [];
  lines.push(...events.map<RefinementApplyRuntimeLine>((event) => ({
      marker:
        event.status === "completed"
          ? "[ok]"
          : event.status === "failed"
            ? "[fail]"
            : "[run]",
      text: event.message,
      timestamp: event.recorded_at,
      tone:
        event.status === "completed"
          ? "ok"
          : event.status === "failed"
            ? "danger"
            : "info",
    })));

  if (recordedReceipt) {
    lines.push({
      marker: "[receipt]",
      text: events.length
        ? `Receipt ${recordedReceipt.receipt_id} recorded. Original event times are retained above.`
        : `Receipt ${recordedReceipt.receipt_id} recorded. Historical step times are unavailable.`,
      timestamp: recordedReceipt.applied_at,
      tone: recordedReceipt.tone,
    });
  }

  if (runtimeError) {
    lines.push({
        marker: "[fail]",
        text: runtimeError,
        timestamp: runtimeErrorAt ?? runtimeRun?.updated_at ?? packet.last_saved_at,
        tone: "danger",
      });
  }

  if (lines.length) return lines;

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
        ? "Footer Apply Refinement will submit the reviewed draft and move to History after receipt readback."
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
  applyInFlight = false,
  applyRecorded,
  canApply,
}: {
  applyInFlight?: boolean;
  applyRecorded: boolean;
  canApply: boolean;
}) {
  if (applyInFlight) return {
    description: "The reviewed request is being applied. Progress below reports only observed backend state.",
    statusLabel: "processing", statusTone: "info" as const,
    title: "Applying Refinement…", tone: "info" as const,
  };
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
  applyInFlight = false,
  applyRecorded,
  canApply,
}: {
  applyInFlight?: boolean;
  applyRecorded: boolean;
  canApply: boolean;
}) {
  if (applyInFlight) return {
    readinessDetail: "The reviewed metadata was submitted. Waiting for the original run and receipt.",
    readinessStatus: "reviewed", readinessTone: "info" as const,
    statusLabel: "submitted", statusTone: "info" as const,
    title: "Reviewed Inputs", tone: "info" as const,
  };
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
  applyInFlight = false,
  applyRecorded,
  canApply,
  runtimeError,
  runtimeRun,
}: {
  applyInFlight?: boolean;
  applyRecorded: boolean;
  canApply: boolean;
  runtimeError: string | null;
  runtimeRun: RefinementOosRun | null;
}) {
  const tone: DeliveryTone = runtimeError
    ? "danger"
    : applyRecorded
      ? "ok"
      : applyInFlight || runtimeRun
        ? "info"
        : canApply
          ? "warn"
          : "muted";

  return {
    description: runtimeError
      ? "The Apply result could not be confirmed here. Retained run events remain visible; inspect the original run before assuming no changes occurred."
      : applyRecorded
      ? "Receipt events are available in History."
      : applyInFlight && !runtimeRun
        ? "Request submitted. Waiting for the backend to acknowledge the original run."
      : runtimeRun
        ? "Durable OOS run events are updating from canonical runtime truth."
      : canApply
        ? "Press Apply Refinement in the footer to submit the reviewed draft."
        : "Runtime log is idle until apply inputs are ready.",
    statusLabel: runtimeError
      ? runtimeRun?.state === "failed" || runtimeRun?.state === "cancelled" ? runtimeRun.state : "unconfirmed"
      : applyRecorded
        ? "complete"
        : applyInFlight && !runtimeRun ? "submitting"
        : runtimeRun
          ? runtimeRun.state
          : canApply
            ? "armed"
            : "idle",
    statusTone: tone,
    tone,
  };
}

export function refinementApplyProgressRows({
  applyInFlight, applyRecorded, runtimeError, runtimeRun,
}: {
  applyInFlight: boolean;
  applyRecorded: boolean;
  runtimeError: string | null;
  runtimeRun: RefinementOosRun | null;
}) {
  const acknowledged = Boolean(runtimeRun) || applyRecorded;
  const readback = applyRecorded || Boolean(runtimeRun?.events.some(event =>
    event.event_type === "readback_completed" && event.status === "completed"));
  const failed = runtimeRun?.state === "failed" || runtimeRun?.state === "cancelled";
  const operationsFinished = readback || runtimeRun?.state === "completed";
  return [
    { label: "Submit reviewed request", status: acknowledged ? "acknowledged" : applyInFlight ? "submitting" : "unconfirmed",
      detail: acknowledged ? "The backend run is recorded." : "Waiting for backend acknowledgement; no operation completion is inferred.",
      tone: acknowledged ? "ok" as const : applyInFlight ? "info" as const : "warn" as const },
    { label: "Apply metadata operations", status: operationsFinished ? "confirmed" : failed ? runtimeRun!.state : runtimeRun?.state === "accepted" ? "queued" : runtimeRun ? "processing" : "waiting",
      detail: runtimeRun?.events.at(-1)?.message ?? "Planned operations are not yet confirmed as started.",
      tone: operationsFinished ? "ok" as const : failed ? "danger" as const : "info" as const },
    { label: "Confirm receipt and readback", status: applyRecorded ? "recorded" : readback ? "readback confirmed" : runtimeError ? "unconfirmed" : "waiting",
      detail: applyRecorded ? "The canonical receipt is recorded." : readback ? "Backend readback completed; waiting for receipt projection." : "Completion requires the canonical receipt and readback.",
      tone: applyRecorded ? "ok" as const : runtimeError ? "warn" as const : "info" as const },
  ];
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
