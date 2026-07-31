import assert from "node:assert/strict";
import test from "node:test";

import { proposalWorkflowDraftsFromReceipts } from "../../src/domain-workspaces/proposal/local-runtime/proposal-workflow-receipt-projection.ts";
import { proposalHistoryStepProjection } from "../../src/domain-workspaces/proposal/presentation/workflows/steps/history/proposal-history-step-view-model.ts";
import { prototypeProjectedReceipts } from "../../src/domain-workspaces/prototype/local-runtime/prototype-receipt-projection.ts";
import {
  prototypeHistoryReceiptFacts,
  prototypeHistoryTimelineRows,
} from "../../src/domain-workspaces/prototype/presentation/dialogs/history/prototype-history-view-model.ts";
import { prototypePreviewCommandLogRows } from "../../src/domain-workspaces/prototype/presentation/dashboards/preview-runtime/prototype-preview-command-log-model.ts";

test("proposal applied drafts and history are reconstructed from immutable receipts", () => {
  const receipt = proposalTriageReceipt();
  const drafts = proposalWorkflowDraftsFromReceipts({
    decisionDrafts: {},
    handoffDrafts: {},
    receiptsByProposal: { "PR-HISTORY": [receipt] },
    routeSelectionDrafts: {},
    triageDrafts: {
      "PR-HISTORY": {
        advisorDraft: "",
        advisorPrompt: "",
        proposalId: "PR-HISTORY",
        savedAt: "2026-07-10T00:00:00.000Z",
        summary: "Mutable draft text must not win.",
      },
    },
  });
  const history = proposalHistoryStepProjection({
    proposal: {
      bodyPreview: "Source proposal context.",
      ingress: "api",
      recordedAt: "2026-07-09T00:00:00.000Z",
    },
    workflowReceipts: [receipt],
  });

  assert.equal(
    drafts.triageDrafts["PR-HISTORY"].summary,
    "Receipt-backed triage summary.",
  );
  assert.equal(
    drafts.triageDrafts["PR-HISTORY"].appliedReceiptId,
    receipt.receiptId,
  );
  assert.equal(history.timelineRows[1].timestamp, receipt.recordedAt);
  assert.match(history.receiptRows[0].detail, /proposal-triage-receipt/);
  assert.equal(history.timelineRows.some((row) => row.timestamp === "Pending"), false);
  assert.equal(history.receiptRows.some((row) => row.value === "Pending"), false);
});

test("proposal history does not manufacture events or receipts for future gates", () => {
  const history = proposalHistoryStepProjection({
    proposal: {
      bodyPreview: "Source proposal context.",
      ingress: "api",
      recordedAt: "2026-07-09T00:00:00.000Z",
    },
    workflowReceipts: [],
  });

  assert.equal(history.timelineRows.length, 1);
  assert.equal(history.timelineRows[0].label, "Proposal captured");
  assert.deepEqual(history.receiptRows, []);
  assert.equal(history.receiptStatusLabel, "empty");
});

test("proposal receipt restoration and history use receipt chronology instead of storage order", () => {
  const olderReceipt = proposalTriageReceipt();
  const newerReceipt = {
    ...proposalTriageReceipt(),
    payload: {
      ...proposalTriageReceipt().payload,
      summary: "Newest receipt-backed summary.",
    },
    receiptId: "proposal-triage-receipt-new",
    recordedAt: "2026-07-10T02:00:00.000Z",
  };
  const receipts = [newerReceipt, olderReceipt];
  const drafts = proposalWorkflowDraftsFromReceipts({
    decisionDrafts: {},
    handoffDrafts: {},
    receiptsByProposal: { "PR-HISTORY": receipts },
    routeSelectionDrafts: {},
    triageDrafts: {},
  });
  const history = proposalHistoryStepProjection({
    proposal: {
      bodyPreview: "Source proposal context.",
      ingress: "api",
      recordedAt: "2026-07-09T00:00:00.000Z",
    },
    workflowReceipts: receipts,
  });

  assert.equal(
    drafts.triageDrafts["PR-HISTORY"].summary,
    "Newest receipt-backed summary.",
  );
  assert.deepEqual(
    history.receiptRows.map((row) => row.id),
    [olderReceipt.receiptId, newerReceipt.receiptId],
  );
});

