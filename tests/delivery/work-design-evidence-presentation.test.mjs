import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { workDesignCurrentMove } from "../../src/domain-workspaces/delivery/presentation/workflows/work-design/view-model/work-design-current-move.ts";
import { workDesignStepStatusLabel } from "../../src/domain-workspaces/delivery/presentation/workflows/work-design/view-model/work-design-step-model.ts";
import { workDesignApplyDraftViewModel } from "../../src/domain-workspaces/delivery/presentation/workflows/work-design/view-model/work-design-session-view-model.ts";
import { workDesignApplyReadinessRows } from "../../src/domain-workspaces/delivery/presentation/workflows/work-design/view-model/work-design-apply-model.ts";

const receiptRef = "openproject://work_packages/908/activities/42";
const recordedAt = "2026-10-23T00:36:10.987Z";
const state = {
  activeStep: "apply",
  applyReady: false,
  applyReceiptRecorded: true,
  contextBriefAccepted: true,
  contextDecision: "proceed",
  contextDecisionCopy: {},
  draftTreePresent: true,
  draftReviewAccepted: true,
  draftValidationAccepted: true,
  reviewReady: true,
  sourceWorkDesignClosed: true,
  workDesignBlocked: false,
};
function view(overrides = {}) {
  return workDesignApplyDraftViewModel({
    ...state,
    applyReceiptId: receiptRef,
    applyRunStartedAt: recordedAt,
    applyViewOpenedAt: "2026-10-23T00:40:00.000Z",
    contextSnapshotAttachment: {
      attachmentStatus: "local_preview",
      targetRecordRef: "openproject://work_packages/908",
    },
    contextSnapshotAttachmentStatusLabel: "Local Preview",
    deliveryPackage: {
      delivery_package_id: "delivery-package:908",
      source_ref: "openproject://work_packages/908",
    },
    metrics: { features: 99, stories: 99, risks: 99 },
    runtimeMode: "live",
    runtimeError: null,
    sourceApplyComplete: true,
    sourceRecordRef: "openproject://work_packages/908",
    ...overrides,
  });
}
function row(rows, label) {
  return rows.find((item) => item.label === label);
}

test("live receipt current move and both progress views use durable evidence copy", () => {
  const move = workDesignCurrentMove({ ...state, runtimeMode: "live" });
  assert.match(move.description, /durable OOS/);
  assert.doesNotMatch(move.description, /mock|preview/);
  assert.equal(workDesignStepStatusLabel("apply", { ...state, runtimeMode: "live" }), "durable OOS receipt captured");
});

test("live completion and cold recovered projection retain exact receipt and application time", () => {
  for (const sourceApplyComplete of [false, true]) {
    const result = view({ sourceApplyComplete });
    assert.equal(result.runtimeMode, "live");
    assert.equal(row(result.historyReceiptRows, "Receipt ID").value, receiptRef);
    assert.equal(result.applyLogRecordedAt, recordedAt);
    assert.equal(row(result.historyReceiptRows, "Projection").value, "Canonical readback complete");
    assert.match(result.applyLogDescription, /not a streamed backend event log/);
    assert.doesNotMatch(result.applyLogDescription, /mock|preview|will replace/);
    assert.match(result.historyTimelineRows.at(-1).detail, /Durable OOS receipt/);
    assert.doesNotMatch(result.historyTimelineRows.at(-1).detail, /99|Feature branches/);
    assert.match(result.applyExecutionLogLines.map((item) => item.text).join("\n"), /OOS accepted apply intent/);
  }
});

test("all live apply surfaces distinguish local snapshot files from canonical mutation", () => {
  for (const sourceApplyComplete of [false, true]) {
    const result = view({ sourceApplyComplete });
    const history = row(result.historyReceiptRows, "Snapshot Evidence");
    const checklist = row(result.applyBackendChecklistRows, "Attach Snapshot Evidence");
    assert.equal(history.value, "Browser-local evidence");
    assert.equal(history.tone, "info");
    assert.match(history.detail, /does not prove a backend snapshot upload/);
    assert.equal(checklist.status, "local only");
    assert.equal(checklist.tone, "info");
    assert.match(checklist.detail, /browser-local/);
    assert.match(result.applyExecutionLogLines.map((item) => item.text).join("\n"), /does not prove a backend upload/);
    const readiness = workDesignApplyReadinessRows({
      applyTargetRecordRef: "openproject://work_packages/908",
      hasUnsavedSessionChanges: false,
      draftReviewAccepted: true,
      runtimeMode: "live",
      snapshotAction: "Attach On Apply",
      snapshotStatus: "local_preview",
      sourceApplyComplete,
    });
    assert.match(row(readiness, "Snapshot Action").detail, /browser-local/);
  }
});

