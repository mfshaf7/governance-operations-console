import assert from "node:assert/strict";
import test from "node:test";

import {
  projectCommandCenterAttention,
} from "../../src/command-center/read-model/command-center-attention.ts";
import {
  commandCenterAttentionSourceRegistry,
} from "../../src/command-center/read-model/command-center-attention-source-registry.ts";

const projectedAt = "2026-07-28T00:00:00.000Z";

test("every current Workbench domain and Console workspace has an explicit Focus disposition", () => {
  const dispositionById = Object.fromEntries(
    commandCenterAttentionSourceRegistry.map((source) => [
      source.id,
      source.disposition,
    ]),
  );

  assert.deepEqual(
    {
      delivery: dispositionById.delivery,
      "dev-integration": dispositionById["dev-integration"],
      "governed-releases": dispositionById["governed-releases"],
      "lifecycle-transitions": dispositionById["lifecycle-transitions"],
      "model-operations": dispositionById["model-operations"],
      orchestration: dispositionById.orchestration,
      portfolio: dispositionById.portfolio,
      proposal: dispositionById.proposal,
      prototype: dispositionById.prototype,
      repository: dispositionById.repository,
    },
    {
      delivery: "admitted",
      "dev-integration": "admitted",
      "governed-releases": "admitted",
      "lifecycle-transitions": "admitted",
      "model-operations": "reserved",
      orchestration: "admitted",
      portfolio: "admitted",
      proposal: "admitted",
      prototype: "admitted",
      repository: "admitted",
    },
  );
});

test("Focus ranking is deterministic regardless of source order", () => {
  const low = candidate({
    candidateId: "low",
    ownerRank: 20,
    urgency: "low",
  });
  const critical = candidate({
    candidateId: "critical",
    ownerRank: 90,
    urgency: "critical",
  });
  const normal = candidate({
    candidateId: "normal",
    ownerRank: 1,
    urgency: "normal",
  });

  const forward = projectCommandCenterAttention(
    [source("one", [low, critical]), source("two", [normal])],
    projectedAt,
  );
  const reverse = projectCommandCenterAttention(
    [source("two", [normal]), source("one", [critical, low])],
    projectedAt,
  );

  assert.deepEqual(
    forward.candidates.map(({ candidateId }) => candidateId),
    ["critical", "normal", "low"],
  );
  assert.deepEqual(
    reverse.candidates.map(({ candidateId }) => candidateId),
    forward.candidates.map(({ candidateId }) => candidateId),
  );
  assert.equal(Object.hasOwn(critical, "tone"), false);
});

test("Focus deduplicates one required move in favor of the higher-ranked owner projection", () => {
  const lowerRank = candidate({
    candidateId: "proposal-copy",
    dedupeKey: "proposal-1:repository.resolve-proposal-gate",
    ownerRank: 40,
    urgency: "normal",
  });
  const ownerProjection = candidate({
    candidateId: "repository-owner",
    dedupeKey: "proposal-1:repository.resolve-proposal-gate",
    ownerRank: 10,
    urgency: "high",
  });
  const projection = projectCommandCenterAttention(
    [
      source("proposal", [lowerRank]),
      source("repository", [ownerProjection]),
    ],
    projectedAt,
  );

  assert.deepEqual(
    projection.candidates.map(({ candidateId }) => candidateId),
    ["repository-owner"],
  );
});

test("a stale source cannot retain an executable route", () => {
  const stale = candidate({
    candidateId: "stale",
    source: {
      authority: "owner-system",
      freshness: "stale",
      mode: "source-projected",
      observedAt: projectedAt,
      projectedAt,
      ref: "owner://record/stale",
      version: "1",
    },
  });
  const projection = projectCommandCenterAttention(
    [source("stale-source", [stale])],
    projectedAt,
  );

  assert.equal(projection.candidates[0].route.availability, "unavailable");
  assert.equal(projection.candidates[0].route.entryIntent, null);
  assert.match(
    projection.candidates[0].route.unavailableReason,
    /refresh owner truth/i,
  );
});

test("non-admitted sources cannot emit candidates", () => {
  const projection = projectCommandCenterAttention(
    [
      source("excluded", [candidate({ candidateId: "invalid-emission" })], {
        disposition: "excluded",
      }),
    ],
    projectedAt,
  );

  assert.equal(projection.candidates.length, 0);
  assert.equal(
    projection.issues[0].code,
    "non-admitted-source-emitted-candidates",
  );
});

function source(
  id,
  candidates,
  { disposition = "admitted" } = {},
) {
  return {
    candidates,
    registration: {
      disposition,
      id,
      label: id,
      reason: `${id} test source`,
    },
    schemaVersion: 1,
    source: {
      authority: "test-authority",
      freshness: "current",
      mode: "synthetic",
      observedAt: projectedAt,
      projectedAt,
      ref: `test://${id}`,
      version: "1",
    },
  };
}

function candidate(overrides = {}) {
  const candidateId = overrides.candidateId ?? "candidate";
  const sourceMetadata = {
    authority: "owner-system",
    freshness: "current",
    mode: "synthetic",
    observedAt: projectedAt,
    projectedAt,
    ref: "owner://record/1",
    version: "1",
  };

  return {
    attentionClass: "required-action",
    candidateId,
    correlationRef: null,
    dedupeKey: `${candidateId}:move`,
    dueAt: null,
    evidenceRefs: [],
    owner: {
      label: "Owner",
      ref: "owner://test",
    },
    ownerRank: 20,
    reason: "Complete the required owner move.",
    receiptRefs: [],
    requiredMove: {
      id: "owner.required-move",
      label: "Required Move",
    },
    reviewAt: null,
    route: {
      availability: "available",
      entryIntent: {
        mode: "review",
        requiredMoveRef: "owner.required-move",
        subjectRef: "subject-1",
        target: {
          id: "workbench:proposal",
          kind: "workbench-domain",
          surfaceLabel: "PROPOSAL",
        },
      },
      externalHref: null,
      label: "Open Owner",
      unavailableReason: null,
    },
    schemaVersion: 1,
    source: sourceMetadata,
    subject: {
      kind: "test",
      ref: "subject-1",
      title: "Subject One",
    },
    urgency: "normal",
    ...overrides,
    source: overrides.source ?? sourceMetadata,
  };
}
