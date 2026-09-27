import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import test from "node:test";

import {
  composeGovernanceActivity,
} from "../../src/governance-activity/governance-activity-composer.ts";
import {
  listOosGovernanceActivity,
} from "../../src/governance-activity/governance-activity-oos-client.ts";
import {
  listWgcfGovernanceActivity,
} from "../../src/governance-activity/governance-activity-wgcf-client.ts";

test("OOS workflow activity is authenticated, validated, and projected without rewriting owner facts", async (context) => {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({
      callerId: request.headers["x-oos-caller-id"],
      callerSecret: request.headers["x-oos-caller-secret"],
      url: request.url,
    });
    sendJson(response, oosPage());
  });
  const baseUrl = await listen(server);
  context.after(() => server.close());

  const result = await listOosGovernanceActivity({ env: liveEnv(baseUrl) });

  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].eventId, "workflow-event:1");
  assert.deepEqual(result.events[0].nextActions, [
    { action: "inspect-receipt", ownerRef: "operator-orchestration-service", reviewAt: null },
  ]);
  assert.equal(result.sources[0].sourceId, "oos:lifecycle-transition");
  assert.deepEqual(requests, [{
    callerId: "governance-operations-console",
    callerSecret: "oos-test-secret",
    url: "/v1/workflow-activity?limit=100",
  }]);
});

test("WGCF history preserves authority, evidence routes, and explicit next action", async (context) => {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({
      callerId: request.headers["x-wgcf-caller-id"],
      callerSecret: request.headers["x-wgcf-caller-secret"],
      url: request.url,
    });
    sendJson(response, wgcfPage());
  });
  const baseUrl = await listen(server);
  context.after(() => server.close());

  const result = await listWgcfGovernanceActivity({
    env: liveEnv(baseUrl),
    now: new Date("2026-09-28T00:05:00.000Z"),
  });

  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].eventId, "wgcf:wgh_test");
  assert.equal(result.events[0].receiptRef, "wgcf://receipts/readiness-1");
  assert.deepEqual(result.events[0].nextActions, [
    { action: "repair-source", ownerRef: "owner-repo", reviewAt: null },
  ]);
  assert.equal(result.events[0].source.authority, "workspace-governance-control-fabric");
  assert.deepEqual(requests, [{
    callerId: "governance-operations-console",
    callerSecret: "wgcf-test-secret",
    url: "/v1/governance-history?limit=100",
  }]);
});

test("live composition remains explicitly partial when one owner is not configured", async (context) => {
  const server = createServer((_request, response) => sendJson(response, oosPage()));
  const baseUrl = await listen(server);
  context.after(() => server.close());

  const result = await composeGovernanceActivity({
    env: {
      OOS_BASE_URL: baseUrl,
      OOS_CALLER_SECRET: "oos-test-secret",
    },
    now: new Date("2026-09-28T00:05:00.000Z"),
  });

  assert.equal(result.mode, "live");
  assert.equal(result.status, "partial");
  assert.equal(result.events.length, 1);
  assert.equal(result.sources.find((source) => source.owner === "workspace-governance-control-fabric")?.state, "unavailable");
});

test("no configured owner returns disconnected preview and configured failure never substitutes fixtures", async () => {
  const disconnected = await composeGovernanceActivity({ env: {} });
  assert.equal(disconnected.mode, "disconnected-preview");
  assert.deepEqual(disconnected.events, []);

  const unavailable = await composeGovernanceActivity({
    env: {
      OOS_BASE_URL: "http://127.0.0.1:1",
      OOS_CALLER_SECRET: "oos-test-secret",
    },
  });
  assert.equal(unavailable.mode, "live");
  assert.equal(unavailable.status, "offline");
  assert.deepEqual(unavailable.events, []);
});

test("malformed and conflicting owner projections fail closed", async (context) => {
  const malformedServer = createServer((_request, response) => {
    sendJson(response, { ...oosPage(), events: [{ event_id: "missing-contract" }] });
  });
  const malformedUrl = await listen(malformedServer);
  context.after(() => malformedServer.close());
  await assert.rejects(
    listOosGovernanceActivity({ env: liveEnv(malformedUrl) }),
    /invalid|must be an object/i,
  );

  const conflictServer = createServer((request, response) => {
    if (request.url.startsWith("/v1/workflow-activity")) {
      const page = oosPage();
      page.events[0].event_id = "wgcf:wgh_test";
      sendJson(response, page);
      return;
    }
    sendJson(response, wgcfPage());
  });
  const conflictUrl = await listen(conflictServer);
  context.after(() => conflictServer.close());
  await assert.rejects(
    composeGovernanceActivity({ env: liveEnv(conflictUrl) }),
    /conflicting owner projections/i,
  );
});

