import assert from "node:assert/strict";
import test from "node:test";

import {
  getRepositoryRuntimeProjectionSnapshot,
  getRepositoryRuntimeCapabilities,
  listRepositoryRuntimeReceipts,
  recordRepositoryAdmissionCommand,
  recordRepositoryProposalGateResolutionCommand,
  recordRepositoryRetirementRequestCommand,
  submitRepositoryRequestCommand,
  subscribeRepositoryRuntimeProjection,
} from "../../src/domain-workspaces/repository/local-runtime/repository-runtime.ts";

test("repository runtime declares submit capability", () => {
  assert.equal(getRepositoryRuntimeCapabilities().canSubmit, true);
});

const requestDraft = {
  name: "Runtime Contract Repository",
  ownerDomain: "governance-operations",
  purpose: "Prove repository command identity and durable local evidence.",
  repoClass: "product",
};

test("repository request retries reuse one record and receipt", async () => {
  const requestId = "repository-runtime-request-idempotency";
  const first = await submitRepositoryRequestCommand(requestDraft, {
    requestId,
    submittedAt: "2026-07-10T04:00:00.000Z",
  });
  const snapshotAfterFirst = getRepositoryRuntimeProjectionSnapshot();
  let duplicateEmissions = 0;
  const unsubscribe = subscribeRepositoryRuntimeProjection(() => {
    duplicateEmissions += 1;
  });
  const repeated = await submitRepositoryRequestCommand(requestDraft, {
    requestId,
    submittedAt: "2026-07-10T04:05:00.000Z",
  });
  unsubscribe();
  const receipts = await listRepositoryRuntimeReceipts(first.record.id);
  const projection = getRepositoryRuntimeProjectionSnapshot();

  assert.equal(first.record.id, repeated.record.id);
  assert.equal(first.receipt.receiptId, repeated.receipt.receiptId);
  assert.equal(projection, snapshotAfterFirst);
  assert.equal(duplicateEmissions, 0);
  assert.equal(first.receipt.commandName, "repository.submit-request");
  assert.equal(first.receipt.resultState, "recorded");
  assert.equal(first.receipt.schemaVersion, 1);
  assert.deepEqual(first.receipt.appliedDraft, requestDraft);
  assert.equal(receipts.length, 1);
  assert.deepEqual(
    projection.receiptsByRecord[first.record.id].map((receipt) => receipt.kind),
    ["request"],
  );
  assert.match(
    receipts[0].sourceVersions[0].version,
    /^local-projection-repository-operation-/,
  );
});

test("repository request identity separates distinct captures", async () => {
  const first = await submitRepositoryRequestCommand(requestDraft, {
    requestId: "repository-runtime-request-first",
    submittedAt: "2026-07-10T05:00:00.000Z",
  });
  const second = await submitRepositoryRequestCommand(requestDraft, {
    requestId: "repository-runtime-request-second",
    submittedAt: "2026-07-10T05:00:00.000Z",
  });

  assert.notEqual(first.record.id, second.record.id);
  assert.notEqual(first.receipt.receiptId, second.receipt.receiptId);
});

test("repository admission retries reuse one receipt", async () => {
  const request = await submitRepositoryRequestCommand(requestDraft, {
    requestId: "repository-runtime-admission-idempotency",
    submittedAt: "2026-07-10T06:00:00.000Z",
  });
  const first = await recordRepositoryAdmissionCommand(
    request.record,
    "2026-07-10T06:05:00.000Z",
  );
  const snapshotAfterFirst = getRepositoryRuntimeProjectionSnapshot();
  let duplicateEmissions = 0;
  const unsubscribe = subscribeRepositoryRuntimeProjection(() => {
    duplicateEmissions += 1;
  });
  const repeated = await recordRepositoryAdmissionCommand(
    request.record,
    "2026-07-10T06:10:00.000Z",
  );
  unsubscribe();
  const receipts = await listRepositoryRuntimeReceipts(request.record.id);
  const projection = getRepositoryRuntimeProjectionSnapshot();
  const admissionReceipts = receipts.filter(
    (receipt) => receipt.receipt.kind === "admission",
  );

  assert.equal(first.receiptId, repeated.receiptId);
  assert.equal(projection, snapshotAfterFirst);
  assert.equal(duplicateEmissions, 0);
  assert.equal(first.commandName, "repository.record-admission");
  assert.equal(first.resultState, "recorded");
  assert.equal(first.reviewedRecord.id, request.record.id);
  assert.deepEqual(
    first.runEvents.map((event) => event.sequence),
    [1, 2, 3, 4],
  );
  assert.equal(admissionReceipts.length, 1);
  assert.deepEqual(
    projection.receiptsByRecord[request.record.id].map(
      (receipt) => receipt.kind,
    ),
    ["request", "admission"],
  );
  assert.match(
    admissionReceipts[0].sourceVersions[0].version,
    /^local-projection-repository-operation-/,
  );
});

test("repository retirement retries preserve one projection snapshot", async () => {
  const request = await submitRepositoryRequestCommand(requestDraft, {
    requestId: "repository-runtime-retirement-idempotency",
    submittedAt: "2026-07-10T06:20:00.000Z",
  });
  const first = await recordRepositoryRetirementRequestCommand(
    request.record,
    "2026-07-10T06:25:00.000Z",
  );
  const snapshotAfterFirst = getRepositoryRuntimeProjectionSnapshot();
  let duplicateEmissions = 0;
  const unsubscribe = subscribeRepositoryRuntimeProjection(() => {
    duplicateEmissions += 1;
  });
  const repeated = await recordRepositoryRetirementRequestCommand(
    request.record,
    "2026-07-10T06:30:00.000Z",
  );
  unsubscribe();

  assert.equal(repeated.receiptId, first.receiptId);
  assert.equal(getRepositoryRuntimeProjectionSnapshot(), snapshotAfterFirst);
  assert.equal(duplicateEmissions, 0);
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
