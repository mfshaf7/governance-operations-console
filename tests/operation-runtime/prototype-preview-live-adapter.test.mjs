import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalDigest,
  assertPrototypePreviewProjection,
} from "../../src/domain-workspaces/prototype/live-runtime/prototype-preview-live-contract.ts";
import {
  projectPrototypePreviewOwnerRecord,
  projectPrototypePreviewOwnerReceipt,
} from "../../src/domain-workspaces/prototype/live-runtime/prototype-preview-live-projection.ts";
import {
  commandPrototypePreviewOwner,
  provePrototypePreviewOwner,
  PrototypePreviewOwnerError,
  readPrototypePreviewOwner,
} from "../../src/domain-workspaces/prototype/server/prototype-preview-owner-client.ts";
import {
  consolePrototypePreviewModeSelected,
  resolveConsolePrototypePreviewConfiguration,
} from "../../src/console-integration/configuration/console-runtime-configuration.ts";

const revision = "5fb10dad78be88c65c3fe2a5deaaf0384bed844d";
const profileDigest = `sha256:${"a".repeat(64)}`;
const sourceDigest = `sha256:${"b".repeat(64)}`;
const receiptRef = {
  digest: `sha256:${"c".repeat(64)}`,
  ref: "preview-runtime://receipts/prototype-preview-receipt:1234567890abcdef12345678",
};
const config = {
  ownerRepoRoot: "/srv/workspace-prototype-studio",
  sourceRevision: revision,
  stateRoot: "/run/user/1000/workspace-prototype-studio/preview-runtime",
};

test("Preview owner configuration is all-or-nothing and keeps state outside source", () => {
  assert.equal(consolePrototypePreviewModeSelected({}), false);
  assert.equal(
    consolePrototypePreviewModeSelected({
      GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_OWNER_REPO_ROOT: config.ownerRepoRoot,
    }),
    true,
  );
  assert.deepEqual(
    resolveConsolePrototypePreviewConfiguration({
      GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_OWNER_REPO_ROOT: config.ownerRepoRoot,
      GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_SOURCE_REVISION: revision,
      GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_STATE_ROOT: config.stateRoot,
    }),
    config,
  );
  assert.throws(() =>
    resolveConsolePrototypePreviewConfiguration({
      GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_OWNER_REPO_ROOT: config.ownerRepoRoot,
      GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_SOURCE_REVISION: revision,
      GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_STATE_ROOT: `${config.ownerRepoRoot}/.state`,
    }),
  );
});

test("Preview projection accepts exact loopback owner truth and denies overclaim", () => {
  assert.equal(
    assertPrototypePreviewProjection(stoppedProjection(), {
      prototypeSlug: "client-review-portal",
      sourceRevision: revision,
    }).runtime_state,
    "stopped",
  );
  assert.throws(() =>
    assertPrototypePreviewProjection(
      {
        ...runningProjection(),
        boundary: { ...runningProjection().boundary, public_ingress: true },
      },
      { prototypeSlug: "client-review-portal", sourceRevision: revision },
    ),
  );
  assert.throws(() =>
    assertPrototypePreviewProjection(
      { ...runningProjection(), source_revision: "0".repeat(40) },
      { prototypeSlug: "client-review-portal", sourceRevision: revision },
    ),
  );
});

test("Console invokes only the fixed Studio command and binds receipt to readback", async () => {
  const receipt = ownerReceipt();
  const calls = [];
  const runner = queuedRunner(
    [
      stoppedProjection(),
      { receipt, schema_version: 1, status: "applied" },
      runningProjection(receipt),
    ],
    calls,
  );
  const result = await commandPrototypePreviewOwner(
    "client-review-portal",
    {
      action: "start",
      expected: {
        instance_id: null,
        profile_digest: profileDigest,
        runtime_state: "stopped",
        source_revision: revision,
      },
      request_id: "console-preview:test:start:001",
    },
    { config, runner },
  );
  assert.equal(result.command.receipt.receipt_digest, receipt.receipt_digest);
  assert.equal(result.projection.runtime_state, "running");
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.executable === "python3"));
  assert.ok(calls.every((call) => call.options.cwd === config.ownerRepoRoot));
  assert.equal(JSON.stringify(calls).includes("OOS_CALLER_SECRET"), false);
  assert.ok(calls[1].args.includes("start"));
  assert.ok(calls[1].args.includes("console-preview:test:start:001"));
});

test("stale Console intent fails before Studio mutation", async () => {
  const calls = [];
  await assert.rejects(
    commandPrototypePreviewOwner(
      "client-review-portal",
      {
        action: "start",
        expected: {
          instance_id: "stale-instance",
          profile_digest: profileDigest,
          runtime_state: "running",
          source_revision: revision,
        },
        request_id: "console-preview:test:stale:001",
      },
      { config, runner: queuedRunner([stoppedProjection()], calls) },
    ),
    (error) =>
      error instanceof PrototypePreviewOwnerError &&
      error.code === "prototype_preview_expected_state_stale",
  );
  assert.equal(calls.length, 1);
});

