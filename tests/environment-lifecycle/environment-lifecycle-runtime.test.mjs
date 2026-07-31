import assert from "node:assert/strict";
import test from "node:test";

import {
  devIntegrationProfileFixtures,
  devIntegrationProfileScenarioFixtures,
} from "../../src/environment-lifecycle/fixtures/dev-integration-profiles.fixture.ts";
import {
  productReleaseCapabilityFixtures,
  productReleaseScenarioFixtures,
} from "../../src/environment-lifecycle/fixtures/product-release-capabilities.fixture.ts";
import {
  createEnvironmentLifecycleLocalRuntime,
} from "../../src/environment-lifecycle/local-runtime/environment-lifecycle-runtime-store.ts";
import { getEnvironmentLifecycleLocalRuntime } from "../../src/environment-lifecycle/local-runtime/environment-lifecycle-runtime-provider.ts";
import {
  selectEnvironmentLifecycleSubjectOperations,
} from "../../src/environment-lifecycle/read-model/environment-lifecycle-operation-selectors.ts";
import {
  createDevIntegrationProfileCommand,
  createDevIntegrationProfileRequestCommand,
  createProductReleaseCommand,
  createProductRuntimeLifecycleCommand,
  environmentProductSubjectRef,
  environmentProfileSubjectRef,
} from "../../src/environment-lifecycle/work-model/commands/environment-lifecycle-command-factory.ts";

const actorRef = "operator:test";
const profile = devIntegrationProfileFixtures[1];
const product = productReleaseCapabilityFixtures[0];

function runtime(failurePlans = []) {
  return createEnvironmentLifecycleLocalRuntime({
    failurePlans,
    products: productReleaseCapabilityFixtures,
    profiles: devIntegrationProfileFixtures,
  });
}

function profileCommand(
  action,
  expectedSourceVersion = profile.source.version,
  requestedAt = "2026-07-26T10:00:00Z",
) {
  return createDevIntegrationProfileCommand({
    action,
    actorRef,
    expectedSourceVersion,
    profile,
    requestedAt,
  });
}

test("idempotent profile command records one ordered operation and receipt", async () => {
  const localRuntime = runtime();
  const command = profileCommand("up");
  const first = await localRuntime.submit(command);
  const duplicate = await localRuntime.submit(command);
  const snapshot = localRuntime.getSnapshot();
  const effectiveProfile = snapshot.effective.profiles.find(
    (candidate) => candidate.profileId === profile.profileId,
  );

  assert.equal(duplicate.operationId, first.operationId);
  assert.equal(first.label, "Start");
  assert.equal(snapshot.operations.length, 1);
  assert.equal(snapshot.receipts.length, 1);
  assert.deepEqual(
    first.events.map((event) => event.state),
    ["requested", "queued", "running", "succeeded"],
  );
  assert.equal(effectiveProfile?.runtime.observation.state, "running");
  assert.equal(profile.runtime.observation.state, "stopped");
});

test("profile operation selection keeps runtime and handoff command families separate", async () => {
  const localRuntime = runtime();
  const subjectRef = environmentProfileSubjectRef(profile.profileId);

  await localRuntime.submit(profileCommand("up"));
  await localRuntime.submit(
    profileCommand(
      "promote-check",
      profile.source.version,
      "2026-07-26T10:05:00Z",
    ),
  );

  const snapshot = localRuntime.getSnapshot();
  const runtimeSelection = selectEnvironmentLifecycleSubjectOperations({
    actions: ["up", "status", "access", "smoke", "down", "reset"],
    operations: snapshot.operations,
    receipts: snapshot.receipts,
    subjectRef,
  });
  const handoffSelection = selectEnvironmentLifecycleSubjectOperations({
    actions: ["promote-check"],
    operations: snapshot.operations,
    receipts: snapshot.receipts,
    subjectRef,
  });

  assert.equal(runtimeSelection.latestOperation?.action, "up");
  assert.equal(runtimeSelection.latestReceipt?.action, "up");
  assert.equal(handoffSelection.latestOperation?.action, "promote-check");
  assert.equal(handoffSelection.latestReceipt?.action, "promote-check");
});

