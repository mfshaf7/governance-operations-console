import {
  assertAppFile,
  assertAppPathAbsent,
  assertIncludes,
  assertOmits,
  lineCount,
  readAppFile,
} from "../guard-lib.mjs";

const pagePath = "src/app/page.tsx";
const shellIndexPath = "src/console-shell/index.ts";
const shellRootPath = "src/console-shell/governance-console-shell.tsx";
const shellControllerPath = "src/console-shell/use-console-shell-controller.ts";
const shellControlsPath = "src/console-shell/console-surface-controls.tsx";
const shellFocusPath =
  "src/console-shell/presentation/console-focus-router.tsx";
const shellActivityPath =
  "src/console-shell/presentation/console-activity-panel.tsx";
const shellActivityModelPath =
  "src/console-shell/activity/console-activity-model.ts";
const shellActivitySourcesPath =
  "src/console-shell/activity/console-activity-sources.ts";
const shellActivityHookPath =
  "src/console-shell/activity/use-console-activity.ts";
const obsoleteShellEventPath =
  "src/console-shell/presentation/console-event-log.tsx";
const obsoleteShellEventFixturePath =
  "src/console-shell/fixtures/console-event-log.fixture.ts";
const commandBarPath = "src/console-shell/presentation/console-command-bar.tsx";
const operatorIdentityModelPath =
  "src/console-shell/identity/operator-identity-model.ts";
const operatorAccountModelPath =
  "src/console-shell/identity/operator-account-model.ts";
const operatorIdentityProjectionPath =
  "src/console-shell/identity/operator-identity-projection.ts";
const operatorAccountCardPath =
  "src/console-shell/presentation/operator-account/operator-account-card.tsx";
const operatorAccountCenterPath =
  "src/console-shell/presentation/operator-account/operator-account-center.tsx";
const operatorAccountControllerPath =
  "src/console-shell/presentation/operator-account/use-operator-account-controller.ts";
const operatorAccountProfileViewPath =
  "src/console-shell/presentation/operator-account/operator-account-profile-view.tsx";
const operatorAccountAccessViewPath =
  "src/console-shell/presentation/operator-account/operator-account-access-view.tsx";
const operatorAccountSecurityViewPath =
  "src/console-shell/presentation/operator-account/operator-account-security-view.tsx";
const operatorAccountSupportDialogsPath =
  "src/console-shell/presentation/operator-account/operator-account-support-dialogs.tsx";
const obsoleteOperatorSessionCardPath =
  "src/console-shell/presentation/operator-session-card.tsx";
const contextCandidatePath =
  "src/console-shell/context/agent-context-candidate.ts";
const contextCandidatesPath =
  "src/console-shell/context/agent-context-candidates.ts";

