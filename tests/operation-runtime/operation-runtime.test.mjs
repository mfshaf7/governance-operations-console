import assert from "node:assert/strict";
import test from "node:test";

import {
  OperationRuntimeCapabilityError,
  OperationRuntimeInvariantError,
  createLocalOperationRuntimeAdapter,
} from "../../src/domain-workspaces/operation-runtime/local-operation-runtime-adapter.ts";
import {
  createOperationCommandPreconditions,
  createOperationIdempotencyKey,
  createLocalOperationProjectionVersion,
  createPrototypeLocalOperationCommand,
  operationProjectionConflicts,
  operationRunCanReportSuccess,
} from "../../src/domain-workspaces/operation-runtime/operation-runtime-invariants.ts";
import {
  assertOperationPacketCustody,
  createLocalOperationCrossDomainPacket,
  createLocalOperationPacketCustody,
} from "../../src/domain-workspaces/operation-runtime/operation-packet-invariants.ts";

const runtimeSource = {
  authority: "prototype-local",
  mode: "local",
  sourceOwner: "test-domain",
};

test("idempotency ignores object key order and changes with source version", () => {
  const firstPreconditions = preconditions("v1");
  const first = createOperationIdempotencyKey({
    command: { alpha: 1, beta: 2 },
    commandName: "test.apply",
    preconditions: firstPreconditions,
    recordId: "record-1",
  });
  const reordered = createOperationIdempotencyKey({
    command: { beta: 2, alpha: 1 },
    commandName: "test.apply",
    preconditions: firstPreconditions,
    recordId: "record-1",
  });
  const newerSource = createOperationIdempotencyKey({
    command: { alpha: 1, beta: 2 },
    commandName: "test.apply",
    preconditions: preconditions("v2"),
    recordId: "record-1",
  });

  assert.equal(first, reordered);
  assert.notEqual(first, newerSource);
});

test("local projection versions are stable and change with source content", () => {
  const first = createLocalOperationProjectionVersion({
    projection: { state: "ready", values: ["one", "two"] },
    sourceOwner: "test-domain",
  });
  const reordered = createLocalOperationProjectionVersion({
    projection: { values: ["one", "two"], state: "ready" },
    sourceOwner: "test-domain",
  });
  const changed = createLocalOperationProjectionVersion({
    projection: { state: "ready", values: ["one", "three"] },
    sourceOwner: "test-domain",
  });

  assert.equal(first, reordered);
  assert.notEqual(first, changed);
  assert.match(first, /^local-projection-test-domain-/);
});

test("projection conflicts include changed primary and dependency versions", () => {
  const bundle = projectionBundle({ primaryVersion: "v2", repositoryVersion: "r2" });
  const conflicts = operationProjectionConflicts(bundle, {
    dependencies: [
      {
        recordId: "repo-1",
        sourceOwner: "repository",
        version: "r1",
      },
    ],
    primary: {
      recordId: "record-1",
      sourceOwner: "test-domain",
      version: "v1",
    },
  });

  assert.deepEqual(
    conflicts.map((conflict) => conflict.version),
    ["v1", "r1"],
  );
});

test("cross-domain packet custody must match packet identity and owner", () => {
  const packet = createLocalOperationCrossDomainPacket({
    causationId: "receipt-1",
    correlationId: "proposal-1",
    createdAt: "2026-07-10T12:00:00.000Z",
    custodyOwner: "prototype-landing",
    packetId: "packet-1",
    payload: { title: "Packet test" },
    producerReceiptRef: "prototype-local://receipt-1",
    sourceDomain: "proposal",
    sourceOwner: "workspace-proposals",
    sourceRecordId: "proposal-1",
    sourceVersion: "v1",
    targetDomain: "prototype",
  });
  const custody = createLocalOperationPacketCustody({
    custodyOwner: "prototype-landing",
    packetId: packet.packetId,
    receiptRef: "prototype-local://custody/packet-1",
    recordedAt: packet.createdAt,
    state: "admitted",
  });

  assert.doesNotThrow(() => assertOperationPacketCustody({ custody, packet }));
  assert.throws(() =>
    assertOperationPacketCustody({
      custody: { ...custody, packetId: "packet-2" },
      packet,
    }),
  );
});

test("local runtime deduplicates commands and records ordered events once", async () => {
  let runCount = 0;
  const runtime = createLocalOperationRuntimeAdapter({
    commandRunner(command) {
      runCount += 1;
      return {
        run: { applied: true },
        state: "completed",
        summary: `${command.commandName} completed locally.`,
      };
    },
    receiptFactory({ command }) {
      return {
        durability: "prototype-local",
        receipt: { accepted: true },
        receiptId: `receipt-${command.idempotencyKey}`,
      };
    },
    runtimeSource,
  });
  const command = localCommand();

  assert.equal(command.requiredCapability, "canSubmit");

  const firstRun = await runtime.submitCommand(command);
  const repeatedRun = await runtime.submitCommand(command);
  const receipts = await runtime.listReceipts("record-1");

  assert.equal(runCount, 1);
  assert.equal(firstRun.runId, repeatedRun.runId);
  assert.deepEqual(
    firstRun.events.map((event) => event.state),
    ["accepted", "completed"],
  );
  assert.equal(receipts.length, 1);
  assert.equal(operationRunCanReportSuccess(firstRun, receipts[0]), true);
});

