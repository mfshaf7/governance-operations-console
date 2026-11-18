import test from "node:test";
import assert from "node:assert/strict";
import {
  refinementApplyRuntimeLines, refinementApplyProgressRows,
  refinementApplyHeaderProjection, refinementApplyInputsProjection, refinementApplyLogPanelProjection,
} from "../../src/domain-workspaces/delivery/presentation/workflows/refinement/view-model/refinement-apply-model.ts";

const started = "2026-11-01T01:00:00Z", acknowledged = "2026-11-01T01:00:02Z", finished = "2026-11-01T01:00:08Z";
const events = [
  { message: "Original run acknowledged", recorded_at: acknowledged, status: "running", event_type: "accepted" },
  { message: "Original readback completed", recorded_at: finished, status: "completed", event_type: "readback_completed" },
];
const packet = { receipt: null, last_saved_at: "2026-10-30T00:00:00Z", packet_id: "packet:synthetic" };
const input = { activeReceipt: null, canApply: false, packet, routeSummary: "metadata", runtimeError: null, runtimeRun: null, uniqueRoutes: [], applyStartedAt: started };

test("Refinement pending acknowledgement reports submission rather than a newly locked input gate", () => {
  const args = { applyInFlight: true, applyRecorded: false, canApply: false, runtimeError: null, runtimeRun: null };
  assert.equal(refinementApplyHeaderProjection(args).statusLabel, "processing");
  assert.equal(refinementApplyInputsProjection(args).readinessStatus, "reviewed");
  assert.equal(refinementApplyLogPanelProjection(args).statusLabel, "submitting");
  assert.deepEqual(refinementApplyProgressRows(args).map(row => row.status), ["submitting", "waiting", "waiting"]);
  assert.deepEqual(refinementApplyRuntimeLines(input).map(line => [line.timestamp, line.marker]), [[started, "[send]"]]);
});

test("Refinement receipt preserves immutable event times instead of stamping summaries as new run events", () => {
  const activeReceipt = { receipt_id: "receipt:synthetic", applied_at: finished, tone: "ok", canonical_evidence: { events }, lines: ["Summary without an event time"] };
  const lines = refinementApplyRuntimeLines({ ...input, activeReceipt, runtimeRun: { events: [{ ...events[0], message: "Unrelated retained run" }] } });
  assert.deepEqual(lines.filter(line => line.text.startsWith("Original")).map(line => line.timestamp), [acknowledged, finished]);
  assert.equal(lines.some(line => line.text === "Summary without an event time"), false);
  assert.equal(lines.some(line => line.text === "Unrelated retained run"), false);
  const historical = refinementApplyRuntimeLines({ ...input, applyStartedAt: null, activeReceipt: { ...activeReceipt, canonical_evidence: undefined } });
  assert.equal(historical.length, 1);
  assert.match(historical[0].text, /Historical step times are unavailable/);
});

test("Refinement lost response retains observed events and a stable error time without claiming completion", () => {
  const runtimeRun = { state: "running", updated_at: acknowledged, events: [events[0]] };
  const args = { ...input, runtimeRun, runtimeError: "Synthetic lost reply", runtimeErrorAt: finished };
  const first = refinementApplyRuntimeLines(args), second = refinementApplyRuntimeLines(args);
  assert.deepEqual(first, second);
  assert.equal(first.at(-1).timestamp, finished);
  assert.equal(first.some(line => line.text === events[0].message), true);
  const progress = { ...args, applyRecorded: false, applyInFlight: false };
  assert.equal(refinementApplyProgressRows(progress).at(-1).status, "unconfirmed");
  assert.equal(refinementApplyLogPanelProjection(progress).statusLabel, "unconfirmed");
});

test("Partial Refinement failure is distinct from a confirmed receipt", () => {
  const args = { applyInFlight: false, applyRecorded: false, runtimeError: "Readback rejected", runtimeRun: { state: "failed", events: [events[0]] } };
  assert.deepEqual(refinementApplyProgressRows(args).map(row => row.status), ["acknowledged", "failed", "unconfirmed"]);
  assert.equal(refinementApplyLogPanelProjection(args).statusLabel, "failed");
});
