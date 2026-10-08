import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  consoleModelOperationsModeSelected,
  projectConsoleRuntimeCapabilities,
  resolveConsoleModelOperationsConfiguration,
} from "../../src/console-integration/configuration/console-runtime-configuration.ts";
import { projectLiveModelOperationsReadModel } from "../../src/domain-workspaces/model-operations/live-runtime/model-operations-live-projection.ts";
import { projectModelOperationsOperatingEvidence } from "../../src/domain-workspaces/model-operations/live-runtime/model-operations-operating-projection.ts";
import {
  listModelProfileRequests,
  submitCreateModelProfileRequest,
} from "../../src/domain-workspaces/model-operations/server/model-operations-oos-client.ts";
import { readPlatformModelOperationsArtifacts } from "../../src/domain-workspaces/model-operations/server/model-operations-platform-adapter.ts";

const revision = "a".repeat(40);
const zeroDigest = `sha256:${"0".repeat(64)}`;

test("configuration fails closed unless OOS and every Platform artifact path are present", () => {
  assert.equal(consoleModelOperationsModeSelected({}), false);
  assert.equal(
    consoleModelOperationsModeSelected({ OOS_BASE_URL: "http://127.0.0.1:8080" }),
    false,
  );
  assert.throws(
    () => resolveConsoleModelOperationsConfiguration({ OOS_BASE_URL: "http://127.0.0.1:8080" }),
    /configured|requires/i,
  );
  const capability = projectConsoleRuntimeCapabilities({
    OOS_BASE_URL: "http://127.0.0.1:8080",
    GOVERNANCE_CONSOLE_MODEL_PROFILE_SOURCE_PROJECTION_PATH: "/tmp/source.json",
  }).capabilities.find(({ id }) => id === "model-operations");
  assert.equal(capability?.source.state, "invalid");
  assert.equal(capability?.mutation.state, "invalid");
});

test("private Platform artifacts project current profile truth without granting Console mutation", async () => {
  const fixture = await platformFixture();
  try {
    const artifacts = await readPlatformModelOperationsArtifacts({ config: fixture.config });
    const readModel = projectLiveModelOperationsReadModel(artifacts, new Date("2026-10-08T17:00:00Z"));
    assert.equal(readModel.profiles[0]?.policy.lifecycle, "suspended");
    assert.equal(readModel.profiles[0]?.accessPlane.activationAllowed, false);
    assert.equal(readModel.profiles[0]?.consumers[0]?.liveConsumptionAllowed, false);
    assert.equal(readModel.workspaceStatus.statusLabel, "Current");
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
});

test("Platform artifact digest or privacy drift is rejected", async () => {
  const fixture = await platformFixture();
  try {
    await writeFile(fixture.config.sourceProjectionPath, JSON.stringify({ broken: true }), { mode: 0o600 });
    await assert.rejects(
      readPlatformModelOperationsArtifacts({ config: fixture.config }),
      /unknown or missing|malformed/i,
    );
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
});

test("Platform artifact files that are not operator-private are rejected", async () => {
  const fixture = await platformFixture();
  try {
    await chmod(fixture.config.sourceProjectionPath, 0o644);
    await assert.rejects(
      readPlatformModelOperationsArtifacts({ config: fixture.config }),
      /operator-private/i,
    );
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
});

test("OOS request list re-reads every item through the canonical source envelope", async () => {
  const projection = requestProjection({ revision: 2, reviewState: "submitted" });
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ init, url: String(url) });
    if (String(url).includes("?limit=")) {
      return Response.json({ schema_version: 1, requests: [projection], next_cursor: null });
    }
    return Response.json(sourceEnvelope(projection));
  };
  const requests = await listModelProfileRequests({ config: baseConfig(), fetchImpl });
  assert.equal(requests[0]?.request_id, projection.request_id);
  assert.equal(calls.length, 2);
  assert.match(String(new Headers(calls[1].init.headers).get("accept")), /console-source-projection/);
  assert.equal(new Headers(calls[1].init.headers).get("x-oos-caller-secret"), "private-test-secret");
});

test("stale OOS source envelopes fail closed", async () => {
  const projection = requestProjection({
    requestId: "model-profile-request:stale-console-test",
    revision: 2,
    reviewState: "submitted",
  });
  const fetchImpl = async (url) => {
    if (String(url).includes("?limit=")) {
      return Response.json({ schema_version: 1, requests: [projection], next_cursor: null });
    }
    const envelope = sourceEnvelope(projection);
    envelope.freshness.state = "stale";
    return Response.json(envelope);
  };
  await assert.rejects(
    listModelProfileRequests({ config: baseConfig(), fetchImpl }),
    (error) => error.code === "source_projection_stale",
  );
});

