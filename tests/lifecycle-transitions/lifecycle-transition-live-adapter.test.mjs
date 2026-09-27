import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import test from "node:test";

import {
  projectLifecycleTransitionOwnerProjection,
} from "../../src/lifecycle-transitions/live-runtime/lifecycle-transition-live-contract.ts";
import {
  lifecycleTransitionOosConfigured,
  listLifecycleTransitionOwnerProjections,
} from "../../src/lifecycle-transitions/server/lifecycle-transition-oos-client.ts";

test("canonical OOS transition pages project WGCF readiness and exact owner action", async (context) => {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({
      accept: request.headers.accept,
      callerId: request.headers["x-oos-caller-id"],
      callerSecret: request.headers["x-oos-caller-secret"],
      url: request.url,
    });
    sendJson(response, {
      next_cursor: null,
      schema_version: 1,
      transitions: [ownerEnvelope()],
    });
  });
  const baseUrl = await listen(server);
  context.after(() => server.close());

  const result = await listLifecycleTransitionOwnerProjections({
    env: liveEnv(baseUrl),
  });

  assert.equal(result.transitions.length, 1);
  assert.equal(result.truncated, false);
  assert.equal(result.transitions[0].state, "blocked");
  assert.equal(result.transitions[0].validation.receiptRef, "wgcf://readiness/lifecycle-transition/sample");
  assert.equal(result.transitions[0].blockedGate?.requiredFix, "Refresh the source packet.");
  assert.deepEqual(result.transitions[0].nextAction, {
    action: "resolve-gate",
    ownerRef: "workspace-governance-control-fabric",
    reviewAt: null,
  });
  assert.equal(requests[0].callerId, "governance-operations-console");
  assert.equal(requests[0].callerSecret, "test-only-secret");
  assert.match(requests[0].accept, /console-source-projection/);
  assert.equal(requests[0].url, "/v1/lifecycle-transitions?limit=100");
});

test("live transition reads are bounded and preserve a continuation posture", async (context) => {
  let calls = 0;
  const server = createServer((request, response) => {
    calls += 1;
    const cursor = new URL(request.url, "http://localhost").searchParams.get("cursor");
    sendJson(response, {
      next_cursor: calls < 5 ? `transition-list:${calls}` : "transition-list:5",
      schema_version: 1,
      transitions: [ownerEnvelope(`sample-${cursor ?? "first"}`, calls)],
    });
  });
  const baseUrl = await listen(server);
  context.after(() => server.close());

  const result = await listLifecycleTransitionOwnerProjections({
    env: liveEnv(baseUrl),
  });

  assert.equal(calls, 5);
  assert.equal(result.transitions.length, 5);
  assert.equal(result.truncated, true);
});

test("stale or route-conflicting owner truth fails closed", async (context) => {
  const stale = ownerEnvelope("stale");
  stale.freshness.valid_until = "2020-01-01T00:00:00.000Z";
  const server = createServer((_request, response) => {
    sendJson(response, {
      next_cursor: null,
      schema_version: 1,
      transitions: [stale],
    });
  });
  const baseUrl = await listen(server);
  context.after(() => server.close());

  await assert.rejects(
    listLifecycleTransitionOwnerProjections({ env: liveEnv(baseUrl) }),
    /not current/i,
  );

  const conflicting = ownerEnvelope("conflicting").projection;
  conflicting.target.home_ref = "workspace-delivery-art";
  assert.throws(
    () => projectLifecycleTransitionOwnerProjection(conflicting),
    /target home is invalid/i,
  );
});

