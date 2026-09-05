import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { deliveryWorkspaceIntakeCandidate } from "../../src/domain-workspaces/delivery/presentation/surfaces/execution-board/action-session/closeout/delivery-workspace-intake-candidate.ts";
import {
  continueWorkspaceIntake,
  prepareWorkspaceIntake,
  submitWorkspaceIntake,
  WorkspaceIntakeOosError,
} from "../../src/console-integration/workspace-intake/server/workspace-intake-oos-client.ts";

const digest = (character) => `sha256:${character.repeat(64)}`;
const revision = "1".repeat(40);
const config = {
  baseUrl: "http://127.0.0.1:8080",
  callerId: "governance-operations-console",
  callerSecret: "server-only-secret",
};

test("case:console-adapters-positive prepares, submits, continues, and projects exact OOS evidence", async () => {
  const calls = [];
  let submitted;
  const fetchImpl = async (url, init) => {
    calls.push({ init, url: String(url) });
    if (String(url).endsWith("/preparations")) return json(preparation());
    if (String(url).endsWith("/continue")) {
      return json(result(submitted, "review-required", review()));
    }
    submitted = JSON.parse(String(init.body));
    return json(result(submitted, "accepted"), 202);
  };
  const options = {
    config,
    fetchImpl,
    now: () => new Date("2026-09-06T01:00:00.000Z"),
  };

  const prepared = await prepareWorkspaceIntake(candidate().target, options);
  const accepted = await submitWorkspaceIntake(intent(prepared), options);
  const progressed = await continueWorkspaceIntake(
    intent(prepared).request_id,
    options,
  );

  assert.equal(prepared.canonical_mutation, false);
  assert.equal(accepted.status, "accepted");
  assert.equal(progressed.status, "review-required");
  assert.equal(progressed.review.url, "https://github.com/mfshaf7/workspace-governance/pull/200");
  assert.equal(submitted.request.requester_ref, config.callerId);
  assert.equal(submitted.decision.operator_acceptance.operator_ref, config.callerId);
  assert.equal(submitted.request.action, "add");
  assert.equal(submitted.request.requested_classification, "admitted");
  assert.match(submitted.request.request_digest, /^sha256:[a-f0-9]{64}$/);
  assert.match(submitted.decision.decision_digest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(calls[1].init.headers["x-oos-caller-secret"], config.callerSecret);
  assert.doesNotMatch(JSON.stringify(submitted), /server-only-secret/);
});

test("case:console-adapters-negative rejects stale authority before command submission", async () => {
  let submissions = 0;
  const reviewed = preparation();
  const fetchImpl = async (url) => {
    if (!String(url).endsWith("/preparations")) submissions += 1;
    return json({ ...reviewed, authority_revision: "2".repeat(40) });
  };
  await assert.rejects(
    submitWorkspaceIntake(intent(reviewed), { config, fetchImpl }),
    (error) =>
      error instanceof WorkspaceIntakeOosError &&
      error.code === "workspace_intake_review_stale" &&
      error.status === 409,
  );
  assert.equal(submissions, 0);
});

test("case:workspace-intake-conflict-and-replay preserve one command identity", async () => {
  const reviewed = preparation();
  const bodies = [];
  const fetchImpl = async (url, init) => {
    if (String(url).endsWith("/preparations")) return json(reviewed);
    const body = JSON.parse(String(init.body));
    bodies.push(body);
    return json(result(body, "accepted"), 202);
  };
  const options = {
    config,
    fetchImpl,
    now: () => new Date("2026-09-06T01:00:00.000Z"),
  };
  await submitWorkspaceIntake(intent(reviewed), options);
  await submitWorkspaceIntake(intent(reviewed), options);
  assert.deepEqual(bodies[0], bodies[1]);

  await assert.rejects(
    submitWorkspaceIntake(intent(reviewed), {
      ...options,
      fetchImpl: async (url) =>
        String(url).endsWith("/preparations")
          ? json(reviewed)
          : json({ code: "workspace_intake_idempotency_conflict", message: "Identity conflict." }, 409),
    }),
    (error) =>
      error instanceof WorkspaceIntakeOosError &&
      error.code === "workspace_intake_idempotency_conflict" &&
      error.status === 409,
  );
});

test("case:workspace-intake-out-of-scope removes in-scope ownership metadata", async () => {
  const reviewed = preparation();
  let submitted;
  await submitWorkspaceIntake(
    { ...intent(reviewed), decision: "out-of-scope" },
    {
      config,
      fetchImpl: async (url, init) => {
        if (String(url).endsWith("/preparations")) return json(reviewed);
        submitted = JSON.parse(String(init.body));
        return json(result(submitted, "accepted"), 202);
      },
      now: () => new Date("2026-09-06T01:00:00.000Z"),
    },
  );
  assert.deepEqual(submitted.request.requested_record, {
    intended_endpoint: null,
    kind: "product",
    notes: candidate().requested_record.notes,
    platform_owner: null,
    runtime_owner: null,
    security_owner: null,
    source_owners: [],
  });
  assert.deepEqual(
    submitted.decision.outcome.approved_record,
    submitted.request.requested_record,
  );
});

test("case:workspace-intake-correction-and-rejection preserve authoritative next action", async () => {
  const command = commandFixture();
  for (const [status, nextAction] of [
    ["requires-action", "submit-corrected-request"],
    ["rejected", "submit-corrected-request"],
  ]) {
    const projected = await continueWorkspaceIntake(command.request.request_id, {
      config,
      fetchImpl: async () =>
        json({
          ...result(command, status),
          failure: {
            code: `workspace_intake_${status}`,
            message: "Correct the reported authority finding.",
            retryable: false,
          },
          next_action: nextAction,
        }),
    });
    assert.equal(projected.status, status);
    assert.equal(projected.next_action, nextAction);
  }
});

test("case:workspace-intake-receipt projects success only with review and merged readback", async () => {
  const command = commandFixture();
  const projected = await continueWorkspaceIntake(command.request.request_id, {
    config,
    fetchImpl: async () =>
      json({
        ...result(command, "succeeded", {
          ...review(),
          human_reviewed: true,
          merge_commit: "5".repeat(40),
          merged: true,
          state: "closed",
        }),
        canonical_mutation: true,
        history: [
          { at: "2026-09-06T01:00:00.000Z", details: null, sequence: 1, status: "accepted" },
          {
            at: "2026-09-06T01:10:00.000Z",
            details: { merge_commit: "5".repeat(40), receipt_digest: digest("e") },
            sequence: 2,
            status: "succeeded",
          },
        ],
        next_action: "complete",
        readback: { authority_state: "merged-authority" },
        receipt: {
          artifact_type: "workspace-intake-receipt",
          canonical_authority: {
            branch: "main",
            path: "contracts/intake-register.yaml",
            repo: "workspace-governance",
          },
          completed_at: "2026-09-06T01:10:00.000Z",
          outcome: "succeeded",
          phase: "merged-authority",
          receipt_digest: digest("e"),
          receipt_id: "intake-merged:console-test",
          schema_version: 2,
        },
        revision: 2,
      }),
  });
  assert.equal(projected.canonical_mutation, true);
  assert.equal(projected.receipt.phase, "merged-authority");
});

test("case:workspace-intake-delivery-source maps a durable closeout candidate without browser authority", () => {
  const mapped = deliveryWorkspaceIntakeCandidate(closeoutEvent());
  assert.equal(mapped.target.kind, "product");
  assert.equal(mapped.target.name, "governance-console");
  assert.equal(mapped.source.class, "delivery");
  assert.equal(mapped.source.digest, digest("a"));
  assert.deepEqual(mapped.requested_record.source_owners, ["governance-operations-console"]);

  const browser = source(
    "../../src/console-integration/workspace-intake/live-runtime/use-workspace-intake-live-runtime.ts",
  );
  const server = source(
    "../../src/console-integration/workspace-intake/server/workspace-intake-oos-client.ts",
  );
  const dialog = source(
    "../../src/console-integration/workspace-intake/presentation/workspace-intake-dialog.tsx",
  );
  const closeout = source(
    "../../src/domain-workspaces/delivery/presentation/surfaces/execution-board/action-session/closeout/execution-closeout-modal.tsx",
  );
  assert.doesNotMatch(browser, /OOS_CALLER_SECRET|x-oos-caller-secret/i);
  assert.doesNotMatch(browser, /workspace-governance\/contracts|api\.github\.com/i);
  assert.match(server, /OOS_CALLER_SECRET/);
  assert.match(server, /sameWorkspaceIntakePreparation/);
  assert.match(dialog, /Decision[\s\S]*Review[\s\S]*Result/);
  assert.match(closeout, /Classify Candidate/);
  assert.doesNotMatch(closeout, /OOS_CALLER_SECRET|api\.github\.com/i);
});

test("case:workspace-intake-result requires merged authority evidence before claiming mutation", async () => {
  const submitted = commandFixture();
  await assert.rejects(
    continueWorkspaceIntake(submitted.request.request_id, {
      config,
      fetchImpl: async () =>
        json({ ...result(submitted, "succeeded"), canonical_mutation: true }),
    }),
    /merged canonical receipt evidence/i,
  );
});

function candidate() {
  return {
    evidence_refs: ["review-packet://delivery-890/final"],
    label: "Governance Console",
    requested_record: {
      intended_endpoint: "console.local",
      kind: "product",
      notes: "Candidate emitted by a completed Delivery closeout.",
      platform_owner: "platform-engineering",
      runtime_owner: "governance-operations-console",
      security_owner: "security-architecture",
      source_owners: ["governance-operations-console"],
      validation_behavior: {
        catalog_refs: ["component-contracts"],
        notes: "Validate through the product owner repository.",
        posture: "owner-repo-validated",
        wgcf_graph_role: "product-readiness-aggregate",
      },
    },
    source: {
      class: "delivery",
      digest: digest("a"),
      ref: "delivery-closeout:delivery-890",
    },
    target: { kind: "product", name: "governance-console" },
  };
}

function preparation() {
  return {
    authority_revision: revision,
    canonical_authority: {
      branch: "main",
      path: "contracts/intake-register.yaml",
      repo: "workspace-governance",
    },
    canonical_mutation: false,
    expected_state: {
      record_digest: null,
      record_version: null,
      register_digest: digest("b"),
    },
    schema_version: 1,
    target: { kind: "product", name: "governance-console", record_id: "product:governance-console" },
    workflow_id: "workspace-intake",
  };
}

function intent(reviewedPreparation) {
  return {
    candidate: candidate(),
    decision: "admitted",
    request_id: "workspace-intake-request:console-test",
    reviewed_preparation: reviewedPreparation,
  };
}

function result(command, status, reviewValue = null) {
  return {
    canonical_mutation: false,
    decision: command.decision,
    execution_ref: command.execution_ref,
    failure: null,
    history: [{ at: "2026-09-06T01:00:00.000Z", details: null, sequence: 1, status }],
    next_action: status === "review-required" ? "review-and-merge" : "continue",
    readback: null,
    readiness: null,
    receipt: null,
    request: command.request,
    request_id: command.request.request_id,
    revision: 1,
    review: reviewValue,
    schema_version: 1,
    session_ref: command.session_ref,
    status,
    workflow_id: "workspace-intake",
  };
}

function review() {
  return {
    base_branch: "main",
    base_commit: revision,
    branch: `intake/${"3".repeat(64)}`,
    head_commit: "4".repeat(40),
    human_reviewed: false,
    merge_commit: null,
    merged: false,
    number: 200,
    repository: "workspace-governance",
    state: "open",
    url: "https://github.com/mfshaf7/workspace-governance/pull/200",
  };
}

function closeoutEvent() {
  return {
    impact: {
      candidate: {
        candidate_ref: "delivery://candidate/governance-console",
        candidate_version: "v1",
        canonical_key: "governance-console",
        correlation_ref: "delivery-closeout:delivery-890",
        entrant_kind: "product",
        evidence_refs: ["review-packet://delivery-890/final"],
        intake_metadata: { ...candidate().requested_record, notes: undefined, kind: undefined },
        name: "Governance Console",
        source_owner_ref: "repo://governance-operations-console",
      },
      kind: "workspace_entrant",
    },
    outcome_ref: "delivery-closeout:delivery-890",
    receipt: { digest: digest("a"), ref: "oos://receipt/delivery-890" },
    status: "applied",
  };
}

function commandFixture() {
  return {
    decision: { decision_digest: digest("d") },
    execution_ref: "console://workspace-intake/executions/test",
    request: {
      request_digest: digest("c"),
      request_id: "workspace-intake-request:console-test",
    },
    session_ref: "console://workspace-intake/sessions/test",
  };
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}
