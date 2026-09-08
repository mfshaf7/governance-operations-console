import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assertPrototypeLandingResult,
} from "../../src/domain-workspaces/prototype/live-runtime/prototype-landing-live-contract.ts";
import { projectPrototypeLanding } from "../../src/domain-workspaces/prototype/live-runtime/prototype-landing-live-projection.ts";
import { projectPrototypeEffectiveReadModel } from "../../src/domain-workspaces/prototype/local-runtime/prototype-effective-projection.ts";
import {
  PrototypeLandingClientError,
  prototypeLandingAllowsLocalFallback,
  prototypeLandingSourceIntent,
  prototypeLandingSubmissionIntent,
} from "../../src/domain-workspaces/prototype/live-runtime/use-prototype-landing-live-runtime.ts";
import { getPrototypeWorkspaceReadModel } from "../../src/domain-workspaces/prototype/read-model/prototype-workspace-read-model.ts";
import {
  buildPrototypeLandingCommand,
  preparePrototypeLanding,
  PrototypeLandingOosError,
  submitPrototypeLanding,
} from "../../src/domain-workspaces/prototype/server/prototype-landing-oos-client.ts";
import {
  prototypeLandingDraftFromRecord,
  prototypeLandingDraftKey,
} from "../../src/domain-workspaces/prototype/work-model/workflows/landing/prototype-landing-model.ts";

const digest = (character) => `sha256:${character.repeat(64)}`;
const authorityRevision = "1".repeat(40);
const mergeCommit = "9".repeat(40);
const config = {
  baseUrl: "http://127.0.0.1:8080",
  callerId: "governance-operations-console",
  callerSecret: "server-only-secret",
};

