import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  closeGovernedAgentSession,
  invokeGovernedAgent,
  probeGovernedAgentPath,
} from "../../src/agent-console/server/agent-console-oos-client.ts";

const sessionNonce = "550e8400-e29b-41d4-a716-446655440000";
const invocationNonce = "550e8400-e29b-41d4-a716-446655440001";
const sessionToken = sessionNonce.replaceAll("-", "");
const invocationToken = invocationNonce.replaceAll("-", "");
const sessionId = `console-session:${sessionToken}:focused`;
const digest = `sha256:${"a".repeat(64)}`;

const config = {
  baseUrl: "http://127.0.0.1:8080",
  callerId: "governance-operations-console",
  callerSecret: "private-test-secret",
  operatorId: "operator:workspace-owner",
};

function input() {
  return {
    candidate: {
      boundary: "Read-only governed context.",
      freshness: "current",
      id: "page:record-1",
      observedAt: null,
      projectedAt: "2026-10-09T05:00:00.000Z",
      refs: ["console://records/record-1"],
      safeActions: ["Explain"],
      schemaVersion: 1,
      scope: "page",
      signals: ["state: ready"],
      sourceAuthority: "Canonical owner projection",
      sourceMode: "source-projected",
      status: "ready",
      summary: "Current bounded summary.",
      surfaceKind: "record",
      title: "Selected record",
    },
    invocationNonce,
    message: "Summarize the next move.",
    mode: "focused",
    session: { nonce: sessionNonce, openedAt: "2026-10-09T05:00:00.000Z" },
  };
}

function projection(overrides = {}) {
  return {
    schema_version: 1,
    workflow_id: "agent-console",
    session_id: sessionId,
    session_ref: { uri: `oos://agent-console/sessions/${sessionId}`, digest },
    revision: 1,
    state: "active",
    operator_id: config.operatorId,
    caller_id: config.callerId,
    agent: { logical_agent_id: "agent-console", instance_id: `console-agent:${sessionToken}` },
    interaction_mode: "focused",
    opened_at: input().session.openedAt,
    closed_at: null,
    current_invocation_id: null,
    current_action_id: null,
    invocation_count: 0,
    latest_invocation: null,
    latest_action_receipt_ref: null,
    ...overrides,
  };
}

function completedProjection() {
  return projection({
    revision: 2,
    invocation_count: 1,
    latest_invocation: {
      invocation_id: `console-invocation:${invocationToken}`,
      correlation_id: `console-correlation:${invocationToken}`,
      state: "completed",
      requested_at: "2026-10-09T05:00:01.000Z",
      completed_at: "2026-10-09T05:00:02.000Z",
      request_digest: digest,
      context: {
        packet_ref: "cgg://packets/agent-console-1",
        redaction_receipt_ref: "cgg://receipts/redaction-1",
        projection_receipt_ref: "cgg://receipts/projection-1",
        artifact_digest: digest,
      },
      model: {
        profile_id: "agent-console-assistant-v1",
        binding_selection_ref: "platform://profiles/agent-console-assistant-v1",
        audit_ref: "gateway://audit/agent-console-1",
      },
      result: { text: "The admitted context is healthy." },
      failure: null,
      receipt_ref: { uri: "oos://agent-console/receipts/invocation-1", digest },
      replayed: false,
    },
  });
}

test("case:agent-console-console-protocol-positive binds session, CGG, profile, and receipts", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ body: init.body ? JSON.parse(String(init.body)) : null, headers: new Headers(init.headers), url: String(url) });
    return Response.json(calls.length === 1 ? projection() : completedProjection(), { status: calls.length === 1 ? 201 : 200 });
  };
  const result = await invokeGovernedAgent(input(), {
    config,
    fetchImpl,
    now: () => new Date("2026-10-09T05:00:01.000Z"),
  });
  assert.equal(result.text, "The admitted context is healthy.");
  assert.equal(result.modelProfileId, "agent-console-assistant-v1");
  assert.equal(result.projectionReceiptRef, "cgg://receipts/projection-1");
  assert.equal(result.receiptRef, "oos://agent-console/receipts/invocation-1");
  assert.match(calls[0].url, /\/v1\/agent-console\/sessions$/);
  assert.match(calls[1].url, /\/invocations$/);
  assert.equal(calls[0].headers.get("x-oos-caller-secret"), "private-test-secret");
  assert.equal(calls[0].body.operator_id, config.operatorId);
  assert.equal(calls[1].body.candidate.source_authority, "governance-operations-console");
  assert.equal(
    calls[1].body.candidate.content_digest,
    `sha256:${createHash("sha256").update(calls[1].body.candidate.content).digest("hex")}`,
  );
});

test("case:agent-console-console-protocol-negative rejects wrong caller, profile, receipt, and upstream denial", async () => {
  await assert.rejects(
    invokeGovernedAgent(input(), {
      config,
      fetchImpl: async () => Response.json(projection({ caller_id: "wrong-caller" }), { status: 201 }),
    }),
    (error) => error.code === "agent_console_projection_invalid",
  );
  const wrongProfile = completedProjection();
  wrongProfile.latest_invocation.model.profile_id = "unapproved-profile";
  const missingReceipt = completedProjection();
  missingReceipt.latest_invocation.receipt_ref = null;

  for (const second of [wrongProfile, missingReceipt]) {
    let call = 0;
    await assert.rejects(
      invokeGovernedAgent(input(), {
        config,
        fetchImpl: async () => Response.json(++call === 1 ? projection() : second, { status: call === 1 ? 201 : 200 }),
      }),
      (error) => error.code === "agent_console_projection_invalid",
    );
  }

  await assert.rejects(
    invokeGovernedAgent(input(), {
      config,
      fetchImpl: async () => Response.json({ code: "agent_console_operator_binding_invalid", message: "Denied." }, { status: 403 }),
    }),
    (error) => error.status === 403 && error.code === "agent_console_operator_binding_invalid",
  );
});

test("session close reads the exact revision before closing and treats absence as clean", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ body: init.body ? JSON.parse(String(init.body)) : null, url: String(url) });
    return Response.json(calls.length === 1 ? projection({ revision: 4 }) : projection({ revision: 5, state: "closed" }));
  };
  assert.deepEqual(await closeGovernedAgentSession(input(), { config, fetchImpl }), { closed: true });
  assert.equal(calls[1].body.expected_revision, 4);

  assert.deepEqual(await closeGovernedAgentSession(input(), {
    config,
    fetchImpl: async () => Response.json({ code: "agent_console_session_not_found", message: "Not found." }, { status: 404 }),
  }), { closed: false });
});

test("governed path probe distinguishes ready and unavailable OOS", async () => {
  assert.deepEqual(await probeGovernedAgentPath({ config, fetchImpl: async () => new Response("ok") }), {
    profileId: "agent-console-assistant-v1",
  });
  await assert.rejects(
    probeGovernedAgentPath({ config, fetchImpl: async () => new Response("no", { status: 503 }) }),
    (error) => error.code === "agent_console_oos_not_ready",
  );
});