test("same-sequence conflicting OOS source envelopes fail closed", async () => {
  const projection = requestProjection({
    requestId: "model-profile-request:conflict-console-test",
    revision: 2,
    reviewState: "submitted",
  });
  let reread = 0;
  const fetchImpl = async (url) => {
    if (String(url).includes("?limit=")) {
      return Response.json({ schema_version: 1, requests: [projection], next_cursor: null });
    }
    reread += 1;
    const value = structuredClone(projection);
    if (reread === 2) value.request.profile_intent.display_name = "conflicting value";
    return Response.json(sourceEnvelope(value));
  };
  await listModelProfileRequests({ config: baseConfig(), fetchImpl });
  await assert.rejects(
    listModelProfileRequests({ config: baseConfig(), fetchImpl }),
    (error) => error.code === "source_authority_conflict",
  );
});

test("OOS authorization rejection is preserved without a fixture fallback", async () => {
  const fetchImpl = async () => Response.json(
    { code: "caller_unauthorized", message: "Caller is not authorized.", retryable: false },
    { status: 403 },
  );
  await assert.rejects(
    listModelProfileRequests({ config: baseConfig(), fetchImpl }),
    (error) => error.code === "caller_unauthorized" && error.status === 403,
  );
});

test("create submission records a draft and exact revision-bound submit command", async () => {
  const created = requestProjection({ revision: 1, reviewState: "draft" });
  const submitted = requestProjection({ revision: 2, reviewState: "submitted" });
  const bodies = [];
  const fetchImpl = async (_url, init) => {
    bodies.push(JSON.parse(String(init.body)));
    return Response.json(bodies.length === 1 ? created : submitted);
  };
  const result = await submitCreateModelProfileRequest(requestDraft(), {
    config: baseConfig(),
    fetchImpl,
    now: () => new Date("2026-10-08T17:00:00Z"),
  });
  assert.equal(result.review_state, "submitted");
  assert.equal(bodies[0].intent, "create");
  assert.equal(bodies[0].profile_intent.profile_id, null);
  assert.equal(bodies[0].profile_intent.source, null);
  assert.equal(bodies[1].action, "submit");
  assert.equal(bodies[1].expected_revision, 1);
});

