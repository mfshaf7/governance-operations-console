import assert from "node:assert/strict";
import test from "node:test";

import { lifecycleTransitionArtifactFixtures } from "../../src/lifecycle-transitions/fixtures/lifecycle-transition-artifacts.fixture.ts";
import { LIFECYCLE_TRANSITION_ROUTES } from "../../src/lifecycle-transitions/model/lifecycle-transition-routes.ts";
import {
  projectLifecycleTransition,
  projectLifecycleTransitions,
} from "../../src/lifecycle-transitions/read-model/lifecycle-transition-projector.ts";
import {
  selectLifecycleTransitionsRequiringAction,
  summarizeLifecycleTransitionStates,
} from "../../src/lifecycle-transitions/read-model/lifecycle-transition-selectors.ts";

test("the route registry contains only the three locked lifecycle routes", () => {
  assert.deepEqual(Object.keys(LIFECYCLE_TRANSITION_ROUTES).sort(), [
    "proposal-to-delivery",
    "proposal-to-prototype",
    "prototype-to-delivery",
  ]);
  assert.equal(
    LIFECYCLE_TRANSITION_ROUTES["proposal-to-delivery"]
      .completionEvidence,
    "target-admission-receipt",
  );
  assert.equal(
    LIFECYCLE_TRANSITION_ROUTES["prototype-to-delivery"].target.laneRef,
    "delivery-intake",
  );
});

test("Proposal to Prototype completes only from the target application receipt", () => {
  const projection = projectLifecycleTransition(
    lifecycleTransitionArtifactFixtures.proposalToPrototypeApplied,
  );

  assert.equal(projection.state, "applied");
  assert.equal(projection.admission.state, "admitted");
  assert.equal(projection.admission.targetRecordRef, null);
  assert.equal(projection.application.state, "applied");
  assert.equal(
    projection.application.evidenceKind,
    "target-application-receipt",
  );
  assert.equal(projection.application.targetRecordRef, "prototype://PT-101");
  assert.equal(projection.nextAction, null);
});

test("Proposal to Delivery ends at target-owned Intake admission", () => {
  const projection = projectLifecycleTransition(
    lifecycleTransitionArtifactFixtures.proposalToDeliveryApplied,
  );

  assert.equal(projection.state, "applied");
  assert.equal(projection.admission.state, "admitted");
  assert.equal(
    projection.admission.targetRecordRef,
    "delivery-intake://source/INT-205",
  );
  assert.equal(
    projection.application.evidenceKind,
    "target-admission-receipt",
  );
  assert.equal(
    projection.application.receiptRef,
    projection.admission.receiptRef,
  );
  assert.equal(
    projection.history.some(
      (artifact) => artifact.artifactKind === "application-started",
    ),
    false,
  );
});

test("Prototype to Delivery remains applying after Intake admission and Consume start", () => {
  const projection = projectLifecycleTransition(
    lifecycleTransitionArtifactFixtures.prototypeToDeliveryApplying,
  );

  assert.equal(projection.state, "applying");
  assert.equal(
    projection.admission.targetRecordRef,
    "delivery-intake://source/INT-307",
  );
  assert.equal(projection.application.state, "running");
  assert.equal(
    projection.nextAction?.ownerRef,
    "operator-orchestration-service",
  );
  assert.equal(projection.nextAction?.action, "complete-application");
});

test("stale source validation returns ownership without claiming target custody", () => {
  const projection = projectLifecycleTransition(
    lifecycleTransitionArtifactFixtures.proposalToPrototypeReturned,
  );

  assert.equal(projection.state, "returned");
  assert.equal(projection.admission.state, "not-started");
  assert.equal(projection.application.state, "not-started");
  assert.equal(projection.correction?.reasonCode, "source-version-stale");
  assert.equal(projection.nextAction?.ownerRef, "proposal");
  assert.equal(projection.nextAction?.action, "correct-source");
});

test("named authority evidence waits on that authority before admission", () => {
  const projection = projectLifecycleTransition(
    lifecycleTransitionArtifactFixtures.proposalToPrototypeAwaitingAuthority,
  );

  assert.equal(projection.state, "awaiting-authority");
  assert.equal(projection.authorityDecisions[0]?.decision, "pending");
  assert.equal(projection.nextAction?.ownerRef, "security-architecture");
  assert.equal(
    projection.nextAction?.action,
    "record-authority-decision",
  );
});

test("technical adapter failure is failed and retryable, not rejected", () => {
  const projection = projectLifecycleTransition(
    lifecycleTransitionArtifactFixtures.prototypeToDeliveryFailed,
  );

  assert.equal(projection.state, "failed");
  assert.equal(projection.rejection, null);
  assert.equal(projection.application.failureCode, "target-adapter-timeout");
  assert.equal(projection.application.retryable, true);
  assert.equal(projection.nextAction?.action, "retry-application");
  assert.equal(
    projection.nextAction?.ownerRef,
    "operator-orchestration-service",
  );
});

test("projection ordering is deterministic and selectors preserve all states", () => {
  const artifacts = [
    ...lifecycleTransitionArtifactFixtures.proposalToPrototypeApplied,
    ...lifecycleTransitionArtifactFixtures.proposalToDeliveryApplied,
    ...lifecycleTransitionArtifactFixtures.prototypeToDeliveryApplying,
  ].reverse();
  const projections = projectLifecycleTransitions(artifacts);
  const summary = summarizeLifecycleTransitionStates(projections);

  assert.equal(projections.length, 3);
  assert.equal(summary.applied, 2);
  assert.equal(summary.applying, 1);
  assert.equal(summary.blocked, 0);
  assert.equal(selectLifecycleTransitionsRequiringAction(projections).length, 1);
});

test("mixed correlation identity fails closed", () => {
  const [packet, validation, ...rest] =
    lifecycleTransitionArtifactFixtures.proposalToPrototypeApplied;
  const invalidValidation = {
    ...validation,
    correlationId: "corr-unrelated",
  };

  assert.throws(
    () =>
      projectLifecycleTransition([packet, invalidValidation, ...rest]),
    /does not correlate/,
  );
});

test("target application cannot skip its admitted and applying predecessors", () => {
  const [packet, , , , , application] =
    lifecycleTransitionArtifactFixtures.proposalToPrototypeApplied;

  assert.throws(
    () => projectLifecycleTransition([packet, application]),
    /invalid while .* prepared/,
  );
});
