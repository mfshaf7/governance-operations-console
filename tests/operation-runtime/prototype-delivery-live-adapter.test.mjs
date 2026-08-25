import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import test from "node:test";

import {
  assertPrototypeDeliveryApplicationId,
  applyPrototypeDeliveryApplication,
  PrototypeDeliveryOosError,
  readPrototypeDeliveryApplication,
} from "../../src/domain-workspaces/prototype/server/prototype-delivery-oos-client.ts";
import {
  assertPrototypeDeliveryApplicationResult,
  assertPrototypeDeliveryResultMatchesPacket,
} from "../../src/domain-workspaces/prototype/live-runtime/prototype-delivery-live-contract.ts";
import { projectPrototypeDeliveryApplication } from "../../src/domain-workspaces/prototype/live-runtime/prototype-delivery-live-projection.ts";
import { getPrototypeWorkspaceReadModel } from "../../src/domain-workspaces/prototype/read-model/prototype-workspace-read-model.ts";

const applicationDigest = "a".repeat(64);
const applicationId = `prototype-delivery-application:${applicationDigest}`;
const ingressId = `delivery-ingress:prototype:${"b".repeat(64)}`;

test("case:ingress-protocol-positive applies, replays, reads, and projects source-authoritative Delivery truth", async (context) => {
  const packet = prototypeDeliveryPacket();
  const requests = [];
  let applications = 0;
  const server = createServer(async (request, response) => {
    const body = await readRequestBody(request);
    requests.push({
      body,
      callerId: request.headers["x-oos-caller-id"],
      callerSecret: request.headers["x-oos-caller-secret"],
      method: request.method,
      url: request.url,
    });

    if (
      request.method === "POST" &&
      request.url === "/v1/delivery-ingress/prototype/applications"
    ) {
      applications += 1;
      sendJson(
        response,
        prototypeDeliveryApplicationResult({
          resolution: applications === 1 ? "created" : "reused",
        }),
        applications === 1 ? 201 : 200,
      );
      return;
    }
    if (
      request.method === "GET" &&
      decodeURIComponent(request.url) ===
        `/v1/delivery-ingress/prototype/applications/${applicationId}`
    ) {
      sendJson(
        response,
        prototypeDeliveryApplicationResult({ resolution: "read" }),
      );
      return;
    }
    sendJson(response, { code: "not_found", error: "Not found." }, 404);
  });
  const baseUrl = await listen(server);
  context.after(() => server.close());
  const env = {
    OOS_BASE_URL: baseUrl,
    OOS_CALLER_ID: "governance-operations-console",
    OOS_CALLER_SECRET: "test-only-server-secret",
  };
  const applicationRequest = {
    decisionRef: "console://prototype-delivery-decisions/sample-packet",
    packet,
  };

  const created = await applyPrototypeDeliveryApplication(applicationRequest, {
    env,
  });
  const replayed = await applyPrototypeDeliveryApplication(applicationRequest, {
    env,
  });
  const read = await readPrototypeDeliveryApplication(applicationId, { env });

  assert.equal(created.resolution, "created");
  assert.equal(replayed.resolution, "reused");
  assert.equal(read.resolution, "read");
  assert.equal(requests.length, 3);
  assert.equal(requests[0].callerId, "governance-operations-console");
  assert.equal(requests[0].callerSecret, "test-only-server-secret");
  assert.equal(requests[0].body.operator_decision.operator_id, "governance-operations-console");
  assert.notEqual(
    requests[0].body.operator_decision.operator_id,
    packet.content.authorization.operator_id,
  );
  assert.doesNotMatch(JSON.stringify(requests[0].body), /test-only-server-secret/);
  assert.deepEqual(requests[0].body, requests[1].body);

  const sourceRecord = structuredClone(
    getPrototypeWorkspaceReadModel().records.find(
      (record) => record.lifecycle === "baseline-approved",
    ),
  );
  assert.ok(sourceRecord);
  sourceRecord.id = "sample-prototype";
  sourceRecord.sourceRef = "record://prototypes/sample-prototype";
  const projected = projectPrototypeDeliveryApplication({
    projection: { packet, result: created },
    record: sourceRecord,
  });

  assert.equal(projected.lifecycle, "graduated");
  assert.equal(projected.movementRequest.state, "receipt-projected");
  assert.equal(projected.lastMovementReceiptRef, created.receipt.receipt_ref);
  assert.equal(projected.projectionFreshness, "current OOS Delivery application");
  assert.equal(projected.receipts.at(-1).authority, "source-projected");
  assert.equal(projected.linkedRecords.at(-1).ref, created.target.record_ref);
});