test("promote check records not-ready as a successful business result", async () => {
  const localRuntime = runtime();
  const operation = await localRuntime.submit(
    profileCommand("promote-check"),
  );
  const snapshot = localRuntime.getSnapshot();
  const receipt = snapshot.receipts[0];
  const effectiveProfile = snapshot.effective.profiles.find(
    (candidate) => candidate.profileId === profile.profileId,
  );

  assert.equal(operation.state, "succeeded");
  assert.equal(receipt?.outcome, "succeeded");
  assert.equal(receipt?.effect?.kind, "profile-handoff");
  const checkResults =
    receipt?.effect?.kind === "profile-handoff"
      ? receipt.effect.checkResults
      : [];
  assert.equal(
    receipt?.effect?.kind === "profile-handoff"
      ? receipt.effect.result
      : null,
    "not-ready",
  );
  assert.deepEqual(
    checkResults.map((result) => ({
      checkId: result.checkId,
      status: result.status,
    })),
    profile.stageHandoff.requiredChecks.map((check) => ({
      checkId: check.id,
      status: "blocked",
    })),
  );
  assert.ok(
    checkResults.every((result) =>
      result.evidenceRef.endsWith(`/checks/${result.checkId}`),
    ),
  );
  assert.equal(effectiveProfile?.stageHandoff.result, "not-ready");
  assert.deepEqual(
    effectiveProfile?.stageHandoff.checkResults,
    checkResults,
  );
});

test("promote check becomes ready only after running smoke evidence exists", async () => {
  const localRuntime = runtime();
  const subjectRef = environmentProfileSubjectRef(profile.profileId);

  await localRuntime.submit(profileCommand("up"));
  let effectiveProfile = localRuntime
    .getSnapshot()
    .effective.profiles.find(
      (candidate) => candidate.profileId === profile.profileId,
    );
  assert.ok(effectiveProfile);

  await localRuntime.submit(
    createDevIntegrationProfileCommand({
      action: "smoke",
      actorRef,
      expectedSourceVersion:
        localRuntime.getSnapshot().effective.subjectVersions[subjectRef],
      profile: effectiveProfile,
      requestedAt: "2026-07-26T10:02:00Z",
    }),
  );
  effectiveProfile = localRuntime
    .getSnapshot()
    .effective.profiles.find(
      (candidate) => candidate.profileId === profile.profileId,
    );
  assert.ok(effectiveProfile);

  await localRuntime.submit(
    createDevIntegrationProfileCommand({
      action: "promote-check",
      actorRef,
      expectedSourceVersion:
        localRuntime.getSnapshot().effective.subjectVersions[subjectRef],
      profile: effectiveProfile,
      requestedAt: "2026-07-26T10:03:00Z",
    }),
  );
  effectiveProfile = localRuntime
    .getSnapshot()
    .effective.profiles.find(
      (candidate) => candidate.profileId === profile.profileId,
    );

  assert.equal(effectiveProfile?.stageHandoff.result, "ready");
  assert.equal(
    effectiveProfile?.stageHandoff.checkResults.length,
    profile.stageHandoff.requiredChecks.length,
  );
  assert.ok(
    effectiveProfile?.stageHandoff.checkResults.every(
      (result) => result.status === "passed",
    ),
  );
  assert.equal(
    effectiveProfile?.nextMove?.actionId,
    "review-stage-handoff",
  );
});

test("status refresh preserves smoke-backed promote check readiness", async () => {
  const localRuntime = runtime();
  const subjectRef = environmentProfileSubjectRef(profile.profileId);

  await localRuntime.submit(profileCommand("up"));
  let effectiveProfile = localRuntime
    .getSnapshot()
    .effective.profiles.find(
      (candidate) => candidate.profileId === profile.profileId,
    );
  assert.ok(effectiveProfile);

  await localRuntime.submit(
    createDevIntegrationProfileCommand({
      action: "smoke",
      actorRef,
      expectedSourceVersion:
        localRuntime.getSnapshot().effective.subjectVersions[subjectRef],
      profile: effectiveProfile,
      requestedAt: "2026-07-26T10:02:00Z",
    }),
  );
  effectiveProfile = localRuntime
    .getSnapshot()
    .effective.profiles.find(
      (candidate) => candidate.profileId === profile.profileId,
    );
  assert.ok(effectiveProfile);
  assert.equal(effectiveProfile.nextMove?.actionId, "promote-check");

  await localRuntime.submit(
    createDevIntegrationProfileCommand({
      action: "status",
      actorRef,
      expectedSourceVersion:
        localRuntime.getSnapshot().effective.subjectVersions[subjectRef],
      profile: effectiveProfile,
      requestedAt: "2026-07-26T10:03:00Z",
    }),
  );
  effectiveProfile = localRuntime
    .getSnapshot()
    .effective.profiles.find(
      (candidate) => candidate.profileId === profile.profileId,
    );

  assert.equal(effectiveProfile?.nextMove?.actionId, "promote-check");
});

