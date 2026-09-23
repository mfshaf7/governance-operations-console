import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assertPrototypeClosureIntent,
  assertPrototypeClosurePreparation,
  assertPrototypeClosureRequestId,
  assertPrototypeClosureResult,
} from "../../src/domain-workspaces/prototype/live-runtime/prototype-closure-live-contract.ts";
import {
  buildPrototypeClosureCommand,
  cancelPrototypeClosure,
  continuePrototypeClosure,
  decidePrototypeClosure,
  preparePrototypeClosure,
  PrototypeClosureOosError,
  readPrototypeClosure,
  submitPrototypeClosure,
} from "../../src/domain-workspaces/prototype/server/prototype-closure-oos-client.ts";
import {
  closureActionsForLifecycle,
  closureFieldsComplete,
  closureFieldsForAction,
  initialClosureFields,
} from "../../src/domain-workspaces/prototype/work-model/workflows/closeout-retirement/prototype-closure-work-model.ts";
import {
  clearPrototypeClosureRequestPointer,
  readPrototypeClosureRequestPointer,
  writePrototypeClosureRequestPointer,
} from "../../src/domain-workspaces/prototype/local-runtime/prototype-closure-request-pointer.ts";

const revision = "1".repeat(40);
const digest = `sha256:${"2".repeat(64)}`;
const config = {
  baseUrl: "http://127.0.0.1:8080",
  callerId: "governance-operations-console",
  callerSecret: "server-only-test-secret",
};
const requestId = "prototype-closure-request:sample-tool:123";

function preparation(overrides = {}) {
  return {
    schema_version: 1,
    workflow_id: "prototype-closure",
    prototype_id: "sample-tool",
    authority_revision: revision,
    expected_state: {
      source_revision: revision,
      record_digest: digest,
      lifecycle: "candidate",
      source_custody: "incubation-repo",
      design_baseline_ref: null,
      delivery_packet_ref: null,
      accepted_delivery_target_receipt_ref: null,
      retirement_ref: null,
      project_phase: null,
    },
    history: [],
    canonical_authority: {
      repo: "workspace-prototype-studio",
      branch: "main",
      registry_path: "prototypes.yaml",
    },
    canonical_mutation: false,
    ...overrides,
  };
}

function intent(overrides = {}) {
  return {
    action: "retire-incubation",
    fields: {
      retirement_reason: "The experiment is no longer needed.",
      retention_plan_ref: "studio://retention/sample-tool",
      runtime_disposition_plan_ref: "platform://disposition/sample-tool",
    },
    preparation: preparation(),
    request_id: requestId,
    ...overrides,
  };
}

function acceptedResult(command) {
  return {
    schema_version: 1,
    workflow_id: "prototype-closure",
    request_id: requestId,
    prototype_id: "sample-tool",
    action: "retire-incubation",
    status: "accepted",
    next_action: "continue",
    revision: 1,
    request: command.request,
    source_snapshot: null,
    readiness: null,
    decision: null,
    resolved_authority: null,
    preparation: null,
    review: null,
    readback: null,
    runtime_disposition: null,
    receipt: null,
    failure: null,
    history: [{ sequence: 1, at: "2026-09-14T01:00:00Z", status: "accepted", details: null }],
    canonical_mutation: false,
    runtime_activation: true,
  };
}

test("Prototype Closure binds a reviewed Studio source and server operator", async () => {
  const calls = [];
  const command = buildPrototypeClosureCommand(assertPrototypeClosureIntent(intent()), config.callerId);
  const result = await submitPrototypeClosure(intent(), { config,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return Response.json(calls.length === 1 ? preparation() : acceptedResult(command),
        { status: calls.length === 1 ? 200 : 202 });
    },
  });
  assert.equal(result.status, "accepted");
  assert.equal(result.canonical_mutation, false);
  assert.equal(calls[0].url, `${config.baseUrl}/v1/prototype-closures/preparations`);
  assert.equal(calls[1].url, `${config.baseUrl}/v1/prototype-closures/requests`);
  assert.equal(calls[1].init.headers["x-oos-caller-secret"], config.callerSecret);
  assert.equal(JSON.parse(calls[1].init.body).request.operator_id, config.callerId);
  assert.equal(JSON.parse(calls[1].init.body).expected_record_digest, digest);
});

