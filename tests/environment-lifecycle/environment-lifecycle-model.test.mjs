import assert from "node:assert/strict";
import test from "node:test";

import {
  devIntegrationProfileFixtures,
  devIntegrationProfileScenarioFixtures,
} from "../../src/environment-lifecycle/fixtures/dev-integration-profiles.fixture.ts";
import {
  devIntegrationProfileHistoryFixtures,
} from "../../src/environment-lifecycle/fixtures/dev-integration-profile-history.fixture.ts";
import {
  productReleaseCapabilityFixtures,
  productReleaseScenarioFixtures,
} from "../../src/environment-lifecycle/fixtures/product-release-capabilities.fixture.ts";
import {
  devIntegrationProfileActionLabel,
  devIntegrationProfileActionAvailability,
  devIntegrationProfileAllowsAction,
} from "../../src/environment-lifecycle/model/dev-integration-profile.ts";
import {
  validateDevIntegrationProfileRequest,
} from "../../src/environment-lifecycle/model/dev-integration-profile-request.ts";
import {
  assertProductReleaseCapability,
  productReleaseStepActionAvailability,
} from "../../src/environment-lifecycle/model/product-release-capability.ts";
import {
  filterDevIntegrationProfiles,
  selectSelfServeDevIntegrationProfiles,
  summarizeDevIntegrationProfileLifecycles,
} from "../../src/environment-lifecycle/read-model/dev-integration-profile-selectors.ts";
import {
  filterProductReleaseCapabilities,
  selectCurrentProductReleaseStep,
  summarizeProductReleaseCapabilities,
} from "../../src/environment-lifecycle/read-model/product-release-selectors.ts";
import {
  buildEnvironmentLifecycleSummary,
} from "../../src/environment-lifecycle/read-model/environment-lifecycle-summary.ts";
import {
  buildProductReleaseDashboard,
} from "../../src/environment-lifecycle/read-model/product-release-dashboard.ts";
import {
  buildDevIntegrationProfileDashboard,
} from "../../src/environment-lifecycle/read-model/dev-integration-profile-dashboard.ts";
import {
  buildDevIntegrationProfileRequest,
  createDevIntegrationProfileRequestDraft,
  isDevIntegrationProfileRequestDraftDirty,
  validateDevIntegrationProfileRequestDraft,
} from "../../src/environment-lifecycle/work-model/profile-request/dev-integration-profile-request-draft.ts";
import {
  projectPrototypeLocalProfileRequest,
} from "../../src/environment-lifecycle/work-model/profile-request/dev-integration-profile-request-projection.ts";
import {
  createProductReleaseActionDraft,
  createProductRuntimeLifecycleDraft,
  isProductReleaseActionDraftDirty,
  isProductRuntimeLifecycleDraftDirty,
  validateProductReleaseActionDraft,
  validateProductRuntimeLifecycleDraft,
} from "../../src/environment-lifecycle/work-model/product-release/product-release-action-draft.ts";

const allProfiles = [
  ...devIntegrationProfileFixtures,
  ...devIntegrationProfileScenarioFixtures,
];
const profileValidationContext = {
  disposableProfileIds: devIntegrationProfileFixtures
    .filter((profile) => profile.runtime.stateModel === "disposable")
    .map((profile) => profile.profileId),
  existingProfileIds: devIntegrationProfileFixtures.map(
    (profile) => profile.profileId,
  ),
};

test("entry summaries derive independent profile and product capability counts", () => {
  assert.deepEqual(
    buildEnvironmentLifecycleSummary(
      devIntegrationProfileFixtures,
      productReleaseCapabilityFixtures,
    ),
    {
      devIntegration: {
        activeProfiles: 2,
        profiles: 2,
        runningProfiles: 1,
      },
      governedReleases: {
        productionSupported: 1,
        products: 2,
        stageSupported: 1,
      },
    },
  );
});

test("profile dashboard derives runtime controls and scoped history", () => {
  const persistent = buildDevIntegrationProfileDashboard(
    devIntegrationProfileFixtures[0],
    devIntegrationProfileHistoryFixtures,
  );
  const disposable = buildDevIntegrationProfileDashboard(
    devIntegrationProfileFixtures[1],
    devIntegrationProfileHistoryFixtures,
  );

  assert.equal(persistent.runtime.actions[0].label, "Resume");
  assert.equal(
    persistent.runtime.actions.find((action) => action.action === "down")
      ?.label,
    "Suspend",
  );
  assert.equal(
    persistent.runtime.actions.find((action) => action.action === "reset")
      ?.destructive,
    true,
  );
  assert.equal(disposable.runtime.actions[0].label, "Start");
  assert.deepEqual(
    persistent.history.map((event) => event.eventId),
    [
      "env-history-gcf-003",
      "env-history-gcf-002",
      "env-history-gcf-001",
    ],
  );
});

