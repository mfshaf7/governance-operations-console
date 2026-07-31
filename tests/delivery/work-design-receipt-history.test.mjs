import assert from "node:assert/strict";
import test from "node:test";

import {
  workDesignHistoryReceiptRows,
  workDesignHistoryTimelineRows,
} from "../../src/domain-workspaces/delivery/presentation/workflows/work-design/view-model/work-design-history-model.ts";
import {
  refinementHistoryReceiptRows,
  refinementHistoryTimelineRows,
} from "../../src/domain-workspaces/delivery/presentation/workflows/refinement/view-model/refinement-history-model.ts";
import {
  createLocalDeliveryBlockerDispositionReceipt,
  createLocalRefinementApplyReceipt,
} from "../../src/domain-workspaces/delivery/local-runtime/commands/workflow-receipts.ts";

const historyInput = {
  applyTargetRecordRef: "delivery://work-design/record",
  contextDecision: "proceed",
  draftRef: "pkg-work-design/draft-v1",
  recordedAt: "2026-07-10T07:00:00.000Z",
  snapshotAction: "Attach On Apply",
  snapshotStatus: "pending_apply",
  sourceApplyComplete: false,
};

test("work design history does not accept a receipt flag without receipt identity", () => {
  const receiptRows = workDesignHistoryReceiptRows({
    ...historyInput,
    applyReceiptId: null,
    applyReceiptRecorded: true,
  });
  const timelineRows = workDesignHistoryTimelineRows({
    applyRecordedAt: null,
    applyReceiptId: null,
    applyReceiptRecorded: true,
    contextBriefAccepted: true,
    contextDecision: "proceed",
    contextRecordedAt: historyInput.recordedAt,
    metrics: { features: 1, risks: 0, stories: 1 },
  });

  assert.equal(receiptRows[0].value, "No receipt recorded");
  assert.equal(timelineRows.length, 1);
  assert.equal(
    timelineRows.some((row) =>
      ["locked", "pending", "waiting"].includes(row.status),
    ),
    false,
  );
});

test("work design history exposes the immutable local receipt identity", () => {
  const receiptId = "WDS-APPLY-756-local";
  const receiptRows = workDesignHistoryReceiptRows({
    ...historyInput,
    applyReceiptId: receiptId,
    applyReceiptRecorded: true,
  });
  const timelineRows = workDesignHistoryTimelineRows({
    applyRecordedAt: historyInput.recordedAt,
    applyReceiptId: receiptId,
    applyReceiptRecorded: true,
    contextBriefAccepted: true,
    contextDecision: "proceed",
    contextRecordedAt: "2026-07-10T06:00:00.000Z",
    metrics: { features: 1, risks: 0, stories: 1 },
  });

  assert.equal(receiptRows[0].value, receiptId);
  assert.match(
    timelineRows.find((row) => row.label === "Apply Receipt Recorded").detail,
    new RegExp(receiptId),
  );
});

test("delivery local receipt factories preserve identity across retries", () => {
  const receiptInput = refinementReceiptInput();
  const firstRefinement = createLocalRefinementApplyReceipt({
    ...receiptInput,
    appliedAt: "2026-07-10T08:00:00.000Z",
    packetId: "refinement-packet-retry",
    sourceWorkDesignReceiptId: "work-design-receipt",
  });
  const repeatedRefinement = createLocalRefinementApplyReceipt({
    ...receiptInput,
    appliedAt: "2026-07-10T08:05:00.000Z",
    packetId: "refinement-packet-retry",
    sourceWorkDesignReceiptId: "work-design-receipt",
  });
  const blockerInput = {
    action: {
      clearsBlocker: false,
      disposition: "defer",
      evidenceLines: ["Blocker retained."],
      id: "keep-blocked",
      outcome: "still-blocked",
      recoveryAction: "Keep blocker recorded.",
    },
    activeBlockerIssue: {
      id: "blocker-retry",
      kind: "partial_apply_inconsistent",
    },
    deliveryPackage: {
      delivery_package_id: "pkg-blocker-retry",
      source_ref: "delivery://blocker-retry",
    },
    fallbackJustification: "Blocker remains open.",
    justification: "",
  };
  const firstBlocker = createLocalDeliveryBlockerDispositionReceipt({
    ...blockerInput,
    recordedAt: "2026-07-10T08:10:00.000Z",
  });
  const repeatedBlocker = createLocalDeliveryBlockerDispositionReceipt({
    ...blockerInput,
    recordedAt: "2026-07-10T08:15:00.000Z",
  });

  assert.equal(firstRefinement, repeatedRefinement);
  assert.equal(firstRefinement.applied_at, "2026-07-10T08:00:00.000Z");
  assert.equal(firstRefinement.result_state, "recorded");
  assert.equal(
    firstRefinement.applied_payload.metadata_values["story-1:definition_of_ready"],
    "Acceptance criteria reviewed.",
  );
  assert.equal(firstBlocker, repeatedBlocker);
  assert.equal(firstBlocker.recordedAt, "2026-07-10T08:10:00.000Z");
  assert.match(
    firstBlocker.receiptId,
    /^local-projection-delivery-work-design-blocker-/,
  );
});

test("refinement history contains packet and receipt events without pending or receipt-line events", () => {
  const receipt = createLocalRefinementApplyReceipt({
    ...refinementReceiptInput(),
    appliedAt: "2026-07-10T09:00:00.000Z",
    packetId: "refinement-history-packet",
    sourceWorkDesignReceiptId: "work-design-history-receipt",
  });
  const packet = refinementHistoryPacket(receipt);
  const beforeApply = refinementHistoryTimelineRows({
    packet: refinementHistoryPacket(null),
    recordedReceipt: null,
  });
  const afterApply = refinementHistoryTimelineRows({
    packet,
    recordedReceipt: receipt,
  });
  const beforeReceiptRows = refinementHistoryReceiptRows({
    packet: refinementHistoryPacket(null),
    recordedReceipt: null,
  });

  assert.deepEqual(beforeApply.map((row) => row.label), [
    "Refinement Packet Projected",
  ]);
  assert.deepEqual(afterApply.map((row) => row.label), [
    "Refinement Packet Projected",
    "Receipt Recorded",
  ]);
  assert.equal(afterApply.some((row) => row.label === "Receipt Line"), false);
  assert.equal(beforeReceiptRows.some((row) => row.value === "Pending"), false);
});

function refinementReceiptInput() {
  return {
    applyPlan: {
      expected_routes: ["POST /v1/delivery-work-items/bulk-update"],
      operations: [
        {
          detail: "Apply reviewed readiness metadata.",
          kind: "bulk_update",
          label: "Apply Metadata",
          operation_id: "operation-1",
          oos_route: "POST /v1/delivery-work-items/bulk-update",
          status: "planned",
          target: "story-1",
        },
      ],
      summary: "Apply one reviewed metadata update.",
    },
    metadataDraftValues: {
      "story-1:definition_of_ready": "Acceptance criteria reviewed.",
    },
    metadataFieldResolutions: {
      "story-1:definition_of_ready": "accepted",
    },
  };
}

function refinementHistoryPacket(receipt) {
  const { applyPlan } = refinementReceiptInput();
  return {
    apply_plan: applyPlan,
    handoff: {
      source_work_design_receipt_id: "work-design-history-receipt",
    },
    last_saved_at: "2026-07-10T08:30:00.000Z",
    packet_id: "refinement-history-packet",
    receipt,
    status: receipt ? "applied" : "ready_for_review",
  };
}
