import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";

import {
  assertGovernedProductPublicationIntent,
  assertGovernedProductPublicationResult,
} from "../../src/domain-workspaces/portfolio/live-runtime/product-publication-live-contract.ts";
import {
  ProductPublicationOosError,
  readGovernedProductPublication,
  submitGovernedProductPublication,
} from "../../src/domain-workspaces/portfolio/server/product-publication-oos-client.ts";
import {
  governedIntentFromPortfolioDecision,
  portfolioSubmissionFromGovernedResult,
} from "../../src/domain-workspaces/portfolio/live-runtime/product-publication-live-projection.ts";
import { productPortfolioReadModel } from "../../src/domain-workspaces/portfolio/read-model/product-portfolio-read-model.ts";

const requestId = "product-publication-request:console:1256";
const now = "2026-10-12T05:30:00.000Z";
const config = {
  authorityRevision: "a".repeat(40),
  baseUrl: "http://127.0.0.1:1",
  callerId: "governance-operations-console",
  callerSecret: "test-only-server-secret",
  operatorId: "operator:mfshaf7",
  securityDecision: {
    digest: `sha256:${"b".repeat(64)}`,
    revision: "c".repeat(40),
    uri: "security-architecture://product-publication/decisions/console-internal-v1",
  },
};
const attributionHeaders = {
  "x-console-correlation-id": "console-correlation-1256",
  "x-console-session-ref": "platform-session://console/1256",
};

test("case:1256-positive submits exact reviewed intent, reads authoritative state, and preserves receipt bindings", async (context) => {
  const requests = [];
  let stored = null;
  const server = createServer(async (request, response) => {
    const body = await readBody(request);
    requests.push({
      body,
      callerId: request.headers["x-oos-caller-id"],
      callerSecret: request.headers["x-oos-caller-secret"],
      method: request.method,
      operatorId: request.headers["x-oos-operator-id"],
      url: request.url,
    });
    if (request.method === "POST" && request.url === "/v1/product-publications") {
      stored = resultFor(body, "created");
      sendJson(response, stored, 201);
      return;
    }
    if (
      request.method === "GET" &&
      decodeURIComponent(request.url) === `/v1/product-publications/${requestId}`
    ) {
      sendJson(response, { ...stored, resolution: "read" });
      return;
    }
    sendJson(response, { code: "not_found", error: "Not found." }, 404);
  });
  const baseUrl = await listen(server);
  context.after(() => server.close());
  const liveConfig = { ...config, baseUrl };

  const created = await submitGovernedProductPublication(intent(), {
    attributionHeaders,
    config: liveConfig,
  });
  const read = await readGovernedProductPublication(requestId, {
    attributionHeaders,
    config: liveConfig,
  });

  assert.equal(created.state, "applied");
  assert.equal(created.receipt.publication_version, 1);
  assert.equal(created.receipt.publication_posture, "internal");
  assert.equal(read.resolution, "read");
  assert.equal(read.receipt_digest, created.receipt_digest);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].callerId, config.callerId);
  assert.equal(requests[0].operatorId, config.operatorId);
  assert.equal(requests[0].body.operator_id, config.operatorId);
  assert.equal(requests[0].body.authority_revision, config.authorityRevision);
  assert.deepEqual(requests[0].body.security_decision, config.securityDecision);
  assert.equal(requests[0].body.session_ref, attributionHeaders["x-console-session-ref"]);
  assert.equal(
    requests[0].body.execution_ref,
    `console-correlation://${attributionHeaders["x-console-correlation-id"]}`,
  );
  assert.doesNotMatch(JSON.stringify(requests[0].body), /test-only-server-secret/);

  const submission = authorityBackedSubmission();
  assert.deepEqual(governedIntentFromPortfolioDecision(submission), intent());
  const projected = portfolioSubmissionFromGovernedResult({
    result: created,
    submission,
  });
  assert.equal(projected.receiptId, created.receipt.receipt_id);
  assert.equal(projected.receiptRef, created.receipt.owner_receipt_ref);
  assert.equal(projected.authorityEvidence.receiptDigest, created.receipt_digest);
});