test("profile request draft stays local, normalizes arrays, and tracks dirty state", () => {
  const clean = createDevIntegrationProfileRequestDraft();
  const draft = {
    ...clean,
    dependencies: ["workspace-governance", " workspace-governance "],
    ownerRepo: "workspace-prototype-studio",
    participatingRepos: [
      "workspace-prototype-studio",
      "platform-engineering",
      "platform-engineering",
    ],
    profileId: "environment-lifecycle-ui",
    purpose: "Exercise the local Environment Lifecycle interface.",
  };
  const context = {
    ...profileValidationContext,
    requestedAt: "2026-07-26T09:30:00Z",
    requestedBy: "operator:fixture",
  };
  const request = buildDevIntegrationProfileRequest(draft, context);

  assert.equal(isDevIntegrationProfileRequestDraftDirty(clean), false);
  assert.equal(isDevIntegrationProfileRequestDraftDirty(draft), true);
  assert.deepEqual(validateDevIntegrationProfileRequestDraft(draft, context), []);
  assert.deepEqual(request.dependencies, ["workspace-governance"]);
  assert.deepEqual(request.participatingRepos, [
    "platform-engineering",
    "workspace-prototype-studio",
  ]);
  assert.equal(request.replacesProfileId, null);
});

test("persistent replacement requests require complete persistence and cutover truth", () => {
  const clean = createDevIntegrationProfileRequestDraft();
  const draft = {
    ...clean,
    ownerRepo: "workspace-prototype-studio",
    participatingRepos: ["workspace-prototype-studio"],
    profileId: "replacement-profile",
    purpose: "Replace an admitted disposable profile.",
    replacesProfileId: "idea-workflow",
    runtimeStateModel: "persistent",
  };
  const errors = validateDevIntegrationProfileRequestDraft(draft, {
    ...profileValidationContext,
    requestedAt: "2026-07-26T09:35:00Z",
    requestedBy: "operator:fixture",
  });

  assert.deepEqual(errors, [
    "Persistent runtime justification is required.",
    "Retained data scope is required.",
    "Suspend and resume semantics are required.",
    "Storage requirement is required.",
    "Destructive reset semantics are required.",
    "A replacement profile requires a cutover plan.",
  ]);
});

test("persistent requests require a real disposable companion when one is named", () => {
  const clean = createDevIntegrationProfileRequestDraft();
  const draft = {
    ...clean,
    ownerRepo: "workspace-prototype-studio",
    participatingRepos: ["workspace-prototype-studio"],
    persistence: {
      ...clean.persistence,
      destructiveResetSemantics: "Delete retained local state.",
      disposableCompanionProfileId: "governance-control-fabric",
      justification: "Retain local test evidence.",
      retainedDataScope: "Local receipt evidence.",
      storageRequirement: "Local persistent volume.",
      suspendResumeSemantics: "Preserve state while suspended.",
    },
    profileId: "persistent-profile",
    purpose: "Prove companion profile validation.",
    runtimeStateModel: "persistent",
  };

  assert.deepEqual(
    validateDevIntegrationProfileRequestDraft(draft, {
      ...profileValidationContext,
      requestedAt: "2026-07-26T09:36:00Z",
      requestedBy: "operator:fixture",
    }),
    [
      "Disposable companion profile must use the disposable state model.",
    ],
  );
});

test("submitted requests project only prototype-local proposed truth", () => {
  const draft = {
    ...createDevIntegrationProfileRequestDraft(),
    ownerRepo: "workspace-prototype-studio",
    participatingRepos: ["workspace-prototype-studio"],
    profileId: "environment-lifecycle-ui",
    purpose: "Exercise the local Environment Lifecycle interface.",
  };
  const request = buildDevIntegrationProfileRequest(draft, {
    ...profileValidationContext,
    requestedAt: "2026-07-26T09:30:00Z",
    requestedBy: "operator:fixture",
  });
  const projected = projectPrototypeLocalProfileRequest(request);

  assert.equal(projected.lifecycle, "proposed");
  assert.equal(projected.source.provenance, "prototype-local");
  assert.equal(projected.runtime.observation.state, "unavailable");
  assert.deepEqual(projected.actions, []);
  assert.equal(projected.stageHandoff.result, "not-run");
});

