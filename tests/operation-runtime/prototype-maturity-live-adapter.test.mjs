import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { assertPrototypeMaturityResult } from "../../src/domain-workspaces/prototype/live-runtime/prototype-maturity-live-contract.ts";
import { projectPrototypeMaturity } from "../../src/domain-workspaces/prototype/live-runtime/prototype-maturity-live-projection.ts";
import {
  PrototypeMaturityClientError,
  prototypeMaturityAllowsLocalFallback,
  prototypeMaturityInputKey,
  prototypeMaturitySubmissionIntent,
} from "../../src/domain-workspaces/prototype/live-runtime/use-prototype-maturity-live-runtime.ts";
import { getPrototypeWorkspaceReadModel } from "../../src/domain-workspaces/prototype/read-model/prototype-workspace-read-model.ts";
import {
  buildPrototypeMaturityCommand,
  preparePrototypeMaturity,
  PrototypeMaturityOosError,
  submitPrototypeMaturity,
} from "../../src/domain-workspaces/prototype/server/prototype-maturity-oos-client.ts";

const digest = (character) => `sha256:${character.repeat(64)}`;
const revision = "1".repeat(40);
const mergeCommit = "9".repeat(40);
const config = {
  baseUrl: "http://127.0.0.1:8080",
  callerId: "governance-operations-console",
  callerSecret: "server-only-secret",
};

test("Prototype Maturity builds and submits one deterministic candidate command", async () => {
  const runInput = candidateRunInput();
  const intent = prototypeMaturitySubmissionIntent(
    runInput,
    {
      acceptedAt: "2026-09-10T04:00:00.000Z",
      requestId: "prototype-maturity-request:sample-tool:1",
    },
    preparation(),
  );
  const command = buildPrototypeMaturityCommand(
    intent,
    preparation(),
    config.callerId,
  );
  assert.deepEqual(Object.keys(command.request.inputs.editable_values).sort(), [
    "accepted-scope",
    "boundary-clarifications",
    "excluded-scope",
    "expected-proof",
    "open-issue-disposition",
    "prototype-objective",
    "target-user",
  ]);
  assert.deepEqual(
    command.packet.sections.map((section) => section.id),
    ["candidate-brief", "scope-and-non-goals", "boundaries-and-risks"],
  );
  assert.equal(command.request.operator_ref, config.callerId);
  assert.equal(command.request.expected_state.source_revision, revision);

  const calls = [];
  const result = acceptedResult(command);
  const submitted = await submitPrototypeMaturity(intent, {
    config,
    fetchImpl: async (url, init) => {
      calls.push({ body: init.body, headers: init.headers, method: init.method, url });
      return Response.json(calls.length === 1 ? preparation() : result, {
        status: calls.length === 1 ? 200 : 202,
      });
    },
  });
  assert.equal(submitted.request_id, intent.request_id);
  assert.equal(calls[0].url, `${config.baseUrl}/v1/prototype-maturity/preparations`);
  assert.equal(calls[1].url, `${config.baseUrl}/v1/prototype-maturity/requests`);
  assert.equal(calls[1].headers["x-oos-caller-secret"], config.callerSecret);
});

test("Prototype Maturity rejects stale review state before command submission", async () => {
  const input = candidateRunInput();
  const intent = prototypeMaturitySubmissionIntent(
    input,
    {
      acceptedAt: "2026-09-10T04:00:00.000Z",
      requestId: "prototype-maturity-request:sample-tool:2",
    },
    preparation(),
  );
  await assert.rejects(
    submitPrototypeMaturity(intent, {
      config,
      fetchImpl: async () =>
        Response.json({
          ...preparation(),
          authority_revision: "2".repeat(40),
          expected_state: {
            ...preparation().expected_state,
            source_revision: "2".repeat(40),
          },
        }),
    }),
    (error) =>
      error instanceof PrototypeMaturityOosError &&
      error.code === "prototype_maturity_review_stale",
  );
});