test("case:1256-negative rejects missing session, stale or contradictory intent, and unbound owner evidence", async () => {
  await assert.rejects(
    submitGovernedProductPublication(intent(), { config }),
    (error) =>
      error instanceof ProductPublicationOosError &&
      error.code === "product_publication_session_binding_required",
  );

  const wrongRequest = resultFor(commandFor(intent()), "read");
  await assert.rejects(
    readGovernedProductPublication(
      "product-publication-request:console:different",
      {
        attributionHeaders,
        config,
        fetchImpl: async () => Response.json(wrongRequest),
      },
    ),
    (error) =>
      error instanceof ProductPublicationOosError &&
      error.code === "product_publication_request_binding_mismatch",
  );

  const wrongCommandDigest = resultFor(commandFor(intent()), "created");
  wrongCommandDigest.command_digest = `sha256:${"0".repeat(64)}`;
  await assert.rejects(
    submitGovernedProductPublication(intent(), {
      attributionHeaders,
      config,
      fetchImpl: async () => Response.json(wrongCommandDigest),
    }),
    (error) =>
      error instanceof ProductPublicationOosError &&
      error.code === "product_publication_command_digest_mismatch",
  );

  assert.throws(
    () =>
      assertGovernedProductPublicationIntent({
        ...intent(),
        expected_publication_version: 1,
        previous_receipt: null,
      }),
    /previous_receipt/i,
  );

  const command = commandFor(intent());
  const crossBoundary = resultFor(command, "created");
  crossBoundary.packet.grants.runtime_authority = true;
  assert.throws(
    () => assertGovernedProductPublicationResult(crossBoundary),
    /cross-boundary authority/i,
  );

  const contradictory = resultFor(command, "created");
  contradictory.receipt.manifest_digest = `sha256:${"f".repeat(64)}`;
  assert.throws(
    () => assertGovernedProductPublicationResult(contradictory),
    /receipt manifest digest does not match/i,
  );

  const crossLanguageKeyOrder = resultFor(command, "created");
  crossLanguageKeyOrder.readiness.readiness.target_publication = {
    posture: "internal",
    audience: "workspace-operators",
    access_class: "workspace-authenticated",
    listing_scope: "workspace-portfolio",
  };
  assert.doesNotThrow(() =>
    assertGovernedProductPublicationResult(crossLanguageKeyOrder),
  );

  const replayConflict = resultFor(command, "created");
  replayConflict.command.idempotency_key = "product-publication:conflicting-content";
  assert.throws(
    () => assertGovernedProductPublicationResult(replayConflict),
    /readiness idempotency key does not match/i,
  );

  const unexpectedNestedData = resultFor(command, "created");
  unexpectedNestedData.command.caller_secret = "must-never-reach-the-browser";
  assert.throws(
    () => assertGovernedProductPublicationResult(unexpectedNestedData),
    /unexpected or missing fields/i,
  );

  const fixtureSubmission = authorityBackedSubmission();
  fixtureSubmission.record.provenance.mode = "synthetic";
  assert.throws(
    () => governedIntentFromPortfolioDecision(fixtureSubmission),
    /fixture data cannot enter governed Product Publication/i,
  );
});

function intent() {
  return {
    action: "publish",
    current_publication_posture: "unlisted",
    decided_at: "2026-10-12T05:28:00.000Z",
    expected_publication_version: 0,
    idempotency_key: "product-publication:console:1256",
    manifest_source: {
      manifest_digest: `sha256:${"d".repeat(64)}`,
      manifest_revision: "e".repeat(40),
      path: "product-publication/manifest.json",
      repo: "governance-operations-console",
      source_revision: "f".repeat(40),
    },
    operator_reason: "Apply the reviewed publish action for governance-operations-console.",
    previous_receipt: null,
    request_id: requestId,
    requested_at: "2026-10-12T05:28:00.000Z",
    target_publication: {
      access_class: "workspace-authenticated",
      audience: "workspace-operators",
      listing_scope: "workspace-portfolio",
      posture: "internal",
    },
  };
}

