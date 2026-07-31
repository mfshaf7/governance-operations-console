import assert from "node:assert/strict";
import test from "node:test";

import {
  prototypePreviewCheckDisabledReason,
  prototypePreviewRuntimeCommandDisabledReason,
  prototypeRecordAfterPreviewCheckCommand,
  prototypeRecordAfterPreviewRuntimeCommand,
} from "../../src/domain-workspaces/prototype/work-model/preview-runtime/prototype-preview-state-model.ts";
import { prototypePreviewProofResult } from "../../src/domain-workspaces/prototype/presentation/dashboards/preview-runtime/prototype-preview-proof-model.ts";

test("starting preview changes runtime state without fabricating proof", () => {
  const record = previewRecord();
  const nextRecord = prototypeRecordAfterPreviewRuntimeCommand(
    record,
    "start-preview",
    "receipt-start",
  );

  assert.equal(nextRecord.preview.runtimeState, "running");
  assert.equal(nextRecord.preview.proofState, "not-started");
  assert.equal(nextRecord.preview.lastProofRef, null);
  assert.equal(nextRecord.preview.lastCheckedAt, null);
});

test("preview check stays blocked until the runtime is running", () => {
  const record = previewRecord();
  const nextRecord = prototypeRecordAfterPreviewCheckCommand(
    record,
    "receipt-check",
    "2026-07-10T10:00:00.000Z",
  );

  assert.match(prototypePreviewCheckDisabledReason(record), /Start/);
  assert.equal(nextRecord, record);
});

test("recording a check is the only transition that creates current proof", () => {
  const runningRecord = previewRecord({ runtimeState: "running" });
  const nextRecord = prototypeRecordAfterPreviewCheckCommand(
    runningRecord,
    "receipt-check",
    "2026-07-10T10:00:00.000Z",
  );

  assert.equal(prototypePreviewCheckDisabledReason(runningRecord), null);
  assert.equal(nextRecord.preview.proofState, "proof-ready");
  assert.equal(nextRecord.preview.lastProofRef, "receipt-check");
  assert.equal(nextRecord.preview.lastCheckedAt, "2026-07-10T10:00:00.000Z");
  assert.deepEqual(nextRecord.baseline.evidenceRefs, ["receipt-check"]);
  assert.equal(nextRecord.evidence[0].status, "proof ready");
});

test("restart invalidates current proof but keeps the runtime running", () => {
  const record = previewRecord({
    lastCheckedAt: "2026-07-10T09:00:00.000Z",
    lastProofRef: "receipt-old-check",
    proofState: "proof-ready",
    runtimeState: "running",
  });
  const nextRecord = prototypeRecordAfterPreviewRuntimeCommand(
    record,
    "restart-preview",
    "receipt-restart",
  );

  assert.equal(nextRecord.preview.runtimeState, "running");
  assert.equal(nextRecord.preview.proofState, "stale");
  assert.equal(nextRecord.preview.lastProofRef, null);
  assert.equal(nextRecord.preview.lastCheckedAt, null);
  assert.equal(nextRecord.evidence[0].status, "stale");
  assert.equal(nextRecord.evidence[0].tone, "warn");
});

test("stop is available only for a running preview", () => {
  const stoppedRecord = previewRecord();
  const runningRecord = previewRecord({ runtimeState: "running" });

  assert.match(
    prototypePreviewRuntimeCommandDisabledReason(
      stoppedRecord,
      "stop-preview",
    ),
    /No running/,
  );
  assert.equal(
    prototypePreviewRuntimeCommandDisabledReason(
      runningRecord,
      "stop-preview",
    ),
    null,
  );
});

test("preview proof projection does not invent missing log references", () => {
  const failedResult = prototypePreviewProofResult(
    previewRecord({ proofState: "proof-failed" }),
  );
  const readyResult = prototypePreviewProofResult(
    previewRecord({ proofState: "proof-ready" }),
  );

  assert.equal(failedResult.logRef, "No failed check log recorded.");
  assert.equal(readyResult.logRef, "No check log recorded.");
  assert.equal(failedResult.logRef.includes("local-logs/"), false);
  assert.equal(readyResult.logRef.includes("local-logs/"), false);
});

function previewRecord(previewOverrides = {}) {
  return {
    baseline: {
      evidenceRefs: [],
      missingItems: ["preview profile", "preview proof"],
    },
    evidence: previewOverrides.lastProofRef
      ? [
          {
            id: previewOverrides.lastProofRef,
            status: "proof ready",
            tone: "ok",
          },
        ]
      : [],
    id: "prototype-preview-test",
    preview: {
      address: "http://127.0.0.1:3317",
      command: "npm run dev",
      healthcheckPath: "/",
      lastCheckLogRef: null,
      lastCheckedAt: null,
      lastProofRef: null,
      launchAdapter: "node-npm",
      port: "3317",
      profileRef: "prototype-preview-test",
      profileSource: "prototype-local fixture",
      profileState: "profile-configured",
      proofState: "not-started",
      runtimeState: "stopped",
      workingDirectory: "apps/prototype-preview-test",
      ...previewOverrides,
    },
    projectionFreshness: "fixture",
  };
}
