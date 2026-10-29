import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ownerAttentionSnapshot } from "../../src/console-integration/live-attention.ts";
import { projectWorkspacePulseSnapshot } from "../../src/command-center/read-model/workspace-pulse.ts";
import { buildResourceMetricDetail, formatCommitPercent } from "../../src/runtime-readiness/read-model/resource-read-model.ts";
import { buildRuntimeAlerts } from "../../src/runtime-readiness/read-model/runtime-alert-read-model.ts";
import { readConsoleOperatorIdentity } from "../../src/console-integration/identity/server/console-operator-identity-route.ts";
import { buildAgentWorkspaceContext, projectAgentOwnerSnapshot } from "../../src/console-shell/context/agent-workspace-context.ts";
import { projectPrototypeOwnerAttention } from "../../src/domain-workspaces/prototype/read-model/attention-source.ts";
import { prototypeWorkspaceReadModel } from "../../src/domain-workspaces/prototype/read-model/fixtures/prototype-workspace-read-model.fixture.ts";
import { prototypeClosureLifecycleOutcome } from "../../src/domain-workspaces/prototype/read-model/native-lifecycle-outcomes.ts";
import { composeLifecycleTransitionSnapshot, projectNativeTransition } from "../../src/lifecycle-transitions/read-model/native-transition-composition.ts";

test("unavailable, expired, future and malformed owner input cannot issue live attention", () => {
  const now = Date.now(), registration = { disposition: "admitted", id: "sample", label: "Sample", reason: "Synthetic test" };
  for (const read of [undefined, { state: "unavailable", payload: {}, capturedAt: new Date(now).toISOString() }, { state: "current", payload: {}, capturedAt: new Date(now - 120001).toISOString() }, { state: "current", payload: {}, capturedAt: new Date(now + 1).toISOString() }]) {
    const result = ownerAttentionSnapshot(registration, read, "sample-owner", () => { throw new Error("must not use missing facts"); }, now);
    assert.equal(result.source.freshness, read === undefined ? "loading" : "unavailable"); assert.deepEqual(result.candidates, []);
  }
});

test("current owner prototypes replace fixture priority while terminal and graduating records remain history", () => {
  const records = structuredClone(prototypeWorkspaceReadModel.records);
  const result = projectPrototypeOwnerAttention({ state: "current", capturedAt: new Date().toISOString(), payload: { mode: "live", projection: { readModel: { records } } } });
  assert.equal(result.source.freshness, "current");
  assert.ok(result.candidates.length > 0);
  for (const candidate of result.candidates) {
    const record = records.find(record => record.id === candidate.subject.ref);
    assert.ok(record); assert.ok(!["retired", "graduated", "graduating"].includes(record.lifecycle));
    assert.equal(candidate.source.mode, "live"); assert.equal(candidate.requiredMove.label, record.currentMove.label);
  }
});

test("an incomplete attention projection never certifies global zero or running work", () => {
  const projection = projectWorkspacePulseSnapshot({ schemaVersion: 1, projectedAt: new Date().toISOString(), projectionMode: "live", projectionAuthority: "sample", records: [], sources: [{ id: "missing", authority: "sample", intendedAuthority: "sample", label: "Missing", state: "unavailable", mode: "live", observedAt: null, reference: "sample://missing", route: null }] });
  for (const signal of projection.signals.filter(signal => signal.id !== "source-coverage")) {
    assert.equal(signal.value, "0+"); assert.equal(signal.stateLabel, "INCOMPLETE"); assert.match(signal.detail, /not a workspace total/);
  }
  assert.equal(projection.signals.find(signal => signal.id === "active-operations").label, "Required actions");
});

test("commit ratios above 100 percent stay informational in the card, selected chart and alerts", () => {
  const sample = { capturedAt: new Date().toISOString(), cpuPercent: 10, memoryPercent: 30, virtualMemoryPercent: 125, diskPercent: 20, networkKibps: 1, rxKibps: 1, txKibps: 0 };
  assert.equal(formatCommitPercent(125), "125%");
  const detail = buildResourceMetricDetail({ card: { label: "VMEM", value: "125%", detail: "Commit accounting", tone: "info" }, latest: null, samples: [sample], freshness: "live", sourceLabel: "Synthetic proc", sourceMode: "live" });
  assert.equal(detail.current, "125%"); assert.equal(detail.tone, "info"); assert.deepEqual(detail.referenceLines, []); assert.match(detail.operatorRead, /not measured RAM pressure/);
  const alerts = buildRuntimeAlerts({ components: [], latestSample: sample, resourceSourceState: "live", resourceSourceLabel: "Synthetic proc", error: null });
  assert.ok(!alerts.some(alert => /VMEM|commit/i.test(alert.label)));
});

test("Delivery page context distinguishes retained history from current work", () => {
  const now = new Date().toISOString();
  const read = projectAgentOwnerSnapshot("delivery", { mode: "live", projection: { projection_state: { status: "fresh" }, packages: [{ backend_status: "done" }, { backend_status: "parked" }, { backend_status: "retired" }, { backend_status: "in-progress" }] } }, now);
  const page = buildAgentWorkspaceContext({ delivery: read }, now, "DELIVERY");
  assert.equal(page.scope, "page"); assert.match(page.signals[0], /4 retained Delivery initiatives; 1 current/); assert.doesNotMatch(page.signals[0], /open Delivery|done excluded/);
});

