import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import binding from "../../contracts/console-operational-capabilities.binding.json" with { type: "json" };
import {
  consoleActionExecutable,
  resolveConsoleFixtureIsolation,
  resolveConsolePrimaryRecordIsolation,
  selectConsoleAuthorityProjection,
} from "../../src/console-integration/fixture-isolation/console-fixture-isolation.ts";
import { projectLifecycleTransitionAttentionSnapshot } from "../../src/lifecycle-transitions/read-model/attention-source.ts";

test("case:1279-positive selects one canonical source and gates actions by its semantics", () => {
  const preview = resolveConsoleFixtureIsolation({
    mode: "disconnected-preview",
    status: "current",
  });
  assert.equal(preview.fixtureAllowed, true);
  assert.equal(preview.liveAuthorityAllowed, false);
  assert.equal(
    selectConsoleAuthorityProjection({
      decision: preview,
      fixture: ["fixture"],
      live: ["live"],
    })?.join(),
    "fixture",
  );
  assert.equal(
    consoleActionExecutable(preview, "prototype-local-simulation"),
    true,
  );
  assert.equal(consoleActionExecutable(preview, "durable-command"), false);

  const live = resolveConsoleFixtureIsolation({
    mode: "live",
    status: "current",
  });
  assert.equal(live.fixtureAllowed, false);
  assert.equal(live.liveAuthorityAllowed, true);
  assert.equal(
    selectConsoleAuthorityProjection({
      decision: live,
      fixture: ["fixture"],
      live: ["live"],
    })?.join(),
    "live",
  );
  assert.equal(consoleActionExecutable(live, "durable-command"), true);
  assert.equal(
    consoleActionExecutable(live, "prototype-local-simulation"),
    false,
  );
});

test("case:1279-negative excludes primary fixtures until owner records are real", () => {
  const loading = resolveConsolePrimaryRecordIsolation({
    liveAuthorityAvailable: false,
    runtimeMode: null,
    runtimeStatus: "loading",
  });
  const liveUnavailable = resolveConsolePrimaryRecordIsolation({
    liveAuthorityAvailable: false,
    runtimeMode: "live",
    runtimeStatus: "current",
  });
  const disconnected = resolveConsolePrimaryRecordIsolation({
    liveAuthorityAvailable: false,
    runtimeMode: "disconnected-preview",
    runtimeStatus: "current",
  });

  assert.equal(loading.fixtureAllowed, false);
  assert.equal(liveUnavailable.fixtureAllowed, false);
  assert.equal(liveUnavailable.actionMode, "disabled");
  assert.equal(disconnected.fixtureAllowed, true);
  assert.equal(disconnected.actionMode, "prototype-local");
});

test("case:1279-negative never falls back while live owner truth is loading or unavailable", () => {
  for (const decision of [
    resolveConsoleFixtureIsolation({ mode: null, status: "loading" }),
    resolveConsoleFixtureIsolation({ mode: "live", status: "offline" }),
    resolveConsoleFixtureIsolation({ mode: "live", status: "partial" }),
    resolveConsoleFixtureIsolation({
      mode: "unavailable",
      status: "unavailable",
    }),
  ]) {
    assert.equal(decision.fixtureAllowed, false);
    assert.equal(decision.liveAuthorityAllowed, false);
    assert.equal(decision.actionMode, "disabled");
    assert.equal(
      selectConsoleAuthorityProjection({
        decision,
        fixture: ["fixture"],
        live: ["live"],
      }),
      null,
    );
  }

  const pendingAttention = projectLifecycleTransitionAttentionSnapshot(null, {
    allowSyntheticPreview: true,
  });
  assert.equal(pendingAttention.source.mode, "source-projected");
  assert.equal(pendingAttention.source.freshness, "unverified");
  assert.deepEqual(pendingAttention.candidates, []);
});

test("the Console binding pins the authoritative fixture boundary from work item 1278", () => {
  assert.equal(
    binding.authority.contract_id,
    "workspace-governance.console-operational-capabilities.v1",
  );
  assert.equal(
    binding.authority.revision,
    "ae000f65c8348364e81ebdbf48cd9bc4231a26ea",
  );
  assert.equal(binding.fixture_boundary.fixture_live_fallback_allowed, false);
  assert.equal(
    binding.fixture_boundary.live_owner_unavailable_behavior,
    "fail-closed-visible",
  );
  assert.deepEqual(binding.fixture_boundary.allowed_modes, [
    "unit-test",
    "storybook",
    "disconnected-preview",
  ]);
});

test("dev preview controls cannot override configured owner truth", () => {
  const shell = readFileSync(
    new URL("../../src/console-shell/use-console-shell-controller.ts", import.meta.url),
    "utf8",
  );
  const runtime = readFileSync(
    new URL("../../src/runtime-readiness/state/use-runtime-component-observations.ts", import.meta.url),
    "utf8",
  );
  const registry = readFileSync(
    new URL("../../src/workspace-registry/presentation/workspace-registry-workspace.tsx", import.meta.url),
    "utf8",
  );
  const modelOperations = readFileSync(
    new URL("../../src/domain-workspaces/model-operations/presentation/surface/use-model-operations-control-controller.ts", import.meta.url),
    "utf8",
  );
  const repository = readFileSync(
    new URL("../../src/domain-workspaces/repository/presentation/surface/use-repository-control-controller.ts", import.meta.url),
    "utf8",
  );
  const prototype = readFileSync(
    new URL("../../src/domain-workspaces/prototype/presentation/surface/use-prototype-control-controller.ts", import.meta.url),
    "utf8",
  );
  const delivery = readFileSync(
    new URL("../../src/domain-workspaces/delivery/presentation/workspace/workspace-controller.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(shell, /consoleDevMode\s*\|\|\s*lifecycleTransitionSnapshot/);
  assert.match(shell, /lifecycleFixtureIsolation\.fixtureAllowed/);
  assert.match(runtime, /fixtureIsolation\.fixtureAllowed/);
  assert.match(registry, /consoleDevMode && fixtureIsolation\.fixtureAllowed/);
  assert.match(registry, /consoleActionExecutable/);
  assert.match(
    modelOperations,
    /selectConsoleAuthorityProjection[\s\S]*modelOperationsReadModel/,
  );
  assert.match(modelOperations, /consoleActionExecutable/);
  for (const source of [repository, prototype, delivery]) {
    assert.match(source, /resolveConsolePrimaryRecordIsolation/);
    assert.match(source, /selectConsoleAuthorityProjection/);
  }
  assert.match(repository, /canProvisionRepository/);
  assert.match(
    repository,
    /primaryRecordIsolation\.fixtureAllowed[\s\S]*repositoryWorkspaceReadModel\.records/,
  );
  assert.match(prototype, /primaryRecordIsolation\.fixtureAllowed/);
  assert.match(
    prototype,
    /primaryRecordIsolation\.fixtureAllowed[\s\S]*getPrototypeWorkspaceReadModel/,
  );
  assert.match(delivery, /fixture: primaryRecordIsolation\.fixtureAllowed/);
  assert.match(delivery, /AvailableDeliveryWorkspaceController/);
  assert.doesNotMatch(delivery, /selectedBaseModel \?\? baseModel/);
});