test("profile lifecycle and runtime observation remain independent", () => {
  const activeStopped = devIntegrationProfileFixtures.find(
    (profile) => profile.profileId === "idea-workflow",
  );
  const buildAdmittedUnknown = devIntegrationProfileScenarioFixtures.find(
    (profile) => profile.profileId === "synthetic-build-admitted",
  );

  assert.equal(activeStopped?.lifecycle, "active");
  assert.equal(activeStopped?.runtime.observation.state, "stopped");
  assert.equal(buildAdmittedUnknown?.lifecycle, "build-admitted");
  assert.equal(buildAdmittedUnknown?.runtime.observation.state, "unknown");
});

test("profile actions fail closed against lifecycle and runtime observation", () => {
  const activeRunning = devIntegrationProfileFixtures[0];
  const activeStopped = devIntegrationProfileFixtures[1];
  const buildAdmitted = devIntegrationProfileScenarioFixtures[1];

  assert.equal(selectSelfServeDevIntegrationProfiles(allProfiles).length, 2);
  assert.equal(devIntegrationProfileAllowsAction(activeRunning, "up"), false);
  assert.equal(devIntegrationProfileAllowsAction(activeRunning, "down"), true);
  assert.equal(devIntegrationProfileAllowsAction(activeStopped, "up"), true);
  assert.equal(
    devIntegrationProfileAllowsAction(activeStopped, "access"),
    false,
  );
  assert.equal(
    devIntegrationProfileAllowsAction(buildAdmitted, "up"),
    false,
  );
  assert.equal(
    devIntegrationProfileAllowsAction(buildAdmitted, "status"),
    true,
  );
  assert.equal(
    devIntegrationProfileActionAvailability(
      activeStopped,
      "access",
    ).reason,
    "This action requires a running or degraded runtime.",
  );
});

test("persistent runtime actions use suspend and resume semantics", () => {
  const persistent = devIntegrationProfileFixtures[0];
  const disposable = devIntegrationProfileFixtures[1];

  assert.equal(devIntegrationProfileActionLabel(persistent, "down"), "Suspend");
  assert.equal(devIntegrationProfileActionLabel(persistent, "up"), "Resume");
  assert.equal(devIntegrationProfileActionLabel(disposable, "down"), "Stop");
  assert.equal(devIntegrationProfileActionLabel(disposable, "up"), "Start");
});

test("profile selectors preserve every lifecycle and structured filters", () => {
  const summary = summarizeDevIntegrationProfileLifecycles(allProfiles);
  const filtered = filterDevIntegrationProfiles(allProfiles, {
    laneClass: "integration-devint",
    lifecycle: "all",
    ownerRepo: "all",
    query: "suspended",
  });

  assert.deepEqual(summary, {
    active: 2,
    "build-admitted": 1,
    proposed: 1,
    retired: 1,
    suspended: 1,
  });
  assert.equal(filtered[0]?.profileId, "synthetic-suspended");
});

test("profile request validation requires persistent and canonical-write detail", () => {
  const errors = validateDevIntegrationProfileRequest(
    {
      dependencies: [],
      expectedWrites: {
        classification: "canonical-backend",
        targets: [],
      },
      laneClass: "governed-devint",
      ownerRepo: "workspace-prototype-studio",
      participatingRepos: ["workspace-prototype-studio"],
      persistence: null,
      profileId: "Invalid Profile",
      purpose: " ",
      replacesProfileId: null,
      requestedAt: "2026-07-26T09:00:00Z",
      requestedBy: "operator:fixture",
      runtimePlatform: "local-k3s",
      runtimeStateModel: "persistent",
      securityTriggers: [],
    },
    profileValidationContext,
  );

  assert.deepEqual(errors, [
    "Profile id must use lowercase kebab-case.",
    "Purpose is required.",
    "The selected write class requires at least one target.",
    "Persistent profiles require persistence configuration.",
  ]);
});

