import assert from "node:assert/strict";
import test from "node:test";
import { agentContextSources, buildAgentWorkspaceContext, projectAgentOwnerSnapshot } from "../../src/console-shell/context/agent-workspace-context.ts";
import { workspaceContextCandidate } from "../../src/console-shell/context/agent-context-candidates.ts";
import { evaluateAgentContextPolicy, agentContextBudgetLimitChars, projectAgentContextCandidate } from "../../src/agent-console/model/agent-context-policy.ts";
import { parseAgentContextRequest } from "../../src/agent-console/server/agent-request-policy.ts";
const now = "2026-10-25T01:00:00.000Z";
import { bodies } from "./agent-workspace-fixtures.mjs";
function snapshots() { return Object.fromEntries(Object.keys(agentContextSources).map(key => [key, projectAgentOwnerSnapshot(key, bodies[key], now)])); }
test("actual owner DTO shapes produce a bounded current whole-Console candidate accepted by the independent server", () => {
 const candidate = buildAgentWorkspaceContext(snapshots(), now);
 assert.equal(candidate.status, "8/8 sources current");
 assert.equal(candidate.scope, "workspace");
 assert.equal(parseAgentContextRequest({ candidate, mode: "workspace" }).mode, "workspace");
 assert.equal(evaluateAgentContextPolicy({ candidate, mode: "workspace" }).code, "cgg-required");
 assert.ok(JSON.stringify(projectAgentContextCandidate(candidate)).length <= agentContextBudgetLimitChars);
 assert.equal(candidate.signals.length, 8); assert.equal(candidate.refs.length, 8);
 assert.match(candidate.signals.join(" "), /example-backend\/example-model/);
 assert.doesNotMatch(JSON.stringify(candidate), /PRIVATE BODY|PRIVATE SOURCE PATH/);
});
test("all registered workspace pages have the correct Focus identity and pass the request contract; Workspace remains whole Console", () => {
 for (const id of ["dev-integration", "governed-releases", "lifecycle-transitions", "workspace-registry"]) {
  const page = buildAgentWorkspaceContext(snapshots(), now, id);
  assert.equal(page.id, `page:${id}`); assert.equal(page.scope, "page");
  assert.equal(parseAgentContextRequest({ candidate: page, mode: "focused" }).mode, "focused");
  assert.equal(evaluateAgentContextPolicy({ candidate: page, mode: "focused" }).code, "cgg-required");
  assert.ok("error" in parseAgentContextRequest({ candidate: page, mode: "workspace" }));
  const global = buildAgentWorkspaceContext(snapshots(), now);
  assert.equal(global.id, "workspace:console");
  assert.equal(evaluateAgentContextPolicy({ candidate: global, mode: "focused" }).code, "context-unavailable");
  assert.ok("error" in parseAgentContextRequest({ candidate: global, mode: "focused" }));
 }
 const registry = workspaceContextCandidate("workspace-registry");
 assert.equal(registry.id, "workspace:workspace-registry"); assert.equal(registry.title, "Workspace Registry");
});
test("missing, expired and preview owner reads never become live facts or require all owners to work", () => {
 const state = snapshots();
 state.delivery = { state: "unavailable", detail: "SECRET OR STALE FACT", capturedAt: now, revision: null };
 state.registry = { ...state.registry, capturedAt: "2026-10-25T00:57:59.000Z", detail: "STALE REGISTRY FACT" };
 state.proposals = projectAgentOwnerSnapshot("proposals", { mode: "disconnected-preview", records: [{ title: "FAKE FIXTURE" }] }, now);
 const global = buildAgentWorkspaceContext(state, now);
 assert.equal(global.status, "6/8 sources current");
 assert.doesNotMatch(JSON.stringify(global), /SECRET OR STALE FACT|FAKE FIXTURE/);
 assert.match(global.signals.join(" "), /delivery: unavailable.*proposals|proposals: preview only/s);
 const registry = buildAgentWorkspaceContext(state, now, "workspace-registry");
 assert.equal(registry.sourceMode, "unavailable"); assert.doesNotMatch(JSON.stringify(registry), /STALE REGISTRY FACT/);
 assert.ok("error" in parseAgentContextRequest({ candidate: registry, mode: "focused" }));
 const expired = buildAgentWorkspaceContext(snapshots(), "2026-10-25T01:02:01.000Z");
 assert.equal(expired.sourceMode, "unavailable");
 assert.equal(evaluateAgentContextPolicy({ candidate: expired, mode: "workspace" }).code, "workspace-unavailable");
});
test("owner failure, stale state and unexpected DTO shapes fail closed before projection", () => {
 for (const [key, body] of Object.entries(bodies)) {
  assert.throws(() => projectAgentOwnerSnapshot(key, { ...body, error: "failure" }, now));
  assert.throws(() => projectAgentOwnerSnapshot(key, { ...body, status: "stale" }, now));
  assert.throws(() => projectAgentOwnerSnapshot(key, {}, now));
 }
});
test("maximum summary and reference bounds still fit the unchanged model-context budget", () => {
 const state = snapshots();
 for (const entry of Object.values(state)) entry.detail = "x".repeat(160);
 const candidate = buildAgentWorkspaceContext(state, now);
 assert.ok(JSON.stringify(projectAgentContextCandidate(candidate)).length <= agentContextBudgetLimitChars);
 assert.equal(evaluateAgentContextPolicy({ candidate, mode: "workspace" }).code, "cgg-required");
 assert.equal(parseAgentContextRequest({ candidate, mode: "workspace" }).mode, "workspace");
});
