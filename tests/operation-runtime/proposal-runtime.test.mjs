import assert from "node:assert/strict";
import test from "node:test";

import {
  getProposalRuntimeCapabilities,
  getProposalRuntimeProjectionSnapshot,
  listProposalRuntimeReceipts,
  submitProposalCaptureCommand,
  submitProposalWorkflowApplyCommand,
} from "../../src/domain-workspaces/proposal/local-runtime/proposal-runtime.ts";

test("proposal runtime declares submit capability", () => {
  assert.equal(getProposalRuntimeCapabilities().canSubmit, true);
});

test("proposal workflow commands are idempotent across submission times", async () => {
  const input = {
    payload: {
      advisorDraft: "",
      advisorPrompt: "",
      step: "triage",
      summary: "Confirm the proposal boundary.",
    },
    proposalId: "proposal-runtime-idempotency",
    source: {
      backendRecordId: "proposal://runtime/idempotency",
      projectionState: "current",
      recordVersion: "v1",
    },
  };

  const first = await submitProposalWorkflowApplyCommand({
    ...input,
    submittedAt: "2026-07-10T01:00:00.000Z",
  });
  const repeated = await submitProposalWorkflowApplyCommand({
    ...input,
    submittedAt: "2026-07-10T01:05:00.000Z",
  });
  const receipts = await listProposalRuntimeReceipts(input.proposalId);

  assert.equal(first.run.runId, repeated.run.runId);
  assert.equal(first.receipt.receiptId, repeated.receipt.receiptId);
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].sourceVersions[0].version, "v1");
  assert.equal(
    getProposalRuntimeProjectionSnapshot().workflowReceipts[input.proposalId]
      .length,
    1,
  );
  assert.equal(
    getProposalRuntimeProjectionSnapshot().workflowReceipts[input.proposalId][0]
      .payload.summary,
    input.payload.summary,
  );
  assert.equal(first.receipt.receipt.resultState, "recorded");
  assert.equal(first.receipt.receipt.commandName, "proposal.triage.apply");
  assert.equal(first.receipt.receipt.schemaVersion, 1);
});

test("proposal command outcome stays recorded while business outcome stays in payload", async () => {
  const result = await submitProposalWorkflowApplyCommand({
    payload: {
      decision: {
        advisorDraft: "",
        advisorPrompt: "",
        notes: "Keep this proposal outside active routing.",
        outcome: "parked",
      },
      route: null,
      step: "disposition",
    },
    proposalId: "proposal-runtime-parked-outcome",
    source: {
      backendRecordId: "proposal://runtime/parked-outcome",
      projectionState: "current",
      recordVersion: "v1",
    },
    submittedAt: "2026-07-10T01:30:00.000Z",
  });

  assert.equal(result.receipt.receipt.resultState, "recorded");
  assert.equal(result.receipt.receipt.payload.decision.outcome, "parked");
});

test("proposal source version changes create a distinct command", async () => {
  const baseInput = {
    payload: {
      advisorDraft: "",
      advisorPrompt: "",
      step: "triage",
      summary: "Review the current proposal version.",
    },
    proposalId: "proposal-runtime-version",
    submittedAt: "2026-07-10T02:00:00.000Z",
  };
  const first = await submitProposalWorkflowApplyCommand({
    ...baseInput,
    source: {
      backendRecordId: "proposal://runtime/version",
      projectionState: "current",
      recordVersion: "v1",
    },
  });
  const newer = await submitProposalWorkflowApplyCommand({
    ...baseInput,
    source: {
      backendRecordId: "proposal://runtime/version",
      projectionState: "current",
      recordVersion: "v2",
    },
  });

  assert.notEqual(first.run.runId, newer.run.runId);
  assert.notEqual(first.receipt.receiptId, newer.receipt.receiptId);
});

test("proposal capture retries reuse one record and receipt", async () => {
  const input = {
    bodyPreview: "A repeated local capture should remain one request.",
    captureRequestId: "proposal-capture-test-idempotency",
    title: "Idempotent Capture",
  };
  const first = await submitProposalCaptureCommand({
    ...input,
    submittedAt: "2026-07-10T03:00:00.000Z",
  });
  const repeated = await submitProposalCaptureCommand({
    ...input,
    submittedAt: "2026-07-10T03:01:00.000Z",
  });
  const receipts = await listProposalRuntimeReceipts(first.record.id);

  assert.equal(first.record.id, repeated.record.id);
  assert.equal(first.run.runId, repeated.run.runId);
  assert.equal(first.receipt.receiptId, repeated.receipt.receiptId);
  assert.equal(receipts.length, 1);
  assert.match(
    receipts[0].sourceVersions[0].version,
    /^local-projection-proposal-operation-/,
  );
});
