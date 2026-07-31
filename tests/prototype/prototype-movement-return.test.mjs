import assert from "node:assert/strict";
import test from "node:test";

import { prototypeWorkspaceReadModel } from "../../src/domain-workspaces/prototype/read-model/prototype-workspace-read-model.ts";
import {
  prototypeMovementReturnInstruction,
  prototypeRecordAfterMovementRequest,
} from "../../src/domain-workspaces/prototype/work-model/workflows/movement-request/prototype-movement-request-model.ts";
import {
  movementIntentChecklistRows,
  movementRequestDraftFromRecord,
} from "../../src/domain-workspaces/prototype/presentation/workflows/movement-request/prototype-movement-request-view-model.ts";

test("returned Prototype movement exposes an actionable correction path", () => {
  const record = prototypeWorkspaceReadModel.records.find(
    (candidate) => candidate.id === "prototype-returned-movement-fixture",
  );

  assert.ok(record);
  const instruction = prototypeMovementReturnInstruction(record);
  const sourceDraft = movementRequestDraftFromRecord(record);

  assert.deepEqual(instruction, {
    authority: "Movement Control",
    owner: "Movement reviewer",
    receiptRef: "movement-receipts/prototype-returned-movement-001.json",
    recordedAt: "2026-06-27 12:30",
    requiredFix:
      "Explain which durable-delivery need justifies movement and what governed outcome is expected.",
  });
  assert.equal(
    sourceDraft.requestReason,
    "Move this baseline-approved prototype into governed delivery.",
  );
  assert.deepEqual(
    movementIntentChecklistRows(sourceDraft, record).map((row) => row.label),
    ["Intent", "Reason"],
  );
  assert.equal(
    prototypeRecordAfterMovementRequest(
      record,
      "local-receipts/unchanged-returned-request.json",
      sourceDraft,
    ),
    record,
  );

  const correctedReason =
    "Move this accepted baseline into governed delivery because multiple operators depend on it and durable backend wiring and governed release controls are now required.";
  const correctedRecord = prototypeRecordAfterMovementRequest(
    record,
    "local-receipts/prototype-returned-movement-correction.json",
    {
      ...sourceDraft,
      requestReason: correctedReason,
    },
  );

  assert.equal(correctedRecord.movementRequest.state, "request-recorded");
  assert.equal(correctedRecord.movementRequest.requestReason, correctedReason);
  assert.equal(correctedRecord.currentMove.id, "history");
});
