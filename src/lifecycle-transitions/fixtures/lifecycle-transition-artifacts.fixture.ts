import type {
  LifecycleTransitionArtifact,
} from "../model/lifecycle-transition-artifacts.ts";
import type {
  LifecycleTransitionAuthorityRequirement,
} from "../model/lifecycle-transition-types.ts";
import {
  createLifecycleTransitionApplicationFailedFixture,
  createLifecycleTransitionApplicationStartedFixture,
  createLifecycleTransitionSourcePacketFixture,
  createLifecycleTransitionTargetAdmissionFixture,
  createLifecycleTransitionTargetApplicationFixture,
  createLifecycleTransitionValidationPassedFixture,
  createLifecycleTransitionValidationReturnedFixture,
  createLifecycleTransitionValidationStartedFixture,
  type LifecycleTransitionFixtureContext,
} from "./lifecycle-transition-fixture-builders.ts";

const securityAuthorityRequirement = {
  authorityOwnerRef: "security-architecture",
  controlId: "sensitive-data-exposure",
  evidenceType: "security-acceptance-receipt",
} as const satisfies LifecycleTransitionAuthorityRequirement;

const contexts = {
  proposalToDeliveryApplied: {
    correlationId: "corr-proposal-delivery-205",
    reasonCode: "governed-delivery-ready",
    reasonDetail:
      "The accepted proposal is ready for Delivery Intake and governed work design.",
    routeId: "proposal-to-delivery",
    sourceProjectionVersion: "proposal-projection-31",
    sourceRecordId: "proposal://PR-205",
    sourceVersion: "proposal-v31",
    startedAt: "2026-07-24T02:00:00.000Z",
    transitionId: "transition-proposal-delivery-205",
  },
  proposalToPrototypeApplied: {
    correlationId: "corr-proposal-prototype-101",
    reasonCode: "prototype-exploration-required",
    reasonDetail:
      "The accepted proposal needs bounded exploration before governed Delivery.",
    routeId: "proposal-to-prototype",
    sourceProjectionVersion: "proposal-projection-17",
    sourceRecordId: "proposal://PR-101",
    sourceVersion: "proposal-v17",
    startedAt: "2026-07-24T01:00:00.000Z",
    transitionId: "transition-proposal-prototype-101",
  },
  proposalToPrototypeAuthority: {
    correlationId: "corr-proposal-prototype-610",
    reasonCode: "prototype-exploration-required",
    reasonDetail:
      "The accepted proposal needs exploration with a sensitive-data control decision.",
    requiredAuthorityControls: [securityAuthorityRequirement],
    routeId: "proposal-to-prototype",
    sourceProjectionVersion: "proposal-projection-22",
    sourceRecordId: "proposal://PR-610",
    sourceVersion: "proposal-v22",
    startedAt: "2026-07-24T06:00:00.000Z",
    transitionId: "transition-proposal-prototype-610",
  },
  proposalToPrototypeReturned: {
    correlationId: "corr-proposal-prototype-404",
    reasonCode: "prototype-exploration-required",
    reasonDetail:
      "The accepted proposal needs Prototype Landing after source correction.",
    routeId: "proposal-to-prototype",
    sourceProjectionVersion: "proposal-projection-8",
    sourceRecordId: "proposal://PR-404",
    sourceVersion: "proposal-v8",
    startedAt: "2026-07-24T04:00:00.000Z",
    transitionId: "transition-proposal-prototype-404",
  },
  prototypeToDeliveryApplying: {
    correlationId: "corr-prototype-delivery-307",
    reasonCode: "baseline-graduation",
    reasonDetail:
      "The baseline-approved prototype is continuing as governed Delivery work.",
    routeId: "prototype-to-delivery",
    sourceProjectionVersion: "prototype-projection-42",
    sourceRecordId: "prototype://PT-307",
    sourceVersion: "prototype-v42",
    startedAt: "2026-07-24T03:00:00.000Z",
    transitionId: "transition-prototype-delivery-307",
  },
  prototypeToDeliveryFailed: {
    correlationId: "corr-prototype-delivery-509",
    reasonCode: "baseline-graduation",
    reasonDetail:
      "The baseline-approved prototype is entering Delivery through its retained Intake source.",
    routeId: "prototype-to-delivery",
    sourceProjectionVersion: "prototype-projection-61",
    sourceRecordId: "prototype://PT-509",
    sourceVersion: "prototype-v61",
    startedAt: "2026-07-24T05:00:00.000Z",
    transitionId: "transition-prototype-delivery-509",
  },
} as const satisfies Record<string, LifecycleTransitionFixtureContext>;

