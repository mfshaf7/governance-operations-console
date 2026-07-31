import {
  assertProductReleaseCapability,
  type ProductReleaseCapability,
} from "../model/product-release-capability.ts";
import {
  openClawReleaseOperationFixtures,
  openClawRuntimeLifecycleStateFixtures,
  openClawRuntimeLifecycleTransitionFixtures,
} from "./openclaw-release-capability.fixture.ts";

function product<T extends ProductReleaseCapability>(value: T): T {
  assertProductReleaseCapability(value);
  return value;
}

export const productReleaseCapabilityFixtures = [
  product({
    highestRealEndpoint: "governed-prod",
    maturity: "fully-governed",
    nextMove: {
      actionId: "record-stage-verification",
      label: "Record stage verification",
      ownerRef: "platform-engineering",
      reason:
        "The current candidate exists, but stage verification remains pending.",
    },
    platformOwner: "platform-engineering",
    productId: "openclaw",
    productLabel: "OpenClaw",
    productionPromotionSupported: true,
    releaseOperations: openClawReleaseOperationFixtures,
    releasePath: [
      {
        action: "record-release-candidate",
        actionRequirement: null,
        canonicalStatus: "candidate",
        id: "stage-candidate",
        label: "Release candidate",
        posture: "complete",
        sourceRef:
          "repo://platform-engineering/environments/stage/release-candidate.yaml",
      },
      {
        action: "record-stage-verification",
        actionRequirement: null,
        canonicalStatus: "pending",
        id: "stage-verification",
        label: "Stage verification",
        posture: "current",
        sourceRef:
          "repo://platform-engineering/environments/stage/verification.yaml",
      },
      {
        action: "record-readiness",
        actionRequirement: null,
        canonicalStatus: "pending",
        id: "stage-readiness",
        label: "Stage readiness",
        posture: "pending",
        sourceRef:
          "repo://platform-engineering/environments/stage/promotion-readiness.yaml",
      },
      {
        action: "request-prod-promotion",
        actionRequirement: {
          allowedStateIds: ["live", "traffic-stopped", "suspended"],
          blockedMove: {
            actionId: "leave-quarantine",
            label: "Resolve quarantine",
            ownerRef: "platform-engineering",
            reason:
              "The product contract blocks promotion while quarantined.",
          },
          kind: "runtime-lifecycle-state",
        },
        canonicalStatus: "not-authorized",
        id: "production-promotion",
        label: "Production promotion",
        posture: "pending",
        sourceRef:
          "repo://platform-engineering/.github/workflows/promote-environment.yaml",
      },
      {
        action: "record-prod-verification",
        actionRequirement: null,
        canonicalStatus: "inactive",
        id: "production-verification",
        label: "Production verification",
        posture: "pending",
        sourceRef:
          "repo://platform-engineering/environments/prod/verification.yaml",
      },
    ],
    rollback: {
      contractRef: null,
      supported: false,
    },
    runtimeLifecycle: {
      adapter: {
        available: true,
        ref: "prototype-local://environment-lifecycle/product-runtime-lifecycle",
        unavailableReason: null,
      },
      currentState: "suspended",
      requiredCapability: "platform:openclaw-runtime-lifecycle",
      sourceRef:
        "repo://platform-engineering/environments/prod/openclaw-lifecycle.yaml",
      states: openClawRuntimeLifecycleStateFixtures,
      transitions: openClawRuntimeLifecycleTransitionFixtures,
      workflowOwner: "platform-engineering",
    },
    securityOwner: "security-architecture",
    source: {
      observedAt: "2026-07-26T08:30:00Z",
      provenance: "authority-snapshot",
      ref: "workspace-governance://products/openclaw",
      source: "workspace-governance",
      version: "1",
    },
    stageSupported: true,
    supportingEvidenceRefs: [
      "repo://platform-engineering/products/openclaw/verification-catalog.yaml",
      "repo://platform-engineering/products/openclaw/prod-verification-catalog.yaml",
    ],
    unavailableReason: null,
    operatorRoute: {
      label: "Open release governance",
      ownerRef: "platform-engineering",
      ref: "repo://platform-engineering/products/openclaw/runbooks/release-governance.md",
    },
  }),
  product({
    highestRealEndpoint: "platform-integrated-runtime",
    maturity: "platform-integrated",
    nextMove: {
      actionId: "inspect-platform-runtime",
      label: "Inspect platform runtime",
      ownerRef: "platform-engineering",
      reason:
        "OpenProject has a platform-managed runtime but no separate product-governed stage-to-production rail.",
    },
    platformOwner: "platform-engineering",
    productId: "openproject",
    productLabel: "OpenProject",
    productionPromotionSupported: false,
    releaseOperations: [],
    releasePath: [],
    rollback: {
      contractRef: null,
      supported: false,
    },
    runtimeLifecycle: null,
    securityOwner: "security-architecture",
    source: {
      observedAt: "2026-07-26T08:30:00Z",
      provenance: "authority-snapshot",
      ref: "workspace-governance://products/openproject",
      source: "workspace-governance",
      version: "1",
    },
    stageSupported: false,
    supportingEvidenceRefs: [
      "repo://platform-engineering/environments/prod/openproject-release/stage-candidate.yaml",
      "repo://platform-engineering/environments/prod/openproject-release/stage-verification.yaml",
      "repo://platform-engineering/environments/prod/openproject-release/stage-readiness.yaml",
      "repo://platform-engineering/environments/prod/openproject-release/prod-verification.yaml",
    ],
    unavailableReason:
      "The highest real endpoint is the platform-integrated OpenProject runtime.",
    operatorRoute: {
      label: "Open platform release guidance",
      ownerRef: "platform-engineering",
      ref: "repo://platform-engineering/products/openproject/runbooks/release-governance.md",
    },
  }),
] as const satisfies readonly ProductReleaseCapability[];

