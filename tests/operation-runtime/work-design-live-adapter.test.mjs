import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  applyWorkDesignDraft,
  readWorkDesignProjection,
  requestWorkDesignContextAdvice,
  requestWorkDesignTreeAdvice,
  workDesignOosConfigured,
  WorkDesignOosError,
} from "../../src/domain-workspaces/delivery/server/work-design-oos-client.ts";
import {
  assertWorkDesignOosProjection,
  workDesignLiveIdentity,
  workDesignLivePackageRef,
} from "../../src/domain-workspaces/delivery/live-runtime/work-design-live-contract.ts";

const env = {
  GOVERNANCE_CONSOLE_OPERATOR_HANDLE: "Console Owner",
  GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:console-owner",
  OOS_BASE_URL: "http://127.0.0.1:8080",
  OOS_CALLER_ID: "governance-operations-console",
  OOS_CALLER_SECRET: "test-only-server-secret",
};

test("case:work-design-projection-positive reads canonical version-zero source and durable history", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ init, url: String(url) });
    return jsonResponse(projection({ sourceRevision: "version-0" }));
  };

  const result = await readWorkDesignProjection("delivery-package:908", {
    env,
    fetchImpl,
  });

  assert.equal(result.source.revision, "version-0");
  assert.equal(result.latest_application.receipt.ref, receiptRef);
  assert.equal(
    calls[0].url,
    "http://127.0.0.1:8080/v1/delivery-work-design/delivery-package%3A908/projection?source_ref=openproject%3A%2F%2Fwork_packages%2F908",
  );
  assert.equal(calls[0].init.headers["x-oos-caller-secret"], "test-only-server-secret");
});

test("case:work-design-assist-positive binds context and tree advice to canonical source", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(String(init.body));
    calls.push({ body, url: String(url) });
    return jsonResponse(assistResult(body));
  };

  const context = await requestWorkDesignContextAdvice(
    "delivery-package:908",
    {
      contextDecision: "proceed",
      contextNote: "Shape the accepted package before Refinement.",
      operatorPrompt: "Check the context boundary.",
      sourceRevision: "version-17",
    },
    { env, fetchImpl },
  );
  const tree = await requestWorkDesignTreeAdvice(
    "delivery-package:908",
    {
      operatorPrompt: "Check the tree boundary.",
      selectedNodeId: "epic-908",
      sourceRevision: "version-17",
      tree: consoleTree(),
    },
    { env, fetchImpl },
  );

  assert.equal(context.task_kind, "context_advice");
  assert.equal(tree.task_kind, "tree_advice");
  assert.equal(calls[0].body.delivery_id, "delivery-908");
  assert.equal(calls[0].body.source_ref, "openproject://work_packages/908");
  assert.equal(calls[0].body.operator.id, "operator:console-owner");
  assert.equal(calls[0].body.context_draft.decision, "proceed");
  assert.equal(calls[1].body.tree_draft.tree.draft_body, "Epic draft body.");
  assert.equal(calls[1].body.tree_draft.tree.tone, undefined);
  assert.equal(
    calls[1].body.tree_draft.tree_digest,
    canonicalDigest(calls[1].body.tree_draft.tree),
  );
});

test("case:work-design-apply-positive preserves stable acceptance, exact draft, and durable receipt", async () => {
  const calls = [];
  const command = {
    acceptanceId: "work-design-acceptance:123e4567-e89b-12d3-a456-426614174000",
    acceptedAt: "2026-08-25T09:00:00.000Z",
    advisorEvidence: [
      {
        gatewayAuditRef: "local-ledger:work-design-908",
        responseId: "work-design-response:908",
      },
    ],
    note: "Apply the reviewed draft.",
    sourceRevision: "version-17",
    tree: consoleTree(),
  };
  const fetchImpl = async (_url, init) => {
    const body = JSON.parse(String(init.body));
    calls.push(body);
    return jsonResponse(applyResult(body));
  };

  const first = await applyWorkDesignDraft("delivery-package:908", command, {
    env,
    fetchImpl,
  });
  const replay = await applyWorkDesignDraft("delivery-package:908", command, {
    env,
    fetchImpl,
  });

  assert.equal(first.receipt.ref, receiptRef);
  assert.equal(replay.accepted_draft_digest, first.accepted_draft_digest);
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(calls[0].acceptance.accepted_by, "operator:console-owner");
  assert.equal(calls[0].idempotency_key, calls[1].idempotency_key);
  assert.equal(
    calls[0].accepted_draft.draft_digest,
    canonicalDigest(calls[0].accepted_draft.tree),
  );
});

