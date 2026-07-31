import {
  assertAppFile,
  assertAppPathAbsent,
  assertIncludes,
  assertOmits,
  assertRepoIncludes,
} from "../guard-lib.mjs";

const attentionModel =
  "src/command-center/read-model/command-center-attention.ts";
const attentionSources =
  "src/command-center/read-model/command-center-attention-sources.ts";
const attentionHook =
  "src/command-center/read-model/use-command-center-attention.ts";
const workspacePulseFixture =
  "src/command-center/fixtures/workspace-pulse.fixture.ts";
const shellSelection = "src/console-shell/use-console-shell-selection.ts";
const shellController = "src/console-shell/use-console-shell-controller.ts";
const shellActivityModel =
  "src/console-shell/activity/console-activity-model.ts";
const shellActivitySources =
  "src/console-shell/activity/console-activity-sources.ts";
const shellActivityHook =
  "src/console-shell/activity/use-console-activity.ts";
const shellActivityPanel =
  "src/console-shell/presentation/console-activity-panel.tsx";
const shellRoot = "src/console-shell/governance-console-shell.tsx";
const selectorModel =
  "src/operation-workbench/operation-workbench-selector-model.ts";

export const guard = {
  id: "shared/whole-console-source",
  run() {
    const failures = [];

    for (const path of [
      "src/command-center/index.ts",
      attentionModel,
      attentionSources,
      attentionHook,
      workspacePulseFixture,
      "src/command-center/read-model/workspace-pulse.ts",
      "src/console-integration/browser-download.ts",
      shellActivityHook,
      shellActivityModel,
      shellActivityPanel,
      shellActivitySources,
      "src/console-shell/fixtures/console-operator.fixture.ts",
      shellController,
      shellRoot,
      "src/lifecycle-transitions/fixtures/lifecycle-transition-artifacts.fixture.ts",
      "src/lifecycle-transitions/fixtures/lifecycle-transition-projections.fixture.ts",
      "src/lifecycle-transitions/presentation/workspace/lifecycle-transitions-workspace.tsx",
      "src/environment-lifecycle/presentation/workspace/environment-lifecycle-workspace.tsx",
      "src/runtime-readiness/fixtures/runtime-readiness.fixture.ts",
      selectorModel,
    ]) {
      assertAppFile(failures, path);
    }

    for (const path of [
      "src/data/today.ts",
      "src/data/governance-readiness.ts",
      "src/data/workspace-pulse.ts",
      "src/command-center/read-model/governance-readiness.ts",
      "src/movement-control",
      "src/command-center/fixtures/command-center.fixture.ts",
      "src/command-center/read-model/command-center-view-model.ts",
      "src/command-center/presentation/command-center-briefing.tsx",
      "src/console-shell/fixtures/console-event-log.fixture.ts",
      "src/console-shell/presentation/console-event-log.tsx",
    ]) {
      assertAppPathAbsent(
        failures,
        path,
        "fixture and read-model truth must remain with its owning capability",
      );
    }

    assertRepoIncludes(
      failures,
      "docs/product/system-design.md",
      [
        "## Whole-Console Source Structure",
        "Fixture truth lives with the capability that owns its meaning.",
        "whole-console fixture object",
        "Structural extraction preserves accepted visual and runtime behavior.",
      ],
    );

    assertIncludes(failures, "src/app/page.tsx", [
      'from "../console-shell"',
      "GovernanceConsoleShell",
    ]);
    assertIncludes(failures, shellController, [
      "lifecycleTransitionProjectionFixtures",
      "operationWorkbenchSelectorEntries",
      "selectedWorkbenchSurface",
    ]);
    assertOmits(failures, "src/app/page.tsx", [
      "command-center",
      "operation-workbench",
      "runtime-readiness",
      "movement-control",
      "agent-console",
      "todayConsole",
      "selectedIntake",
      "IntakeWorkflowCloseGuardModal",
      "ConsoleShellApprovalSession",
      "closeGuardOverlayContextPacket",
      "/fixtures/command-center.fixture",
    ]);
    assertIncludes(failures, shellRoot, [
      "ConsoleCommandBar",
      "OperationWorkbenchSelector",
      "CommandCenterWorkspacePulse",
      "ConsoleFocusRouter",
      "WslResourceUsage",
      "AgentContextPanel",
      "AgentRuntimePresenceProvider",
      "AgentRuntimeDock",
      "ConsolePrimaryNavigation",
      "LifecycleTransitionsWorkspace",
      "EnvironmentLifecycleWorkspace",
      "ConsoleActivityPanel",
    ]);
    assertIncludes(failures, shellActivityModel, [
      "ConsoleActivityEvent",
      "projectConsoleActivity",
      "filterConsoleActivity",
    ]);
    assertIncludes(failures, shellActivitySources, [
      "projectConsoleActivitySources",
      "deliveryActivitySource",
      "orchestrationActivitySource",
      "portfolioActivitySource",
      "proposalActivitySource",
      "prototypeActivitySource",
      "repositoryActivitySource",
    ]);
    assertIncludes(failures, shellActivityHook, [
      "useSyncExternalStore",
      "projectConsoleActivitySources",
    ]);
    assertIncludes(failures, shellActivityPanel, [
      "Governance Activity",
      "Activity History",
      "Export JSON",
      "downloadConsoleBlob",
    ]);
    assertOmits(failures, shellActivityPanel, [
      "URL.createObjectURL",
      'document.createElement("a")',
    ]);

    assertIncludes(failures, shellSelection, [
      "selectedWorkbenchSurface",
      "selectWorkbenchSurface",
      "clearMajorSurfaceSelection",
    ]);
    assertOmits(failures, shellSelection, [
      "selectedIntake",
      "approvalSessions",
      "workflowOpen",
      "handoffRecordRef",
      "closeConfirmOpen",
    ]);

    assertIncludes(failures, attentionModel, [
      "CommandCenterAttentionCandidate",
      "projectCommandCenterAttention",
      "compareCommandCenterAttention",
    ]);
    assertIncludes(failures, attentionSources, [
      "proposalAttentionSource",
      "repositoryAttentionSource",
      "deliveryAttentionSource",
      "prototypeAttentionSource",
      "portfolioAttentionSource",
      "orchestrationAttentionSource",
      "lifecycleTransitionAttentionSource",
      "devIntegrationAttentionSource",
      "governedReleaseAttentionSource",
    ]);
    assertIncludes(failures, attentionHook, [
      "useSyncExternalStore",
      "projectCommandCenterAttention",
    ]);
    assertIncludes(failures, workspacePulseFixture, [
      "projectWorkspacePulseSnapshot",
      "workspacePulseDesignScenarios",
      "resolveWorkspacePulseFixture",
      'mode: "synthetic"',
    ]);
    assertIncludes(failures, selectorModel, [
      "operationWorkbenchDomainRegistry.map",
      "selectorMetadata[entry.domain]",
    ]);
    assertOmits(failures, selectorModel, ["process:"]);

    assertIncludes(
      failures,
      "src/runtime-readiness/read-model/runtime-readiness-scenarios.ts",
      ['from "../fixtures/runtime-readiness.fixture"'],
    );
    assertIncludes(
      failures,
      "src/lifecycle-transitions/fixtures/lifecycle-transition-projections.fixture.ts",
      ["allLifecycleTransitionArtifactFixtures", "projectLifecycleTransitions"],
    );
    assertIncludes(
      failures,
      "src/lifecycle-transitions/presentation/workspace/lifecycle-transitions-workspace.tsx",
      [
        "buildLifecycleTransitionRouteOverviews",
        "LifecycleTransitionsWorkspaceSurface",
        "TerasFullscreenSurfaceFrame",
      ],
    );

    return failures;
  },
};

export default guard;