test("status refresh preserves ready stage handoff review", async () => {
  const localRuntime = runtime();
  const subjectRef = environmentProfileSubjectRef(profile.profileId);

  for (const [action, requestedAt] of [
    ["up", "2026-07-26T10:01:00Z"],
    ["smoke", "2026-07-26T10:02:00Z"],
    ["promote-check", "2026-07-26T10:03:00Z"],
  ]) {
    const effectiveProfile = localRuntime
      .getSnapshot()
      .effective.profiles.find(
        (candidate) => candidate.profileId === profile.profileId,
      );
    assert.ok(effectiveProfile);
    await localRuntime.submit(
      createDevIntegrationProfileCommand({
        action,
        actorRef,
        expectedSourceVersion:
          localRuntime.getSnapshot().effective.subjectVersions[subjectRef],
        profile: effectiveProfile,
        requestedAt,
      }),
    );
  }

  let effectiveProfile = localRuntime
    .getSnapshot()
    .effective.profiles.find(
      (candidate) => candidate.profileId === profile.profileId,
    );
  assert.ok(effectiveProfile);
  assert.equal(
    effectiveProfile.nextMove?.actionId,
    "review-stage-handoff",
  );

  await localRuntime.submit(
    createDevIntegrationProfileCommand({
      action: "status",
      actorRef,
      expectedSourceVersion:
        localRuntime.getSnapshot().effective.subjectVersions[subjectRef],
      profile: effectiveProfile,
      requestedAt: "2026-07-26T10:04:00Z",
    }),
  );
  effectiveProfile = localRuntime
    .getSnapshot()
    .effective.profiles.find(
      (candidate) => candidate.profileId === profile.profileId,
    );

  assert.equal(
    effectiveProfile?.nextMove?.actionId,
    "review-stage-handoff",
  );
});

test("runtime changes invalidate prior stage handoff evidence", async () => {
  const localRuntime = runtime();
  const subjectRef = environmentProfileSubjectRef(profile.profileId);

  for (const [action, requestedAt] of [
    ["up", "2026-07-26T10:01:00Z"],
    ["smoke", "2026-07-26T10:02:00Z"],
    ["promote-check", "2026-07-26T10:03:00Z"],
  ]) {
    const effectiveProfile = localRuntime
      .getSnapshot()
      .effective.profiles.find(
        (candidate) => candidate.profileId === profile.profileId,
      );
    assert.ok(effectiveProfile);
    await localRuntime.submit(
      createDevIntegrationProfileCommand({
        action,
        actorRef,
        expectedSourceVersion:
          localRuntime.getSnapshot().effective.subjectVersions[subjectRef],
        profile: effectiveProfile,
        requestedAt,
      }),
    );
  }

  let effectiveProfile = localRuntime
    .getSnapshot()
    .effective.profiles.find(
      (candidate) => candidate.profileId === profile.profileId,
    );
  assert.ok(effectiveProfile);
  assert.equal(effectiveProfile.stageHandoff.result, "ready");

  await localRuntime.submit(
    createDevIntegrationProfileCommand({
      action: "down",
      actorRef,
      expectedSourceVersion:
        localRuntime.getSnapshot().effective.subjectVersions[subjectRef],
      profile: effectiveProfile,
      requestedAt: "2026-07-26T10:04:00Z",
    }),
  );
  effectiveProfile = localRuntime
    .getSnapshot()
    .effective.profiles.find(
      (candidate) => candidate.profileId === profile.profileId,
    );
  assert.ok(effectiveProfile);
  assert.equal(effectiveProfile.stageHandoff.result, "stale");
  assert.equal(effectiveProfile.stageHandoff.smokeSummaryRef, null);
  assert.equal(effectiveProfile.stageHandoff.sessionManifestRef, null);
  assert.equal(effectiveProfile.stageHandoff.promotionReportRef, null);
  assert.deepEqual(effectiveProfile.stageHandoff.checkResults, []);

  await localRuntime.submit(
    createDevIntegrationProfileCommand({
      action: "up",
      actorRef,
      expectedSourceVersion:
        localRuntime.getSnapshot().effective.subjectVersions[subjectRef],
      profile: effectiveProfile,
      requestedAt: "2026-07-26T10:05:00Z",
    }),
  );
  effectiveProfile = localRuntime
    .getSnapshot()
    .effective.profiles.find(
      (candidate) => candidate.profileId === profile.profileId,
    );
  assert.ok(effectiveProfile);

  await localRuntime.submit(
    createDevIntegrationProfileCommand({
      action: "smoke",
      actorRef,
      expectedSourceVersion:
        localRuntime.getSnapshot().effective.subjectVersions[subjectRef],
      profile: effectiveProfile,
      requestedAt: "2026-07-26T10:06:00Z",
    }),
  );
  effectiveProfile = localRuntime
    .getSnapshot()
    .effective.profiles.find(
      (candidate) => candidate.profileId === profile.profileId,
    );

  assert.equal(effectiveProfile?.stageHandoff.result, "not-run");
  assert.ok(effectiveProfile?.stageHandoff.smokeSummaryRef);
  assert.equal(effectiveProfile?.stageHandoff.sessionManifestRef, null);
  assert.equal(effectiveProfile?.stageHandoff.promotionReportRef, null);
  assert.equal(effectiveProfile?.nextMove?.actionId, "promote-check");
});