test("case:ingress-protocol-negative fails closed on OOS rejection and unproven result bindings", async (context) => {
  const packet = prototypeDeliveryPacket();
  const server = createServer((_request, response) => {
    sendJson(
      response,
      {
        code: "prototype_delivery_application_conflict",
        error: "The source packet conflicts with the recorded application.",
      },
      409,
    );
  });
  const baseUrl = await listen(server);
  context.after(() => server.close());
  const env = {
    OOS_BASE_URL: baseUrl,
    OOS_CALLER_ID: "governance-operations-console",
    OOS_CALLER_SECRET: "test-only-server-secret",
  };

  await assert.rejects(
    applyPrototypeDeliveryApplication(
      { decisionRef: "console://prototype-delivery-decisions/rejected", packet },
      { env },
    ),
    (error) =>
      error instanceof PrototypeDeliveryOosError &&
      error.status === 409 &&
      error.code === "prototype_delivery_application_conflict",
  );

  const malformed = prototypeDeliveryApplicationResult();
  malformed.readiness.outcome = "deny";
  assert.throws(
    () => assertPrototypeDeliveryApplicationResult(malformed),
    /readiness outcome is invalid/i,
  );

  const mismatched = prototypeDeliveryApplicationResult();
  mismatched.source.packet_digest = `sha256:${"f".repeat(64)}`;
  assert.throws(
    () => assertPrototypeDeliveryResultMatchesPacket({ packet, result: mismatched }),
    /does not match its source packet/i,
  );

  assert.throws(
    () => assertPrototypeDeliveryApplicationId("prototype-delivery-application:invalid"),
    (error) =>
      error instanceof PrototypeDeliveryOosError && error.status === 400,
  );

  const browserSource = readFileSync(
    new URL(
      "../../src/domain-workspaces/prototype/live-runtime/use-prototype-delivery-live-runtime.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const serverSource = readFileSync(
    new URL(
      "../../src/domain-workspaces/prototype/server/prototype-delivery-oos-client.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(browserSource, /fixtures\//i);
  assert.doesNotMatch(browserSource, /OOS_CALLER_SECRET/);
  assert.doesNotMatch(serverSource, /openproject.*(?:POST|PATCH|PUT|DELETE)/is);
  assert.match(serverSource, /x-oos-caller-secret/);
});

function prototypeDeliveryPacket() {
  return {
    content: {
      authorization: {
        decision: "approved",
        decision_ref: "prototype-studio://decisions/sample-prototype-delivery",
        operator_id: "operator:prototype-owner",
      },
      baseline: {
        baseline_id: "sample-prototype-baseline",
        record_digest: `sha256:${"c".repeat(64)}`,
        record_ref: "record://prototype-baselines/sample-prototype-baseline",
        schema_version: 1,
        version: "1",
      },
      custody: {
        classification: "existing-repo",
        owner: "workspace-prototype-studio",
        rationale: "The prototype has resolved source custody.",
        repository_gate_state: "resolved",
        repository_mode: "existing",
        source_ref: "repo://sample-prototype",
      },
      evidence_refs: ["evidence://sample-prototype/baseline-review"],
      intent: "governed-delivery",
      posture: {
        data_mode: "synthetic",
        mutation_boundary: "prototype-local",
        visibility_tier: "operator-review",
      },
      rationale: "Move the approved prototype baseline into governed Delivery.",
      source: {
        kind: "prototype",
        lifecycle: "baseline-approved",
        owner: "workspace-prototype-studio",
        prototype_id: "sample-prototype",
        record_ref: "record://prototypes/sample-prototype",
        record_version: "1".repeat(40),
        repository: "sample-prototype",
        revision: {
          base_commit: "2".repeat(40),
          head_commit: "3".repeat(40),
          ref: "refs/heads/main",
          tree: "4".repeat(40),
        },
      },
      target: "workspace-delivery-art",
      work: {
        excluded_scope: ["Production release"],
        included_scope: ["Admit the approved baseline"],
        objective: "Continue the prototype as governed delivery work.",
        remaining_work: ["Complete production wiring"],
        title: "Sample Prototype Delivery",
      },
    },
    packet_digest: `sha256:${"d".repeat(64)}`,
    packet_id: "sample-prototype-delivery",
    packet_ref: "record://delivery-packets/sample-prototype-delivery",
    schema_version: 1,
  };
}

function prototypeDeliveryApplicationResult({ resolution = "created" } = {}) {
  const packet = prototypeDeliveryPacket();
  return {
    application_id: applicationId,
    ingress_id: ingressId,
    operator_decision: {
      decision: "apply",
      decision_ref: "console://prototype-delivery-decisions/sample-packet",
      operator_id: "governance-operations-console",
    },
    readiness: {
      evaluated_at: "2026-08-25T00:00:00Z",
      outcome: "allow",
      receipt_id: "wgcf-receipt:sample-prototype-delivery",
      receipt_ref: {
        digest: `sha256:${"e".repeat(64)}`,
        uri: "wgcf://receipts/sample-prototype-delivery",
      },
    },
    receipt: {
      content_digest: `sha256:${"f".repeat(64)}`,
      custody: {
        backend: "openproject-activity",
        state: "durable",
        uri: "openproject://work_packages/901/activities/42",
      },
      owner: "operator-orchestration-service",
      receipt_ref: "oos://receipts/prototype-delivery/sample-prototype",
      recorded_at: "2026-08-25T00:00:01Z",
    },
    resolution,
    schema_version: 1,
    source: {
      baseline_ref: packet.content.baseline.record_ref,
      custody: packet.content.custody,
      packet_digest: packet.packet_digest,
      packet_ref: packet.packet_ref,
      prototype_id: packet.content.source.prototype_id,
      record_ref: packet.content.source.record_ref,
      record_version: packet.content.source.record_version,
    },
    target: {
      application_state: resolution === "reused" ? "reused" : "created",
      baseline_backlink_state: "recorded",
      owner_repo: "governance-operations-console",
      prototype_backlink_state: "recorded",
      record_project: "workspace-delivery-art",
      record_ref: "openproject://work_packages/901",
      record_system: "openproject",
      record_type: "delivery-epic",
      record_version: 7,
      source_receipt_state: "emitted",
    },
    workflow_id: "prototype-delivery-application",
  };
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return `http://127.0.0.1:${address.port}`;
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response, body, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}
