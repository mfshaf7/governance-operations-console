import { projectPrototypeOwnerAttention } from "../../src/domain-workspaces/prototype/read-model/attention-source.ts";
import { projectOrchestrationOwnerAttention } from "../../src/domain-workspaces/orchestration/read-model/attention-source.ts";
import { ownerWorkspace, retainedRun } from "../support/orchestration-ui-fixture.mjs";
import assert from "node:assert/strict";
import { attentionCandidateTone, attentionFreshnessTone } from "../../src/command-center/read-model/attention-tone.ts";
import test from "node:test";

import {
  normalizeCommandCenterAttentionSourceForRuntime,
  projectCommandCenterAttention,
} from "../../src/command-center/read-model/command-center-attention.ts";
import {
  projectWorkspacePulseFromAttention,
} from "../../src/command-center/read-model/workspace-pulse.ts";
import {
  lifecycleTransitionProjectionFixtures,
} from "../../src/lifecycle-transitions/fixtures/lifecycle-transition-projections.fixture.ts";
import {
  projectLifecycleTransitionAttentionSnapshot,
} from "../../src/lifecycle-transitions/read-model/attention-source.ts";

const observedAt = "2026-09-27T18:00:00.000Z";

test("Lifecycle attention preserves explicit disconnected preview", () => {
  const snapshot = projectLifecycleTransitionAttentionSnapshot({
    error: null,
    mode: "disconnected-preview",
    observedAt,
    status: "current",
    transitions: [],
    truncated: false,
  });

  assert.equal(snapshot.source.mode, "synthetic");
  assert.equal(snapshot.source.authority, "workspace-prototype-studio");
  assert.match(snapshot.source.ref, /^fixture:\/\//);
  assert.ok(snapshot.candidates.length > 0);
});

test("Lifecycle attention uses current canonical owner projections", () => {
  const snapshot = projectLifecycleTransitionAttentionSnapshot({
    error: null,
    mode: "live",
    observedAt,
    status: "current",
    transitions: lifecycleTransitionProjectionFixtures,
    truncated: false,
  });

  assert.equal(snapshot.source.authority, "operator-orchestration-service");
  assert.equal(snapshot.source.freshness, "current");
  assert.equal(snapshot.source.mode, "source-projected");
  assert.equal(snapshot.source.observedAt, observedAt);
  assert.ok(
    snapshot.candidates.every(
      (candidate) =>
        candidate.source.authority === "operator-orchestration-service" &&
        candidate.source.mode === "source-projected",
    ),
  );
});

test("Partial and unavailable lifecycle reads cannot claim executable live attention", () => {
  const partial = projectLifecycleTransitionAttentionSnapshot({
    error: null,
    mode: "live",
    observedAt,
    status: "current",
    transitions: lifecycleTransitionProjectionFixtures,
    truncated: true,
  });
  const unavailable = projectLifecycleTransitionAttentionSnapshot({
    error: "owner unavailable",
    mode: "live",
    observedAt,
    status: "offline",
    transitions: [],
    truncated: false,
  });
  const projection = projectCommandCenterAttention([partial], observedAt);

  assert.equal(partial.source.freshness, "unverified");
  assert.ok(
    projection.candidates.every(
      (candidate) => candidate.route.availability === "unavailable",
    ),
  );
  assert.equal(unavailable.source.freshness, "unavailable");
  assert.deepEqual(unavailable.candidates, []);
});

test("Live composition suppresses fixture and prototype-local candidates", () => {
  for (const mode of ["synthetic", "prototype-local"]) {
    const normalized = normalizeCommandCenterAttentionSourceForRuntime(
      sourceSnapshot({ mode }),
      "live",
    );
    assert.equal(normalized.source.freshness, "unavailable");
    assert.deepEqual(normalized.candidates, []);
  }

  const preview = normalizeCommandCenterAttentionSourceForRuntime(
    sourceSnapshot({ mode: "synthetic" }),
    "disconnected-preview",
  );
  assert.equal(preview.source.freshness, "current");
  assert.equal(preview.candidates.length, 1);
});

test("Workspace Pulse derives from the same deduplicated attention snapshot", () => {
  const blocked = candidate({
    attentionClass: "recovery",
    candidateId: "blocked-owner",
    dedupeKey: "subject-1:repair",
    ownerRank: 10,
    requiredMove: { id: "repair", label: "Repair" },
    urgency: "critical",
  });
  const duplicate = candidate({
    candidateId: "duplicate-copy",
    dedupeKey: "subject-1:repair",
    ownerRank: 40,
    requiredMove: { id: "repair", label: "Repair" },
  });
  const decision = candidate({
    attentionClass: "decision",
    candidateId: "decision",
    dedupeKey: "subject-2:decide",
    requiredMove: { id: "decide", label: "Decide" },
  });
  const attention = projectCommandCenterAttention(
    [
      sourceSnapshot({ candidates: [blocked, decision], id: "owner" }),
      sourceSnapshot({ candidates: [duplicate], id: "copy" }),
    ],
    observedAt,
  );
  const pulse = projectWorkspacePulseFromAttention(attention);

  assert.equal(attention.candidates.length, 2);
  assert.equal(
    pulse.signals.find(({ id }) => id === "blocked-operations")?.value,
    "1",
  );
  assert.equal(
    pulse.signals.find(({ id }) => id === "required-decisions")?.value,
    "1",
  );
  assert.equal(pulse.posture.id, "blocked");
  assert.equal(pulse.projectionAuthority, "command-center-attention-composition");
});

test("Pulse exposes malformed source posture and unavailable routes", () => {
  const unavailableRoute = candidate({
    candidateId: "route-unavailable",
    route: {
      availability: "unavailable",
      entryIntent: null,
      externalHref: null,
      label: "Open Owner",
      unavailableReason: "Owner route is unavailable.",
    },
  });
  const invalid = sourceSnapshot({ id: "invalid" });
  invalid.source.authority = "";
  const attention = projectCommandCenterAttention(
    [sourceSnapshot({ candidates: [unavailableRoute], id: "owner" }), invalid],
    observedAt,
  );
  const pulse = projectWorkspacePulseFromAttention(attention);
  const record = pulse.signals
    .flatMap(({ records }) => records)
    .find(({ id }) => id === "attention:route-unavailable");

  assert.equal(record?.route, null);
  assert.equal(record?.timingLabel, "Route unavailable");
  assert.equal(
    pulse.sources.find(({ id }) => id === "invalid")?.state,
    "unverified",
  );
  assert.equal(pulse.posture.id, "stale");
});

function sourceSnapshot({
  candidates = [candidate()],
  id = "source",
  mode = "source-projected",
} = {}) {
  return {
    candidates,
    registration: {
      disposition: "admitted",
      id,
      label: id,
      reason: `${id} owner attention`,
    },
    schemaVersion: 1,
    source: {
      authority: `${id}-authority`,
      freshness: "current",
      mode,
      observedAt,
      projectedAt: observedAt,
      ref: `${id}://attention`,
      version: "1",
    },
  };
}

function candidate(overrides = {}) {
  const candidateId = overrides.candidateId ?? "candidate";
  return {
    attentionClass: "required-action",
    candidateId,
    correlationRef: null,
    dedupeKey: `${candidateId}:move`,
    dueAt: null,
    evidenceRefs: [],
    owner: { label: "Owner", ref: "owner://source" },
    ownerRank: 20,
    reason: "Complete the owner-issued move.",
    receiptRefs: [],
    requiredMove: { id: "move", label: "Move" },
    reviewAt: null,
    route: {
      availability: "available",
      entryIntent: {
        mode: "review",
        requiredMoveRef: "move",
        subjectRef: "subject-1",
        target: {
          id: "lifecycle-transitions",
          kind: "workspace",
          workspaceId: "lifecycle-transitions",
        },
      },
      externalHref: null,
      label: "Open Owner",
      unavailableReason: null,
    },
    schemaVersion: 1,
    source: {
      authority: "owner-authority",
      freshness: "current",
      mode: "source-projected",
      observedAt,
      projectedAt: observedAt,
      ref: "owner://record/1",
      version: "1",
    },
    subject: {
      kind: "test-record",
      ref: "subject-1",
      title: "Subject One",
    },
    urgency: "normal",
    ...overrides,
  };
}


test("attention category colours match Pulse records at every urgency without changing rank or classification", () => {
  for (const [attentionClass, expected] of [["required-action", "info"], ["external-follow-up", "info"], ["review", "warn"], ["decision", "warn"], ["recovery", "danger"]]) {
    for (const urgency of ["critical", "high", "normal", "low"]) {
      const record = candidate({ attentionClass, urgency });
      const before = structuredClone(record);
      const attention = projectCommandCenterAttention([sourceSnapshot({ candidates: [record] })], observedAt);
      const pulse = projectWorkspacePulseFromAttention(attention);
      const signal = pulse.signals.find(signal => signal.records.length);
      assert.equal(attentionCandidateTone(record), expected);
      assert.equal(signal.tone, expected);
      assert.equal(signal.records[0].tone, expected);
      assert.equal(attention.candidates[0].urgency, urgency);
      assert.deepEqual(record, before);
    }
  }
});

test("source reliability remains separate from category and partial coverage preserves known action colour", () => {
  const action = candidate({ attentionClass: "required-action", urgency: "high" });
  const source = sourceSnapshot({ candidates: [action] });
  const unavailable = sourceSnapshot({ id: "missing", candidates: [] });
  unavailable.source.freshness = "unavailable";
  const pulse = projectWorkspacePulseFromAttention(projectCommandCenterAttention([source, unavailable], observedAt));
  const signal = pulse.signals.find(signal => signal.id === "active-operations");
  assert.equal(signal.value, "1+"); assert.equal(signal.stateLabel, "INCOMPLETE"); assert.equal(signal.tone, "info");
  assert.equal(pulse.signals.find(signal => signal.id === "source-coverage").tone, "danger");
  for (const [freshness, expected] of [["current", "ok"], ["loading", "info"], ["stale", "stale"], ["unverified", "stale"], ["unavailable", "danger"]]) {
    assert.equal(attentionFreshnessTone(freshness), expected);
    if (freshness !== "current") assert.equal(attentionCandidateTone({ ...action, source: { ...action.source, freshness } }), expected);
  }
});


test("partial Prototype summaries never certify a complete zero-attention workspace",()=>{
 const capturedAt=new Date().toISOString();
 for(const marker of [{coverage:{complete:false}},{page:{next_cursor:"cursor:more"}},{projection:{ownerPage:{next_cursor:"cursor:more"}}}]){
  const payload={mode:"live",...marker,projection:{...marker.projection,readModel:{records:[]}}};
  const source=projectPrototypeOwnerAttention({state:"current",capturedAt,payload});
  assert.equal(source.source.freshness,"unverified");
  const pulse=projectWorkspacePulseFromAttention(projectCommandCenterAttention([source],capturedAt));
  assert.equal(pulse.signals.find(s=>s.id==="active-operations").value,"0+");
 }
});

test("the bounded Orchestration overview qualifies attention coverage instead of certifying a full workspace total",()=>{
 const payload=ownerWorkspace(),seed=retainedRun();
 payload.runs=Array.from({length:100},(_,i)=>JSON.parse(JSON.stringify(seed).replaceAll(seed.run_id,'run:window-'+i)));
 const source=projectOrchestrationOwnerAttention({state:"current",capturedAt:new Date().toISOString(),payload});
 assert.equal(source.source.freshness,"unverified");
});