test("Prototype Maturity builds the authoritative Baseline Promotion shape", () => {
  const runInput = baselineRunInput();
  const reviewedPreparation = baselinePreparation();
  const intent = prototypeMaturitySubmissionIntent(
    runInput,
    {
      acceptedAt: "2026-09-10T04:00:00.000Z",
      requestId: "prototype-maturity-request:sample-tool:4",
    },
    reviewedPreparation,
  );
  const command = buildPrototypeMaturityCommand(
    intent,
    reviewedPreparation,
    config.callerId,
  );

  assert.equal(command.request.source_lifecycle, "candidate");
  assert.equal(command.request.target_lifecycle, "baseline-approved");
  assert.deepEqual(Object.keys(command.request.inputs.editable_values).sort(), [
    "accepted-summary",
    "baseline-statement",
    "baseline-title",
    "excluded-summary",
    "issue-and-risk-disposition",
    "missing-evidence-disposition",
    "selected-evidence-refs",
  ]);
  assert.deepEqual(
    command.packet.sections.map((section) => section.id),
    [
      "definition",
      "design-and-workflow",
      "evidence",
      "boundaries",
      "issues-and-risk-disposition",
    ],
  );
});

test("Prototype Maturity rejects a blocking Baseline decision without a visible blocker", () => {
  const runInput = baselineRunInput();
  assert.throws(
    () =>
      prototypeMaturitySubmissionIntent(
        {
          ...runInput,
          input: {
            ...runInput.input,
            input: { ...runInput.input.input, decision: "block-baseline" },
          },
        },
        {
          acceptedAt: "2026-09-10T04:00:00.000Z",
          requestId: "prototype-maturity-request:sample-tool:5",
        },
        baselinePreparation(),
      ),
    /blocker is invalid/i,
  );
});

test("Prototype Maturity projects lifecycle only from merged terminal authority", () => {
  const input = candidateRunInput();
  const intent = prototypeMaturitySubmissionIntent(
    input,
    {
      acceptedAt: "2026-09-10T04:00:00.000Z",
      requestId: "prototype-maturity-request:sample-tool:3",
    },
    preparation(),
  );
  const command = buildPrototypeMaturityCommand(
    intent,
    preparation(),
    config.callerId,
  );
  const accepted = acceptedResult(command);
  const unchanged = projectPrototypeMaturity({
    projection: {
      input: input.input,
      inputKey: input.inputKey,
      recordId: input.record.id,
      result: accepted,
    },
    record: input.record,
  });
  assert.equal(unchanged, input.record);

  const succeeded = succeededResult(command);
  assertPrototypeMaturityResult(succeeded);
  const projected = projectPrototypeMaturity({
    projection: {
      input: input.input,
      inputKey: input.inputKey,
      recordId: input.record.id,
      result: succeeded,
    },
    record: input.record,
  });
  assert.equal(projected.lifecycle, "candidate");
  assert.equal(projected.currentMove.id, "baseline-promotion");
  assert.equal(projected.projectionVersion, succeeded.receipt.receipt_digest);
  assert.equal(projected.receipts.at(-1).authority, "source-projected");

  assert.throws(
    () =>
      assertPrototypeMaturityResult({
        ...succeeded,
        review: { ...succeeded.review, human_reviewed: false },
      }),
    /reviewed merged authority/i,
  );
  assert.throws(
    () =>
      assertPrototypeMaturityResult({
        ...succeeded,
        canonical_mutation: false,
      }),
    /reviewed merged authority/i,
  );
});

test("Prototype Maturity permits fixture fallback only when live mode is absent", () => {
  assert.equal(
    prototypeMaturityAllowsLocalFallback(
      new PrototypeMaturityClientError({
        code: "prototype_maturity_live_mode_required",
        error: "Disconnected local preview.",
        retryable: false,
      }),
    ),
    true,
  );
  assert.equal(
    prototypeMaturityAllowsLocalFallback(
      new PrototypeMaturityClientError({
        code: "prototype_maturity_oos_unavailable",
        error: "OOS unavailable.",
        retryable: true,
      }),
    ),
    false,
  );
});