test("non-active status refresh preserves the lifecycle-owned next move", async () => {
  const suspended = devIntegrationProfileScenarioFixtures.find(
    (candidate) => candidate.profileId === "synthetic-suspended",
  );
  assert.ok(suspended);
  const localRuntime = createEnvironmentLifecycleLocalRuntime({
    products: productReleaseCapabilityFixtures,
    profiles: [suspended],
  });
  const operation = await localRuntime.submit(
    createDevIntegrationProfileCommand({
      action: "status",
      actorRef,
      expectedSourceVersion: suspended.source.version,
      profile: suspended,
      requestedAt: "2026-07-26T10:07:00Z",
    }),
  );
  const effectiveProfile = localRuntime
    .getSnapshot()
    .effective.profiles.find(
      (candidate) => candidate.profileId === suspended.profileId,
    );

  assert.equal(operation.state, "succeeded");
  assert.equal(
    effectiveProfile?.nextMove?.actionId,
    "review-suspension",
  );

  assert.ok(effectiveProfile);
  await localRuntime.submit(
    createDevIntegrationProfileCommand({
      action: "reset",
      actorRef,
      expectedSourceVersion:
        localRuntime.getSnapshot().effective.subjectVersions[
          environmentProfileSubjectRef(suspended.profileId)
        ],
      profile: effectiveProfile,
      requestedAt: "2026-07-26T10:08:00Z",
    }),
  );
  const resetProfile = localRuntime
    .getSnapshot()
    .effective.profiles.find(
      (candidate) => candidate.profileId === suspended.profileId,
    );

  assert.equal(resetProfile?.nextMove?.actionId, "review-suspension");
  assert.equal(resetProfile?.stageHandoff.result, "stale");
  assert.equal(resetProfile?.stageHandoff.smokeSummaryRef, null);
});

test("product release receipt advances only the completed current step", async () => {
  const localRuntime = runtime();
  const command = createProductReleaseCommand({
    actorRef,
    expectedSourceVersion: product.source.version,
    input: {
      "evidence-ref": "evidence://stage/rehearsal-01",
      note: "Stage rehearsal passed.",
    },
    product,
    requestedAt: "2026-07-26T10:05:00Z",
    stepId: "stage-verification",
  });
  const operation = await localRuntime.submit(command);
  const receipt = localRuntime.getSnapshot().receipts[0];
  const effectiveProduct =
    localRuntime.getSnapshot().effective.products.find(
      (candidate) => candidate.productId === product.productId,
    );

  assert.equal(operation.state, "succeeded");
  assert.deepEqual(
    {
      actorRef: operation.actorRef,
      adapterRef: operation.adapterRef,
      requiredCapability: operation.requiredCapability,
      workflowOwner: operation.workflowOwner,
    },
    {
      actorRef: command.actorRef,
      adapterRef: command.adapterRef,
      requiredCapability: command.requiredCapability,
      workflowOwner: command.workflowOwner,
    },
  );
  assert.deepEqual(receipt?.commandInput, {
    input: {
      "evidence-ref": "evidence://stage/rehearsal-01",
      note: "Stage rehearsal passed.",
    },
    kind: "product-release",
    productId: product.productId,
    stepId: "stage-verification",
  });
  assert.deepEqual(
    {
      actorRef: receipt?.actorRef,
      adapterRef: receipt?.adapterRef,
      requiredCapability: receipt?.requiredCapability,
      workflowOwner: receipt?.workflowOwner,
    },
    {
      actorRef: command.actorRef,
      adapterRef: command.adapterRef,
      requiredCapability: command.requiredCapability,
      workflowOwner: command.workflowOwner,
    },
  );
  assert.equal(
    effectiveProduct?.releasePath.find(
      (step) => step.id === "stage-verification",
    )?.posture,
    "complete",
  );
  assert.equal(
    effectiveProduct?.releasePath.find(
      (step) => step.id === "stage-readiness",
    )?.posture,
    "current",
  );
  assert.equal(effectiveProduct?.nextMove?.actionId, "record-readiness");
  assert.equal(
    product.releasePath.find(
      (step) => step.id === "stage-verification",
    )?.posture,
    "current",
  );
});