export const guard = {
  id: "shared/console-shell-composition",
  run() {
    const failures = [];

    for (const path of [
      pagePath,
      shellIndexPath,
      shellRootPath,
      shellControllerPath,
      shellControlsPath,
      shellFocusPath,
      shellActivityPath,
      shellActivityModelPath,
      shellActivitySourcesPath,
      shellActivityHookPath,
      commandBarPath,
      operatorAccountModelPath,
      operatorAccountCardPath,
      operatorAccountCenterPath,
      operatorAccountControllerPath,
      operatorAccountProfileViewPath,
      operatorAccountAccessViewPath,
      operatorAccountSecurityViewPath,
      operatorAccountSupportDialogsPath,
      operatorIdentityModelPath,
      operatorIdentityProjectionPath,
      contextCandidatePath,
      contextCandidatesPath,
      "src/operation-workbench/operation-workbench-host.tsx",
      "src/operation-workbench/operation-workbench-selector.tsx",
    ]) {
      assertAppFile(failures, path);
    }

    assertAppPathAbsent(
      failures,
      obsoleteShellEventPath,
      "Governance Activity replaces the custom synthetic event-log surface",
    );
    assertAppPathAbsent(
      failures,
      obsoleteShellEventFixturePath,
      "activity must project owning-domain records instead of a shell fixture",
    );
    assertAppPathAbsent(
      failures,
      obsoleteOperatorSessionCardPath,
      "Operator Account replaces the obsolete Operator Session inspection card",
    );
    assertAppPathAbsent(
      failures,
      "src/console-shell/operator-context.tsx",
      "context candidates must not own React event bridges",
    );
    assertAppPathAbsent(
      failures,
      "src/console-shell/context-packets.ts",
      "the typed context candidate model replaces packet-shaped browser authority",
    );
    assertAppPathAbsent(
      failures,
      "src/console-shell/use-console-operator-context.ts",
      "the active candidate must be resolved directly from shell selection",
    );

    assertIncludes(failures, pagePath, [
      'import { GovernanceConsoleShell } from "../console-shell"',
      "return <GovernanceConsoleShell />",
    ]);
    assertOmits(failures, pagePath, [
      "useState",
      "useEffect",
      "useRef",
      "CommandCenterBriefing",
      "CommandCenterWorkspacePulse",
      "OperationWorkbench",
      "WslResourceUsage",
      "MovementControl",
      "LifecycleTransitionsPanel",
      "ModelInteractionDock",
      "ActivityStrip",
    ]);
    if (lineCount(pagePath) > 12) {
      failures.push(
        `${pagePath}: route mount must remain thin; found ${lineCount(pagePath)} lines`,
      );
    }

    assertIncludes(failures, shellIndexPath, ["GovernanceConsoleShell"]);
    assertIncludes(failures, shellIndexPath, ["ConsoleSurfaceTabPanel"]);
    assertIncludes(failures, shellControlsPath, [
      "aria-controls={`${groupId}-panel`}",
      'role="tabpanel"',
      'aria-modal="true"',
      'document.body.style.overflow = "hidden"',
      "previousBodyOverflow",
    ]);
    assertIncludes(failures, shellRootPath, [
      "useConsoleShellController",
      "ConsoleShellFrame",
      "ConsoleCommandBar",
      "OperationWorkbenchSelector",
      "CommandCenterWorkspacePulse",
      "ConsoleFocusRouter",
      "WslResourceUsage",
      "ModelInteractionDock",
      "AgentContextPanel",
      "AgentRuntimePresenceProvider",
      "AgentConsoleSessionProvider",
      "AgentRuntimeDock",
      "ConsolePrimaryNavigation",
      "LifecycleTransitionsWorkspace",
      "EnvironmentLifecycleWorkspace",
      "ConsoleActivityPanel",
      'initialContextMode="focused"',
      'initialContextMode="general"',
      'runtimeId: "console-ai.embedded-context"',
      'runtimeId: "console-ai.docking-agent"',
      'title="Docking Agent"',
    ]);
    assertOmits(failures, shellRootPath, [
      "useState",
      "useEffect",
      "operationWorkbenchSelectorEntries.find",
      "resolveWorkspacePulseFixture",
      "<AgentConsoleSessionProvider providerStatus={providerStatus}>",
    ]);

    const shellRootSource = readAppFile(shellRootPath);
    const sessionProviderMountCount = (
      shellRootSource.match(/<AgentConsoleSessionProvider/g) ?? []
    ).length;

    if (sessionProviderMountCount !== 2) {
      failures.push(
        `${shellRootPath}: embedded and docking agents must own exactly two independent session providers; found ${sessionProviderMountCount}`,
      );
    }

    const compositionOrder = [
      "<ConsoleCommandBar",
      "<OperationWorkbenchSelector",
      "<CommandCenterWorkspacePulse",
      "<ConsoleFocusRouter",
      "<WslResourceUsage",
      "<EmbeddedAgentConsole",
      "<ConsoleActivityPanel",
    ];
    let previousIndex = -1;
    for (const token of compositionOrder) {
      const tokenIndex = shellRootSource.indexOf(token);
      if (tokenIndex < 0 || tokenIndex <= previousIndex) {
        failures.push(
          `${shellRootPath}: major console surfaces must retain accepted composition order at "${token}"`,
        );
      }
      previousIndex = tokenIndex;
    }

    assertIncludes(failures, shellControllerPath, [
      "useConsoleShellSelection",
      "resolveConsoleAgentContextCandidate",
      "activeWorkspaceId: activeConsoleWorkspaceId",
      "activeAgentContextCandidate",
      "useConsoleActivity",
      "consoleActivity",
      "openWorkbenchSurface",
      "scrollToCommandCenterFocus",
      "setComponentScenario",
      "setResourceScenario",
      "setPulseScenario",
    ]);
    assertOmits(failures, shellControllerPath, [
      "className=",
      "<ConsoleShell",
      "<OperationWorkbench",
      "useConsoleOperatorContext",
      "governance-console:page-context",
      "governance-console:overlay-context",
    ]);
    assertIncludes(failures, contextCandidatePath, [
      "AgentContextCandidate",
      "AgentContextSourceMode",
      "createAgentContextCandidate",
      "formatAgentContextCandidate",
    ]);
    assertIncludes(failures, contextCandidatesPath, [
      "resolveConsoleAgentContextCandidate",
      "workspaceContextCandidate",
      'sourceMode: "synthetic"',
      'scope: "workspace"',
    ]);
    assertIncludes(failures, commandBarPath, [
      "OperatorAccountCard",
      "OperatorAccountCenter",
      "consoleOperatorAccountFixture",
      "useOperatorAccountController",
    ]);
    assertOmits(failures, commandBarPath, [
      "Logged in operator",
      "formatOperatorLoginTime",
      "loggedInAtDate",
      "setLoggedInAtDate",
    ]);
    assertIncludes(failures, operatorIdentityModelPath, [
      "OperatorIdentitySnapshot",
      '"console-operator-identity/v1"',
      "OperatorAuthenticationState",
      "OperatorIdentitySourceMode",
    ]);
    assertIncludes(failures, operatorIdentityProjectionPath, [
      "projectOperatorIdentity",
      "hasLiveTrustEvidence",
      'snapshot.source.mode === "live"',
      'snapshot.source.freshness === "current"',
      'posture === "verified"',
    ]);
    assertIncludes(failures, operatorAccountModelPath, [
      "OperatorAccountSnapshot",
      '"console-operator-account/v1"',
      "OperatorAccountCapabilityState",
      "prototype-local",
      "unavailable",
    ]);
    assertIncludes(failures, operatorAccountCardPath, [
      "Operator Account",
      "Open account",
      "projectOperatorIdentity",
    ]);
    assertIncludes(failures, operatorAccountCenterPath, [
      "ConsoleSurfaceDialog",
      "Security & Sessions",
      'size="wide"',
    ]);
    assertIncludes(failures, operatorAccountProfileViewPath, [
      "Profile and preferences",
      "Save profile",
      "profileUpdateEnabled",
    ]);
    assertIncludes(failures, operatorAccountAccessViewPath, [
      "Current access context",
      "Request access",
      "Identity details",
    ]);
    assertIncludes(failures, operatorAccountSecurityViewPath, [
      "Manage authentication",
      "Switch account",
      "Revoke session",
    ]);
    assertIncludes(failures, operatorAccountSupportDialogsPath, [
      "Identity details",
      "Discard profile changes?",
      "discardProfileAndClose",
    ]);
    assertIncludes(failures, operatorAccountControllerPath, [
      "profileDirty",
      "requestAccountClose",
      "discardProfileAndClose",
      "saveProfile",
    ]);

    assertIncludes(failures, shellFocusPath, [
      "OperationWorkbenchHost",
      "CommandCenterFocus",
      "CommandCenterSystemMoodFocus",
      "CommandCenterPulseMetricFocus",
      "ResourceMetricFocus",
      "AlertDetailFocus",
      "ComponentDetailFocus",
    ]);
    assertIncludes(failures, shellActivityPath, [
      "Governance Activity",
      "View all activity",
      "TerasFilterBar",
      "governance-activity",
      "filteredEvents",
    ]);
    assertIncludes(failures, shellActivityModelPath, [
      "ConsoleActivityEvent",
      "projectConsoleActivity",
      "filterConsoleActivity",
    ]);
    assertIncludes(failures, shellActivitySourcesPath, [
      "projectConsoleActivitySources",
      "deliveryActivitySource",
      "proposalActivitySource",
      "repositoryActivitySource",
      "prototypeActivitySource",
      "portfolioActivitySource",
      "orchestrationActivitySource",
    ]);
    assertIncludes(failures, shellActivityHookPath, [
      "useSyncExternalStore",
      "projectConsoleActivitySources",
      "projectConsoleActivity",
    ]);

    assertOmits(
      failures,
      "src/agent-console/presentation/model-interaction-dock.tsx",
      ['from "../console-shell"'],
    );
    for (const path of [
      "src/command-center/presentation/command-center-focus.tsx",
      "src/command-center/presentation/command-center-pulse.tsx",
      "src/command-center/presentation/command-center-presentation-support.tsx",
    ]) {
      assertOmits(failures, path, ['from "../../console-shell"']);
    }

    return failures;
  },
};

export default guard;