test("Prototype Maturity keeps credentials server-only and exposes full lifecycle routes", () => {
  const hook = readFileSync(
    new URL(
      "../../src/domain-workspaces/prototype/live-runtime/use-prototype-maturity-live-runtime.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const server = readFileSync(
    new URL(
      "../../src/domain-workspaces/prototype/server/prototype-maturity-oos-client.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(hook, /OOS_CALLER_SECRET|x-oos-caller-secret/);
  assert.match(server, /OOS_CALLER_SECRET/);
  for (const path of [
    "preparations",
    "requests",
    "decisions",
    "continue",
    "cancel",
  ]) {
    assert.match(`${hook}\n${server}`, new RegExp(path));
  }
});

test("Prototype Maturity preparation rejects malformed authority", async () => {
  await assert.rejects(
    preparePrototypeMaturity("prototype:sample-tool", "candidate-promotion", {
      config,
      fetchImpl: async () => Response.json({ ...preparation(), canonical_mutation: true }),
    }),
    (error) =>
      error instanceof PrototypeMaturityOosError &&
      error.code === "prototype_maturity_projection_invalid",
  );
});

function candidateRunInput() {
  const source = structuredClone(getPrototypeWorkspaceReadModel().records[0]);
  const record = {
    ...source,
    baseline: { ...source.baseline, evidenceRefs: [] },
    candidate: {
      ...source.candidate,
      decision: null,
      lastReceiptRef: null,
      state: "not-started",
    },
    currentMove: {
      actionLabel: "Open Candidate Promotion",
      detail: "Shape the landed prototype.",
      id: "candidate-promotion",
      label: "Candidate Promotion",
      tone: "warn",
    },
    evidence: [],
    id: "prototype:sample-tool",
    landing: {
      ...source.landing,
      lastLandingReceiptRef: "prototype-landing-receipt:sample-tool:1",
      state: "landed",
    },
    lifecycle: "exploring",
    openIssues: [],
    sourceRef: "repo://workspace-prototype-studio/prototypes/sample-tool",
  };
  const maturityInput = {
    input: {
      audience: { kind: "internal-user", label: "Workspace operator" },
      decision: "promote-candidate",
      objective: "Prove a bounded workflow.",
      proof: {
        criterion: "The reviewed flow behaves deterministically.",
        method: "technical-validation",
      },
      scope: {
        excluded: ["Production authority"],
        included: ["Local workflow"],
      },
    },
    transition: "candidate-promotion",
  };
  return {
    input: maturityInput,
    inputKey: prototypeMaturityInputKey(maturityInput),
    record,
  };
}

function baselineRunInput() {
  const candidate = candidateRunInput();
  const maturityInput = {
    input: {
      baselineStatement: "The bounded workflow is stable and reviewable.",
      baselineTitle: "Sample tool baseline",
      decision: "approve-baseline",
      evidenceDisposition: "Current evidence is sufficient for this baseline.",
      issueDisposition: "No visible issue blocks baseline approval.",
    },
    transition: "baseline-promotion",
  };
  return {
    input: maturityInput,
    inputKey: prototypeMaturityInputKey(maturityInput),
    record: {
      ...candidate.record,
      candidate: {
        ...candidate.record.candidate,
        decision: "promote-candidate",
        lastReceiptRef: "prototype-maturity-receipt:sample-tool:1",
        state: "candidate",
      },
      currentMove: {
        actionLabel: "Open Baseline Promotion",
        detail: "Review the candidate evidence.",
        id: "baseline-promotion",
        label: "Baseline Promotion",
        tone: "warn",
      },
      lifecycle: "candidate",
    },
  };
}

function preparation() {
  return {
    authority_revision: revision,
    canonical_authority: {
      branch: "main",
      registry_path: "prototypes.yaml",
      repo: "workspace-prototype-studio",
    },
    canonical_mutation: false,
    expected_state: {
      lifecycle: "exploring",
      record_digest: digest("2"),
      source_revision: revision,
    },
    prototype_id: "prototype:sample-tool",
    schema_version: 1,
    transition: "candidate-promotion",
    workflow_id: "prototype-maturity",
  };
}

function baselinePreparation() {
  return {
    ...preparation(),
    expected_state: {
      ...preparation().expected_state,
      lifecycle: "candidate",
    },
    transition: "baseline-promotion",
  };
}

function acceptedResult(command) {
  return {
    canonical_mutation: false,
    decision: null,
    execution_ref: command.execution_ref,
    failure: null,
    history: [
      {
        at: "2026-09-10T04:00:00.000Z",
        details: null,
        sequence: 1,
        status: "accepted",
      },
    ],
    next_action: "continue",
    packet: command.packet,
    preparation: null,
    prototype_id: command.request.prototype_id,
    readback: null,
    readiness: null,
    receipt: null,
    request: command.request,
    request_id: command.request.request_id,
    review: null,
    revision: 1,
    runtime_activation: false,
    schema_version: 1,
    session_ref: command.session_ref,
    status: "accepted",
    transition: command.request.transition,
    workflow_id: "prototype-maturity",
  };
}

function succeededResult(command) {
  const base = acceptedResult(command);
  const decisionRef = { digest: digest("4"), id: "prototype-maturity-decision:sample-tool:3" };
  const readback = {
    artifact_type: "prototype-maturity-readback",
    authority_state: "merged-authority",
    decision: "promote-candidate",
    decision_ref: decisionRef,
    observed_at: "2026-09-10T04:05:00.000Z",
    observed_lifecycle: "candidate",
    prototype_id: command.request.prototype_id,
    readback_digest: digest("6"),
    readback_id: "prototype-maturity-readback:sample-tool:3",
    record_digest: digest("5"),
    record_ref: "record://prototype-registry/sample-tool",
    schema_version: 1,
    source_revision: mergeCommit,
    transition: "candidate-promotion",
  };
  const receipt = {
    artifact_type: "prototype-maturity-receipt",
    completed_at: "2026-09-10T04:05:00.000Z",
    correlation_id: command.request.correlation_id,
    decision: "promote-candidate",
    decision_ref: decisionRef,
    idempotency_key: command.request.idempotency_key,
    next_action: {
      code: "baseline-promotion",
      owner_ref: "workspace-prototype-studio",
    },
    outcome: "succeeded",
    packet_ref: {
      digest: command.packet.packet_digest,
      id: command.packet.packet_id,
    },
    prototype_id: command.request.prototype_id,
    readback_ref: { digest: readback.readback_digest, id: readback.readback_id },
    readiness_ref: {
      digest: digest("3"),
      id: "prototype-maturity-readiness:sample-tool:3",
    },
    receipt_digest: digest("7"),
    receipt_id: "prototype-maturity-receipt:sample-tool:3",
    request_ref: {
      digest: command.request.request_digest,
      id: command.request.request_id,
    },
    resulting_lifecycle: "candidate",
    schema_version: 1,
    transition: "candidate-promotion",
  };
  return {
    ...base,
    canonical_mutation: true,
    decision: { decision: "promote-candidate" },
    history: [
      base.history[0],
      {
        at: "2026-09-10T04:01:00.000Z",
        details: null,
        sequence: 2,
        status: "succeeded",
      },
    ],
    next_action: "baseline-promotion",
    preparation: { branch: "prototype-maturity/sample-tool", file_count: 3 },
    readback,
    readiness: { readiness: { outcome: "ready" } },
    receipt,
    review: {
      base_branch: "main",
      base_commit: revision,
      branch: "prototype-maturity/sample-tool",
      head_commit: "8".repeat(40),
      human_reviewed: true,
      merge_commit: mergeCommit,
      merged: true,
      number: 42,
      repository: "workspace-prototype-studio",
      state: "closed",
      url: "https://github.com/mfshaf7/workspace-prototype-studio/pull/42",
    },
    revision: 2,
    status: "succeeded",
  };
}