test("browser activity runtime cannot read owner credentials and exports bounded projection metadata", () => {
  const browserSource = readFileSync(
    new URL("../../src/governance-activity/use-governance-activity-runtime.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(browserSource, /OOS_CALLER_SECRET|WGCF_CALLER_SECRET|x-oos-caller|x-wgcf-caller/);

  const panelSource = readFileSync(
    new URL("../../src/console-shell/presentation/console-activity-panel.tsx", import.meta.url),
    "utf8",
  );
  assert.match(panelSource, /projectionStatus: snapshot\.status/);
  assert.match(panelSource, /sources: snapshot\.sources/);
  assert.match(panelSource, /schemaVersion: 2/);
});

function oosPage() {
  return {
    artifact_type: "workflow-activity-page",
    events: [{
      action: { id: "transition.recorded", label: "Transition recorded" },
      actor: { kind: "agent", ref: "agent-gary" },
      causation_id: "command:1",
      category: "transition",
      correlation_id: "correlation:1",
      durability: "source-projected",
      event_id: "workflow-event:1",
      evidence_refs: ["oos://evidence/1"],
      next_actions: [{
        action: "inspect-receipt",
        owner_ref: "operator-orchestration-service",
        review_at: null,
      }],
      occurred_at: "2026-09-28T00:00:00.000Z",
      outcome: "succeeded",
      receipt_ref: "oos://receipt/1",
      source: {
        authority: "operator-orchestration-service",
        label: "Lifecycle transition",
        mode: "source-projected",
        owner: "operator-orchestration-service",
        ref: "lifecycle-transition:1",
        revision: "revision:1",
      },
      subject: { kind: "transition", label: "Proposal to Prototype", ref: "transition:1" },
      summary: "The transition was recorded.",
    }],
    filters: { category: null, outcome: null, source_id: null, subject_ref: null },
    next_cursor: null,
    observed_at: "2026-09-28T00:01:00.000Z",
    projection_status: "current",
    schema_version: 1,
    sources: [{
      authority: "operator-orchestration-service",
      error_code: null,
      event_count: 1,
      observed_at: "2026-09-28T00:01:00.000Z",
      owner: "operator-orchestration-service",
      source_id: "lifecycle-transition",
      source_revision: "revision:1",
      state: "current",
      truncated: false,
    }],
  };
}

function wgcfPage() {
  return {
    authority_boundary: authorityBoundary(),
    filters: { category: null, outcome: null, subject: null },
    page: { has_more: false, limit: 100, next_cursor: null, returned: 1 },
    projection_state: "complete",
    records: [{
      action: "readiness-evaluated",
      actor: "agent-gary",
      authority_boundary: authorityBoundary(),
      category: "readiness",
      evidence_routes: [
        { ref: "wgcf://receipts/readiness-1", route_type: "readiness-receipt" },
        { ref: "wgcf://runs/readiness-1", route_type: "validation-run" },
      ],
      freshness: "current",
      history_id: "wgh_test",
      metadata: { correlation_id: "correlation:1" },
      next_action: { action: "repair-source", owner_repo: "owner-repo" },
      occurred_at: "2026-09-28T00:02:00.000Z",
      outcome: "blocked",
      source: "readiness-receipts",
      subject: "delivery-900",
      summary: "Readiness is blocked by stale source evidence.",
    }],
    schema_version: 1,
    sources: [{
      category: "readiness",
      id: "readiness-receipts",
      reason_code: null,
      scanned: 1,
      state: "available",
      truncated: false,
    }],
  };
}

function authorityBoundary() {
  return {
    approval_source: false,
    owner_repo: "workspace-governance-control-fabric",
    role: "runtime-evidence-projection",
  };
}

function liveEnv(baseUrl) {
  return {
    OOS_BASE_URL: baseUrl,
    OOS_CALLER_ID: "governance-operations-console",
    OOS_CALLER_SECRET: "oos-test-secret",
    WGCF_BASE_URL: baseUrl,
    WGCF_CALLER_ID: "governance-operations-console",
    WGCF_CALLER_SECRET: "wgcf-test-secret",
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