function authorityBackedSubmission() {
  const record = structuredClone(
    productPortfolioReadModel.publicationRecords.find(
      (candidate) => candidate.scenarioId === "new-product-delivery-candidate",
    ),
  );
  assert.ok(record);
  record.provenance = {
    authorityRefs: ["workspace-governance://products/governance-operations-console/v1"],
    mode: "authority-snapshot",
    syntheticFields: [],
  };
  record.publicationPacket.product.productId = "governance-operations-console";
  record.publicationPacket.governedPublication = {
    action: "publish",
    currentPosture: "unlisted",
    expectedVersion: 0,
    idempotencyKey: intent().idempotency_key,
    manifestSource: {
      manifestDigest: intent().manifest_source.manifest_digest,
      manifestRevision: intent().manifest_source.manifest_revision,
      path: intent().manifest_source.path,
      repo: intent().manifest_source.repo,
      sourceRevision: intent().manifest_source.source_revision,
    },
    previousReceipt: null,
    requestId,
  };
  return {
    decidedAt: intent().decided_at,
    decidedByRef: "operator://portfolio-console/reviewed",
    draft: {
      listing: { featured: false, scope: "internal", state: "listed" },
      outcome: "publish",
    },
    idempotencyKey: "console-local-idempotency",
    record,
  };
}

function commandFor(value) {
  return {
    schema_version: 1,
    artifact_type: "product-publication-command",
    request_id: value.request_id,
    idempotency_key: value.idempotency_key,
    session_ref: attributionHeaders["x-console-session-ref"],
    execution_ref: `console-correlation://${attributionHeaders["x-console-correlation-id"]}`,
    authority_revision: config.authorityRevision,
    manifest_source: structuredClone(value.manifest_source),
    action: value.action,
    expected_publication_version: value.expected_publication_version,
    current_publication_posture: value.current_publication_posture,
    target_publication: structuredClone(value.target_publication),
    previous_receipt: value.previous_receipt,
    operator_id: config.operatorId,
    operator_decision: {
      decision: "approve",
      reason: value.operator_reason,
      decided_at: value.decided_at,
    },
    security_decision: structuredClone(config.securityDecision),
    requested_at: value.requested_at,
  };
}