test("profile request validation rejects unsupported contract vocabulary", () => {
  const errors = validateDevIntegrationProfileRequest(
    {
      dependencies: [],
      expectedWrites: {
        classification: "invented-write-class",
        targets: ["prototype://target"],
      },
      laneClass: "invented-lane",
      ownerRepo: "workspace-prototype-studio",
      participatingRepos: ["workspace-prototype-studio"],
      persistence: null,
      profileId: "unsupported-vocabulary",
      purpose: "Prove runtime contract vocabulary validation.",
      replacesProfileId: null,
      requestedAt: "2026-07-26T09:10:00Z",
      requestedBy: "operator:fixture",
      runtimePlatform: "local-k3s",
      runtimeStateModel: "invented-state-model",
      securityTriggers: ["invented-trigger"],
    },
    profileValidationContext,
  );

  assert.deepEqual(errors, [
    "Lane class must use a supported value.",
    "Runtime state model must use a supported value.",
    "Expected write class must use a supported value.",
    "Security triggers must use supported values.",
  ]);
});

test("persistent profile requests fail closed when shared smoke is mutable", () => {
  const errors = validateDevIntegrationProfileRequest(
    {
      dependencies: [],
      expectedWrites: {
        classification: "prototype-local",
        targets: ["prototype://target"],
      },
      laneClass: "prototype-devint",
      ownerRepo: "workspace-prototype-studio",
      participatingRepos: ["workspace-prototype-studio"],
      persistence: {
        cutoverPlan: "",
        destructiveResetSemantics: "Delete retained local state.",
        disposableCompanionProfileId: null,
        justification: "Retain local project state.",
        retainedDataScope: "Prototype-local records.",
        sharedSmokeMutationMode: "mutating",
        storageRequirement: "Local persistent volume.",
        suspendResumeSemantics: "Preserve state while suspended.",
      },
      profileId: "mutable-smoke-profile",
      purpose: "Prove persistent smoke posture validation.",
      replacesProfileId: null,
      requestedAt: "2026-07-26T09:11:00Z",
      requestedBy: "operator:fixture",
      runtimePlatform: "local-k3s",
      runtimeStateModel: "persistent",
      securityTriggers: [],
    },
    profileValidationContext,
  );

  assert.deepEqual(errors, [
    "Persistent shared smoke must remain read-only.",
  ]);
});

test("product capability fixtures preserve the real endpoint ceiling", () => {
  const openclaw = productReleaseCapabilityFixtures[0];
  const openproject = productReleaseCapabilityFixtures[1];

  assert.equal(openclaw.productId, "openclaw");
  assert.equal(openclaw.stageSupported, true);
  assert.equal(openclaw.productionPromotionSupported, true);
  assert.equal(openclaw.rollback.supported, false);
  assert.equal(openproject.productId, "openproject");
  assert.equal(openproject.highestRealEndpoint, "platform-integrated-runtime");
  assert.equal(openproject.stageSupported, false);
  assert.equal(openproject.releasePath.length, 0);
});

test("the current product release step comes from structured path posture", () => {
  const openclaw = productReleaseCapabilityFixtures[0];
  const quarantined = productReleaseScenarioFixtures[0];

  assert.equal(
    selectCurrentProductReleaseStep(openclaw)?.id,
    "stage-verification",
  );
  assert.equal(
    selectCurrentProductReleaseStep(quarantined)?.canonicalStatus,
    "blocked-by-quarantine",
  );
});

test("product dashboard preserves conditional capability without universal steps", () => {
  const openclaw = buildProductReleaseDashboard(
    productReleaseCapabilityFixtures[0],
  );
  const openproject = buildProductReleaseDashboard(
    productReleaseCapabilityFixtures[1],
  );

  assert.equal(openclaw.releasePath.available, true);
  assert.equal(openclaw.releasePath.steps.length, 5);
  assert.equal(openclaw.currentStep?.id, "stage-verification");
  assert.equal(
    openclaw.releasePath.steps.find(
      (item) => item.step.id === "stage-verification",
    )?.operation?.requiredCapability,
    "platform:openclaw-stage-verification",
  );
  assert.equal(openclaw.runtimeLifecycle.currentState?.id, "suspended");
  assert.deepEqual(
    openclaw.runtimeLifecycle.targetStates.map((state) => state.id),
    ["live", "traffic-stopped", "quarantined"],
  );

  const quarantined = buildProductReleaseDashboard(
    productReleaseScenarioFixtures[0],
  );
  assert.equal(
    quarantined.releasePath.steps.find(
      (item) => item.step.id === "production-promotion",
    )?.actionable,
    false,
  );
  assert.equal(quarantined.nextMove?.actionId, "leave-quarantine");

  assert.equal(openproject.releasePath.available, false);
  assert.deepEqual(openproject.releasePath.steps, []);
  assert.equal(openproject.runtimeLifecycle.available, false);
  assert.equal(openproject.supportingEvidenceRefs.length, 4);
  assert.match(
    openproject.operatorRoute.ref,
    /openproject\/runbooks\/release-governance/,
  );
});

