import assert from "node:assert/strict";
import test from "node:test";

import { modelProfileRecords } from "../../src/domain-workspaces/model-operations/read-model/fixtures/model-profile-records.fixture.ts";
import {
  modelOperationsSummaryFromProfiles,
  modelProfileAvailability,
  modelProfileChecks,
} from "../../src/domain-workspaces/model-operations/read-model/selectors/model-profile-selectors.ts";
import { modelProfileRequestCapability } from "../../src/domain-workspaces/model-operations/work-model/profile-requests/model-profile-request-capability.ts";

test("the default Model Operations fixture reflects canonical suspended truth", () => {
  assert.equal(modelProfileRecords.length, 1);

  const profile = modelProfileRecords[0];
  assert.ok(profile);
  assert.equal(profile.policy.profileId, "intake-classifier-v1");
  assert.equal(profile.policy.lifecycle, "suspended");
  assert.equal(profile.policy.upstreamModel, "pending-selection");
  assert.equal(profile.policy.directProviderAccessAllowed, false);
  assert.equal(profile.accessPlane.activationAllowed, false);
  assert.equal(profile.consumers[0]?.liveConsumptionAllowed, false);
  assert.equal(modelProfileAvailability(profile), "suspended");
});

test("summary buckets are exclusive and keep zero-value categories", () => {
  assert.deepEqual(modelOperationsSummaryFromProfiles(modelProfileRecords), [
    { id: "available", label: "Available", tone: "ok", value: "0" },
    { id: "blocked", label: "Blocked", tone: "danger", value: "0" },
    { id: "suspended", label: "Suspended", tone: "warn", value: "1" },
    { id: "exception", label: "Exception", tone: "warn", value: "0" },
    { id: "retired", label: "Retired", tone: "muted", value: "0" },
  ]);
});

test("dashboard checks preserve suspension and blocked evidence", () => {
  const profile = modelProfileRecords[0];
  assert.ok(profile);

  const checks = modelProfileChecks(profile);
  assert.deepEqual(
    checks.map((check) => [check.id, check.state]),
    [
      ["profile-policy", "suspended"],
      ["consumer-contract", "suspended"],
      ["access-plane", "blocked"],
      ["runtime-controls", "blocked"],
      ["security-acceptance", "blocked"],
    ],
  );
});

test("profile request remains a truthful unavailable capability", () => {
  assert.equal(modelProfileRequestCapability.availability, "planned");
  assert.equal(modelProfileRequestCapability.actionSemantic, "unavailable");
  assert.equal(
    modelProfileRequestCapability.workflowOwner,
    "operator-orchestration-service",
  );
  assert.ok(
    modelProfileRequestCapability.requiredBeforeEnable.includes(
      "source-version reconciliation",
    ),
  );
});