test("final product release receipt clears the completed path next move", async () => {
  const finalVerificationProduct = {
    ...product,
    nextMove: {
      actionId: "record-prod-verification",
      label: "Production verification",
      ownerRef: "platform-engineering",
      reason: "Record verification for the promoted production contract.",
    },
    releasePath: product.releasePath.map((step) => {
      if (step.id === "production-verification") {
        return {
          ...step,
          canonicalStatus: "pending",
          posture: "current",
        };
      }

      const canonicalStatus = {
        "production-promotion": "promoted",
        "stage-candidate": "candidate",
        "stage-readiness": "approved",
        "stage-verification": "recorded",
      }[step.id];

      return {
        ...step,
        canonicalStatus: canonicalStatus ?? step.canonicalStatus,
        posture: "complete",
      };
    }),
  };
  const localRuntime = createEnvironmentLifecycleLocalRuntime({
    products: [finalVerificationProduct],
    profiles: devIntegrationProfileFixtures,
  });

  await localRuntime.submit(
    createProductReleaseCommand({
      actorRef,
      expectedSourceVersion: finalVerificationProduct.source.version,
      input: {
        "evidence-ref": "evidence://prod/verification-01",
        note: "Production verification passed.",
      },
      product: finalVerificationProduct,
      requestedAt: "2026-07-26T10:06:00Z",
      stepId: "production-verification",
    }),
  );

  const effectiveProduct =
    localRuntime.getSnapshot().effective.products.find(
      (candidate) =>
        candidate.productId === finalVerificationProduct.productId,
    );

  assert.ok(
    effectiveProduct?.releasePath.every(
      (step) => step.posture === "complete",
    ),
  );
  assert.equal(effectiveProduct?.nextMove, null);
});

test("product commands target execution adapters instead of human operator guidance", () => {
  const releaseOperation = product.releaseOperations.find(
    (operation) => operation.action === "record-stage-verification",
  );
  const releaseCommand = createProductReleaseCommand({
    actorRef,
    expectedSourceVersion: product.source.version,
    input: {
      "evidence-ref": "evidence://stage/rehearsal-02",
      note: "",
    },
    product,
    requestedAt: "2026-07-26T10:06:00Z",
    stepId: "stage-verification",
  });
  const runtimeCommand = createProductRuntimeLifecycleCommand({
    actorRef,
    expectedSourceVersion: product.source.version,
    incidentRef: null,
    product,
    reason: "Resume the governed runtime.",
    requestedAt: "2026-07-26T10:07:00Z",
    targetRuntimeLifecycleState: "live",
  });

  assert.ok(releaseOperation?.adapter.ref);
  assert.ok(product.runtimeLifecycle?.adapter.ref);
  assert.equal(releaseCommand.adapterRef, releaseOperation.adapter.ref);
  assert.notEqual(releaseCommand.adapterRef, product.operatorRoute.ref);
  assert.equal(
    runtimeCommand.adapterRef,
    product.runtimeLifecycle.adapter.ref,
  );
  assert.notEqual(runtimeCommand.adapterRef, product.operatorRoute.ref);
});