function resultFor(command, resolution) {
  const request = {
    request_id: command.request_id,
    idempotency_key: command.idempotency_key,
    action: command.action,
    expected_publication_version: command.expected_publication_version,
    current_publication_posture: command.current_publication_posture,
    target_publication: structuredClone(command.target_publication),
    previous_receipt: command.previous_receipt,
    requested_at: command.requested_at,
  };
  request.request_digest = digest(request, "request_digest");
  const evaluation = {
    schema_version: 1,
    artifact_type: "wgcf-product-publication-evaluation",
    evaluation_id: "product-publication-evaluation:console:1256",
    session_ref: command.session_ref,
    execution_ref: command.execution_ref,
    authority_revision: command.authority_revision,
    manifest_source: structuredClone(command.manifest_source),
    request,
  };
  evaluation.evaluation_digest = digest(evaluation, "evaluation_digest");
  const readiness = {
    schema_version: 1,
    artifact_type: "product-publication-readiness",
    readiness_id: "product-publication-readiness:console:1256",
    evaluated_at: now,
    expires_at: "2026-10-12T06:00:00.000Z",
    request_ref: {
      id: command.request_id,
      digest: request.request_digest,
      idempotency_key: command.idempotency_key,
    },
    product_id: "product:governance-operations-console",
    manifest_binding: {
      manifest_id: "product-publication-manifest:governance-operations-console:1",
      manifest_digest: command.manifest_source.manifest_digest,
      owner_repo: command.manifest_source.repo,
      owner_revision: command.manifest_source.source_revision,
      manifest_revision: command.manifest_source.manifest_revision,
      path: command.manifest_source.path,
    },
    authority_binding: {
      revision: command.authority_revision,
      contract_digest: `sha256:${"1".repeat(64)}`,
      products_digest: `sha256:${"2".repeat(64)}`,
    },
    target_publication: structuredClone(command.target_publication),
    outcome: "ready",
    findings: [],
    secret_values_embedded: false,
  };
  readiness.readiness_digest = digest(readiness, "readiness_digest");
  const readinessRef = {
    digest: readiness.readiness_digest,
    uri: `wgcf://product-publication/readiness-receipts/${readiness.readiness_digest.slice(7)}`,
  };
  const packet = {
    schema_version: 1,
    artifact_type: "product-publication-packet",
    packet_id: "product-publication-packet:console:1256",
    request_id: command.request_id,
    idempotency_key: command.idempotency_key,
    request_digest: request.request_digest,
    expected_publication_version: command.expected_publication_version,
    action: command.action,
    product_id: readiness.product_id,
    manifest_binding: {
      manifest_id: readiness.manifest_binding.manifest_id,
      manifest_digest: readiness.manifest_binding.manifest_digest,
      owner_repo: readiness.manifest_binding.owner_repo,
      owner_revision: readiness.manifest_binding.owner_revision,
    },
    current_publication_posture: command.current_publication_posture,
    target_publication: structuredClone(command.target_publication),
    authority_refs: {
      operator_decision_ref: "oos://product-publication/operator-decisions/1256",
      readiness_receipt_ref: readinessRef.uri,
      security_decision_ref: command.security_decision.uri,
    },
    previous_receipt: command.previous_receipt,
    grants: {
      source_authority: false,
      runtime_authority: false,
      release_authority: false,
      security_acceptance: false,
      lifecycle_mutation: false,
    },
    requested_at: command.requested_at,
  };
  const receipt = {
    schema_version: 1,
    artifact_type: "product-publication-receipt",
    receipt_id: "product-publication-receipt:console:1256",
    packet_id: packet.packet_id,
    request_id: command.request_id,
    request_digest: request.request_digest,
    manifest_digest: command.manifest_source.manifest_digest,
    product_id: readiness.product_id,
    outcome: "applied",
    publication_version: 1,
    publication_posture: "internal",
    owner_receipt_ref: "oos://product-publication/owner-receipts/product-publication-receipt:console:1256",
    recorded_at: "2026-10-12T05:31:00.000Z",
    secret_values_embedded: false,
  };
  const receiptDigest = digest(receipt);
  return {
    schema_version: 1,
    workflow_id: "product-publication",
    request_id: command.request_id,
    revision: 1,
    resolution,
    state: "applied",
    command_digest: digest(command),
    command: structuredClone(command),
    evaluation,
    readiness: {
      readiness,
      ledger: {
        resolution: "read",
        state: "durable",
        ref: readinessRef,
        authority_revision: command.authority_revision,
        contract_digest: readiness.authority_binding.contract_digest,
        implementation_ref: "3".repeat(40),
        service_identity_ref: "spiffe://dev-integration/wgcf/product-publication",
        expires_at: readiness.expires_at,
      },
    },
    packet,
    receipt,
    receipt_digest: receiptDigest,
    owner_receipt: { uri: receipt.owner_receipt_ref, digest: receiptDigest },
    history: [{
      sequence: 1,
      event_type: "publication-applied",
      occurred_at: receipt.recorded_at,
      actor_id: command.operator_id,
      readiness_ref: readinessRef,
      receipt_ref: { uri: receipt.owner_receipt_ref, digest: receiptDigest },
    }],
    next_action: "refresh-portfolio-projection",
    cross_boundary_authority_granted: false,
  };
}

function digest(value, omittedField = null) {
  const projection = structuredClone(value);
  if (omittedField) delete projection[omittedField];
  return `sha256:${createHash("sha256").update(canonicalJson(projection)).digest("hex")}`;
}

function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" && Number.isSafeInteger(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
}

function sendJson(response, value, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(value));
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}
