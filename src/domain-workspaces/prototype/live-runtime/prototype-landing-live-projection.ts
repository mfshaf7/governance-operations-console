import type { PrototypeRecord } from "../read-model/prototype-workspace-read-model.ts";
import { prototypeRecordAfterLanding } from "../work-model/workflows/landing/prototype-landing-model.ts";
import { assertPrototypeLandingResult } from "./prototype-landing-live-contract.ts";
import type { PrototypeLandingLiveProjection } from "./prototype-landing-live-types.ts";

export function projectPrototypeLanding({
  projection,
  record,
}: {
  projection: PrototypeLandingLiveProjection | undefined;
  record: PrototypeRecord;
}): PrototypeRecord {
  if (!projection) return record;
  if (projection.recordId !== record.id) {
    throw new Error("Prototype Landing projection does not match its record.");
  }

  const result = assertPrototypeLandingResult(projection.result);
  if (result.status !== "succeeded" || !result.receipt || !result.readback) {
    return record;
  }

  const landed = prototypeRecordAfterLanding(
    record,
    projection.draft,
    result.receipt.receipt_id,
  );
  const receiptExists = landed.receipts.some(
    (receipt) => receipt.id === result.receipt?.receipt_id,
  );

  return {
    ...landed,
    name: result.readback.record.name,
    projectionFreshness: "current Prototype Studio merged authority",
    projectionVersion: result.receipt.receipt_digest,
    receipts: receiptExists
      ? landed.receipts
      : [
          ...landed.receipts,
          {
            authority: "source-projected",
            commandId: "land-prototype-request",
            commandName: "prototype.landing.apply",
            id: result.receipt.receipt_id,
            label: "Prototype Landing",
            recordedAt: result.receipt.completed_at,
            resultState: "recorded",
            schemaVersion: 1,
            summary:
              "Prototype Studio merged the reviewed Landing source and recorded Candidate Promotion as the next action.",
            tone: "ok",
          },
        ],
    sourcePath: result.readback.record.source.ref,
    sourceRef: result.readback.record.source.ref,
    summary: result.readback.record.objective,
  };
}