test("case:work-design-adapter-negative rejects stale source and mismatched evidence without preview fallback", async () => {
  await assert.rejects(
    requestWorkDesignContextAdvice(
      "delivery-package:908",
      {
        contextDecision: "proceed",
        contextNote: "Stale context.",
        operatorPrompt: "Check the context.",
        sourceRevision: "version-16",
      },
      {
        env,
        fetchImpl: async () =>
          jsonResponse(
            {
              code: "accepted_draft_stale",
              correlation_id: "console-work-design-correlation:stale",
              message: "The Work Design source changed after this draft was created.",
              retryable: false,
              schema_version: 1,
            },
            409,
          ),
      },
    ),
    (error) =>
      error instanceof WorkDesignOosError &&
      error.code === "accepted_draft_stale" &&
      error.status === 409,
  );

  const mismatched = projection();
  mismatched.package_ref = "delivery-package:909";
  await assert.rejects(
    readWorkDesignProjection("delivery-package:908", {
      env,
      fetchImpl: async () => jsonResponse(mismatched),
    }),
    /different source/i,
  );

  const browserSource = readFileSync(
    new URL(
      "../../src/domain-workspaces/delivery/live-runtime/use-work-design-live-runtime.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(browserSource, /OOS_CALLER_SECRET/);
  assert.doesNotMatch(browserSource, /openproject.*(?:POST|PATCH|PUT|DELETE)/is);
  assert.match(browserSource, /disconnected-preview/);
  assert.match(browserSource, /throw workDesignClientError/);

  const controllerSource = readFileSync(
    new URL(
      "../../src/domain-workspaces/delivery/presentation/workflows/work-design/session-controller/use-work-design-session-controller.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(controllerSource, /projectionStatus === "current"/);
  assert.match(controllerSource, /applyReady: applyActionReady/);
});

test("Work Design configured mode fails closed without server credentials", async () => {
  assert.equal(workDesignOosConfigured({}), false);
  assert.equal(workDesignOosConfigured({ OOS_BASE_URL: env.OOS_BASE_URL }), true);
  await assert.rejects(
    readWorkDesignProjection("delivery-package:908", {
      env: { OOS_BASE_URL: env.OOS_BASE_URL },
      fetchImpl: async () => {
        throw new Error("fetch must not run without credentials");
      },
    }),
    (error) =>
      error instanceof WorkDesignOosError &&
      error.code === "work_design_oos_not_configured" &&
      error.status === 503,
  );
});

test("Work Design identity and projection contracts reject ambiguous records", () => {
  assert.deepEqual(workDesignLiveIdentity("delivery-package:908"), {
    deliveryId: "delivery-908",
    packageRef: "delivery-package:908",
    sourceRef: "openproject://work_packages/908",
  });
  assert.equal(workDesignLivePackageRef({ legacy_epic_id: 908 }), "delivery-package:908");
  assert.throws(() => workDesignLiveIdentity("pkg-design-908"), /identity is invalid/i);
  const malformed = projection();
  malformed.source.revision = "version-local";
  assert.throws(() => assertWorkDesignOosProjection(malformed), /source revision/i);
});

const receiptRef = "openproject://work_packages/908/activities/66";

function projection({ sourceRevision = "version-18" } = {}) {
  const result = applyResult({
    accepted_draft: { draft_digest: `sha256:${"a".repeat(64)}` },
    correlation_id: "console-work-design-correlation:908",
    request_id: "console-work-design-apply:908",
  });
  return {
    history: [result],
    latest_application: result,
    package_ref: "delivery-package:908",
    pending_application_id: null,
    projected_at: "2026-08-25T09:01:00.000Z",
    schema_version: 1,
    source: {
      ref: "openproject://work_packages/908",
      revision: sourceRevision,
    },
    state: "applied",
  };
}

function assistResult(request) {
  return {
    affected_node_id:
      request.task.kind === "tree_advice" ? "epic-908" : null,
    confidence: "medium",
    correlation_id: request.correlation_id,
    evidence: {
      cgg_packet_ref: "/v1/context/packets/work-design-908",
      gateway_audit_ref: "local-ledger:work-design-908",
      generated_at: "2026-08-25T09:00:00.000Z",
      model_profile_id: "delivery-work-design-advisor-v1",
      output_schema_ref:
        "platform-engineering/security/schemas/delivery-work-design-advice.schema.json",
      redaction_receipt_ref: "/v1/context/receipts/work-design-908",
      task_contract_ref: "oos.delivery-work-design.v1",
    },
    patch_proposal: null,
    request_id: request.request_id,
    required_operator_action: "review",
    response_id: `work-design-response:${request.task.kind}`,
    schema_version: 1,
    status: "ready",
    task_kind: request.task.kind,
    text: "Keep the Work Design boundary explicit.",
  };
}

function applyResult(request) {
  return {
    accepted_draft_digest: request.accepted_draft.draft_digest,
    application_id: "work-design-application:908",
    applied_at: "2026-08-25T09:00:30.000Z",
    applied_by: "operator:console-owner",
    correlation_id: request.correlation_id,
    receipt: {
      digest: `sha256:${"b".repeat(64)}`,
      ref: receiptRef,
    },
    request_id: request.request_id,
    schema_version: 1,
    status: "reconciled",
    target: {
      created_refs: [],
      delivery_ref: "openproject://work_packages/908",
      readback_complete: true,
      reused_refs: ["openproject://work_packages/908"],
      updated_refs: [],
    },
  };
}

function consoleTree() {
  return {
    children: [
      {
        children: [],
        description: "Feature description.",
        draftBody: "Feature draft body.",
        id: "feature-908",
        kind: "Feature",
        remark: "Feature remark.",
        title: "Feature 908",
        tone: "info",
      },
    ],
    description: "Epic description.",
    draftBody: "Epic draft body.",
    id: "epic-908",
    kind: "Epic",
    remark: "Epic remark.",
    title: "Epic 908",
    tone: "info",
  };
}

function canonicalDigest(value) {
  return `sha256:${createHash("sha256").update(canonicalStringify(value)).digest("hex")}`;
}

function canonicalStringify(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}
