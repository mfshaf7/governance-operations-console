import {
  assertAppFile,
  assertAppPathAbsent,
  assertIncludes,
  assertOmits,
  assertRepoIncludes,
} from "../guard-lib.mjs";

const pagePath = "src/app/page.tsx";
const boundaryPath = "src/command-center/index.ts";
const attentionModelPath =
  "src/command-center/read-model/command-center-attention.ts";
const attentionRegistryPath =
  "src/command-center/read-model/command-center-attention-source-registry.ts";
const neutralAttentionRegistryPath =
  "src/console-integration/attention-source-registry.ts";
const attentionSourcesPath =
  "src/command-center/read-model/command-center-attention-sources.ts";
const attentionHookPath =
  "src/command-center/read-model/use-command-center-attention.ts";
const focusPath =
  "src/command-center/presentation/command-center-focus.tsx";
const focusCssPath =
  "src/command-center/presentation/command-center-focus.module.css";
const pulsePath =
  "src/command-center/presentation/command-center-pulse.tsx";
const pulseCssPath =
  "src/command-center/presentation/command-center-pulse.module.css";
const pulseFixturePath =
  "src/command-center/fixtures/workspace-pulse.fixture.ts";
const pulseModelPath =
  "src/command-center/read-model/workspace-pulse.ts";
const supportPath =
  "src/command-center/presentation/command-center-presentation-support.tsx";
const shellControllerPath =
  "src/console-shell/use-console-shell-controller.ts";
const shellFocusPath =
  "src/console-shell/presentation/console-focus-router.tsx";
const shellRootPath =
  "src/console-shell/governance-console-shell.tsx";
const contextCandidatesPath =
  "src/console-shell/context/agent-context-candidates.ts";