test("disconnected preview retains local receipt, projection and attachment semantics", () => {
  const result = view({ runtimeMode: "disconnected-preview", sourceApplyComplete: false });
  assert.match(workDesignCurrentMove({ ...state }).description, /disconnected-preview.*locally/);
  assert.equal(workDesignStepStatusLabel("apply", state), "preview receipt captured");
  assert.match(result.applyLogDescription, /disconnected-preview.*not canonical/);
  assert.match(row(result.historyReceiptRows, "Receipt ID").detail, /Disconnected-preview/);
  assert.equal(row(result.historyReceiptRows, "Snapshot Evidence").value, "Attached In Preview");
  assert.match(row(result.historyReceiptRows, "Projection").detail, /not canonical backend state/);
  assert.match(result.applyExecutionLogLines[0].text, /Preview runtime/);
});

test("configured live mode without a receipt cannot claim canonical application", () => {
  for (const runtimeError of [null, "OOS projection unavailable"]) {
    const result = view({
      applyReceiptId: null, applyReceiptRecorded: false,
      applyRunStartedAt: null, sourceApplyComplete: false, runtimeError,
    });
    assert.equal(row(result.historyReceiptRows, "Receipt ID").value, "No receipt recorded");
    assert.equal(row(result.historyReceiptRows, "Projection").value, "No completion evidence");
    assert.equal(result.historyTimelineRows.some((item) => item.label === "Apply Receipt Recorded"), false);
    assert.doesNotMatch(result.applyExecutionLogLines.map((item) => item.text).join("\n"), /OOS accepted apply intent|reconciled/);
  }
  const flagOnly = view({ applyReceiptId: null, sourceApplyComplete: false });
  assert.equal(row(flagOnly.historyReceiptRows, "Receipt ID").value, "No receipt recorded");
});

test("source-only completion does not invent a receipt or backend snapshot upload", () => {
  const result = view({ applyReceiptId: null, applyReceiptRecorded: false });
  assert.equal(row(result.historyReceiptRows, "Receipt State").value, "Source Done");
  assert.equal(row(result.historyReceiptRows, "Snapshot Evidence").value, "Browser-local evidence");
  assert.equal(row(result.historyReceiptRows, "Receipt ID"), undefined);
});

test("validated receipt remains successful when follow-up projection refresh is unavailable", () => {
  const result = view({ sourceApplyComplete: false, runtimeError: "Refresh unavailable" });
  assert.equal(row(result.historyReceiptRows, "Receipt ID").value, receiptRef);
  assert.match(result.applyExecutionLogLines[0].text, /OOS accepted/);
  assert.equal(row(result.applyBackendChecklistRows, "Submit Apply Request").status, "complete");
});

test("real UI compositions pass runtime mode and log description without hardcoded mock claims", () => {
  const root = new URL("../../src/domain-workspaces/delivery/presentation/workflows/work-design/", import.meta.url);
  const read = (path) => readFileSync(new URL(path, root), "utf8");
  assert.match(read("session-controller/use-work-design-session-controller.ts"), /workDesignCurrentMove\(\{\s*runtimeMode: liveRuntime.mode/);
  assert.equal((read("session/work-design-session-step-router.tsx").match(/runtimeMode=\{applyWorkflow.runtimeMode\}/g) ?? []).length, 3);
  for (const path of ["shell/work-design-progress-panel.tsx", "hub/work-design-hub-view.tsx"]) {
    assert.match(read(path), /workDesignStepStatusLabel\(item.id, \{\s*runtimeMode/);
  }
  assert.match(read("session/work-design-session-dialogs.tsx"), /description: applyWorkflow.applyLogDescription/);
  const dialog = read("steps/apply-draft/work-design-apply-log-dialog.tsx");
  assert.match(dialog, /description=\{description\}/);
  assert.doesNotMatch(dialog, /replace these mock rows/);
  for (const path of ["embedded-products/context-board/work-design-context-board-rail.tsx", "embedded-products/build-tree/work-design-build-tree-view.tsx"]) {
    assert.match(read(path), /Tool-enabled authority is separate from suggestion-only advice/);
    assert.match(read(path), /statusLabel="tool-profile pending"/);
  }
});