test("Account identity matches enforcing source and clears on conflict, expiry or unsafe permissions", async () => {
  const root = await mkdtemp(join(tmpdir(), "console-session-display-")), path = join(root, "identity.json");
  const now = new Date(), earlier = new Date(now.getTime() - 1000).toISOString();
  const identity = { schemaVersion: "console-operator-identity/v1", access: { roles: ["Operator"], authorities: ["Workspace owner"], environment: "Dev integration" }, principal: { kind: "human", displayName: "Example operator", reference: "operator:example" }, source: { authority: "platform-engineering", mode: "live", freshness: "current", observedAt: earlier, reference: "platform-session-source://example" }, session: { mode: "Platform dev-integration", authenticationState: "authenticated", authenticatedAt: earlier, expiresAt: new Date(now.getTime() + 60000).toISOString(), reference: "platform-session://example" } };
  const env = { OOS_BASE_URL: "http://example.invalid", GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH: path, GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:example" };
  try {
    await writeFile(path, JSON.stringify(identity), { mode: 0o600 });
    assert.deepEqual((await readConsoleOperatorIdentity(env, now)).identity, identity);
    for (const result of [await readConsoleOperatorIdentity({ ...env, GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:other" }, now), await readConsoleOperatorIdentity(env, new Date(now.getTime() + 61000)), await readConsoleOperatorIdentity({ OOS_BASE_URL: env.OOS_BASE_URL }, now)]) {
      assert.equal(result.mode, "live"); assert.equal(result.identity.source.mode, "unavailable"); assert.deepEqual(result.identity.access.roles, []); assert.ok(!JSON.stringify(result).includes(path));
    }
    assert.equal((await readConsoleOperatorIdentity({}, now)).mode, "disconnected-preview");
    await chmod(path, 0o644);
    assert.equal((await readConsoleOperatorIdentity(env, now)).identity.source.mode, "unavailable");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("native handoff display preserves origin without manufacturing journal approval history", () => {
  const fact = { id: "native:example", routeId: "proposal-to-prototype", sourceId: "idea-42", sourceVersion: "packet:42", title: "Example", owner: "workspace-proposals", sourceRef: "openproject://work_packages/42", targetRef: "record://prototype-captures/proposal-42", receiptRef: "receipt://example", recordedAt: new Date().toISOString(), observationKind: "source-acknowledgement", evidenceRefs: ["receipt://example"], detail: "Source reports applied; target proof is not independently projected." };
  const native = projectNativeTransition(fact);
  assert.equal(native.state, "applied"); assert.equal(native.nativeEvidence.kind, "source-acknowledgement");
  assert.equal(native.validation.state, "not-projected"); assert.equal(native.admission.state, "not-projected");
  assert.equal(native.application.recordedAt, null); assert.equal(native.application.evidenceKind, null);
  assert.equal(native.nextAction, null); assert.deepEqual(native.authorityDecisions, []);
  assert.deepEqual(native.history.map(event => event.outcome), ["informational"]);
  const now = new Date().toISOString(), reads = { proposals: { state: "current", payload: {}, capturedAt: now }, prototypes: { state: "current", payload: {}, capturedAt: now } };
  const journal = { mode: "live", status: "current", observedAt: now, transitions: [], truncated: false, error: null };
  const projectors = { proposals: () => [fact], prototypes: () => [] };
  const combined = composeLifecycleTransitionSnapshot(journal, reads, projectors);
  assert.equal(combined.transitions.length, 1); assert.equal(journal.transitions.length, 0);
  const actualJournal = { ...native, transitionId: "lifecycle-transition:example", nativeEvidence: undefined };
  assert.equal(composeLifecycleTransitionSnapshot({ ...journal, transitions: [actualJournal] }, reads, projectors).transitions.length, 1);
  const expired = { ...reads, proposals: { ...reads.proposals, capturedAt: new Date(Date.now() - 121000).toISOString() } };
  const unavailable = composeLifecycleTransitionSnapshot(journal, expired, projectors);
  assert.equal(unavailable.transitions.length, 0); assert.equal(unavailable.truncated, true);
});

test("owner graduation evidence binds the exact prototype, target and receipt while later Closure actions preserve retained outcomes", () => {
  const digest = "a".repeat(64), receipt = `oos://receipts/prototype-delivery-application/${digest}`;
  const record = { id: "prototype-example", name: "Example", sourceRef: "record://prototypes/example" };
  const closure = { prototype_id: "example", status: "succeeded", action: "graduate-source", source_snapshot: { source_revision: "b".repeat(40) }, receipt: { receipt_id: "receipt://prototype-closure/example", outcome: "completed", observed_lifecycle: "graduated", recorded_at: new Date().toISOString() }, resolved_authority: { target_delivery_ref: null, verification: { state: "accepted", evidence_refs: [receipt] } }, readiness: { readiness: { evidence: [{ field: "accepted_delivery_target_receipt_ref", state: "accepted", owner_ref: "operator-orchestration-service", prototype_id: "example", ref: receipt, digest: `sha256:${digest}`, subject_ref: "openproject://work_packages/77" }] } } };
  const history = [closure, { ...closure, action: "retire" }].flatMap(row => prototypeClosureLifecycleOutcome(record, row));
  assert.equal(history.length, 1); assert.equal(history[0].targetRef, "openproject://work_packages/77"); assert.equal(history[0].receiptRef, receipt);
  assert.deepEqual(prototypeClosureLifecycleOutcome({ ...record, id: "prototype-other" }, closure), []);
  const noDelivery = { ...closure, resolved_authority: { verification: { state: "accepted", evidence_refs: ["repo://example/source"] } } };
  assert.deepEqual(prototypeClosureLifecycleOutcome(record, noDelivery), []);
  const wrongSubject = structuredClone(closure); wrongSubject.readiness.readiness.evidence[0].prototype_id = "other";
  assert.equal(prototypeClosureLifecycleOutcome(record, wrongSubject)[0].targetRef, null);
});