export const lifecycleTransitionArtifactFixtures = {
  proposalToDeliveryApplied: [
    createLifecycleTransitionSourcePacketFixture(
      contexts.proposalToDeliveryApplied,
    ),
    createLifecycleTransitionValidationStartedFixture(
      contexts.proposalToDeliveryApplied,
      1,
    ),
    createLifecycleTransitionValidationPassedFixture(
      contexts.proposalToDeliveryApplied,
      2,
    ),
    createLifecycleTransitionTargetAdmissionFixture(
      contexts.proposalToDeliveryApplied,
      3,
      "delivery-intake://source/INT-205",
    ),
  ],
  proposalToPrototypeApplied: [
    createLifecycleTransitionSourcePacketFixture(
      contexts.proposalToPrototypeApplied,
    ),
    createLifecycleTransitionValidationStartedFixture(
      contexts.proposalToPrototypeApplied,
      1,
    ),
    createLifecycleTransitionValidationPassedFixture(
      contexts.proposalToPrototypeApplied,
      2,
    ),
    createLifecycleTransitionTargetAdmissionFixture(
      contexts.proposalToPrototypeApplied,
      3,
      null,
    ),
    createLifecycleTransitionApplicationStartedFixture(
      contexts.proposalToPrototypeApplied,
      4,
      "oos-run://prototype-ingress/101",
    ),
    createLifecycleTransitionTargetApplicationFixture(
      contexts.proposalToPrototypeApplied,
      5,
      "oos-run://prototype-ingress/101",
      "prototype://PT-101",
    ),
  ],
  proposalToPrototypeAwaitingAuthority: [
    createLifecycleTransitionSourcePacketFixture(
      contexts.proposalToPrototypeAuthority,
    ),
    createLifecycleTransitionValidationStartedFixture(
      contexts.proposalToPrototypeAuthority,
      1,
    ),
    createLifecycleTransitionValidationPassedFixture(
      contexts.proposalToPrototypeAuthority,
      2,
    ),
  ],
  proposalToPrototypeReturned: [
    createLifecycleTransitionSourcePacketFixture(
      contexts.proposalToPrototypeReturned,
    ),
    createLifecycleTransitionValidationStartedFixture(
      contexts.proposalToPrototypeReturned,
      1,
    ),
    createLifecycleTransitionValidationReturnedFixture(
      contexts.proposalToPrototypeReturned,
      2,
    ),
  ],
  prototypeToDeliveryApplying: [
    createLifecycleTransitionSourcePacketFixture(
      contexts.prototypeToDeliveryApplying,
    ),
    createLifecycleTransitionValidationStartedFixture(
      contexts.prototypeToDeliveryApplying,
      1,
    ),
    createLifecycleTransitionValidationPassedFixture(
      contexts.prototypeToDeliveryApplying,
      2,
    ),
    createLifecycleTransitionTargetAdmissionFixture(
      contexts.prototypeToDeliveryApplying,
      3,
      "delivery-intake://source/INT-307",
    ),
    createLifecycleTransitionApplicationStartedFixture(
      contexts.prototypeToDeliveryApplying,
      4,
      "oos-run://delivery-intake-consume/307",
    ),
  ],
  prototypeToDeliveryFailed: [
    createLifecycleTransitionSourcePacketFixture(
      contexts.prototypeToDeliveryFailed,
    ),
    createLifecycleTransitionValidationStartedFixture(
      contexts.prototypeToDeliveryFailed,
      1,
    ),
    createLifecycleTransitionValidationPassedFixture(
      contexts.prototypeToDeliveryFailed,
      2,
    ),
    createLifecycleTransitionTargetAdmissionFixture(
      contexts.prototypeToDeliveryFailed,
      3,
      "delivery-intake://source/INT-509",
    ),
    createLifecycleTransitionApplicationStartedFixture(
      contexts.prototypeToDeliveryFailed,
      4,
      "oos-run://delivery-intake-consume/509",
    ),
    createLifecycleTransitionApplicationFailedFixture(
      contexts.prototypeToDeliveryFailed,
      5,
      "oos-run://delivery-intake-consume/509",
    ),
  ],
} as const satisfies Record<string, readonly LifecycleTransitionArtifact[]>;

export const allLifecycleTransitionArtifactFixtures =
  Object.values(lifecycleTransitionArtifactFixtures).flat();
