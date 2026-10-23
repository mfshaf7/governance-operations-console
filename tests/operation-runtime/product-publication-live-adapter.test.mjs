import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";
import { ownerPublicationIntent, emptyOwnerPublicationDraft } from "../../src/domain-workspaces/portfolio/live-runtime/owner-publication-intent.ts";
import { workspaceRegistryFixture } from "../../src/workspace-registry/fixtures/workspace-registry.fixture.ts";
import { canonicalSourceResponse } from "../support/console-source-projection.mjs";

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
      readAuthority: async () => config.authorityRevision,
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
  assert.deepEqual(
    projected.authorityEvidence.targetPublication,
    intent().target_publication,
  );
  assert.deepEqual(projected.authorityEvidence.ownerManifest, {
    manifestDigest: intent().manifest_source.manifest_digest,
    manifestRevision: intent().manifest_source.manifest_revision,
    path: intent().manifest_source.path,
    repo: intent().manifest_source.repo,
    sourceRevision: intent().manifest_source.source_revision,
  });
});

test("case:1261-positive projects every active audience tuple from the reviewed Portfolio decision", () => {
  const cases = [
    {
      listing: { featured: false, scope: "internal", state: "listed" },
      target: {
        access_class: "workspace-authenticated",
        audience: "workspace-operators",
        listing_scope: "workspace-portfolio",
        posture: "internal",
      },
    },
    {
      listing: { featured: false, scope: "client", state: "listed" },
      target: {
        access_class: "client-authorized",
        audience: "authorized-clients",
        listing_scope: "client-portfolio",
        posture: "client",
      },
    },
    {
      listing: { featured: false, scope: "public", state: "listed" },
      target: {
        access_class: "public-anonymous",
        audience: "public",
        listing_scope: "public-catalog",
        posture: "public",
      },
    },
    {
      listing: { featured: false, scope: "internal", state: "unlisted" },
      target: {
        access_class: null,
        audience: null,
        listing_scope: null,
        posture: "unlisted",
      },
    },
  ];

  for (const item of cases) {
    const submission = authorityBackedSubmission();
    submission.draft.listing = item.listing;
    submission.record.publicationPacket.governedPublication.action =
      item.listing.state === "unlisted" ? "unpublish" : "publish";
    assert.deepEqual(
      governedIntentFromPortfolioDecision(submission).target_publication,
      item.target,
    );
  }
});

test("case:1270-positive validates exact archive lifecycle, publication, and history composition", () => {
  const command = commandFor(lifecycleIntent());
  const archived = resultFor(command, "created");
  assert.doesNotThrow(() => assertGovernedProductPublicationResult(archived));
  assert.equal(archived.maintenance_projection.lifecycle.state, "retired");
  assert.equal(archived.maintenance_projection.publication.posture, "archived");
  assert.equal(archived.maintenance_projection.history.length, 1);

  const contradictory = structuredClone(archived);
  contradictory.readiness.readiness.inventory_lifecycle_binding.action = "restore";
  assert.throws(
    () => assertGovernedProductPublicationResult(contradictory),
    /inventory lifecycle action does not match/i,
  );
});

test("case:1273-rejected preserves a governed future-request rejection", () => {
  const command = commandFor(lifecycleIntent());
  command.requested_at = "2026-10-12T05:30:30.000Z";
  const rejected = rejectedResultFor(command, {
    code: "future-request",
    message: "Publication request timestamp is ahead of the evaluation clock.",
    severity: "blocking",
  });

  assert.doesNotThrow(() => assertGovernedProductPublicationResult(rejected));

  const unbound = structuredClone(rejected);
  unbound.readiness.readiness.findings = [];
  unbound.maintenance_projection.evidence_posture.findings = [];
  assert.throws(
    () => assertGovernedProductPublicationResult(unbound),
    /evidence timeline is contradictory/i,
  );
});

