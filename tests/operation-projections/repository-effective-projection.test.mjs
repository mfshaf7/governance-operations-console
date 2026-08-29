import assert from "node:assert/strict";
import test from "node:test";

import { projectRepositoryEffectiveRecords } from "../../src/domain-workspaces/repository/local-runtime/repository-effective-projection.ts";
import { repositoryRecordSourceVersion } from "../../src/domain-workspaces/repository/local-runtime/repository-runtime-model.ts";

test("Repository admission review evidence does not claim canonical admission", () => {
  const source = repositoryRecord("repo-1", "ready");
  const records = projectRepositoryEffectiveRecords({
    proposalRequestRecords: [],
    runtimeProjection: {
      receiptsByRecord: {
        "repo-1": [{
          kind: "admission",
          receiptId: "admission-1",
          recordedAt: "2026-07-11",
          recordId: "repo-1",
          sourceRecordVersion: repositoryRecordSourceVersion(source),
        }],
      },
    },
    sourceRecords: [source],
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].name, "Source record");
  assert.equal(records[0].admissionState, "ready");
  assert.match(records[0].lastValidation, /local admission review receipt/);
  assert.equal(records[0].admissionPosture[0].items[0].state, "pending");
});

test("Repository ignores stale local review evidence", () => {
  const source = repositoryRecord("repo-stale", "ready");
  const records = projectRepositoryEffectiveRecords({
    proposalRequestRecords: [],
    runtimeProjection: {
      receiptsByRecord: {
        "repo-stale": [{
          kind: "admission",
          receiptId: "admission-stale",
          recordedAt: "2026-07-10",
          recordId: "repo-stale",
          sourceRecordVersion: "local-projection-repository-operation-stale",
        }],
      },
    },
    sourceRecords: [source],
  });

  assert.equal(records[0].lastValidation, "not run");
});

test("Repository replays chained admission and retirement evidence in source order", () => {
  const source = repositoryRecord("repo-chain", "admitted");
  const admissionReceipt = {
    kind: "admission",
    receiptId: "admission-chain",
    recordedAt: "2026-07-11T01:00:00Z",
    recordId: source.id,
    sourceRecordVersion: repositoryRecordSourceVersion(source),
  };
  const [afterAdmission] = projectRepositoryEffectiveRecords({
    proposalRequestRecords: [],
    runtimeProjection: {
      receiptsByRecord: {
        [source.id]: [admissionReceipt],
      },
    },
    sourceRecords: [source],
  });
  const retirementReceipt = {
    kind: "retirement-request",
    receiptId: "retirement-chain",
    recordedAt: "2026-07-11T02:00:00Z",
    recordId: source.id,
    sourceRecordVersion: repositoryRecordSourceVersion(afterAdmission),
  };
  const [effective] = projectRepositoryEffectiveRecords({
    proposalRequestRecords: [],
    runtimeProjection: {
      receiptsByRecord: {
        [source.id]: [retirementReceipt, admissionReceipt],
      },
    },
    sourceRecords: [source],
  });

  assert.match(effective.lastValidation, /local retirement request/);
  assert.match(effective.nextAction, /Retirement request is recorded locally/);
  assert.equal(effective.admissionState, "admitted");
});

function repositoryRecord(id, admissionState) {
  return {
    admissionPosture: [
      {
        items: [{ state: "pending", tone: "warn", value: "pending" }],
        tone: "warn",
      },
    ],
    admissionState,
    id,
    lastValidation: "not run",
    name: "Source record",
    nextAction: "Review admission",
    tone: "warn",
  };
}
