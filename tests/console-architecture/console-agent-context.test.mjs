import assert from "node:assert/strict";
import test from "node:test";

import {
  attentionContextCandidate,
  componentContextCandidate,
  pulseContextCandidate,
  resolveConsoleAgentContextCandidate,
  systemMoodContextCandidate,
} from "../../src/console-shell/context/agent-context-candidates.ts";
import { validateAgentRequest } from "../../src/agent-console/server/agent-request-policy.ts";
import { evaluateAgentContextPolicy } from "../../src/agent-console/model/agent-context-policy.ts";

const systemMood = {
  detail: "Synthetic readiness projection.",
  id: "clear",
  label: "CALM / NO FIRE",
  projectionAuthority: "workspace-prototype-studio",
  projectionLabel: "Prototype-local snapshot",
  projectionMode: "synthetic",
  sourceSummary: "6/6 fixture sources represented",
  tone: "ok",
};

function attentionWithEvidence(count) {
  return {
    candidateId: "owner-record:review",
    subject: { ref: "owner://record/one", title: "Owner record" },
    source: {
      ref: "owner://projection/one", authority: "Owner projection", mode: "live",
      freshness: "current", observedAt: "2026-10-25T00:00:00.000Z",
      projectedAt: "2026-10-25T00:00:00.000Z",
    },
    receiptRefs: ["owner://receipt/one"],
    evidenceRefs: Array.from({ length: count }, (_, i) => `owner://evidence/${i}`),
    requiredMove: { label: "Review evidence" }, owner: { label: "Owner" },
    urgency: "normal", attentionClass: "review", reason: "Review the owner evidence.",
  };
}

function validateFocus(candidate) {
  return validateAgentRequest({
    context: { candidate, mode: "focused" },
    invocationNonce: "550e8400-e29b-41d4-a716-446655440001",
    session: { nonce: "550e8400-e29b-41d4-a716-446655440000", openedAt: candidate.projectedAt },
    message: "Explain this selected record.",
  });
}

test("Focus producer and request contract agree at and beyond the reference limit", () => {
  for (const evidenceCount of [0, 5, 6, 48]) {
    const attention = attentionWithEvidence(evidenceCount);
    const original = structuredClone(attention);
    const candidate = attentionContextCandidate(attention);
    assert.equal(validateFocus(candidate).ok, true, JSON.stringify(validateFocus(candidate)));
    assert.equal(evaluateAgentContextPolicy({ candidate, mode: "focused" }).code, "cgg-required");
    assert.deepEqual(candidate.refs, [
      attention.subject.ref, attention.source.ref,
      ...attention.receiptRefs, ...attention.evidenceRefs,
    ].slice(0, 8));
    assert.deepEqual(attention, original, "the complete owner evidence must remain unchanged");
    if (evidenceCount > 5) {
      assert.match(candidate.signals.join(" "), /8 of .*unique references.*Focus/i);
    }
  }
});

test("Focus reference selection is stable and counts unique owner references", () => {
  const attention = attentionWithEvidence(5);
  attention.evidenceRefs.unshift(attention.subject.ref, attention.receiptRefs[0]);
  const candidate = attentionContextCandidate(attention);
  assert.equal(validateFocus(candidate).ok, true);
  assert.deepEqual(candidate.refs, [
    attention.subject.ref, attention.source.ref, attention.receiptRefs[0],
    ...attention.evidenceRefs.slice(2),
  ]);
  assert.equal(candidate.signals.some(signal => /unique references/.test(signal)), false);
});

test("Projection does not weaken independent request limits or secret rejection", () => {
  const candidate = attentionContextCandidate(attentionWithEvidence(5));
  const oversized = validateFocus({ ...candidate, refs: [...candidate.refs, "owner://extra"] });
  assert.equal(oversized.ok, false);
  assert.match(oversized.error, /refs must contain at most 8/);
  const secret = validateFocus({ ...candidate, refs: ["token=synthetic-sensitive-value"] });
  assert.equal(secret.ok, false);
  assert.match(secret.error, /secret-like/);
});

test("Full-screen workspace context takes priority over stale page selection", () => {
  const candidate = resolveConsoleAgentContextCandidate({
    activeWorkspaceId: "dev-integration",
    defaultContextSignals: [],
    selectedAlert: null,
    selectedComponent: {
      freshness: "current",
      href: null,
      label: "Stale page selection",
      observedAt: "2026-07-28T05:00:00.000Z",
      sourceAuthority: "Runtime source",
      sourceMode: "live",
      status: "online",
      surface: "runtime",
      tone: "ok",
    },
    selectedPulseSignal: null,
    selectedResourceMetric: null,
    selectedWorkbenchSurface: null,
    systemMood,
    systemMoodOpen: false,
  });

  assert.equal(candidate.id, "workspace:dev-integration");
  assert.equal(candidate.scope, "workspace");
  assert.equal(candidate.sourceMode, "synthetic");
});

test("Runtime source modes remain explicit on component candidates", () => {
  const live = componentContextCandidate({
    freshness: "current",
    href: null,
    label: "Runtime API",
    observedAt: "2026-07-28T05:00:00.000Z",
    sourceAuthority: "Runtime readiness adapter",
    sourceMode: "live",
    status: "online",
    surface: "runtime",
    tone: "ok",
  });
  const synthetic = componentContextCandidate({
    freshness: "scenario",
    href: null,
    label: "Runtime API",
    observedAt: null,
    sourceAuthority: "Runtime readiness fixture",
    sourceMode: "synthetic-scenario",
    status: "online",
    surface: "runtime",
    tone: "ok",
  });

  assert.equal(live.sourceMode, "live");
  assert.equal(synthetic.sourceMode, "synthetic");
});

test("Workspace Pulse context preserves projection authority and source mode", () => {
  const pulse = pulseContextCandidate({
    detail: "One operator decision needs review.",
    id: "required-decisions",
    label: "Required decisions",
    projectionAuthority: "workspace-prototype-studio",
    projectionLabel: "Prototype-local snapshot",
    projectionMode: "synthetic",
    sourceSummary: "6/6 fixture sources represented",
    stateLabel: "WAITING",
    tone: "warn",
    value: "1",
  });
  const mood = systemMoodContextCandidate({
    ...systemMood,
    projectionAuthority: "workspace-governance-control-fabric",
    projectionLabel: "Cached projection · 2026-07-28T05:00:00.000Z",
    projectionMode: "cached",
  });

  assert.equal(pulse.sourceAuthority, "workspace-prototype-studio");
  assert.equal(pulse.sourceMode, "synthetic");
  assert.equal(mood.sourceAuthority, "workspace-governance-control-fabric");
  assert.equal(mood.sourceMode, "source-projected");
});