test("product runtime lifecycle receipt changes only effective local truth", async () => {
  const localRuntime = runtime();
  const reason = "Resume the governed runtime after verification.";
  const operation = await localRuntime.submit(
    createProductRuntimeLifecycleCommand({
      actorRef,
      expectedSourceVersion: product.source.version,
      incidentRef: null,
      product,
      reason,
      requestedAt: "2026-07-26T10:10:00Z",
      targetRuntimeLifecycleState: "live",
    }),
  );
  const snapshot = localRuntime.getSnapshot();
  const effectiveProduct = snapshot.effective.products.find(
      (candidate) => candidate.productId === product.productId,
  );

  assert.equal(operation.state, "succeeded");
  assert.equal(effectiveProduct?.runtimeLifecycle?.currentState, "live");
  assert.equal(product.runtimeLifecycle?.currentState, "suspended");
  assert.deepEqual(snapshot.receipts[0]?.commandInput, {
    incidentRef: null,
    kind: "product-runtime-lifecycle",
    productId: product.productId,
    reason,
    sourceState: "suspended",
    targetState: "live",
  });
  assert.deepEqual(snapshot.receipts[0]?.effect, {
    kind: "product-runtime-lifecycle",
    sourceState: "suspended",
    targetState: "live",
    verificationEffect: "pending",
  });
  assert.equal(
    effectiveProduct?.releasePath.find(
      (step) => step.id === "production-verification",
    )?.canonicalStatus,
    "pending",
  );
});

test("non-live runtime transitions deactivate production verification", async () => {
  const localRuntime = runtime();
  const subjectRef = environmentProductSubjectRef(product.productId);

  await localRuntime.submit(
    createProductRuntimeLifecycleCommand({
      actorRef,
      expectedSourceVersion: product.source.version,
      incidentRef: null,
      product,
      reason: "Resume the governed runtime for verification.",
      requestedAt: "2026-07-26T10:10:00Z",
      targetRuntimeLifecycleState: "live",
    }),
  );
  let snapshot = localRuntime.getSnapshot();
  const liveProduct = snapshot.effective.products.find(
    (candidate) => candidate.productId === product.productId,
  );
  assert.ok(liveProduct);

  await localRuntime.submit(
    createProductRuntimeLifecycleCommand({
      actorRef,
      expectedSourceVersion:
        snapshot.effective.subjectVersions[subjectRef],
      incidentRef: null,
      product: liveProduct,
      reason: "Stop product traffic while retaining support services.",
      requestedAt: "2026-07-26T10:11:00Z",
      targetRuntimeLifecycleState: "traffic-stopped",
    }),
  );
  snapshot = localRuntime.getSnapshot();
  const trafficStoppedProduct = snapshot.effective.products.find(
    (candidate) => candidate.productId === product.productId,
  );
  const receipt = snapshot.receipts.at(-1);

  assert.equal(
    trafficStoppedProduct?.runtimeLifecycle?.currentState,
    "traffic-stopped",
  );
  assert.equal(
    trafficStoppedProduct?.releasePath.find(
      (step) => step.id === "production-verification",
    )?.canonicalStatus,
    "inactive",
  );
  assert.deepEqual(receipt?.effect, {
    kind: "product-runtime-lifecycle",
    sourceState: "live",
    targetState: "traffic-stopped",
    verificationEffect: "inactive",
  });
});

test("quarantine blocks promotion until runtime lifecycle evidence clears the gate", async () => {
  const quarantined = productReleaseScenarioFixtures[0];
  const localRuntime = createEnvironmentLifecycleLocalRuntime({
    products: [quarantined],
    profiles: devIntegrationProfileFixtures,
  });
  const subjectRef = environmentProductSubjectRef(
    quarantined.productId,
  );

  assert.throws(
    () =>
      createProductReleaseCommand({
        actorRef,
        expectedSourceVersion: quarantined.source.version,
        input: { reason: "Promote the approved candidate." },
        product: quarantined,
        requestedAt: "2026-07-26T10:10:00Z",
        stepId: "production-promotion",
      }),
    /does not expose an actionable operation/,
  );

  await localRuntime.submit(
    createProductRuntimeLifecycleCommand({
      actorRef,
      expectedSourceVersion: quarantined.source.version,
      incidentRef: "incident://openclaw/follow-up-001",
      product: quarantined,
      reason: "The incident is resolved and quarantine can end.",
      requestedAt: "2026-07-26T10:11:00Z",
      targetRuntimeLifecycleState: "live",
    }),
  );
  const effectiveProduct =
    localRuntime.getSnapshot().effective.products.find(
      (candidate) => candidate.productId === quarantined.productId,
    );
  assert.ok(effectiveProduct);
  assert.equal(
    effectiveProduct.nextMove?.actionId,
    "request-prod-promotion",
  );

  const operation = await localRuntime.submit(
    createProductReleaseCommand({
      actorRef,
      expectedSourceVersion:
        localRuntime.getSnapshot().effective.subjectVersions[
          subjectRef
        ],
      input: { reason: "Promote the approved candidate." },
      product: effectiveProduct,
      requestedAt: "2026-07-26T10:12:00Z",
      stepId: "production-promotion",
    }),
  );

  assert.equal(operation.state, "succeeded");
  assert.equal(operation.label, "Production promotion");
});

