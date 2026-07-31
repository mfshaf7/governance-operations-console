import assert from "node:assert/strict";
import test from "node:test";

import {
  componentContextCandidate,
  pulseContextCandidate,
  resolveConsoleAgentContextCandidate,
  systemMoodContextCandidate,
} from "../../src/console-shell/context/agent-context-candidates.ts";

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