test("local runtime assigns unique ordered sequences to progress events", async () => {
  const runtime = createLocalOperationRuntimeAdapter({
    commandRunner() {
      return {
        progress: [
          { state: "running", summary: "First check." },
          { state: "running", summary: "Second check." },
        ],
        run: { applied: true },
        state: "completed",
        summary: "Progress completed.",
      };
    },
    receiptFactory({ command }) {
      return {
        durability: "prototype-local",
        receipt: { accepted: true },
        receiptId: `receipt-${command.idempotencyKey}`,
      };
    },
    runtimeSource,
  });

  const run = await runtime.submitCommand(localCommand());

  assert.deepEqual(
    run.events.map((event) => event.sequence),
    [1, 2, 3, 4],
  );
  assert.equal(new Set(run.events.map((event) => event.eventId)).size, 4);
});

test("completed local commands require receipts", async () => {
  const runtime = createLocalOperationRuntimeAdapter({
    commandRunner() {
      return {
        run: { applied: true },
        state: "completed",
        summary: "Completed without evidence.",
      };
    },
    runtimeSource,
  });

  await assert.rejects(
    runtime.submitCommand(localCommand()),
    OperationRuntimeInvariantError,
  );
});

test("blocked outcomes remain non-success even when they have receipts", async () => {
  const runtime = createLocalOperationRuntimeAdapter({
    commandRunner() {
      return {
        run: { blocker: "Missing required input" },
        state: "blocked",
        summary: "Blocked by missing required input.",
      };
    },
    receiptFactory({ command }) {
      return {
        durability: "prototype-local",
        receipt: { blocked: true },
        receiptId: `blocked-${command.idempotencyKey}`,
      };
    },
    runtimeSource,
  });

  const run = await runtime.submitCommand(localCommand());
  const [receipt] = await runtime.listReceipts("record-1");

  assert.equal(run.state, "blocked");
  assert.equal(operationRunCanReportSuccess(run, receipt), false);
});

test("runtime exposes unavailable submit capability instead of fake completion", async () => {
  const runtime = createLocalOperationRuntimeAdapter({ runtimeSource });

  assert.equal(runtime.getCapabilities().canSubmit, false);
  await assert.rejects(
    runtime.submitCommand(localCommand()),
    OperationRuntimeCapabilityError,
  );
});

test("runtime preserves prototype-local actor and session attribution", async () => {
  const runtime = createLocalOperationRuntimeAdapter({
    commandRunner: () => ({
      run: { message: "recorded" },
      state: "completed",
      summary: "Command completed.",
    }),
    receiptFactory: ({ command, run }) => ({
      durability: "prototype-local",
      receipt: { commandName: command.commandName },
      receiptId: "receipt-attribution",
      recordedAt: run.updatedAt,
    }),
    runtimeSource,
  });
  const command = localCommand();

  const run = await runtime.submitCommand(command);
  const [receipt] = await runtime.listReceipts(command.recordId);

  assert.equal(run.actorId, command.actorId);
  assert.equal(run.sessionId, command.sessionId);
  assert.equal(receipt.actorId, command.actorId);
  assert.equal(receipt.sessionId, command.sessionId);
});

test("projection storage isolates records that share a version label", async () => {
  const first = projectionBundle({ recordId: "record-1" });
  const second = projectionBundle({ recordId: "record-2" });
  const runtime = createLocalOperationRuntimeAdapter({
    initialProjections: [first, second],
    runtimeSource,
  });

  assert.equal((await runtime.readProjection("record-1")).primary.recordId, "record-1");
  assert.equal((await runtime.readProjection("record-2")).primary.recordId, "record-2");
});

function localCommand() {
  return createPrototypeLocalOperationCommand({
    command: { value: "accepted" },
    commandName: "test.apply",
    preconditions: preconditions("v1"),
    recordId: "record-1",
    runtimeSource,
    submittedAt: "2026-07-10T00:00:00.000Z",
  });
}

function preconditions(version) {
  return createOperationCommandPreconditions({
    primary: {
      recordId: "record-1",
      sourceOwner: "test-domain",
      version,
    },
  });
}

function projectionBundle({
  primaryVersion = "v1",
  recordId = "record-1",
  repositoryVersion = "r1",
} = {}) {
  return {
    dependencies: [
      {
        authority: "fixture",
        freshness: "current",
        mode: "local",
        observedAt: "2026-07-10T00:00:00.000Z",
        projection: { admitted: true },
        projectionVersion: repositoryVersion,
        recordId: "repo-1",
        schemaVersion: "1",
        sourceOwner: "repository",
      },
    ],
    primary: {
      ...runtimeSource,
      freshness: "current",
      observedAt: "2026-07-10T00:00:00.000Z",
      projection: { status: "ready" },
      projectionVersion: primaryVersion,
      recordId,
      schemaVersion: "1",
    },
  };
}
