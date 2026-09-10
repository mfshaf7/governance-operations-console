import type { PrototypeRecord } from "../read-model/prototype-workspace-read-model.ts";
import { prototypeRecordAfterBaselinePromotion } from "../work-model/workflows/baseline-promotion/prototype-baseline-promotion-model.ts";
import { prototypeRecordAfterCandidatePromotion } from "../work-model/workflows/candidate-promotion/prototype-candidate-promotion-model.ts";
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

  const projected =
    projection.input.transition === "candidate-promotion"
      ? prototypeRecordAfterCandidatePromotion(
          record,
          result.receipt.receipt_id,
          projection.input.input,
        )
      : prototypeRecordAfterBaselinePromotion(
          record,
          result.receipt.receipt_id,
          projection.input.input,
        );
  if (projected === record) return record;

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