test("product release drafts derive required fields from the operation descriptor", () => {
  const operation = productReleaseCapabilityFixtures[0].releaseOperations.find(
    (candidate) => candidate.action === "record-stage-verification",
  );

  assert.ok(operation);
  const clean = createProductReleaseActionDraft(operation);
  const complete = {
    values: {
      ...clean.values,
      "evidence-ref": "artifact://stage/openclaw/rehearsal-001",
    },
  };

  assert.deepEqual(validateProductReleaseActionDraft(clean, operation), [
    "Evidence reference is required.",
  ]);
  assert.deepEqual(
    validateProductReleaseActionDraft(complete, operation),
    [],
  );
  assert.equal(isProductReleaseActionDraftDirty(clean, operation), false);
  assert.equal(isProductReleaseActionDraftDirty(complete, operation), true);
});

test("product release drafts reject undeclared action fields", () => {
  const operation = productReleaseCapabilityFixtures[0].releaseOperations.find(
    (candidate) => candidate.action === "record-stage-verification",
  );

  assert.ok(operation);
  assert.deepEqual(
    validateProductReleaseActionDraft(
      {
        values: {
          "evidence-ref": "artifact://stage/openclaw/rehearsal-001",
          "undeclared-field": "must-not-pass",
        },
      },
      operation,
    ),
    ["Action input contains unsupported fields."],
  );
});

test("select decisions start unchosen and require explicit operator input", () => {
  const operation =
    productReleaseCapabilityFixtures[0].releaseOperations.find(
      (candidate) => candidate.action === "record-readiness",
    );

  assert.ok(operation);
  const clean = createProductReleaseActionDraft(operation);

  assert.equal(clean.values["readiness-decision"], "");
  assert.deepEqual(
    validateProductReleaseActionDraft(clean, operation),
    ["Readiness decision is required.", "Decision reason is required."],
  );
});

test("product action requirements follow the effective runtime lifecycle", () => {
  const quarantined = productReleaseScenarioFixtures[0];
  const promotionStep = quarantined.releasePath.find(
    (step) => step.id === "production-promotion",
  );

  assert.ok(promotionStep);
  assert.equal(
    productReleaseStepActionAvailability(
      quarantined,
      promotionStep,
    ).allowed,
    false,
  );
  assert.equal(
    productReleaseStepActionAvailability(
      {
        ...quarantined,
        runtimeLifecycle: {
          ...quarantined.runtimeLifecycle,
          currentState: "live",
        },
      },
      promotionStep,
    ).allowed,
    true,
  );
});

test("product actions fail closed when the declared execution adapter is unavailable", () => {
  const openclaw = productReleaseCapabilityFixtures[0];
  const verificationStep = openclaw.releasePath.find(
    (step) => step.id === "stage-verification",
  );
  const unavailableProduct = {
    ...openclaw,
    releaseOperations: openclaw.releaseOperations.map((operation) =>
      operation.action === "record-stage-verification"
        ? {
            ...operation,
            adapter: {
              available: false,
              ref: null,
              unavailableReason:
                "The stage verification adapter is not admitted.",
            },
          }
        : operation,
    ),
  };

  assert.ok(verificationStep);
  assert.doesNotThrow(() =>
    assertProductReleaseCapability(unavailableProduct),
  );
  assert.deepEqual(
    productReleaseStepActionAvailability(
      unavailableProduct,
      verificationStep,
    ),
    {
      allowed: false,
      reason: "The stage verification adapter is not admitted.",
    },
  );
});

test("runtime lifecycle drafts require product-supported targets and incident evidence", () => {
  const lifecycle = productReleaseCapabilityFixtures[0].runtimeLifecycle;

  assert.ok(lifecycle);
  const clean = createProductRuntimeLifecycleDraft();
  const quarantine = {
    ...clean,
    reason: "Contain the active incident.",
    targetState: "quarantined",
  };

  assert.deepEqual(validateProductRuntimeLifecycleDraft(clean, lifecycle), [
    "Select a supported target lifecycle state.",
    "Lifecycle reason is required.",
  ]);
  assert.deepEqual(
    validateProductRuntimeLifecycleDraft(quarantine, lifecycle),
    ["This lifecycle transition requires an incident reference."],
  );
  assert.deepEqual(
    validateProductRuntimeLifecycleDraft(
      {
        ...quarantine,
        incidentRef: "incident://openclaw/2026-07-26-001",
      },
      lifecycle,
    ),
    [],
  );
  assert.equal(isProductRuntimeLifecycleDraftDirty(clean), false);
  assert.equal(isProductRuntimeLifecycleDraftDirty(quarantine), true);
});

