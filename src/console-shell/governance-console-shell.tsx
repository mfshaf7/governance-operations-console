"use client";

import {
  AgentConsoleSessionProvider,
  type AgentProviderStatus,
  type AgentRuntimeIdentity,
  AgentRuntimePresenceProvider,
  ModelInteractionDock,
  useAgentConsoleSession,
  useAgentProviderStatus,
} from "../agent-console";
import { CommandCenterWorkspacePulse } from "../command-center";
import { EnvironmentLifecycleWorkspace } from "../environment-lifecycle";
import { LifecycleTransitionsWorkspace } from "../lifecycle-transitions";
import { OperationWorkbenchSelector } from "../operation-workbench/operation-workbench-selector";
import { operationWorkbenchSelectorEntries } from "../operation-workbench/operation-workbench-selector-model";
import { WslResourceUsage } from "../runtime-readiness";
import { ConsoleShellFrame } from "./console-shell-frame";
import type { AgentContextCandidate } from "./context/agent-context-candidate";
import { ConsolePrimaryNavigation } from "./navigation/console-primary-navigation";
import { AgentRuntimeDock } from "./presentation/agent-runtime-dock";
import { AgentContextPanel } from "./presentation/agent-context-panel";
import { ConsoleActivityPanel } from "./presentation/console-activity-panel";
import { ConsoleCommandBar } from "./presentation/console-command-bar";
import { ConsoleFocusRouter } from "./presentation/console-focus-router";
import { useConsoleShellController } from "./use-console-shell-controller";

const embeddedAgentRuntimeIdentity = {
  callerId: "console-ai.embedded",
  displayName: "Embedded Context Agent",
  ownerSurface: "Command Center",
  runtimeId: "console-ai.embedded-context",
  sourceAuthority: "agent-console",
  sourceRef: "console-shell:embedded-agent",
} satisfies AgentRuntimeIdentity;

const dockingAgentRuntimeIdentity = {
  callerId: "console-ai.docking",
  displayName: "Docking Agent",
  ownerSurface: "Console Shell",
  runtimeId: "console-ai.docking-agent",
  sourceAuthority: "agent-console",
  sourceRef: "console-shell:docking-agent",
} satisfies AgentRuntimeIdentity;

export function GovernanceConsoleShell() {
  const providerStatus = useAgentProviderStatus();

  return (
    <AgentRuntimePresenceProvider>
      <GovernanceConsoleContent providerStatus={providerStatus} />
    </AgentRuntimePresenceProvider>
  );
}

