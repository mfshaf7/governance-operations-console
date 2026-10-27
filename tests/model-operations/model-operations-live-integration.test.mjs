import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  consoleModelOperationsModeSelected,
  consoleModelOperationsReadMode,
  projectConsoleRuntimeCapabilities,
  resolveConsoleModelOperationsConfiguration,
} from "../../src/console-integration/configuration/console-runtime-configuration.ts";
import { projectLiveModelOperationsReadModel } from "../../src/domain-workspaces/model-operations/live-runtime/model-operations-live-projection.ts";
import { projectModelOperationsOperatingEvidence } from "../../src/domain-workspaces/model-operations/live-runtime/model-operations-operating-projection.ts";
import {
  listModelProfileRequests,
  submitCreateModelProfileRequest,
  commandModelProfileRequest,
} from "../../src/domain-workspaces/model-operations/server/model-operations-oos-client.ts";
import { readPlatformModelOperationsArtifacts, readPlatformModelRegistryArtifacts } from "../../src/domain-workspaces/model-operations/server/model-operations-platform-adapter.ts";
import { assertModelProfileReviewCommandDraft } from "../../src/domain-workspaces/model-operations/live-runtime/model-operations-live-contract.ts";
import { fetchModelProfileFulfillment, submitModelProfileReviewCommand } from "../../src/domain-workspaces/model-operations/live-runtime/model-profile-operator-client.ts";
import { modelProfileReviewActions, modelProfileDraftFromRequest } from "../../src/domain-workspaces/model-operations/work-model/profile-requests/model-profile-review-model.ts";

const revision = "a".repeat(40);
const zeroDigest = `sha256:${"0".repeat(64)}`;