test("prototype receipt projection removes duplicate local and imported evidence", () => {
  const localReceipt = {
    actionLabel: "Refresh Preview Proof",
    appliedInput: {},
    appliedRecord: { id: "PT-HISTORY" },
    authority: "prototype-local",
    commandId: "refresh-preview-proof",
    commandName: "prototype.refresh-preview-proof",
    receiptId: "shared-receipt",
    recordedAt: "2026-07-10T03:00:00.000Z",
    recordId: "PT-HISTORY",
    resultState: "recorded",
    routeOwner: "prototype-operation",
    schemaVersion: 1,
    sourceVersion: "v2",
    summary: "Local receipt is authoritative.",
    tone: "ok",
  };
  const record = {
    id: "PT-HISTORY",
    projectionVersion: "v2",
    receipts: [
      {
        authority: "source-projected",
        commandId: localReceipt.commandId,
        commandName: localReceipt.commandName,
        id: localReceipt.receiptId,
        label: localReceipt.actionLabel,
        recordedAt: localReceipt.recordedAt,
        resultState: localReceipt.resultState,
        schemaVersion: 1,
        summary: "Duplicated imported copy.",
        tone: localReceipt.tone,
      },
      {
        authority: "source-projected",
        commandId: localReceipt.commandId,
        commandName: localReceipt.commandName,
        id: "registry-only-receipt",
        label: localReceipt.actionLabel,
        recordedAt: localReceipt.recordedAt,
        resultState: localReceipt.resultState,
        schemaVersion: 1,
        summary: "Registry-only evidence.",
        tone: localReceipt.tone,
      },
    ],
  };
  const receipts = prototypeProjectedReceipts(record, [localReceipt]);

  assert.equal(receipts.length, 2);
  assert.equal(receipts[0].sourceLabel, "prototype-local");
  assert.equal(receipts[0].summary, "Local receipt is authoritative.");
  assert.equal(receipts[1].sourceLabel, "source record");
});

test("prototype history and preview logs do not manufacture events", () => {
  assert.deepEqual(prototypeHistoryTimelineRows({}, []), []);
  assert.deepEqual(prototypePreviewCommandLogRows([]), []);
});

test("prototype receipt history is chronological and recent facts are newest first", () => {
  const record = {
    id: "PT-ORDER",
    receipts: [
      prototypeSourceReceipt("receipt-new", "2026-07-10T03:00:00.000Z"),
      prototypeSourceReceipt("receipt-old", "2026-07-10T01:00:00.000Z"),
      prototypeSourceReceipt("receipt-middle", "2026-07-10T02:00:00.000Z"),
    ],
  };
  const receipts = prototypeProjectedReceipts(record, []);
  const timeline = prototypeHistoryTimelineRows(record, receipts);
  const facts = prototypeHistoryReceiptFacts(receipts);

  assert.deepEqual(
    receipts.map((receipt) => receipt.id),
    ["receipt-old", "receipt-middle", "receipt-new"],
  );
  assert.deepEqual(
    timeline.map((row) => row.timestamp),
    [
      "2026-07-10T01:00:00.000Z",
      "2026-07-10T02:00:00.000Z",
      "2026-07-10T03:00:00.000Z",
    ],
  );
  assert.equal(facts[0].label, "receipt-new");
});

function proposalTriageReceipt() {
  return {
    commandName: "proposal.triage.apply",
    kind: "workflow",
    payload: {
      advisorDraft: "",
      advisorPrompt: "",
      step: "triage",
      summary: "Receipt-backed triage summary.",
    },
    proposalId: "PR-HISTORY",
    receiptId: "proposal-triage-receipt",
    recordedAt: "2026-07-10T01:00:00.000Z",
    resultState: "recorded",
    schemaVersion: 1,
    sourceBackendRecordId: "proposal://history",
    sourceProjectionState: "current",
    sourceRecordVersion: "v1",
    step: "triage",
    summary: "Triage recorded.",
  };
}

function prototypeSourceReceipt(id, recordedAt) {
  return {
    authority: "source-projected",
    commandId: "test-receipt",
    commandName: "prototype.test-receipt",
    id,
    label: id,
    recordedAt,
    resultState: "recorded",
    schemaVersion: 1,
    summary: `${id} summary`,
    tone: "ok",
  };
}