test("quarantine recovery requires incident follow-up context", () => {
  const lifecycle =
    productReleaseScenarioFixtures[0].runtimeLifecycle;

  assert.ok(lifecycle);
  assert.deepEqual(
    validateProductRuntimeLifecycleDraft(
      {
        incidentRef: "",
        reason: "Restore the governed runtime.",
        targetState: "live",
      },
      lifecycle,
    ),
    [
      "This lifecycle transition requires an incident follow-up reference.",
    ],
  );
  assert.deepEqual(
    validateProductRuntimeLifecycleDraft(
      {
        incidentRef: "incident://openclaw/follow-up-001",
        reason: "Restore the governed runtime.",
        targetState: "live",
      },
      lifecycle,
    ),
    [],
  );
});

test("product filters and summary do not invent a universal release status", () => {
  const summary = summarizeProductReleaseCapabilities(
    productReleaseCapabilityFixtures,
  );
  const unavailable = filterProductReleaseCapabilities(
    productReleaseCapabilityFixtures,
    {
      endpoint: "unavailable",
      maturity: "all",
      query: "",
    },
  );

  assert.deepEqual(summary, {
    productionSupported: 1,
    products: 2,
    runtimeLifecycleSupported: 1,
    stageSupported: 1,
  });
  assert.deepEqual(
    unavailable.map((product) => product.productId),
    ["openproject"],
  );
});

test("rollback and unsupported release paths fail closed", () => {
  assert.throws(
    () =>
      assertProductReleaseCapability({
        ...productReleaseCapabilityFixtures[1],
        rollback: {
          contractRef: null,
          supported: true,
        },
      }),
    /rollback support requires one explicit contract ref/,
  );

  assert.throws(
    () =>
      assertProductReleaseCapability({
        ...productReleaseCapabilityFixtures[1],
        releasePath: [
          {
            action: "record-stage-verification",
            canonicalStatus: "pending",
            id: "stage-verification",
            label: "Stage verification",
            posture: "current",
            sourceRef: "synthetic://invalid-stage",
          },
        ],
      }),
    /cannot expose stage steps without stage support/,
  );
});

test("product operations and runtime states fail closed against their descriptors", () => {
  const openclaw = productReleaseCapabilityFixtures[0];

  assert.throws(
    () =>
      assertProductReleaseCapability({
        ...openclaw,
        releaseOperations: openclaw.releaseOperations.filter(
          (operation) =>
            operation.action !== "record-stage-verification",
        ),
      }),
    /has no matching operation capability/,
  );

  assert.throws(
    () =>
      assertProductReleaseCapability({
        ...openclaw,
        runtimeLifecycle: {
          ...openclaw.runtimeLifecycle,
          currentState: "invented-state",
        },
      }),
    /runtime lifecycle state is outside its product contract/,
  );

  assert.throws(
    () =>
      assertProductReleaseCapability({
        ...openclaw,
        runtimeLifecycle: {
          ...openclaw.runtimeLifecycle,
          adapter: {
            available: true,
            ref: null,
            unavailableReason: null,
          },
        },
    }),
    /runtime lifecycle requires a capability, workflow owner, and coherent adapter/,
  );

  assert.throws(
    () =>
      assertProductReleaseCapability({
        ...openclaw,
        runtimeLifecycle: {
          ...openclaw.runtimeLifecycle,
          transitions: [
            ...openclaw.runtimeLifecycle.transitions,
            openclaw.runtimeLifecycle.transitions[0],
          ],
        },
      }),
    /runtime lifecycle transitions must be unique/,
  );

  assert.throws(
    () =>
      assertProductReleaseCapability({
        ...openclaw,
        runtimeLifecycle: {
          ...openclaw.runtimeLifecycle,
          transitions: openclaw.runtimeLifecycle.transitions.map(
            (transition, index) =>
              index === 0
                ? { ...transition, toStateId: "invented-state" }
                : transition,
          ),
        },
      }),
    /runtime lifecycle transition is incomplete or references an unsupported state/,
  );
});