export const productReleaseScenarioFixtures = [
  product({
    highestRealEndpoint: "governed-prod",
    maturity: "fully-governed",
    nextMove: {
      actionId: "leave-quarantine",
      label: "Resolve quarantine",
      ownerRef: "platform-engineering",
      reason: "The product contract blocks promotion while quarantined.",
    },
    platformOwner: "platform-engineering",
    productId: "synthetic-quarantined-product",
    productLabel: "Synthetic Quarantined Product",
    productionPromotionSupported: true,
    releaseOperations: openClawReleaseOperationFixtures,
    releasePath: [
      {
        action: "record-release-candidate",
        actionRequirement: null,
        canonicalStatus: "candidate",
        id: "stage-candidate",
        label: "Release candidate",
        posture: "complete",
        sourceRef: "synthetic://release/candidate",
      },
      {
        action: "record-stage-verification",
        actionRequirement: null,
        canonicalStatus: "recorded",
        id: "stage-verification",
        label: "Stage verification",
        posture: "complete",
        sourceRef: "synthetic://release/verification",
      },
      {
        action: "record-readiness",
        actionRequirement: null,
        canonicalStatus: "approved",
        id: "stage-readiness",
        label: "Stage readiness",
        posture: "complete",
        sourceRef: "synthetic://release/readiness",
      },
      {
        action: "request-prod-promotion",
        actionRequirement: {
          allowedStateIds: ["live", "suspended"],
          blockedMove: {
            actionId: "leave-quarantine",
            label: "Resolve quarantine",
            ownerRef: "platform-engineering",
            reason:
              "The product contract blocks promotion while quarantined.",
          },
          kind: "runtime-lifecycle-state",
        },
        canonicalStatus: "blocked-by-quarantine",
        id: "production-promotion",
        label: "Production promotion",
        posture: "current",
        sourceRef: "synthetic://release/promotion",
      },
    ],
    rollback: {
      contractRef: null,
      supported: false,
    },
    runtimeLifecycle: {
      adapter: {
        available: true,
        ref: "prototype-local://environment-lifecycle/product-runtime-lifecycle",
        unavailableReason: null,
      },
      currentState: "quarantined",
      requiredCapability: "platform:openclaw-runtime-lifecycle",
      sourceRef: "synthetic://runtime-lifecycle/quarantined",
      states: openClawRuntimeLifecycleStateFixtures.filter(
        (state) => state.id !== "traffic-stopped",
      ),
      transitions: openClawRuntimeLifecycleTransitionFixtures.filter(
        (transition) =>
          transition.fromStateId !== "traffic-stopped" &&
          transition.toStateId !== "traffic-stopped",
      ),
      workflowOwner: "platform-engineering",
    },
    securityOwner: "security-architecture",
    source: {
      observedAt: "2026-07-26T08:31:00Z",
      provenance: "synthetic-scenario",
      ref: "synthetic://product/quarantined",
      source: "environment-lifecycle-fixtures",
      version: "1",
    },
    stageSupported: true,
    supportingEvidenceRefs: [
      "synthetic://release/verification-catalog",
      "synthetic://release/prod-verification-catalog",
    ],
    unavailableReason: null,
    operatorRoute: {
      label: "Open synthetic release guidance",
      ownerRef: "platform-engineering",
      ref: "synthetic://release/runbook",
    },
  }),
] as const satisfies readonly ProductReleaseCapability[];