test("proof binds current owner projection, receipt, and Security gate", async () => {
  const receipt = ownerReceipt();
  const projection = runningProjection(receipt);
  const proof = {
    health_digest: `sha256:${"d".repeat(64)}`,
    negative_checks: Object.fromEntries(
      ["bind", "ingress", "network", "mutation", "data", "maturity", "source", "receipt"].map(
        (key) => [key, true],
      ),
    ),
    positive_checks: ["profile", "source", "instance", "receipt"],
    profile_id: "client-review-portal",
    projection_digest: canonicalDigest(projection),
    prototype_id: "prototype:client-review-portal",
    receipt: projection.latest_receipt,
    schema_version: 1,
    security_decision: "evaluated-by-oos-before-operating-ready",
    security_gate: "gate:preview-runtime-operating-acceptance",
    status: "proven",
  };
  const result = await provePrototypePreviewOwner("client-review-portal", {
    config,
    runner: queuedRunner([projection, proof], []),
  });
  assert.equal(result.proof.projection_digest, canonicalDigest(projection));
});

test("owner failure is bounded and disconnected mode never invokes a command", async () => {
  await assert.rejects(
    readPrototypePreviewOwner("client-review-portal", { env: {} }),
    (error) =>
      error instanceof PrototypePreviewOwnerError &&
      error.code === "prototype_preview_live_mode_required",
  );
  await assert.rejects(
    readPrototypePreviewOwner("client-review-portal", {
      config,
      runner: async () => {
        const error = new Error("private owner diagnostic");
        error.stdout = JSON.stringify({
          code: "stale_runtime_state",
          message: "bounded owner message",
          status: "rejected",
        });
        throw error;
      },
    }),
    (error) =>
      error instanceof PrototypePreviewOwnerError &&
      error.code === "stale_runtime_state" &&
      !error.message.includes("private owner diagnostic"),
  );
});

test("Console projection makes Studio authority and receipts visible", () => {
  const receipt = ownerReceipt();
  const command = { receipt, schema_version: 1, status: "applied" };
  const record = recordFixture();
  const projected = projectPrototypePreviewOwnerRecord(
    record,
    runningProjection(receipt),
    null,
    "live",
  );
  const projectedReceipt = projectPrototypePreviewOwnerReceipt(record.id, command);
  assert.equal(projected.preview.runtimeState, "running");
  assert.match(projected.preview.profileSource, /Workspace Prototype Studio/);
  assert.equal(projected.preview.profileState, "profile-configured");
  assert.equal(projectedReceipt.authority, "source-projected");
  assert.equal(projectedReceipt.sourceVersion, revision);
});

function baseProjection() {
  return {
    boundary: {
      data_mode: "synthetic",
      external_network: false,
      mutation_boundary: "none",
      persistence_model: "runtime-metadata-only",
      public_ingress: false,
      visibility_tier: "private-internal",
    },
    maturity_claim: "prototype-preview-only",
    operator_actions: ["start", "status", "restart", "stop", "proof"],
    profile_digest: profileDigest,
    profile_id: "client-review-portal",
    prototype_id: "prototype:client-review-portal",
    schema_version: 1,
    source_digest: sourceDigest,
    source_revision: revision,
  };
}

function stoppedProjection() {
  return {
    ...baseProjection(),
    endpoint: null,
    instance_id: null,
    latest_receipt: null,
    runtime_state: "stopped",
  };
}

function runningProjection(receipt = null) {
  return {
    ...baseProjection(),
    endpoint: "http://127.0.0.1:18191",
    instance_id: "1234567890abcdef12345678",
    latest_receipt: receipt
      ? { digest: receipt.receipt_digest, ref: `preview-runtime://receipts/${receipt.receipt_id}` }
      : receiptRef,
    runtime_state: "running",
  };
}

function ownerReceipt() {
  const body = {
    action: "start",
    after_state: "running",
    before_state: "stopped",
    completed_at: "2026-10-08T15:00:00Z",
    outcome: "applied",
    profile_digest: profileDigest,
    profile_id: "client-review-portal",
    prototype_id: "prototype:client-review-portal",
    receipt_id: "prototype-preview-receipt:1234567890abcdef12345678",
    request_id: "console-preview:test:start:001",
    schema_version: 1,
    source_digest: sourceDigest,
    source_revision: revision,
  };
  return { ...body, receipt_digest: canonicalDigest(body) };
}

function queuedRunner(outputs, calls) {
  return async (executable, args, options) => {
    calls.push({ executable, args, options });
    const next = outputs.shift();
    if (!next) throw new Error("unexpected owner command");
    return { stderr: "", stdout: JSON.stringify(next) };
  };
}

function recordFixture() {
  return {
    id: "prototype-client-review-portal",
    evidence: [],
    preview: {
      address: "",
      command: "",
      healthcheckPath: "",
      lastCheckLogRef: null,
      lastCheckedAt: null,
      lastProofRef: null,
      launchAdapter: "unassigned",
      port: "",
      profileRef: "",
      profileSource: "",
      profileState: "no-profile",
      proofState: "not-started",
      runtimeState: "unknown",
      workingDirectory: "",
    },
    projectionFreshness: "fixture",
  };
}
