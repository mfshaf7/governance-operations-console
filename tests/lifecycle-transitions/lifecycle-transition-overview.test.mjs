import assert from "node:assert/strict";
import test from "node:test";

import { lifecycleTransitionArtifactFixtures } from "../../src/lifecycle-transitions/fixtures/lifecycle-transition-artifacts.fixture.ts";
import { projectLifecycleTransitions } from "../../src/lifecycle-transitions/read-model/lifecycle-transition-projector.ts";
import { buildLifecycleTransitionRouteOverviews } from "../../src/lifecycle-transitions/presentation/lifecycle-transition-overview-view-model.ts";
import {
  lifecycleTransitionRouteNavLabel,
  lifecycleTransitionTargetFact,
  lifecycleTransitionTitle,
  lifecycleTransitionWorkspaceMetrics,
} from "../../src/lifecycle-transitions/presentation/workspace/lifecycle-transitions-workspace-view-model.ts";
import { resolveLifecycleTransitionWorkbenchRoute } from "../../src/lifecycle-transitions/routing/lifecycle-transition-owner-route.ts";

const transitions = projectLifecycleTransitions(
  Object.values(lifecycleTransitionArtifactFixtures).flat(),
);
const routes = buildLifecycleTransitionRouteOverviews(transitions);

test("the overview exposes only the three locked routes", () => {
  assert.deepEqual(
    routes.map((route) => route.routeId),
    [
      "proposal-to-prototype",
      "proposal-to-delivery",
      "prototype-to-delivery",
    ],
  );
  assert.equal(
    routes.some((route) => route.targetLabel === "Portfolio"),
    false,
  );
});

test("every locked route remains visible when its count is zero", () => {
  const emptyRoutes = buildLifecycleTransitionRouteOverviews([]);

  assert.equal(emptyRoutes.length, 3);
  for (const route of emptyRoutes) {
    assert.equal(route.totalCount, 0);
    assert.equal(route.tone, "muted");
    assert.equal(route.statusLabel, "No records");
    assert.equal(route.summaryLabel, "No transition records");
  }
});

test("route summaries derive posture from transition truth", () => {
  const proposalToPrototype = routes[0];
  const proposalToDelivery = routes[1];
  const prototypeToDelivery = routes[2];

  assert.equal(proposalToPrototype.tone, "warn");
  assert.equal(proposalToPrototype.appliedCount, 1);
  assert.equal(proposalToPrototype.attentionCount, 2);
  assert.equal(proposalToDelivery.tone, "ok");
  assert.equal(proposalToDelivery.appliedCount, 1);
  assert.equal(prototypeToDelivery.tone, "danger");
  assert.equal(prototypeToDelivery.activeCount, 1);
  assert.equal(prototypeToDelivery.attentionCount, 1);
});

test("workspace summaries preserve all route outcomes without duplicating route names", () => {
  assert.deepEqual(
    lifecycleTransitionWorkspaceMetrics(routes[0]).map((metric) => metric.id),
    ["total", "active", "attention", "applied", "closed"],
  );
  assert.deepEqual(
    routes.map((route) => lifecycleTransitionRouteNavLabel(route.routeId)),
    ["Prototype", "Delivery", "Handoff"],
  );
});

test("selected transition context distinguishes a target home from target custody", () => {
  const returned = routes[0].items.find(
    (candidate) => candidate.state === "returned",
  );
  const applied = routes[0].items.find(
    (candidate) => candidate.state === "applied",
  );
  assert.ok(returned);
  assert.ok(applied);

  assert.deepEqual(lifecycleTransitionTargetFact(returned), {
    label: "Target home",
    value: "Prototype Studio",
  });
  assert.deepEqual(lifecycleTransitionTargetFact(applied), {
    label: "Target record",
    value: "PT-101",
  });
  assert.equal(lifecycleTransitionTitle(returned), "PR-404 to Prototype");
});

test("attention projections expose the actual correction or failure detail", () => {
  const returned = routes[0].items.find(
    (candidate) => candidate.state === "returned",
  );
  const failed = routes[2].items.find(
    (candidate) => candidate.state === "failed",
  );
  assert.ok(returned);
  assert.ok(failed);

  assert.equal(
    returned.attentionDetail,
    "Refresh the Proposal projection and prepare a superseding packet from the current source version.",
  );
  assert.equal(
    failed.attentionDetail,
    "The target adapter timed out before a target application receipt was recorded.",
  );
});

test("a returned source routes to the source workbench", () => {
  const item = routes[0].items.find((candidate) => candidate.state === "returned");
  assert.ok(item);

  const route = resolveLifecycleTransitionWorkbenchRoute({
    applicationRunRef: item.applicationRunRef,
    nextOwnerRef: item.nextAction?.ownerRef ?? null,
    sourceDomain: item.sourceDomain,
    sourceRecordId: item.sourceRecordId,
    targetDomain: item.targetDomain,
    targetRecordRef: item.targetRecordRef,
    transitionId: item.transitionId,
  });

  assert.equal(route.kind, "workbench");
  assert.equal(route.surfaceLabel, "PROPOSAL");
  assert.equal(route.contextRef, item.sourceRecordId);
});

test("a technical application failure routes to Orchestration", () => {
  const item = routes[2].items.find((candidate) => candidate.state === "failed");
  assert.ok(item);

  const route = resolveLifecycleTransitionWorkbenchRoute({
    applicationRunRef: item.applicationRunRef,
    nextOwnerRef: item.nextAction?.ownerRef ?? null,
    sourceDomain: item.sourceDomain,
    sourceRecordId: item.sourceRecordId,
    targetDomain: item.targetDomain,
    targetRecordRef: item.targetRecordRef,
    transitionId: item.transitionId,
  });

  assert.equal(route.kind, "workbench");
  assert.equal(route.surfaceLabel, "ORCHESTRATION");
  assert.equal(route.contextRef, item.applicationRunRef);
});

test("a named authority without an admitted console surface gets no fake action", () => {
  const item = routes[0].items.find(
    (candidate) => candidate.state === "awaiting-authority",
  );
  assert.ok(item);

  const route = resolveLifecycleTransitionWorkbenchRoute({
    applicationRunRef: item.applicationRunRef,
    nextOwnerRef: item.nextAction?.ownerRef ?? null,
    sourceDomain: item.sourceDomain,
    sourceRecordId: item.sourceRecordId,
    targetDomain: item.targetDomain,
    targetRecordRef: item.targetRecordRef,
    transitionId: item.transitionId,
  });

  assert.equal(route.kind, "unavailable");
  assert.equal(route.ownerRef, "security-architecture");
});

test("an applied transition routes to the target workspace for inspection", () => {
  const item = routes[1].items[0];
  assert.equal(item.state, "applied");
  assert.equal(item.nextAction, null);

  const route = resolveLifecycleTransitionWorkbenchRoute({
    applicationRunRef: item.applicationRunRef,
    nextOwnerRef: null,
    sourceDomain: item.sourceDomain,
    sourceRecordId: item.sourceRecordId,
    targetDomain: item.targetDomain,
    targetRecordRef: item.targetRecordRef,
    transitionId: item.transitionId,
  });

  assert.equal(route.kind, "workbench");
  assert.equal(route.surfaceLabel, "DELIVERY");
  assert.equal(route.contextRef, "delivery-intake://source/INT-205");
});