export const guard = {
  id: "shared/command-center-boundary",
  run() {
    const failures = [];

    for (const path of [
      boundaryPath,
      attentionModelPath,
      attentionRegistryPath,
      neutralAttentionRegistryPath,
      attentionSourcesPath,
      attentionHookPath,
      focusPath,
      focusCssPath,
      pulseCssPath,
      pulseFixturePath,
      pulseModelPath,
      pulsePath,
      supportPath,
      shellControllerPath,
      shellFocusPath,
      shellRootPath,
      contextCandidatesPath,
      "src/console-shell/console-shell-panel.tsx",
      "src/console-shell/console-shell-status.ts",
    ]) {
      assertAppFile(failures, path);
    }

    for (const path of [
      "src/command-center/fixtures/command-center.fixture.ts",
      "src/command-center/read-model/command-center-view-model.ts",
      "src/command-center/presentation/command-center-briefing.tsx",
    ]) {
      assertAppPathAbsent(
        failures,
        path,
        "owner-projected attention replaces the fixture-era briefing",
      );
    }

    assertRepoIncludes(
      failures,
      "docs/product/surface-contracts/command-center-focus.md",
      [
        "read-only cross-console priority projection",
        "bounded queue with at most five visible rows",
        "same rendered height as the Workspace",
        "generic Console entry intent",
        "Tabs are an admitted fallback only",
      ],
    );

    assertIncludes(failures, boundaryPath, [
      "CommandCenterFocus",
      "useCommandCenterAttention",
      "projectCommandCenterAttention",
      "commandCenterAttentionSourceRegistry",
      "CommandCenterWorkspacePulse",
      "CommandCenterSystemMoodFocus",
      "CommandCenterPulseMetricFocus",
    ]);
    assertOmits(failures, boundaryPath, [
      "CommandCenterBriefing",
      "commandCenterDecisionScenarios",
      "commandCenterFixture",
    ]);

    assertIncludes(failures, attentionModelPath, [
      "CommandCenterAttentionCandidate",
      "CommandCenterAttentionSourceSnapshot",
      "compareCommandCenterAttention",
      "projectCommandCenterAttention",
      "routeForFreshness",
      "dedupeKey",
    ]);
    assertOmits(failures, attentionModelPath, [
      'from "react"',
      "className",
      "toneOrder",
    ]);
    assertIncludes(failures, neutralAttentionRegistryPath, [
      "admitted",
      "reserved",
      "excluded",
    ]);
    assertIncludes(failures, attentionRegistryPath, [
      "commandCenterAttentionSourceRegistry",
      "consoleAttentionSourceRegistry",
    ]);
    assertIncludes(failures, attentionHookPath, [
      "useSyncExternalStore",
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

    assertIncludes(failures, focusPath, [
      "CommandCenterFocus",
      "Needs attention",
      "Operator priority",
      "PriorityDetail",
      "SourceDetailsDialog",
      "ConsoleSurfaceFilterBar",
      "ConsoleSurfaceDialog",
      "attentionUrgencyOptions",
      "filteredCandidates",
      "onOpenCandidate",
      "onSelectCandidate",
    ]);
    assertOmits(failures, focusPath, [
      "../fixtures/",
      "CommandCenterDevScenarioSwitch",
      "CommandCenterBriefingAgentAction",
      "activeTab",
      "AgentRobotIcon",
      "ConsoleSurfacePanel",
      "ConsoleSurfaceTabs",
      "ConsoleSurfaceTabPanel",
    ]);
    assertIncludes(failures, focusCssPath, [
      ".root",
      "height: 100%",
      ".deck",
      ".filterRow",
      ".attentionView",
      ".queueViewport",
      "height: 0",
      "overflow-y: auto",
    ]);

    assertIncludes(failures, shellFocusPath, [
      "<CommandCenterFocus",
      "<CommandCenterSystemMoodFocus",
      "<CommandCenterPulseMetricFocus",
    ]);
    assertOmits(failures, shellFocusPath, [
      "CommandCenterBriefing",
      "useCommandCenterBriefingState",
      "CommandCenterBriefingAgentAction",
    ]);
    assertIncludes(failures, shellControllerPath, [
      "useCommandCenterAttention",
      "attentionSnapshot",
      "selectedAttentionCandidate",
      "openAttentionCandidate",
      "openConsoleEntryIntent",
    ]);
    assertOmits(failures, shellControllerPath, [
      "commandCenterDecisionScenarios",
      "commandCenterFixture",
      "decisionScenarioId",
    ]);
    assertIncludes(failures, contextCandidatesPath, [
      "attentionContextCandidate",
      "selectedAttentionCandidate",
      "Command Center Focus is read-only",
    ]);

    assertIncludes(failures, shellRootPath, [
      "<CommandCenterWorkspacePulse",
      "<ConsoleFocusRouter",
      "attentionSnapshot={controller.attentionSnapshot}",
      "selectedAttentionCandidate",
    ]);
    assertOmits(failures, pagePath, [
      'from "../command-center"',
      "CommandCenterFocus",
      "CommandCenterWorkspacePulse",
    ]);
    assertIncludes(failures, pagePath, ["GovernanceConsoleShell"]);

    assertIncludes(failures, pulsePath, [
      "CommandCenterWorkspacePulse",
      "CommandCenterSystemMoodFocus",
      "CommandCenterPulseMetricFocus",
      "ConsoleShellPanel",
      "command-center-pulse.module.css",
      "onOpenRoute",
      "onSelectSignal",
    ]);
    assertIncludes(failures, pulseModelPath, [
      "WorkspacePulseSnapshot",
      "WorkspacePulseSignalId",
      "WorkspacePulseRecord",
      "WorkspacePulseRoute",
      "WorkspacePosture",
      "projectWorkspacePulseSnapshot",
    ]);
    assertIncludes(failures, pulseFixturePath, [
      'authority: "workspace-prototype-studio"',
      'mode: "synthetic"',
      "workspacePulseDesignScenarios",
      "resolveWorkspacePulseFixture",
    ]);

    return failures;
  },
};

export default guard;
