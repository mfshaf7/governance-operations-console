import assert from "node:assert/strict";
import test from "node:test";

import {
  getRepositoryRuntimeProjectionSnapshot,
  getRepositoryRuntimeCapabilities,
  listRepositoryRuntimeReceipts,
  recordRepositoryAdmissionCommand,
  recordRepositoryProposalGateResolutionCommand,
  subscribeRepositoryRuntimeProjection,
} from "../../src/domain-workspaces/repository/local-runtime/repository-runtime.ts";

test("repository runtime declares submit capability", () => {
  assert.equal(getRepositoryRuntimeCapabilities().canSubmit, true);
});

test("repository admission retries reuse one receipt", async () => {
  const record = { id: "repository-runtime-admission-idempotency" };
  const first = await recordRepositoryAdmissionCommand(
    record,
    "2026-07-10T06:05:00.000Z",
  );
  const snapshotAfterFirst = getRepositoryRuntimeProjectionSnapshot();
  let duplicateEmissions = 0;
  const unsubscribe = subscribeRepositoryRuntimeProjection(() => {
    duplicateEmissions += 1;
  });
  const repeated = await recordRepositoryAdmissionCommand(
    record,
    "2026-07-10T06:10:00.000Z",
  );
  unsubscribe();
  const receipts = await listRepositoryRuntimeReceipts(record.id);
  const projection = getRepositoryRuntimeProjectionSnapshot();
  const admissionReceipts = receipts.filter(
    (receipt) => receipt.receipt.kind === "admission",
  );

  assert.equal(first.receiptId, repeated.receiptId);
  assert.equal(projection, snapshotAfterFirst);
  assert.equal(duplicateEmissions, 0);
  assert.equal(first.commandName, "repository.record-admission");
  assert.equal(first.resultState, "recorded");
  assert.equal(first.reviewedRecord.id, record.id);
  assert.deepEqual(
    first.runEvents.map((event) => event.sequence),
    [1, 2, 3, 4],
  );
  assert.equal(admissionReceipts.length, 1);
  assert.deepEqual(
    projection.receiptsByRecord[record.id].map(
      (receipt) => receipt.kind,
    ),
    ["admission"],
  );
  assert.match(
    admissionReceipts[0].sourceVersions[0].version,
    /^local-projection-repository-operation-/,
  );
});

test("repository gate resolution is an idempotent runtime receipt", async () => {
  const record = {
    id: "repo-proposal-runtime-gate",
    proposalGate: {
      proposalId: "PR-RUNTIME-GATE",
      repoRequestRef: "repo-request://runtime-gate",
      sourceVersion: "proposal-v1",
      status: "pending",
    },
  };
  const input = {
    notes: "Owner repository selected.",
    record,
    resolvedOwner: "OOS",
    resolvedRepoRef:
      "git@github.com:mfshaf7/operator-orchestration-service.git",
  };
  const first = await recordRepositoryProposalGateResolutionCommand({
    ...input,
    submittedAt: "2026-07-10T06:00:00.000Z",
  });
  const repeated = await recordRepositoryProposalGateResolutionCommand({
    ...input,
    submittedAt: "2026-07-10T06:05:00.000Z",
  });
  const receipts = await listRepositoryRuntimeReceipts(record.id);
  const projection = getRepositoryRuntimeProjectionSnapshot();
  const gateReceipts = receipts.filter(
    (receipt) => receipt.receipt.kind === "proposal-gate-resolution",
  );

  assert.equal(first.receiptId, repeated.receiptId);
  assert.equal(first.recordedAt, "2026-07-10T06:00:00.000Z");
  assert.equal(first.proposalId, record.proposalGate.proposalId);
  assert.equal(first.commandName, "repository.resolve-proposal-gate");
  assert.equal(first.resultState, "recorded");
  assert.equal(first.schemaVersion, 1);
  assert.equal(first.sourceVersion, record.proposalGate.sourceVersion);
  assert.match(
    first.sourceRecordVersion,
    /^local-projection-repository-operation-/,
  );
  assert.equal(gateReceipts.length, 1);
  assert.deepEqual(
    projection.receiptsByRecord[record.id].map((receipt) => receipt.kind),
    ["proposal-gate-resolution"],
  );
});

test("repository gate resolution rejects an arbitrary owner and repo ref", async () => {
  const record = {
    id: "repo-proposal-invalid-gate",
    proposalGate: {
      proposalId: "PR-INVALID-GATE",
      repoRequestRef: "repo-request://invalid-gate",
      sourceVersion: "proposal-v1",
      status: "pending",
    },
  };

  await assert.rejects(
    () =>
      recordRepositoryProposalGateResolutionCommand({
        notes: "Unregistered repository should not resolve custody.",
        record,
        resolvedOwner: "unregistered-owner",
        resolvedRepoRef: "repo://unregistered",
      }),
    /must select an admitted owner repository/,
  );
});