test("stale source command fails without changing effective state", async () => {
  const localRuntime = runtime();
  const statusOperation = await localRuntime.submit(
    profileCommand("status"),
  );
  const staleOperation = await localRuntime.submit(
    profileCommand("up", profile.source.version, "2026-07-26T10:11:00Z"),
  );
  const snapshot = localRuntime.getSnapshot();
  const subjectRef = environmentProfileSubjectRef(profile.profileId);
  const effectiveProfile = snapshot.effective.profiles.find(
    (candidate) => candidate.profileId === profile.profileId,
  );

  assert.equal(statusOperation.state, "succeeded");
  assert.equal(staleOperation.state, "failed");
  assert.equal(staleOperation.failureCode, "source-version-conflict");
  assert.equal(effectiveProfile?.runtime.observation.state, "stopped");
  assert.equal(
    snapshot.effective.subjectVersions[subjectRef],
    snapshot.receipts[0]?.receiptRef,
  );
});

test("transient failure retries with correlation and causation intact", async () => {
  const localRuntime = runtime([
    {
      action: "up",
      failure: {
        code: "adapter-unavailable",
        detail: "The prototype-local adapter is temporarily unavailable.",
      },
      remainingAttempts: 1,
    },
  ]);
  const failed = await localRuntime.submit(profileCommand("up"));
  const retried = await localRuntime.retry(
    failed.operationId,
    "2026-07-26T10:12:00Z",
  );
  const reconciliation = localRuntime.reconcile(failed.correlationId);
  const effectiveProfile =
    localRuntime.getSnapshot().effective.profiles.find(
      (candidate) => candidate.profileId === profile.profileId,
    );
  const subjectRef = environmentProfileSubjectRef(profile.profileId);
  assert.ok(effectiveProfile);
  await localRuntime.submit(
    createDevIntegrationProfileCommand({
      action: "status",
      actorRef,
      expectedSourceVersion:
        localRuntime.getSnapshot().effective.subjectVersions[subjectRef],
      profile: effectiveProfile,
      requestedAt: "2026-07-26T10:13:00Z",
    }),
  );
  const correlatedSelection =
    selectEnvironmentLifecycleSubjectOperations({
      correlationId: failed.correlationId,
      operations: localRuntime.getSnapshot().operations,
      receipts: localRuntime.getSnapshot().receipts,
      subjectRef,
    });

  assert.equal(failed.state, "failed");
  assert.equal(retried.state, "succeeded");
  assert.equal(retried.attempt, 2);
  assert.equal(retried.correlationId, failed.correlationId);
  assert.equal(retried.causationId, failed.operationId);
  assert.equal(reconciliation.state, "resolved");
  assert.equal(reconciliation.operation?.operationId, retried.operationId);
  assert.equal(effectiveProfile?.runtime.observation.state, "running");
  assert.equal(
    correlatedSelection.latestOperation?.operationId,
    retried.operationId,
  );
  assert.equal(correlatedSelection.operations.length, 2);
});