test("registry configuration requires its owner source and OOS binding, independently of transaction evidence", () => {
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

test("first-use registry needs no previous lifecycle receipt or merged transaction", async () => {
  const fixture = await platformFixture();
  try {
    await rm(fixture.config.lifecycleReceiptPath);
    await rm(fixture.config.mergedReadbackPath);
    const env = { ...baseConfigEnv(), GOVERNANCE_CONSOLE_MODEL_PROFILE_SOURCE_PROJECTION_PATH: fixture.config.sourceProjectionPath };
    const config = resolveConsoleModelOperationsConfiguration(env);
    assert.equal(config.lifecycleReceiptPath, null);
    assert.equal(config.mergedReadbackPath, null);
    assert.equal(projectConsoleRuntimeCapabilities(env).capabilities.find(({ id }) => id === "model-operations")?.source.state, "available");
    const artifacts = await readPlatformModelRegistryArtifacts({ config });
    const readModel = projectLiveModelOperationsReadModel(artifacts);
    assert.equal(readModel.profiles.length, 1);
    assert.equal(readModel.profiles[0].latestAudit.state, "unknown");
    assert.equal(readModel.workspaceStatus.items.find(({ id }) => id === "reconciliation"), undefined);
    await assert.rejects(readPlatformModelOperationsArtifacts({ config, requestId: fixture.lifecycleReceipt.request_id }), /No Platform fulfillment evidence/);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("a later current registry does not invalidate an earlier exact request's fulfillment", async () => {
  const fixture = await platformFixture();
  try {
    const newer = structuredClone(fixture.mergedReadback.source_projection);
    newer.source.source_version = "c".repeat(40);
    newer.profiles[0].purpose = "A legitimate later registry revision";
    await writeFile(fixture.config.sourceProjectionPath, JSON.stringify(withDigest(newer)), { mode: 0o600 });
    const current = await readPlatformModelRegistryArtifacts({ config: fixture.config });
    const historical = await readPlatformModelOperationsArtifacts({ config: fixture.config, requestId: fixture.lifecycleReceipt.request_id });
    assert.equal(current.sourceProjection.source.source_version, "c".repeat(40));
    assert.equal(historical.sourceProjection.source.source_version, revision);
    assert.equal(historical.lifecycleReceipt.digest, fixture.lifecycleReceipt.digest);
    await assert.rejects(readPlatformModelOperationsArtifacts({ config: fixture.config, requestId: "model-profile-request:another-request" }), /another request/);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("request history selects only its hashed private file, preserves old requests and never borrows latest evidence", async () => {
  const fixture = await platformFixture();
  try {
    const requestHistoryRoot = join(fixture.root, "history");
    await mkdir(requestHistoryRoot, { mode: 0o700 });
    const config = { ...fixture.config, requestHistoryRoot };
    const id = fixture.lifecycleReceipt.request_id;
    const path = join(requestHistoryRoot, createHash("sha256").update(id).digest("hex") + ".json");
    const bundle = withDigest({ schema_version: 1, artifact_type: "platform-model-profile-request-evidence", request_id: id, lifecycle_receipt: fixture.lifecycleReceipt, merged_readback: fixture.mergedReadback });
    await writeFile(path, JSON.stringify(bundle), { mode: 0o600 });
    await writeFile(config.sourceProjectionPath, "current registry unavailable", { mode: 0o600 });
    assert.equal((await readPlatformModelOperationsArtifacts({ config, requestId: id })).lifecycleReceipt.digest, fixture.lifecycleReceipt.digest);
    await assert.rejects(readPlatformModelOperationsArtifacts({ config, requestId: "model-profile-request:unfulfilled" }), /could not be read safely/);
    await assert.rejects(readPlatformModelOperationsArtifacts({ config, requestId: "../../another-file" }), /identity is invalid/);
    await writeFile(path, JSON.stringify(withDigest({ ...bundle, request_id: "model-profile-request:cross-bound" })), { mode: 0o600 });
    await assert.rejects(readPlatformModelOperationsArtifacts({ config, requestId: id }), /another request/);
    await writeFile(path, JSON.stringify(bundle), { mode: 0o600 });
    await chmod(path, 0o644);
    await assert.rejects(readPlatformModelOperationsArtifacts({ config, requestId: id }), /operator-private/);
    await chmod(path, 0o600);
    await chmod(requestHistoryRoot, 0o755);
    await assert.rejects(readPlatformModelOperationsArtifacts({ config, requestId: id }), /operator-private/);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("historical readback still rejects a forged actor or a lifecycle result digest mismatch", async () => {
  const fixture = await platformFixture();
  try {
    const forged = withDigest({ ...fixture.mergedReadback, oos_fulfillment: { ...fixture.fulfillment, actor_id: "governance-operations-console" } });
    await writeFile(fixture.config.mergedReadbackPath, JSON.stringify(forged), { mode: 0o600 });
    await assert.rejects(readPlatformModelOperationsArtifacts({ config: fixture.config }), /incomplete or mismatched/);
    const wrong = structuredClone(fixture.mergedReadback);
    wrong.source_projection.source.registry_digest = `sha256:${"f".repeat(64)}`;
    wrong.source_projection = withDigest(wrong.source_projection);
    await writeFile(fixture.config.mergedReadbackPath, JSON.stringify(withDigest(wrong)), { mode: 0o600 });
    await assert.rejects(readPlatformModelOperationsArtifacts({ config: fixture.config }), /lifecycle result source/);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
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
      readPlatformModelRegistryArtifacts({ config: fixture.config }),
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
      readPlatformModelRegistryArtifacts({ config: fixture.config }),
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
        source_version: revision,
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
  const { digest: _previous, ...content } = value;
  return { ...content, digest: canonicalDigest(content) };
}

function canonicalDigest(value) {
  return `sha256:${createHash("sha256").update(canonicalStringify(value)).digest("hex")}`;
}

function canonicalStringify(value) {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(",")}}`;
}


test("Purpose profile samples require a wholly disconnected Console, never missing live owner evidence", () => {
  assert.equal(consoleModelOperationsReadMode({}), "disconnected-preview");
  for (const env of [
    { OOS_BASE_URL: "http://owner.test" },
    { OOS_CALLER_SECRET: "partial-test-only" },
    { WGCF_BASE_URL: "http://continuity.test" },
    { GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_OWNER_REPO_ROOT: "/test-only/studio" },
    baseConfigEnv(),
  ]) {
    assert.equal(consoleModelOperationsReadMode(env), "unavailable");
  }
  const partial = { GOVERNANCE_CONSOLE_MODEL_PROFILE_SOURCE_PROJECTION_PATH: "/test-only/projection.json" };
  assert.equal(consoleModelOperationsReadMode(partial), "live");
  assert.throws(() => resolveConsoleModelOperationsConfiguration(partial));
  const configured = {
    ...baseConfigEnv(),
    ...partial,
    GOVERNANCE_CONSOLE_MODEL_PROFILE_LIFECYCLE_RECEIPT_PATH: "/test-only/receipt.json",
    GOVERNANCE_CONSOLE_MODEL_PROFILE_MERGED_READBACK_PATH: "/test-only/readback.json",
  };
  assert.equal(consoleModelOperationsReadMode(configured), "live");
  assert.equal(resolveConsoleModelOperationsConfiguration(configured).sourceProjectionPath, partial.GOVERNANCE_CONSOLE_MODEL_PROFILE_SOURCE_PROJECTION_PATH);
});

function baseConfigEnv() {
  return { OOS_BASE_URL: "http://owner.test", OOS_CALLER_SECRET: "test-only-secret", GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:synthetic" };
}

function reviewDraft(action = "start-review") {
  return { action, commandId: "model-profile-command:console-review-test", expectedRevision: 2,
    issuedAt: "2026-10-08T17:01:00.000Z", reason: null, decisionRef: null, requirements: [], revisedIntentDraft: null };
}

test("explicit review uses the bound operator and retains byte-identical retry identity and time", async () => {
  const draft = reviewDraft();
  const result = requestProjection({ requestId: "model-profile-request:operator-review-positive", revision: 3, reviewState: "under-review" });
  result.history[0].command_id = draft.commandId;
  const bodies = [];
  const options = { config: baseConfig(), fetchImpl: async (url, init) => {
    assert.ok(String(url).endsWith(`/v1/model-profile-requests/${encodeURIComponent(result.request_id)}/commands`));
    bodies.push(JSON.parse(init.body)); return Response.json(result);
  } };
  assert.equal((await commandModelProfileRequest(result.request_id, draft, options)).review_state, "under-review");
  await commandModelProfileRequest(result.request_id, draft, { ...options, now: () => new Date("2026-10-09T17:00:00Z") });
  assert.deepEqual(bodies[0], bodies[1]);
  assert.equal(bodies[0].operator_id, options.config.operatorId);
  assert.equal(bodies[0].expected_revision, 2);
  assert.equal(bodies[0].issued_at, draft.issuedAt);
  assert.equal(bodies[0].revised_profile_intent, null);
  assert.equal(bodies[0].decision_ref, null);
});

test("review cannot smuggle operator, fulfillment, activation or unreviewed decision authority", async () => {
  const id = "model-profile-request:operator-review-negative";
  let dispatched = 0;
  const options = { config: baseConfig(), fetchImpl: async () => { ++dispatched; throw new Error("must not dispatch"); } };
  for (const draft of [
    { ...reviewDraft(), operator_id: "operator:another" },
    { ...reviewDraft(), action: "fulfill" },
    { ...reviewDraft(), action: "activate" },
    { ...reviewDraft("approve"), reason: "Approved without decision evidence" },
    { ...reviewDraft("request-changes"), reason: "Requires changes", requirements: [] },
    { ...reviewDraft(), expectedRevision: 0 },
    { ...reviewDraft(), issuedAt: "2099-01-01T00:00:00Z" },
  ]) await assert.rejects(commandModelProfileRequest(id, draft, options), error => error.status === 400);
  assert.equal(dispatched, 0);
  assert.throws(() => assertModelProfileReviewCommandDraft({ ...reviewDraft("revise"), reason: "Review revised original", revisedIntentDraft: { ...requestDraft(), requestId: "model-profile-request:other" } }, id), /original request identity/);
});

test("review decisions and requested changes retain explicit evidence and native typed requirements", async () => {
  const decision = { ...reviewDraft("approve"), reason: "Operator explicitly accepts the reviewed intent", decisionRef: { uri: "openproject://work_packages/1342", digest: zeroDigest } };
  assert.equal(assertModelProfileReviewCommandDraft(decision, requestDraft().requestId).action, "approve");
  assert.equal(assertModelProfileReviewCommandDraft({ ...decision, action: "reject" }, requestDraft().requestId).action, "reject");
  const requirement = { requirement_id: "requirement:caller-scope", summary: "Narrow the caller scope", owner_repo: "platform-engineering", next_action: "Revise the original request" };
  assert.equal(assertModelProfileReviewCommandDraft({ ...reviewDraft("request-changes"), reason: "Caller scope needs correction", requirements: [requirement] }, requestDraft().requestId).requirements.length, 1);
  assert.throws(() => assertModelProfileReviewCommandDraft({ ...reviewDraft("request-changes"), reason: "Correct owner", requirements: [{ ...requirement, owner_repo: "../unknown" }] }, requestDraft().requestId), /requested change/);
});

test("revision keeps original request, profile and source binding and cannot silently truncate an existing environment set", async () => {
  const original = requestProjection({ requestId: "model-profile-request:operator-revise-positive", revision: 4, reviewState: "changes-required" });
  original.request.intent = "amend";
  original.request.profile_intent.profile_id = "existing-profile-v1";
  original.request.profile_intent.source = { source_version: revision, registry_ref: { uri: "owner://registry", digest: zeroDigest } };
  original.request.profile_intent.requested_environments = ["dev-integration", "stage"];
  const revised = { ...modelProfileDraftFromRequest(original), purpose: "Explicitly revised purpose" };
  const draft = { ...reviewDraft("revise"), expectedRevision: 4, reason: "Correct the requested purpose", revisedIntentDraft: revised };
  const result = structuredClone(original); result.revision = 5; result.latest_receipt.request_revision = 5; result.review_state = "draft"; result.history[0].command_id = draft.commandId;
  let submitted;
  const options = { config: baseConfig(), fetchImpl: async (_url, init) => {
    if (init.method === "GET") return Response.json(sourceEnvelope(original));
    submitted = JSON.parse(init.body); return Response.json(result);
  } };
  await commandModelProfileRequest(original.request_id, draft, options);
  assert.equal(submitted.request_id, original.request_id);
  assert.equal(submitted.revised_profile_intent.profile_id, "existing-profile-v1");
  assert.deepEqual(submitted.revised_profile_intent.source, original.request.profile_intent.source);
  assert.deepEqual(submitted.revised_profile_intent.requested_environments, ["dev-integration", "stage"]);
  assert.equal(submitted.revised_profile_intent.intended_purpose, revised.purpose);
});

test("native revision rejection and wrong-command acknowledgement cannot become local review success", async () => {
  const draft = reviewDraft(); const id = "model-profile-request:review-conflict";
  await assert.rejects(submitModelProfileReviewCommand(id, draft, { fetchImpl: async () => Response.json({ error: "Original request revision changed" }, { status: 409 }) }), error => error.status === 409);
  const wrong = requestProjection({ requestId: id, revision: 3, reviewState: "under-review" });
  await assert.rejects(submitModelProfileReviewCommand(id, draft, { fetchImpl: async () => Response.json(wrong) }), /original reviewed action/);
  await assert.rejects(commandModelProfileRequest(id, draft, { config: baseConfig(), fetchImpl: async () => Response.json(wrong) }), /original request review command/);
});

test("request review actions follow the current owner lifecycle and never offer Platform fulfillment", () => {
  for (const [state, expected] of Object.entries({ draft: ["revise", "submit", "withdraw"], submitted: ["start-review", "withdraw"], "under-review": ["approve", "request-changes", "reject", "withdraw"], "changes-required": ["revise", "withdraw"], approved: [], rejected: [], withdrawn: [] })) {
    const actual = modelProfileReviewActions(requestProjection({ revision: 2, reviewState: state }));
    assert.deepEqual(actual, expected); assert.equal(actual.includes("fulfill"), false);
  }
});

test("fulfillment view accepts only the selected original request, revision and historical merged source", async () => {
  const id = "model-profile-request:historical-complete";
  const evidence = { workflow_id: "model-operations-live-projection", projection_state: "current", next_action: "complete", console_mutation_authority: false,
    oos_request_ref: { request_id: id, revision: 6, receipt_digest: zeroDigest },
    platform_source_ref: { lifecycle_receipt_digest: zeroDigest, merged_readback_digest: zeroDigest, source_version: revision } };
  const get = value => ({ fetchImpl: async () => Response.json(value) });
  assert.equal((await fetchModelProfileFulfillment(id, 6, get(evidence))).platform_source_ref.source_version, revision);
  await assert.rejects(fetchModelProfileFulfillment(id, 7, get(evidence)), /matching verified fulfillment/);
  await assert.rejects(fetchModelProfileFulfillment("model-profile-request:other", 6, get(evidence)), /matching verified fulfillment/);
  await assert.rejects(fetchModelProfileFulfillment(id, 6, get({ ...evidence, console_mutation_authority: true })), /matching verified fulfillment/);
});