test("Prototype Closure refuses stale Studio authority before sending a command", async () => {
  let calls = 0;
  await assert.rejects(submitPrototypeClosure(intent(), { config,
    fetchImpl: async () => {
      calls += 1;
      return Response.json(preparation({ authority_revision: "3".repeat(40),
        expected_state: { ...preparation().expected_state, source_revision: "3".repeat(40) } }));
    },
  }), (error) => error instanceof PrototypeClosureOosError &&
    error.code === "prototype_closure_review_stale");
  assert.equal(calls, 1);
});

test("Prototype Closure rejects cross-action fields and unsafe references", () => {
  assert.throws(() => assertPrototypeClosureIntent(intent({
    fields: { ...intent().fields, target_kind: "new-delivery-epic" },
  })), /unknown field/);
  assert.throws(() => assertPrototypeClosureIntent(intent({
    fields: { ...intent().fields, retention_plan_ref: "plain text" },
  })), /owner-resolvable reference/);
  assert.equal(closureFieldsComplete("retire-incubation", intent().fields), true);
  assert.deepEqual(closureActionsForLifecycle("retired"), ["reopen-incubation"]);
  assert.deepEqual(closureActionsForLifecycle("graduated"), []);
});

test("Prototype Closure requires ingress owner evidence before Delivery apply", () => {
  const ownerEvidence = {
    accepted_baseline_receipt_ref:
      "oos://receipts/prototype-maturity/prototype-maturity-receipt:sample-tool:3",
    accepted_delivery_target_receipt_ref:
      "oos://receipts/prototype-delivery-application/sample-tool",
    target_delivery_ref: "openproject://work_packages/901",
  };
  const fields = initialClosureFields("apply-delivery", ownerEvidence);
  assert.deepEqual(fields, {
    ...ownerEvidence,
    target_kind: "new-delivery-epic",
  });
  assert.equal(closureFieldsComplete("apply-delivery", fields), true);
  assert.deepEqual(
    closureFieldsForAction("apply-delivery", fields).map((field) => field.key),
    [
      "accepted_baseline_receipt_ref",
      "target_delivery_ref",
      "accepted_delivery_target_receipt_ref",
    ],
  );
  assert.equal(
    closureFieldsComplete("apply-delivery", {
      ...fields,
      accepted_delivery_target_receipt_ref: undefined,
    }),
    false,
  );
  assert.throws(
    () =>
      assertPrototypeClosureIntent({
        action: "apply-delivery",
        fields: {
          accepted_baseline_receipt_ref:
            ownerEvidence.accepted_baseline_receipt_ref,
          target_delivery_ref: ownerEvidence.target_delivery_ref,
          target_kind: "new-delivery-epic",
        },
        preparation: preparation({
          expected_state: {
            ...preparation().expected_state,
            lifecycle: "baseline-approved",
          },
        }),
        request_id: requestId,
      }),
    /lacks action evidence/,
  );
});

