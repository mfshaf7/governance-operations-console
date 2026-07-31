import assert from "node:assert/strict";
import test from "node:test";

import {
  projectPrototypeEffectiveReadModel,
  projectPrototypeEffectiveRecord,
} from "../../src/domain-workspaces/prototype/local-runtime/prototype-effective-projection.ts";
import { prototypeRecordSourceVersion } from "../../src/domain-workspaces/prototype/local-runtime/prototype-runtime-model.ts";

test("Prototype merges local requests, Proposal entries, and registry records with stable precedence", () => {
  const projection = projectPrototypeEffectiveReadModel({
    proposalEntryRecords: [
      { id: "prototype-2", name: "Proposal entry", receipts: [] },
    ],
    runtimeProjection: {
      localRequestRecords: [
        { id: "prototype-1", name: "Local request", receipts: [] },
      ],
      receiptsByRecord: { "prototype-1": [] },
    },
    sourceReadModel: {
      records: [
        { id: "prototype-1", name: "Registry one", receipts: [] },
        { id: "prototype-2", name: "Registry two", receipts: [] },
        { id: "prototype-3", name: "Registry three", receipts: [] },
      ],
    },
  });

  assert.deepEqual(
    projection.readModel.records.map((record) => record.name),
    ["Local request", "Proposal entry", "Registry three"],
  );
  assert.equal(projection.receiptsByRecord["prototype-1"].length, 0);
});

test("Prototype applies ordered receipts only when each source version matches", () => {
  const sourceRecord = { id: "prototype-chain", name: "Source" };
  const candidateRecord = { id: "prototype-chain", name: "Candidate" };
  const baselineRecord = { id: "prototype-chain", name: "Baseline" };
  const receipts = [
    {
      appliedRecord: candidateRecord,
      commandId: "record-candidate-promotion",
      receiptId: "prototype-candidate-receipt",
      recordedAt: "2026-07-11T01:00:00.000Z",
      recordId: sourceRecord.id,
      sourceVersion: prototypeRecordSourceVersion(sourceRecord),
    },
    {
      appliedRecord: baselineRecord,
      commandId: "record-baseline-promotion",
      receiptId: "prototype-baseline-receipt",
      recordedAt: "2026-07-11T01:01:00.000Z",
      recordId: sourceRecord.id,
      sourceVersion: prototypeRecordSourceVersion(candidateRecord),
    },
  ];

  assert.equal(
    projectPrototypeEffectiveRecord({
      receipts: [...receipts].reverse(),
      record: sourceRecord,
    }).name,
    "Baseline",
  );

  assert.equal(
    projectPrototypeEffectiveRecord({
      receipts: [
        {
          ...receipts[0],
          sourceVersion: "stale-source-version",
        },
      ],
      record: sourceRecord,
    }).name,
    "Source",
  );

  assert.equal(
    projectPrototypeEffectiveRecord({
      receipts: [
        {
          ...receipts[0],
          appliedRecord: {
            ...candidateRecord,
            id: "another-prototype",
          },
        },
      ],
      record: sourceRecord,
    }).name,
    "Source",
  );
});