test("operating projection binds exact applied OOS and Platform evidence", async () => {
  const fixture = await platformFixture();
  const projection = requestProjection({
    fulfillment: fixture.fulfillment,
    fulfillmentState: "applied",
    revision: 6,
    reviewState: "approved",
  });
  try {
    const artifacts = await readPlatformModelOperationsArtifacts({ config: fixture.config });
    const value = projectModelOperationsOperatingEvidence(projection, artifacts);
    assert.deepEqual(value, {
      workflow_id: "model-operations-live-projection",
      projection_state: "current",
      next_action: "complete",
      console_mutation_authority: false,
      oos_request_ref: {
        request_id: projection.request_id,
        revision: 6,
        receipt_digest: projection.latest_receipt.digest,
      },
      platform_source_ref: {
        lifecycle_receipt_digest: fixture.lifecycleReceipt.digest,
        merged_readback_digest: fixture.mergedReadback.digest,
      },
    });
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
});

test("operating projection rejects incomplete OOS and Platform reconciliation", async () => {
  const fixture = await platformFixture();
  const projection = requestProjection({
    fulfillment: fixture.fulfillment,
    fulfillmentState: "implementing",
    revision: 6,
    reviewState: "approved",
  });
  try {
    const artifacts = await readPlatformModelOperationsArtifacts({ config: fixture.config });
    assert.throws(
      () => projectModelOperationsOperatingEvidence(projection, artifacts),
      /has not reconciled/i,
    );
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
});

function baseConfig(paths = {}) {
  return {
    baseUrl: "http://127.0.0.1:8080",
    callerId: "governance-operations-console",
    callerSecret: "private-test-secret",
    operatorId: "operator:workspace-owner",
    lifecycleReceiptPath: paths.lifecycleReceiptPath ?? "/tmp/lifecycle.json",
    mergedReadbackPath: paths.mergedReadbackPath ?? "/tmp/readback.json",
    sourceProjectionPath: paths.sourceProjectionPath ?? "/tmp/source.json",
  };
}

async function platformFixture() {
  const root = await mkdtemp(join(tmpdir(), "model-operations-console-"));
  const sourceProjection = withDigest({
    schema_version: 1,
    artifact_type: "platform-model-profile-source-projection",
    owner_repo: "platform-engineering",
    source: {
      registry_digest: zeroDigest,
      access_plane_digest: zeroDigest,
      runtime_assist_digest: zeroDigest,
      source_version: revision,
    },
    profiles: [
      {
        profile_id: "console-test-v1",
        lifecycle: "suspended",
        purpose: "bounded console test",
        allowed_callers: ["governance-operations-console/model-operations"],
        selected_environments: ["dev-integration"],
        activation: {
          activation_allowed: false,
          binding: "dev-integration",
          environment: "dev-integration",
          reason: "lifecycle-suspended:test",
        },
        security_review_ref: { uri: "https://security.local/reviews/test", digest: zeroDigest },
      },
    ],
  });
  const lifecycleReceipt = withDigest({
    schema_version: 1,
    artifact_type: "platform-model-profile-lifecycle-receipt",
    receipt_id: "platform-model-profile-receipt:aaaaaaaaaaaaaaaaaaaaaaaa",
    request_id: "model-profile-request:console-test",
    request_revision: 5,
    request_receipt_digest: zeroDigest,
    decision_id: "platform-model-profile-decision:test",
    decision_digest: zeroDigest,
    intent: "create",
    profile_id: "console-test-v1",
    actor_id: "platform-engineering/model-profile-lifecycle",
    recorded_at: "2026-10-08T16:55:00Z",
    outcome: "applied",
    lifecycle_before: null,
    lifecycle_after: "suspended",
    base_source: { source_version: "b".repeat(40), registry_digest: zeroDigest, access_plane_digest: zeroDigest, runtime_assist_digest: zeroDigest },
    result_source: { source_version: "platform-source:aaaaaaaaaaaaaaaaaaaaaaaa", registry_digest: zeroDigest, access_plane_digest: zeroDigest, runtime_assist_digest: zeroDigest },
    rollback_bundle_ref: { uri: "file:///tmp/rollback.json", digest: zeroDigest },
    oos_fulfillment: { state: "pending-source-review", expected_revision: 5, next_action: "readback" },
  });
  const fulfillment = {
    schema_version: 1,
    fulfillment_id: "platform-model-profile-fulfillment:test",
    request_id: lifecycleReceipt.request_id,
    expected_revision: 5,
    state: "applied",
    actor_id: "platform-engineering/model-profile-lifecycle",
    recorded_at: "2026-10-08T16:58:00Z",
    source: {
      owner_repo: "platform-engineering",
      base_version: "b".repeat(40),
      result_version: revision,
      review_ref: { uri: "https://github.com/mfshaf7/platform-engineering/pull/279", digest: zeroDigest },
    },
    receipt_ref: { uri: "file:///tmp/lifecycle.json", digest: lifecycleReceipt.digest },
    failure: null,
    idempotency_key: "model-profile-readback:test",
  };
  const mergedReadback = withDigest({
    schema_version: 1,
    artifact_type: "platform-model-profile-merged-readback",
    source_version: revision,
    lifecycle_receipt_ref: { uri: "file:///tmp/lifecycle.json", digest: lifecycleReceipt.digest },
    source_projection: sourceProjection,
    oos_fulfillment: fulfillment,
  });
  const paths = {
    sourceProjectionPath: join(root, "source.json"),
    lifecycleReceiptPath: join(root, "lifecycle.json"),
    mergedReadbackPath: join(root, "readback.json"),
  };
  await Promise.all([
    writeFile(paths.sourceProjectionPath, JSON.stringify(sourceProjection), { mode: 0o600 }),
    writeFile(paths.lifecycleReceiptPath, JSON.stringify(lifecycleReceipt), { mode: 0o600 }),
    writeFile(paths.mergedReadbackPath, JSON.stringify(mergedReadback), { mode: 0o600 }),
  ]);
  return {
    config: baseConfig(paths),
    env: {
      OOS_BASE_URL: "http://127.0.0.1:8080",
      OOS_CALLER_ID: "governance-operations-console",
      OOS_CALLER_SECRET: "private-test-secret",
      GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:workspace-owner",
      GOVERNANCE_CONSOLE_MODEL_PROFILE_SOURCE_PROJECTION_PATH: paths.sourceProjectionPath,
      GOVERNANCE_CONSOLE_MODEL_PROFILE_LIFECYCLE_RECEIPT_PATH: paths.lifecycleReceiptPath,
      GOVERNANCE_CONSOLE_MODEL_PROFILE_MERGED_READBACK_PATH: paths.mergedReadbackPath,
    },
    fulfillment,
    lifecycleReceipt,
    mergedReadback,
    root,
  };
}

function requestDraft() {
  return {
    admittedContextDigest: zeroDigest,
    admittedContextUri: "https://context.local/packets/test",
    dataClassification: "internal",
    displayName: "Console test",
    environment: "dev-integration",
    justification: "Exercise the admitted bounded Console request path.",
    operationalExpectations: "Fail closed\nEmit receipts",
    outputSchemaPath: "contracts/output.schema.json",
    outputSchemaRepo: "governance-operations-console",
    outputSchemaVersion: "v1",
    ownerRepo: "governance-operations-console",
    purpose: "Validate the governed Model Operations request workflow.",
    registeredCallers: "governance-operations-console/model-operations=governance-operations-console",
    requestId: "model-profile-request:console-test",
  };
}

function requestProjection({
  fulfillment = null,
  fulfillmentState = "not-started",
  requestId = "model-profile-request:console-test",
  revision: requestRevision,
  reviewState,
}) {
  const receiptDigest = `sha256:${String(requestRevision).padStart(64, "0")}`;
  return {
    schema_version: 1,
    workflow_id: "model-profile-request",
    request_id: requestId,
    revision: requestRevision,
    request: {
      schema_version: 1,
      request_id: requestId,
      intent: "create",
      requested_at: "2026-10-08T17:00:00Z",
      operator_id: "operator:workspace-owner",
      profile_intent: {
        profile_id: null,
        source: null,
        display_name: "Console test",
        intended_purpose: "bounded test",
        requesting_owner: "governance-operations-console",
        registered_callers: [{ caller_id: "governance-operations-console/model-operations", owner_repo: "governance-operations-console" }],
        requested_environments: ["dev-integration"],
        input_data_classification: "internal",
        admitted_context_ref: { uri: "https://context.local/test", digest: zeroDigest },
        required_output_schema_ref: { repo: "governance-operations-console", path: "contracts/test.json", version: "v1" },
        human_approval_required: true,
        operational_expectations: ["fail closed"],
        operator_justification: "bounded test request",
      },
      delivery_ref: null,
      correlation_id: "console-model-profile:test",
      causation_id: null,
      idempotency_key: "model-profile-request:test",
    },
    review_state: reviewState,
    fulfillment_state: fulfillmentState,
    requirements: [],
    decision_ref: reviewState === "approved" ? { uri: "https://security.local/decision/test", digest: zeroDigest } : null,
    fulfillment,
    latest_receipt: {
      schema_version: 1,
      receipt_id: "model-profile-receipt:aaaaaaaaaaaaaaaaaaaaaaaa",
      request_id: requestId,
      request_revision: requestRevision,
      intent: "create",
      review_state: reviewState,
      fulfillment_state: fulfillmentState,
      profile_id: null,
      actor: { caller_id: "governance-operations-console", operator_id: "operator:workspace-owner" },
      routed_owners: { workflow_owner: "operator-orchestration-service", fulfillment_owner: "platform-engineering", security_owner: "security-architecture" },
      delivery_ref: null,
      source_ref: null,
      prior_receipt_ref: null,
      recorded_at: "2026-10-08T17:00:00Z",
      digest: receiptDigest,
    },
    history: [{
      sequence: 1,
      event_type: "request-created",
      occurred_at: "2026-10-08T17:00:00Z",
      actor_id: "operator:workspace-owner",
      command_id: "model-profile-request:test",
      review_state_before: null,
      review_state_after: reviewState,
      fulfillment_state_before: null,
      fulfillment_state_after: fulfillmentState,
      summary: "test",
      receipt_ref: { uri: "oos://receipt/test", digest: receiptDigest },
    }],
    next_action: fulfillmentState === "applied" ? "refresh-authoritative-projections" : reviewState === "draft" ? "revise-or-submit" : reviewState === "submitted" ? "start-review" : "begin-platform-fulfillment",
    profile_lifecycle_changed: false,
  };
}

function sourceEnvelope(projection) {
  const now = new Date();
  return {
    schema_version: 1,
    artifact_type: "console-source-projection",
    binding: {
      authority: "operator-orchestration-service",
      record_ref: `oos://model-profile-requests/${projection.request_id}`,
      source_owner: "operator-orchestration-service",
      source_ref: `oos-source://model-profile-request/${projection.request_id}`,
    },
    revision: {
      event_cursor: `revision-${projection.revision}`,
      event_sequence: projection.revision,
      source_revision: `revision-${projection.revision}`,
    },
    freshness: {
      observed_at: now.toISOString(),
      valid_until: new Date(now.getTime() + 60_000).toISOString(),
      state: "current",
    },
    projection,
  };
}

function withDigest(value) {
  return { ...value, digest: canonicalDigest(value) };
}

function canonicalDigest(value) {
  return `sha256:${createHash("sha256").update(canonicalStringify(value)).digest("hex")}`;
}

function canonicalStringify(value) {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(",")}}`;
}