test("case:1256-negative rejects missing session, stale or contradictory intent, and unbound owner evidence", async () => {
  await assert.rejects(
    submitGovernedProductPublication(intent(), {
      readAuthority: async () => config.authorityRevision, config }),
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
      readAuthority: async () => config.authorityRevision,
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

  const governedLifecycleAction = authorityBackedSubmission();
  governedLifecycleAction.record.publicationPacket.governedPublication.action = "archive";
  governedLifecycleAction.record.publicationPacket.governedPublication.schemaVersion = 2;
  assert.deepEqual(
    governedIntentFromPortfolioDecision(governedLifecycleAction).target_publication,
    {
      access_class: "historical-read-only",
      audience: "historical",
      listing_scope: "historical-archive",
      posture: "archived",
    },
  );
});

function intent() {
  return {
    schema_version: 1,
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

function lifecycleIntent() {
  return {
    ...intent(),
    schema_version: 2,
    action: "archive",
    current_publication_posture: "internal",
    expected_publication_version: 1,
    idempotency_key: "product-maintenance-intent:governance-operations-console:archive:1",
    previous_receipt: {
      publication_posture: "internal",
      publication_version: 1,
      receipt_digest: `sha256:${"9".repeat(64)}`,
      receipt_id: "product-publication-receipt:console:prior",
    },
    request_id: "product-publication-request:console:maintenance:archive:1",
    target_publication: {
      access_class: "historical-read-only",
      audience: "historical",
      listing_scope: "historical-archive",
      posture: "archived",
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
    schema_version: value.schema_version,
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
    schema_version: command.schema_version,
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
    schema_version: command.schema_version,
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
  if (command.schema_version === 2) {
    readiness.action = command.action;
    readiness.current_publication_posture = command.current_publication_posture;
    readiness.previous_receipt = structuredClone(command.previous_receipt);
    readiness.authority_binding.history_digest = `sha256:${"4".repeat(64)}`;
    readiness.inventory_lifecycle_binding = {
      action: command.action === "archive" ? "retire" : "restore",
      receipt_ref: {
        id: "workspace-inventory-lifecycle-receipt:retire:console",
        digest: `sha256:${"5".repeat(64)}`,
      },
      history_event_ref: {
        id: "workspace-inventory-history-event:retire:console",
        digest: `sha256:${"6".repeat(64)}`,
        sequence: 11,
      },
      previous_event_ref: {
        id: "workspace-inventory-history-event:previous:console",
        digest: `sha256:${"7".repeat(64)}`,
      },
      after: {
        posture: command.action === "archive" ? "retired" : "active",
        record_digest: `sha256:${"8".repeat(64)}`,
        record_version: 11,
      },
    };
  }
  readiness.readiness_digest = digest(readiness, "readiness_digest");
  const readinessRef = {
    digest: readiness.readiness_digest,
    uri: `wgcf://product-publication/readiness-receipts/${readiness.readiness_digest.slice(7)}`,
  };
  const packet = {
    schema_version: command.schema_version,
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
  if (command.schema_version === 2) {
    packet.lifecycle_history_binding = {
      inventory_lifecycle_receipt_ref: structuredClone(readiness.inventory_lifecycle_binding.receipt_ref),
      inventory_history_event_ref: structuredClone(readiness.inventory_lifecycle_binding.history_event_ref),
    };
  }
  const receipt = {
    schema_version: command.schema_version,
    artifact_type: "product-publication-receipt",
    receipt_id: "product-publication-receipt:console:1256",
    packet_id: packet.packet_id,
    request_id: command.request_id,
    request_digest: request.request_digest,
    manifest_digest: command.manifest_source.manifest_digest,
    product_id: readiness.product_id,
    outcome: "applied",
    publication_version: command.expected_publication_version + 1,
    publication_posture: command.target_publication.posture,
    owner_receipt_ref: "oos://product-publication/owner-receipts/product-publication-receipt:console:1256",
    recorded_at: "2026-10-12T05:31:00.000Z",
    secret_values_embedded: false,
  };
  if (command.schema_version === 2) {
    receipt.previous_receipt = structuredClone(command.previous_receipt);
    receipt.lifecycle_history_binding = structuredClone(packet.lifecycle_history_binding);
  }
  const receiptDigest = digest(receipt);
  const maintenanceProjection = {
    schema_version: 1,
    product_id: receipt.product_id,
    lifecycle: command.schema_version === 2
      ? {
          state: readiness.inventory_lifecycle_binding.after.posture,
          record_version: readiness.inventory_lifecycle_binding.after.record_version,
          record_digest: readiness.inventory_lifecycle_binding.after.record_digest,
          receipt_ref: structuredClone(readiness.inventory_lifecycle_binding.receipt_ref),
          history_event_ref: structuredClone(readiness.inventory_lifecycle_binding.history_event_ref),
        }
      : {
          state: "not-projected",
          record_version: null,
          record_digest: null,
          receipt_ref: null,
          history_event_ref: null,
        },
    publication: {
      posture: receipt.publication_posture,
      version: receipt.publication_version,
      receipt_ref: { id: receipt.receipt_id, digest: receiptDigest },
    },
    owner_route: {
      repo: readiness.manifest_binding.owner_repo,
      revision: readiness.manifest_binding.owner_revision,
      manifest_id: readiness.manifest_binding.manifest_id,
      manifest_digest: readiness.manifest_binding.manifest_digest,
    },
    evidence_posture: {
      state: readiness.outcome,
      findings: readiness.findings,
      valid_until: readiness.expires_at,
    },
    operational_health: "not-projected",
    history: command.schema_version === 2
      ? [{
          sequence: 1,
          action: command.action,
          publication_version: receipt.publication_version,
          publication_posture: receipt.publication_posture,
          receipt_ref: { id: receipt.receipt_id, digest: receiptDigest },
          inventory_lifecycle_receipt_ref: structuredClone(readiness.inventory_lifecycle_binding.receipt_ref),
          inventory_history_event_ref: structuredClone(readiness.inventory_lifecycle_binding.history_event_ref),
          recorded_at: receipt.recorded_at,
        }]
      : [],
    next_action: "refresh-portfolio-projection",
    implications: {
      runtime_restored: false,
      release_restored: false,
      access_restored: false,
      security_acceptance_granted: false,
    },
  };
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
    maintenance_projection: maintenanceProjection,
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

function rejectedResultFor(command, finding) {
  const result = resultFor(command, "created");
  const readiness = result.readiness.readiness;
  readiness.outcome = "blocked";
  readiness.findings = [structuredClone(finding)];
  readiness.readiness_digest = digest(readiness, "readiness_digest");
  const readinessRef = {
    digest: readiness.readiness_digest,
    uri: `wgcf://product-publication/readiness-receipts/${readiness.readiness_digest.slice(7)}`,
  };
  result.readiness.ledger.ref = readinessRef;
  result.packet.authority_refs.readiness_receipt_ref = readinessRef.uri;

  result.receipt.outcome = "rejected";
  result.receipt.publication_posture = null;
  result.receipt.publication_version = null;
  result.receipt_digest = digest(result.receipt);
  result.owner_receipt.digest = result.receipt_digest;
  result.history[0].event_type = "publication-rejected";
  result.history[0].readiness_ref = structuredClone(readinessRef);
  result.history[0].receipt_ref.digest = result.receipt_digest;

  result.state = "rejected";
  result.next_action = "correct-owner-evidence-and-submit-new-request";
  result.maintenance_projection.publication = {
    posture: command.previous_receipt.publication_posture,
    version: command.previous_receipt.publication_version,
    receipt_ref: structuredClone(command.previous_receipt),
  };
  result.maintenance_projection.evidence_posture.state = "blocked";
  result.maintenance_projection.evidence_posture.findings = [structuredClone(finding)];
  result.maintenance_projection.history = [{
    sequence: 1,
    action: "unpublish",
    publication_posture: command.previous_receipt.publication_posture,
    publication_version: command.previous_receipt.publication_version,
    receipt_ref: {
      id: command.previous_receipt.receipt_id,
      digest: command.previous_receipt.receipt_digest,
    },
    inventory_lifecycle_receipt_ref: null,
    inventory_history_event_ref: null,
    recorded_at: "2026-10-12T05:20:00.000Z",
  }];
  result.maintenance_projection.next_action = "correct-owner-evidence-and-submit-new-request";
  return result;
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


test("owner locator review builds native initial intent and consumes only an applied prior receipt", () => {
  const source = intent().manifest_source;
  const draft = { ...emptyOwnerPublicationDraft, repo: source.repo, path: source.path,
    sourceRevision: source.source_revision, manifestRevision: source.manifest_revision,
    manifestDigest: source.manifest_digest, reason: "Publish the exact owner evidence internally." };
  const initial = ownerPublicationIntent(draft, requestId, now, null);
  assert.equal(initial.expected_publication_version, 0);
  assert.equal(initial.previous_receipt, null);
  assert.equal(initial.target_publication.posture, "internal");
  assert.equal(Object.hasOwn(initial, "product_id"), false);
  assert.throws(() => ownerPublicationIntent({ ...draft, action: "archive" }, requestId, now, null), /prior publication/);
  const prior = resultFor(commandFor(intent()), "read");
  const update = ownerPublicationIntent({ ...draft, action: "update" }, requestId, now, prior);
  assert.equal(update.previous_receipt.receipt_digest, prior.receipt_digest);
  assert.equal(update.expected_publication_version, prior.receipt.publication_version);
  assert.throws(() => ownerPublicationIntent({ ...emptyOwnerPublicationDraft, action: "update", reason: "Fresh source required." }, requestId, now, prior));
});

test("new Publication observes current Registry authority while historical GET preserves the original receipt", async () => {
  const calls = [], current = "d".repeat(40);
  const fetchImpl = async (url, init) => {
    calls.push(init.method);
    if (String(url).endsWith("/v1/workspace-inventory/registry")) return canonicalSourceResponse({ ...workspaceRegistryFixture, authority_revision: current },
      { recordRef: "repo://workspace-governance/contracts/inventory", sourceOwner: "workspace-governance" });
    const command = JSON.parse(init.body);
    assert.equal(command.authority_revision, current);
    assert.deepEqual(command.security_decision, config.securityDecision);
    return Response.json(resultFor(command, "created"));
  };
  const result = await submitGovernedProductPublication(intent(), { attributionHeaders, config, fetchImpl });
  assert.equal(result.state, "applied"); assert.deepEqual(calls, ["GET", "POST"]);
  const reads = [];
  const historical = await readGovernedProductPublication(requestId, { attributionHeaders, config,
    fetchImpl: async (_url, init) => { reads.push(init.method); return Response.json({ ...result, resolution: "read" }); } });
  assert.equal(historical.command.authority_revision, current); assert.deepEqual(reads, ["GET"]);
});

test("missing or malformed Registry denies a new Publication before POST", async () => {
  for (const response of [Response.json({ error: "unavailable" }, { status: 503 }), Response.json({ authority_revision: "not-authority" })]) {
    const calls = [];
    await assert.rejects(submitGovernedProductPublication(intent(), { attributionHeaders, config,
      fetchImpl: async (_url, init) => { calls.push(init.method); return response; } }), error => error.code === "product_publication_authority_unavailable");
    assert.deepEqual(calls, ["GET"]);
  }
});