test("Prototype Closure Console routes resolve JSON before validation", () => {
  const source = readFileSync(new URL(
    "../../src/domain-workspaces/prototype/server/prototype-closure-api-routes.ts",
    import.meta.url,
  ), "utf8");
  assert.match(source, /submitPrototypeClosure\(await request\.json\(\)/);
  assert.match(source, /decidePrototypeClosure\([\s\S]*await request\.json\(\)/);
});

test("Prototype Closure rejects false terminal claims without receipt and readback", () => {
  const command = buildPrototypeClosureCommand(assertPrototypeClosureIntent(intent()), config.callerId);
  assert.throws(() => assertPrototypeClosureResult({ ...acceptedResult(command),
    status: "succeeded", next_action: "inspect-receipt", canonical_mutation: true,
    history: [{ sequence: 1, at: "2026-09-14T01:00:00Z", status: "succeeded", details: null }],
  }, requestId), /terminal state and receipt outcome disagree/);
});

test("Prototype Closure projects a reviewed and merged terminal receipt", () => {
  const command = buildPrototypeClosureCommand(assertPrototypeClosureIntent(intent()), config.callerId);
  const result = assertPrototypeClosureResult({ ...acceptedResult(command),
    status: "succeeded", next_action: "inspect-receipt", canonical_mutation: true,
    source_snapshot: { source_revision: revision, record_digest: digest,
      lifecycle: "candidate", source_custody: "incubation-repo" },
    resolved_authority: { verification: { state: "accepted", source_revision: revision,
      evidence_refs: ["studio://authority/sample-tool"] },
      runtime_disposition_proof_ref: "platform://disposition/sample-tool" },
    review: { number: 42, url: "https://github.com/example/repo/pull/42", state: "closed",
      head_commit: "2".repeat(40), merged: true, merge_commit: "3".repeat(40),
      delegated_approval: { review_ref: "https://github.com/example/repo/pull/42#pullrequestreview-7",
        head_commit: "2".repeat(40), reviewer_login: "example",
        execution: "agent-gary-delegated" } },
    readback: { merged_source_revision: "3".repeat(40), observed_lifecycle: "retired",
      observed_source_custody: "incubation-repo" },
    receipt: { receipt_id: "prototype-closure-receipt:sample-tool", outcome: "completed",
      observed_lifecycle: "retired", observed_source_custody: "incubation-repo",
      recorded_at: "2026-09-14T01:00:00Z" },
    history: [{ sequence: 1, at: "2026-09-14T01:00:00Z", status: "succeeded", details: null }],
  }, requestId);
  assert.equal(result.receipt?.outcome, "completed");
  assert.equal(result.resolved_authority?.runtime_disposition_proof_ref,
    "platform://disposition/sample-tool");
  assert.equal(result.review?.human_reviewed, true);
  assert.throws(() => assertPrototypeClosureResult({ ...result,
    review: { ...result.review, head_commit: "2".repeat(40),
      delegated_approval: { review_ref: "https://github.com/example/repo/pull/42#pullrequestreview-7",
        head_commit: "2".repeat(40), reviewer_login: "example",
        execution: "agent-gary-delegated" } },
    readback: { ...result.readback, merged_source_revision: "4".repeat(40) },
  }, requestId), /reviewed source readback/);
});

test("Prototype Closure reads and resumes the exact OOS request", async () => {
  const command = buildPrototypeClosureCommand(assertPrototypeClosureIntent(intent()), config.callerId);
  const urls = [];
  const options = { config, fetchImpl: async (url) => {
    urls.push(url);
    return Response.json(acceptedResult(command));
  } };
  await readPrototypeClosure(requestId, options);
  await decidePrototypeClosure(requestId, { decision: "approve" }, options);
  await continuePrototypeClosure(requestId, options);
  await cancelPrototypeClosure(requestId, options);
  assert.deepEqual(urls, [
    `${config.baseUrl}/v1/prototype-closures/requests/${encodeURIComponent(requestId)}`,
    `${config.baseUrl}/v1/prototype-closures/requests/${encodeURIComponent(requestId)}/decisions`,
    `${config.baseUrl}/v1/prototype-closures/requests/${encodeURIComponent(requestId)}/continue`,
    `${config.baseUrl}/v1/prototype-closures/requests/${encodeURIComponent(requestId)}/cancel`,
  ]);
});

test("Prototype Closure preparation rejects a misleading source authority", () => {
  assert.throws(() => assertPrototypeClosurePreparation(preparation({
    canonical_authority: { repo: "other-repo", branch: "main", registry_path: "prototypes.yaml" },
  })), /unexpected source authority/);
});

test("Prototype Closure can inspect an OOS-issued history request identity", () => {
  assert.equal(assertPrototypeClosureRequestId("closure/owner-request:42"), "closure/owner-request:42");
  assert.throws(() => assertPrototypeClosureRequestId("closure\nrequest"), /invalid/);
});

test("Prototype Closure preparation reads only the selected Studio prototype", async () => {
  const calls = [];
  const result = await preparePrototypeClosure("sample-tool", { config,
    fetchImpl: async (_url, init) => {
      calls.push(init);
      return Response.json(preparation());
    },
  });
  assert.equal(result.prototype_id, "sample-tool");
  assert.deepEqual(JSON.parse(calls[0].body), { prototype_id: "sample-tool" });
});

test("Prototype Closure recovery stores only a request pointer", () => {
  const priorWindow = globalThis.window;
  const values = new Map();
  globalThis.window = { localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  } };
  try {
    writePrototypeClosureRequestPointer("sample-tool", requestId);
    assert.equal(readPrototypeClosureRequestPointer("sample-tool"), requestId);
    assert.equal(readPrototypeClosureRequestPointer("other-tool"), null);
    assert.deepEqual([...values.values()], [JSON.stringify(requestId)]);
    clearPrototypeClosureRequestPointer("sample-tool");
    assert.equal(readPrototypeClosureRequestPointer("sample-tool"), null);
  } finally {
    globalThis.window = priorWindow;
  }
});