test("Prototype Landing prepares and submits a deterministic server-authorized command", async () => {
  const sourceRecord = landingRecord();
  const draft = prototypeLandingDraftFromRecord(sourceRecord);
  const prepared = preparation();
  const intent = prototypeLandingSubmissionIntent(
    { draft, draftKey: prototypeLandingDraftKey(draft), record: sourceRecord },
    {
      acceptedAt: "2026-09-07T12:00:00.000Z",
      requestId: "prototype-landing-request:client-review-portal:1",
    },
    prepared,
  );
  const calls = [];
  let submitted;
  const fetchImpl = async (url, init) => {
    calls.push({ init, url: String(url) });
    if (String(url).endsWith("/preparations")) return json(prepared);
    submitted = JSON.parse(String(init.body));
    return json(result(submitted, "accepted"), 202);
  };

  assert.deepEqual(
    await preparePrototypeLanding(intent.prototype_id, { config, fetchImpl }),
    prepared,
  );
  const accepted = await submitPrototypeLanding(intent, { config, fetchImpl });

  assert.equal(accepted.status, "accepted");
  assert.equal(submitted.request.operator_ref, config.callerId);
  assert.equal(submitted.request.prototype.name, draft.name);
  assert.equal(submitted.request.setup.support_profile, "interactive");
  assert.equal(submitted.entry_packet.ingress_class, "direct");
  assert.equal(submitted.plan.next_action, "candidate-promotion");
  assert.equal(calls.at(-1).init.headers["x-oos-caller-secret"], config.callerSecret);
  assert.doesNotMatch(JSON.stringify(submitted), /server-only-secret/);
  assert.match(submitted.request.request_digest, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(
    submitted,
    buildPrototypeLandingCommand(intent, prepared, config.callerId),
  );
  assert.equal(
    assertPrototypeLandingResult(result(submitted, "review-required")).next_action,
    "review-and-merge",
  );
});

test("Prototype Landing rejects stale authority before command submission", async () => {
  const sourceRecord = landingRecord();
  const draft = prototypeLandingDraftFromRecord(sourceRecord);
  const reviewed = preparation();
  const intent = prototypeLandingSubmissionIntent(
    { draft, draftKey: prototypeLandingDraftKey(draft), record: sourceRecord },
    {
      acceptedAt: "2026-09-07T12:00:00.000Z",
      requestId: "prototype-landing-request:client-review-portal:2",
    },
    reviewed,
  );
  let submissions = 0;
  await assert.rejects(
    submitPrototypeLanding(intent, {
      config,
      fetchImpl: async (url) => {
        if (!String(url).endsWith("/preparations")) submissions += 1;
        return json({
          ...reviewed,
          expected_state: {
            ...reviewed.expected_state,
            record_digest: digest("4"),
            record_present: true,
            registry_digest: digest("3"),
          },
        });
      },
    }),
    (error) =>
      error instanceof PrototypeLandingOosError &&
      error.code === "prototype_landing_review_stale" &&
      error.status === 409,
  );
  assert.equal(submissions, 0);
});

test("Prototype Landing projects only terminal merged Studio authority", () => {
  const sourceRecord = landingRecord();
  const draft = prototypeLandingDraftFromRecord(sourceRecord);
  const intent = prototypeLandingSubmissionIntent(
    { draft, draftKey: prototypeLandingDraftKey(draft), record: sourceRecord },
    {
      acceptedAt: "2026-09-07T12:00:00.000Z",
      requestId: "prototype-landing-request:client-review-portal:3",
    },
    preparation(),
  );
  const command = buildPrototypeLandingCommand(
    intent,
    preparation(),
    config.callerId,
  );
  const succeeded = result(command, "succeeded");
  assertPrototypeLandingResult(succeeded);

  const projected = projectPrototypeLanding({
    projection: {
      draft,
      draftKey: prototypeLandingDraftKey(draft),
      recordId: sourceRecord.id,
      result: succeeded,
    },
    record: sourceRecord,
  });

  assert.equal(projected.landing.state, "landed");
  assert.equal(projected.lifecycle, "exploring");
  assert.equal(projected.currentMove.id, "candidate-promotion");
  assert.equal(projected.projectionVersion, succeeded.receipt.receipt_digest);
  assert.equal(projected.receipts.at(-1).authority, "source-projected");
  assert.equal(projected.sourceRef, succeeded.readback.record.source.ref);

  const effective = projectPrototypeEffectiveReadModel({
    landingProjectionsByRecordId: {
      [sourceRecord.id]: {
        draft,
        draftKey: prototypeLandingDraftKey(draft),
        recordId: sourceRecord.id,
        result: succeeded,
      },
    },
    proposalEntryRecords: [],
    runtimeProjection: { localRequestRecords: [], receiptsByRecord: {} },
    sourceReadModel: { records: [sourceRecord] },
  });
  assert.equal(effective.readModel.records[0].landing.state, "landed");
  assert.equal(
    effective.readModel.records[0].projectionVersion,
    succeeded.receipt.receipt_digest,
  );
});

test("Prototype Landing fails closed on false success and unsupported source evidence", () => {
  const sourceRecord = landingRecord();
  const draft = prototypeLandingDraftFromRecord(sourceRecord);
  const intent = prototypeLandingSubmissionIntent(
    { draft, draftKey: prototypeLandingDraftKey(draft), record: sourceRecord },
    {
      acceptedAt: "2026-09-07T12:00:00.000Z",
      requestId: "prototype-landing-request:client-review-portal:4",
    },
    preparation(),
  );
  const command = buildPrototypeLandingCommand(intent, preparation(), config.callerId);
  assert.throws(
    () =>
      assertPrototypeLandingResult({
        ...result(command, "succeeded"),
        review: { ...review(), human_reviewed: false },
      }),
    /merged authority evidence/i,
  );
  assert.throws(
    () =>
      assertPrototypeLandingResult({
        ...result(command, "accepted"),
        next_action: "candidate-promotion",
      }),
    /status and next action/i,
  );
  const prepared = result(command, "review-required");
  assert.throws(
    () =>
      assertPrototypeLandingResult({
        ...prepared,
        preparation: {
          ...prepared.preparation,
          readback: {
            ...prepared.preparation.readback,
            source_revision: "git-tree:" + "7".repeat(40),
          },
        },
      }),
    /source preparation projection/i,
  );

  assert.throws(
    () =>
      prototypeLandingSourceIntent({
        ...sourceRecord,
        ingress: "existing-source",
        landing: { ...sourceRecord.landing, sourceHome: "existing-source" },
        projectionVersion: "prototype-v1",
        sourceRef: "repo://another-owner/sample",
      }),
    /immutable source revision/i,
  );
  assert.throws(
    () =>
      prototypeLandingSourceIntent({
        ...sourceRecord,
        ingress: "imported",
        sourceEvidence: {
          authority: "import-provider",
          importedContentDigest: null,
          originDigest: null,
          posture: "import-to-studio",
          revision: null,
        },
        sourceRef: "import://unstaged/sample",
      }),
    /staged import ref/i,
  );
});

test("Prototype Landing permits local simulation only for explicit missing configuration", () => {
  assert.equal(
    prototypeLandingAllowsLocalFallback(
      new PrototypeLandingClientError({
        code: "prototype_landing_live_mode_required",
        error: "Disconnected local preview.",
        retryable: false,
      }),
    ),
    true,
  );
  assert.equal(
    prototypeLandingAllowsLocalFallback(
      new PrototypeLandingClientError({
        code: "prototype_landing_oos_unavailable",
        error: "OOS unavailable.",
        retryable: true,
      }),
    ),
    false,
  );

  const browserSource = source(
    "../../src/domain-workspaces/prototype/live-runtime/use-prototype-landing-live-runtime.ts",
  );
  const serverSource = source(
    "../../src/domain-workspaces/prototype/server/prototype-landing-oos-client.ts",
  );
  assert.doesNotMatch(browserSource, /OOS_CALLER_SECRET|x-oos-caller-secret/);
  assert.match(serverSource, /OOS_CALLER_SECRET/);
  assert.doesNotMatch(serverSource, /api\.github\.com|openproject.*(?:POST|PUT|PATCH|DELETE)/is);
});

function landingRecord() {
  const record = getPrototypeWorkspaceReadModel().records.find(
    (candidate) => candidate.landing.state === "captured",
  );
  assert.ok(record);
  return structuredClone(record);
}

function preparation() {
  return {
    authority_revision: authorityRevision,
    canonical_authority: {
      branch: "main",
      registry_path: "prototypes.yaml",
      repo: "workspace-prototype-studio",
    },
    canonical_mutation: false,
    expected_state: {
      record_digest: null,
      record_present: false,
      registry_digest: digest("2"),
      source_revision: authorityRevision,
    },
    prototype_id: "prototype:client-review-portal",
    schema_version: 1,
    workflow_id: "prototype-landing",
  };
}

function result(command, status) {
  const successful = status === "succeeded";
  const sourcePrepared = successful || status === "review-required";
  const reviewValue = sourcePrepared ? review(successful) : null;
  const preparedReview = sourcePrepared ? review(false) : null;
  const preparedReadback = sourcePrepared
    ? readbackFixture(command, preparedReview, false)
    : null;
  const preparedReceipt = sourcePrepared
    ? receiptFixture(command, preparedReadback, preparedReview, false)
    : null;
  const readback = successful
    ? readbackFixture(command, reviewValue, true)
    : null;
  const receipt = successful
    ? receiptFixture(command, readback, reviewValue, true)
    : null;
  return {
    apply: sourcePrepared ? { artifact_type: "prototype-landing-apply" } : null,
    canonical_mutation: successful,
    entry_packet: command.entry_packet,
    execution_ref: command.execution_ref,
    failure: null,
    history: [
      {
        at: "2026-09-07T12:00:00.000Z",
        details: null,
        sequence: 1,
        status,
      },
    ],
    next_action: successful
      ? "candidate-promotion"
      : status === "review-required"
        ? "review-and-merge"
        : "continue",
    plan: command.plan,
    preparation: sourcePrepared
      ? {
          base_commit: preparedReview.base_commit,
          branch: preparedReview.branch,
          changed_paths: ["prototypes.yaml"],
          content_digest: digest("3"),
          file_count: 1,
          readback: preparedReadback,
          receipt: preparedReceipt,
        }
      : null,
    prototype_id: command.request.prototype.id,
    readback,
    readiness: sourcePrepared ? { outcome: "ready" } : null,
    receipt,
    request: command.request,
    request_id: command.request.request_id,
    review: reviewValue,
    revision: 1,
    runtime_activation: false,
    schema_version: 1,
    session_ref: command.session_ref,
    status,
    workflow_id: "prototype-landing",
  };
}

function review(merged = true) {
  return {
    base_branch: "main",
    base_commit: authorityRevision,
    branch: "landing/client-review-portal",
    head_commit: "8".repeat(40),
    human_reviewed: merged,
    merge_commit: merged ? mergeCommit : null,
    merged,
    number: 321,
    repository: "workspace-prototype-studio",
    state: merged ? "closed" : "open",
    url: "https://github.com/mfshaf7/workspace-prototype-studio/pull/321",
  };
}

function readbackFixture(command, reviewValue, merged) {
  const revision = merged ? mergeCommit : reviewValue.head_commit;
  return {
    artifact_type: "prototype-landing-readback",
    authority_state: merged ? "merged-authority" : "review-branch",
    observed_at: "2026-09-07T12:05:00.000Z",
    prototype_id: command.request.prototype.id,
    readback_digest: digest("7"),
    readback_id: "prototype-landing-readback:client-review-portal:3",
    record: {
      entry_ref: command.request.entry_packet_ref,
      id: command.request.prototype.id,
      ingress_class: command.entry_packet.ingress_class,
      lifecycle: "exploring",
      name: command.request.prototype.name,
      next_action: "candidate-promotion",
      objective: command.request.prototype.objective,
      project_phase: "incubating",
      setup: command.request.setup,
      source: {
        custody: "incubation-repo",
        posture: command.request.source_plan.posture,
        ref: command.request.source_plan.source_ref,
        revision,
      },
    },
    record_digest: digest("6"),
    registry_digest: digest("5"),
    schema_version: 1,
    source_branch: merged ? "main" : reviewValue.branch,
    source_revision: revision,
  };
}

function receiptFixture(command, readback, reviewValue, merged) {
  return {
    artifact_type: "prototype-landing-receipt",
    completed_at: "2026-09-07T12:05:00.000Z",
    next_action: {
      code: merged ? "candidate-promotion" : "review-source",
      owner_ref: merged
        ? "workspace-prototype-studio"
        : "operator-orchestration-service",
    },
    outcome: merged ? "succeeded" : "prepared",
    phase: merged ? "merged-authority" : "source-preparation",
    prototype_id: command.request.prototype.id,
    receipt_digest: digest("4"),
    receipt_id: "prototype-landing-receipt:client-review-portal:3",
    schema_version: 1,
    source_result: {
      branch: merged ? "main" : reviewValue.branch,
      record_digest: readback.record_digest,
      registry_digest: readback.registry_digest,
      repo: "workspace-prototype-studio",
      revision: readback.source_revision,
    },
  };
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}
