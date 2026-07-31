import assert from "node:assert/strict";
import test from "node:test";

import { workspacePulseFixture } from "../../src/command-center/fixtures/workspace-pulse.fixture.ts";
import { lifecycleTransitionProjectionFixtures } from "../../src/lifecycle-transitions/fixtures/lifecycle-transition-projections.fixture.ts";
import { operationWorkbenchDomainRegistry } from "../../src/operation-workbench/operation-workbench-domain-registry.ts";
import { operationWorkbenchSelectorEntries } from "../../src/operation-workbench/operation-workbench-selector-model.ts";
import { runtimeReadinessFixture } from "../../src/runtime-readiness/fixtures/runtime-readiness.fixture.ts";

test("whole-console fixtures stay bounded by capability", () => {
  assert.equal(workspacePulseFixture.signals.length, 4);
  assert.equal(runtimeReadinessFixture.componentObservations.length, 12);
  assert.equal(lifecycleTransitionProjectionFixtures.length, 6);
  assert.deepEqual(
    [
      ...new Set(
        lifecycleTransitionProjectionFixtures.map(
          (transition) => transition.route.routeId,
        ),
      ),
    ].sort(),
    [
      "proposal-to-delivery",
      "proposal-to-prototype",
      "prototype-to-delivery",
    ],
  );
});

test("Workbench selector identity and order come from the typed registry", () => {
  assert.deepEqual(
    operationWorkbenchSelectorEntries.map(({ domain, label }) => ({ domain, label })),
    operationWorkbenchDomainRegistry,
  );

  for (const entry of operationWorkbenchSelectorEntries) {
    assert.equal(entry.detail.length > 0, true);
    assert.equal(entry.availability, "available");
    assert.equal(
      ["interactive", "read-only", "unavailable"].includes(
        entry.runtimeReadiness,
      ),
      true,
    );
    assert.equal(entry.sourceMode, "prototype-local");
  }
});
