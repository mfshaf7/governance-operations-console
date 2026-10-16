import type { PrototypeRecord } from "../read-model/prototype-workspace-read-model.ts";
import { assertPrototypeMaturityResult } from "./prototype-maturity-live-contract.ts";
import type { PrototypeMaturityLiveProjection } from "./prototype-maturity-live-types.ts";

export function projectPrototypeMaturity({
  projection,
  record,
}: {
  projection: PrototypeMaturityLiveProjection | undefined;
  record: PrototypeRecord;
}): PrototypeRecord {
  if (!projection) return record;
  if (projection.recordId !== record.id) {
    throw new Error("Prototype Maturity projection does not match its record.");
  }
  const result = assertPrototypeMaturityResult(projection.result);
  if (!result.receipt || !result.readback) return record;
  if (result.receipt.decision !== projection.input.input.decision) {
    throw new Error("Prototype Maturity receipt does not match the reviewed decision.");
  }

  if (result.receipt.resulting_lifecycle !== result.readback.observed_lifecycle) {
    throw new Error("Prototype Maturity receipt and owner readback disagree on lifecycle.");
  }

  // Fixture helpers create local evidence as part of simulated transitions.
  // Live projection must use the owner's receipt alone and preserve separately
  // observed preview/evidence instead of importing those simulated effects.
  let projected = record;
  // Local draft eligibility is not authority to reject an already verified
  // owner transition during a cold reconstruction. Preserve unobserved preview
  // state while projecting the exact canonical promotion and its receipt.
  if (result.status === "succeeded" && result.receipt.outcome === "succeeded") {
    if (projection.input.transition === "candidate-promotion") {
      const input = projection.input.input;
      projected = { ...projected, lifecycle: result.readback.observed_lifecycle,
        candidate: { ...projected.candidate, ...input, state: "candidate", lastReceiptRef: result.receipt.receipt_id },
        currentMove: record.landing.previewNeed === "none" || record.preview.proofState === "proof-ready"
          ? { id: "baseline-promotion", actionLabel: "Open Baseline Promotion", label: "Review baseline evidence", detail: "Candidate promotion is recorded by the owner; inspect current baseline readiness.", tone: "info" }
          : { id: "preview-proof", actionLabel: "Open Preview Runtime", label: "Inspect preview evidence", detail: "Candidate promotion is recorded by the owner; preview proof remains independently owned.", tone: "info" },
      };
    } else {
      const input = projection.input.input;
      projected = { ...projected, lifecycle: result.readback.observed_lifecycle,
        baseline: { ...projected.baseline, ...input, state: "ready-for-movement", lastPacketReceiptRef: result.receipt.receipt_id, missingItems: [],
          acceptedSummary: String(result.request.inputs.editable_values["accepted-summary"] ?? ""), excludedSummary: String(result.request.inputs.editable_values["excluded-summary"] ?? "") },
        currentMove: { id: "movement-request", actionLabel: "Open Movement Request", label: "Prepare owner-backed Delivery handoff", detail: "The owner accepted this baseline. Delivery and custody retain their own gates.", tone: "info" },
      };
    }
  }

  const sourceReceipt = {
    authority: "source-projected" as const,
    commandId:
      projection.input.transition === "candidate-promotion"
        ? "record-candidate-promotion"
        : "record-baseline-promotion",
    commandName: `prototype.${projection.input.transition}`,
    id: result.receipt.receipt_id,
    label:
      projection.input.transition === "candidate-promotion"
        ? "Candidate Promotion"
        : "Baseline Promotion",
    recordedAt: result.receipt.completed_at,
    resultState: result.status === "blocked" ? ("blocked" as const) : ("recorded" as const),
    schemaVersion: 1 as const,
    summary: receiptSummary(result),
    tone:
      result.status === "succeeded"
        ? ("ok" as const)
        : result.status === "blocked"
          ? ("danger" as const)
          : ("warn" as const),
  };

  return {
    ...projected,
    projectionFreshness: "current Prototype Studio maturity authority",
    projectionVersion: result.receipt.receipt_digest,
    receipts: projected.receipts.some(
      (receipt) => receipt.id === sourceReceipt.id,
    )
      ? projected.receipts
      : [...projected.receipts, sourceReceipt],
  };
}

function receiptSummary(
  result: ReturnType<typeof assertPrototypeMaturityResult>,
) {
  if (result.status === "succeeded") {
    return result.transition === "candidate-promotion"
      ? "Prototype Studio merged the reviewed Candidate Promotion."
      : "Prototype Studio merged the reviewed Baseline Promotion.";
  }
  if (result.status === "blocked") {
    return "Prototype Maturity recorded the reviewed blocker without changing source lifecycle.";
  }
  return "Prototype Maturity routed the reviewed closeout intent without changing source lifecycle.";
}