test("profile request enters effective state once through the runtime", async () => {
  const localRuntime = runtime();
  const request = {
    dependencies: [],
    expectedWrites: {
      classification: "none",
      targets: [],
    },
    laneClass: "prototype-devint",
    ownerRepo: "workspace-prototype-studio",
    participatingRepos: ["workspace-prototype-studio"],
    persistence: null,
    profileId: "runtime-request-test",
    purpose: "Verify the prototype-local request command path.",
    replacesProfileId: null,
    requestedAt: "2026-07-26T10:15:00Z",
    requestedBy: actorRef,
    runtimePlatform: "local-k3s",
    runtimeStateModel: "disposable",
    securityTriggers: [],
  };
  const command = createDevIntegrationProfileRequestCommand({
    actorRef,
    expectedSourceVersion: "unregistered",
    request,
  });
  const duplicateCommand = createDevIntegrationProfileRequestCommand({
    actorRef,
    expectedSourceVersion: "unregistered",
    request: {
      ...request,
      requestedAt: "2026-07-26T10:15:01Z",
    },
  });
  const first = await localRuntime.submit(command);
  const duplicate = await localRuntime.submit(duplicateCommand);
  const projected = localRuntime
    .getSnapshot()
    .effective.profiles.filter(
      (candidate) => candidate.profileId === request.profileId,
    );

  assert.equal(first.state, "succeeded");
  assert.equal(duplicateCommand.idempotencyKey, command.idempotencyKey);
  assert.equal(duplicate.operationId, first.operationId);
  assert.equal(projected.length, 1);
  assert.equal(projected[0]?.lifecycle, "proposed");
  assert.equal(projected[0]?.source.provenance, "prototype-local");
  assert.equal(
    localRuntime.getSnapshot().effective.subjectVersions[
      environmentProfileSubjectRef(request.profileId)
    ],
    localRuntime.getSnapshot().receipts[0]?.receiptRef,
  );
});

test("profile request commands fail closed when form-only invariants are bypassed", async () => {
  const localRuntime = runtime();
  const request = {
    dependencies: [],
    expectedWrites: {
      classification: "none",
      targets: [],
    },
    laneClass: "prototype-devint",
    ownerRepo: "workspace-prototype-studio",
    participatingRepos: ["platform-engineering"],
    persistence: null,
    profileId: "invalid-runtime-request",
    purpose: "Prove command-boundary request validation.",
    replacesProfileId: null,
    requestedAt: "2026-07-26T10:16:00Z",
    requestedBy: actorRef,
    runtimePlatform: "local-k3s",
    runtimeStateModel: "disposable",
    securityTriggers: [],
  };
  const operation = await localRuntime.submit(
    createDevIntegrationProfileRequestCommand({
      actorRef,
      expectedSourceVersion: "unregistered",
      request,
    }),
  );
  const snapshot = localRuntime.getSnapshot();

  assert.equal(operation.state, "failed");
  assert.equal(
    operation.failureDetail,
    "Participating repositories must include the owner repo.",
  );
  assert.equal(
    snapshot.effective.profiles.some(
      (profile) => profile.profileId === request.profileId,
    ),
    false,
  );
  assert.equal(snapshot.receipts[0]?.outcome, "failed");
  await assert.rejects(
    () =>
      localRuntime.retry(
        operation.operationId,
        "2026-07-26T10:17:00Z",
      ),
    /Only a retryable failed Environment operation can be retried/,
  );
});

test("unknown reconciliation and failed receipts never claim resolved truth", async () => {
  const localRuntime = runtime([
    {
      action: "status",
      failure: {
        code: "adapter-timeout",
        detail: "The status adapter timed out.",
      },
      remainingAttempts: 1,
    },
  ]);
  const operation = await localRuntime.submit(profileCommand("status"));
  const snapshot = localRuntime.getSnapshot();

  assert.equal(localRuntime.reconcile("missing-correlation").state, "unknown");
  assert.equal(localRuntime.reconcile(operation.correlationId).state, "failed");
  assert.equal(snapshot.receipts[0]?.outcome, "failed");
  assert.equal(
    snapshot.effective.subjectVersions[
      environmentProfileSubjectRef(profile.profileId)
    ],
    profile.source.version,
  );
  assert.equal(
    snapshot.effective.subjectVersions[
      environmentProductSubjectRef(product.productId)
    ],
    product.source.version,
  );
});

test("the workspace runtime survives consumer unmount and remount", async () => {
  const first = getEnvironmentLifecycleLocalRuntime({
    products: productReleaseCapabilityFixtures,
    profiles: devIntegrationProfileFixtures,
  });
  await first.submit(profileCommand("up", profile.source.version, "2026-07-26T11:00:00Z"));

  const reopened = getEnvironmentLifecycleLocalRuntime({
    products: productReleaseCapabilityFixtures,
    profiles: devIntegrationProfileFixtures,
  });

  assert.equal(reopened, first);
  assert.equal(reopened.getSnapshot().operations.length, 1);
  assert.equal(
    reopened
      .getSnapshot()
      .effective.profiles.find(
        (candidate) => candidate.profileId === profile.profileId,
      )?.runtime.observation.state,
    "running",
  );
});
