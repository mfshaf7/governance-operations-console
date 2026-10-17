import assert from "node:assert/strict";
import test from "node:test";
import {
  prototypeLandingLiveRunPending,
  prototypeLandingRunControlState,
} from "../../src/domain-workspaces/prototype/presentation/workflows/landing/prototype-landing-status-model.ts";

const state = (patch = {}) => prototypeLandingRunControlState({
  atResult: true, canStartNewRun: false, draftDirty: false,
  liveStatus: "review-required", sourceRunComplete: true,
  submitting: false, terminalRecord: false, ...patch,
});

test("merged source never completes or disables its pending immutable owner run", () => {
  for (const liveStatus of ["accepted", "evaluating", "preparing", "review-required", "cancelling"]) {
    for (const sourceRunComplete of [false, true]) {
      assert.equal(prototypeLandingLiveRunPending(liveStatus), true);
      assert.deepEqual(state({ liveStatus, sourceRunComplete }), { complete: false, available: true });
    }
  }
});

test("only succeeded completes a live run; other terminal owner states do not advance", () => {
  for (const liveStatus of ["succeeded", "cancelled", "rejected", "requires-action"]) {
    for (const sourceRunComplete of [false, true]) {
      assert.equal(prototypeLandingLiveRunPending(liveStatus), false);
      assert.deepEqual(state({ liveStatus, sourceRunComplete, canStartNewRun: true }),
        { complete: liveStatus === "succeeded", available: false });
    }
  }
});

test("pending owner continuation keeps terminal record, dirty draft, step and in-flight guards", () => {
  for (const patch of [{ terminalRecord: true }, { draftDirty: true }, { atResult: false }, { submitting: true }]) {
    assert.deepEqual(state(patch), { complete: false, available: false });
  }
});

test("disconnected new-run and recorded local-result guards retain their existing meaning", () => {
  assert.equal(prototypeLandingLiveRunPending(null), false);
  assert.deepEqual(state({ liveStatus: null }), { complete: true, available: false });
  assert.deepEqual(state({ liveStatus: null, sourceRunComplete: false, canStartNewRun: true }),
    { complete: false, available: true });
  assert.deepEqual(state({ liveStatus: null, sourceRunComplete: false }),
    { complete: false, available: false });
  assert.deepEqual(state({ liveStatus: null, draftDirty: true, canStartNewRun: true }),
    { complete: true, available: true });
});