function GovernanceConsoleContent({
  providerStatus,
}: {
  providerStatus: AgentProviderStatus | null;
}) {
  const controller = useConsoleShellController();

  return (
    <ConsoleShellFrame
      hasFocusedRuntimeSurface={Boolean(
        controller.selectedComponent ||
        controller.selectedAlert ||
        controller.selectedResourceMetric,
      )}
      hasFocusedSystemSurface={Boolean(
        controller.systemMoodOpen || controller.selectedPulseSignal,
      )}
      hasSelectedWorkbenchSurface={Boolean(controller.selectedWorkbenchSurface)}
      navigation={
        <ConsolePrimaryNavigation
          activeWorkspaceId={controller.activeConsoleWorkspaceId}
          onOpenConsole={controller.openConsoleHome}
          onOpenWorkbenchDomain={controller.selectWorkbenchSurface}
          onOpenWorkspace={controller.openConsoleWorkspace}
          selectedWorkbenchSurface={controller.selectedWorkbenchSurface}
          workspaceEntries={[
            "lifecycle-transitions",
            "dev-integration",
            "governed-releases",
          ]}
          workbenchEntries={operationWorkbenchSelectorEntries}
        />
      }
    >
      <div ref={controller.consoleHomeRef}>
        <ConsoleCommandBar />
      </div>
      <OperationWorkbenchSelector
        selected={controller.selectedWorkbenchSurface}
        onSelect={controller.selectWorkbenchSurface}
      />
      <div className="command-main-grid">
        <CommandCenterWorkspacePulse
          posture={controller.systemMood}
          pulseSignals={controller.pulseSignals}
          selectedPulseSignal={controller.selectedPulseSignal}
          systemMoodOpen={controller.systemMoodOpen}
          onPulseSignalChange={controller.setPulseSignalSelection}
          onSystemMoodChange={controller.setSystemMoodSelection}
        />
        <div
          ref={controller.commandCenterFocusRef}
          className="command-center-focus-anchor"
        >
          <ConsoleFocusRouter
            activeConsoleEntryIntent={controller.activeConsoleEntryIntent}
            activePulseScenarioId={controller.activePulseScenarioId}
            activePulseScenarioOptions={
              controller.activePulseScenarioOptions
            }
            attentionSnapshot={controller.attentionSnapshot}
            consoleDevMode={controller.consoleDevMode}
            onBackFromPulse={() => {
              controller.setPulseSignalSelection(null);
              controller.setSystemMoodSelection(false);
            }}
            selectedAlert={controller.selectedAlert}
            selectedComponent={controller.selectedComponent}
            selectedPulseSignal={controller.selectedPulseSignal}
            selectedResourceMetric={controller.selectedResourceMetric}
            selectedWorkbenchSurface={controller.selectedWorkbenchSurface}
            onCloseSelectedWorkbenchSurface={() =>
              controller.selectWorkbenchSurface(null)
            }
            onOpenAttentionCandidate={controller.openAttentionCandidate}
            onOpenWorkbenchSurface={controller.openWorkbenchSurface}
            onOpenPulseRoute={controller.openPulseRoute}
            onPulseScenarioChange={controller.setPulseScenario}
            onSelectAttentionCandidate={
              controller.setSelectedAttentionCandidateId
            }
            onSelectPulseSignal={controller.setPulseSignalSelection}
            selectedAttentionCandidate={
              controller.selectedAttentionCandidate
            }
            systemMoodOpen={controller.systemMoodOpen}
            workspacePulseSnapshot={controller.workspacePulseSnapshot}
          />
        </div>
        <WslResourceUsage
          activeComponentScenario={controller.activeComponentScenario}
          activeResourceScenario={controller.activeResourceScenario}
          componentScenarioId={controller.componentScenarioId}
          consoleDevMode={controller.consoleDevMode}
          onComponentScenarioChange={controller.setComponentScenario}
          onSelectAlert={controller.selectAlert}
          onSelectComponent={controller.selectComponent}
          onSelectResourceMetric={controller.selectResourceMetric}
          onResourceScenarioChange={controller.setResourceScenario}
          resourceScenarioId={controller.resourceScenarioId}
          selectedAlert={controller.selectedAlert}
          selectedComponent={controller.selectedComponent}
          selectedResourceMetric={controller.selectedResourceMetric}
        />
        <EmbeddedAgentConsole
          contextCandidate={controller.activeAgentContextCandidate}
          providerStatus={providerStatus}
        />
        <ConsoleActivityPanel events={controller.consoleActivity} />
      </div>
      <DockingAgent
        contextCandidate={controller.activeAgentContextCandidate}
        providerStatus={providerStatus}
      />
      <AgentRuntimeDock providerStatus={providerStatus} />
      {controller.activeConsoleWorkspaceId === "lifecycle-transitions" ? (
        <LifecycleTransitionsWorkspace
          entryIntent={controller.activeConsoleEntryIntent}
          onClose={controller.closeConsoleWorkspace}
          onOpenWorkbenchSurface={controller.openWorkbenchSurface}
          transitions={controller.lifecycleTransitions}
        />
      ) : null}
      {controller.activeConsoleWorkspaceId === "dev-integration" ||
      controller.activeConsoleWorkspaceId === "governed-releases" ? (
        <EnvironmentLifecycleWorkspace
          activeWorkspaceId={controller.activeConsoleWorkspaceId}
          entryIntent={controller.activeConsoleEntryIntent}
          onClose={controller.closeConsoleWorkspace}
          profileHistory={controller.devIntegrationProfileHistory}
          products={controller.environmentLifecycleProducts}
          profiles={controller.devIntegrationProfiles}
        />
      ) : null}
    </ConsoleShellFrame>
  );
}

function EmbeddedAgentConsole({
  contextCandidate,
  providerStatus,
}: {
  contextCandidate: AgentContextCandidate | null;
  providerStatus: AgentProviderStatus | null;
}) {
  return (
    <AgentConsoleSessionProvider
      initialContextMode="focused"
      providerStatus={providerStatus}
      runtimeIdentity={embeddedAgentRuntimeIdentity}
    >
      <EmbeddedAgentConsoleContent
        contextCandidate={contextCandidate}
        providerStatus={providerStatus}
      />
    </AgentConsoleSessionProvider>
  );
}

function EmbeddedAgentConsoleContent({
  contextCandidate,
  providerStatus,
}: {
  contextCandidate: AgentContextCandidate | null;
  providerStatus: AgentProviderStatus | null;
}) {
  const { agentContextMode } = useAgentConsoleSession();

  return (
    <>
      <ModelInteractionDock
        className="model-dock-large lg:col-span-2"
        contextFallbackLabel="Page context unavailable"
        contextCandidate={contextCandidate}
        placement="embedded"
        providerStatus={providerStatus}
        title="Agent Console"
      />
      <AgentContextPanel
        mode={agentContextMode}
        candidate={contextCandidate}
      />
    </>
  );
}

function DockingAgent({
  contextCandidate,
  providerStatus,
}: {
  contextCandidate: AgentContextCandidate | null;
  providerStatus: AgentProviderStatus | null;
}) {
  return (
    <AgentConsoleSessionProvider
      initialContextMode="general"
      providerStatus={providerStatus}
      runtimeIdentity={dockingAgentRuntimeIdentity}
    >
      <ModelInteractionDock
        className="model-dock-floating"
        contextFallbackLabel="Floating context unavailable"
        contextCandidate={contextCandidate}
        listenForOpenEvent={false}
        placement="floating"
        providerStatus={providerStatus}
        title="Docking Agent"
      />
    </AgentConsoleSessionProvider>
  );
}