test("disconnected mode is explicit and browser code cannot read owner credentials", () => {
  assert.equal(lifecycleTransitionOosConfigured({}), false);
  assert.equal(
    lifecycleTransitionOosConfigured({
      OOS_BASE_URL: "http://127.0.0.1:3000",
      OOS_CALLER_SECRET: "configured",
    }),
    true,
  );
  const browserSource = readFileSync(
    new URL(
      "../../src/lifecycle-transitions/live-runtime/use-lifecycle-transition-live-runtime.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(browserSource, /OOS_CALLER_SECRET|x-oos-caller-secret/);
  assert.doesNotMatch(browserSource, /fixtures\//i);
});

function ownerEnvelope(suffix = "sample", sequence = 1) {
  const transitionId = `lifecycle-transition:${suffix}`;
  const observedAt = new Date().toISOString();
  const validUntil = new Date(Date.now() + 300_000).toISOString();
  return {
    artifact_type: "console-source-projection",
    binding: {
      authority: "operator-orchestration-service",
      record_ref: `lifecycle-transition://${transitionId}`,
      source_owner: "operator-orchestration-service",
      source_ref: `lifecycle-source://proposal-to-prototype/proposal-${suffix}`,
    },
    freshness: {
      observed_at: observedAt,
      state: "current",
      valid_until: validUntil,
    },
    projection: {
      admission: {
        reason_code: null,
        receipt_ref: null,
        recorded_at: null,
        state: "not-started",
        target_record_ref: null,
      },
      application: {
        adapter_ref: "prototype-ingress-adapter",
        evidence_kind: null,
        failure_code: null,
        failure_detail: null,
        receipt_ref: null,
        recorded_at: null,
        resulting_refs: [],
        retryable: null,
        run_ref: null,
        state: "not-started",
        target_record_ref: null,
      },
      authority_decisions: [],
      blocked_gate: {
        evidence_ref: "wgcf://readiness/lifecycle-transition/sample",
        gate_id: "source-current",
        owner_ref: "workspace-governance-control-fabric",
        required_fix: "Refresh the source packet.",
        state: "blocked",
      },
      cancelled_reason_code: null,
      correction: null,
      correlation_id: `correlation:${suffix}`,
      deferred: null,
      history: {
        entries: [
          {
            artifact_id: `prepared:${suffix}`,
            artifact_kind: "source-packet-prepared",
            authority: { owner_ref: "proposal", role: "source-domain" },
            evidence_refs: [`proposal://packet/${suffix}`],
            recorded_at: observedAt,
            sequence: 0,
          },
          {
            artifact_id: `blocked:${suffix}`,
            artifact_kind: "validation-completed",
            authority: {
              owner_ref: "workspace-governance-control-fabric",
              role: "validation-authority",
            },
            evidence_refs: ["wgcf://readiness/lifecycle-transition/sample"],
            recorded_at: observedAt,
            sequence,
          },
        ],
        next_cursor: null,
        truncated: false,
      },
      idempotency_key: `idempotency:${suffix}`,
      next_action: {
        action: "resolve-gate",
        owner_ref: "workspace-governance-control-fabric",
        review_at: null,
      },
      reason: { code: "prototype-needed", detail: "Validate the accepted proposal for Prototype." },
      rejection: null,
      route_id: "proposal-to-prototype",
      source: {
        domain: "proposal",
        owner_ref: "proposal",
        projection_version: "1",
        record_id: `proposal-${suffix}`,
        source_version: `version-${suffix}`,
      },
      state: "blocked",
      superseded_by_transition_id: null,
      supersedes_transition_id: null,
      target: {
        admission_owner_ref: "prototype-ingress-policy",
        application_owner_ref: "prototype-ingress-adapter",
        domain: "prototype",
        home_ref: "workspace-prototype-studio",
        ingress_ref: "prototype-ingress",
        lane_ref: "prototype-landing",
      },
      transition_id: transitionId,
      updated_at: observedAt,
      validation: {
        gates: [
          {
            evidence_ref: "wgcf://readiness/lifecycle-transition/sample",
            gate_id: "source-current",
            owner_ref: "workspace-governance-control-fabric",
            required_fix: "Refresh the source packet.",
            state: "blocked",
          },
        ],
        receipt_ref: "wgcf://readiness/lifecycle-transition/sample",
        run_ref: `wgcf-run://${suffix}`,
        state: "blocked",
      },
    },
    revision: {
      event_cursor: `lifecycle-transition:${suffix}:${sequence}`,
      event_sequence: sequence,
      source_revision: `sha256:${String(sequence).padStart(64, "a")}`,
    },
    schema_version: 1,
  };
}

function liveEnv(baseUrl) {
  return {
    OOS_BASE_URL: baseUrl,
    OOS_CALLER_ID: "governance-operations-console",
    OOS_CALLER_SECRET: "test-only-secret",
  };
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function sendJson(response, value) {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(value));
}
