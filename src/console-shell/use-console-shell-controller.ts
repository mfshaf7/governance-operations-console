"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  resolveWorkspacePulseFixture,
  useCommandCenterAttention,
  workspacePulseDesignScenarios,
  type CommandCenterAttentionCandidate,
  type WorkspacePulseRoute,
  type WorkspacePulseScenarioSelections,
  type WorkspacePulseSignal,
} from "../command-center";
import type {
  ConsoleEntryIntent,
  ConsoleNavigationTarget,
  ConsoleSurfaceEntryIntent,
  ConsoleWorkspaceId,
} from "../console-architecture";
import { openExternalConsoleRoute } from "../console-integration/external-route";
import {
  lifecycleTransitionProjectionFixtures,
} from "../lifecycle-transitions";
import {
  devIntegrationProfileHistoryFixtures,
  devIntegrationProfileFixtures,
  productReleaseCapabilityFixtures,
} from "../environment-lifecycle";
import type { OperationWorkbenchPathLabel } from "../operation-workbench/operation-workbench-domain-registry";
import {
  operationWorkbenchSelectorEntries,
  type OperationWorkbenchSelectorEntry,
} from "../operation-workbench/operation-workbench-selector-model";
import {
  componentStatusScenarios,
  resourceUsageScenarios,
  type ResourceMetricDetail,
  type RuntimeAlertItem,
  type RuntimeComponentObservation,
} from "../runtime-readiness";
import { useConsoleActivity } from "./activity/use-console-activity";
import { resolveConsoleAgentContextCandidate } from "./context/agent-context-candidates";
import { consoleWorkbenchTargetId } from "./navigation/console-entry-model";
import { useConsoleShellSelection } from "./use-console-shell-selection";

export function useConsoleShellController() {
  const consoleHomeRef = useRef<HTMLDivElement | null>(null);
  const commandCenterFocusRef = useRef<HTMLDivElement | null>(null);
  const [activeConsoleWorkspaceId, setActiveConsoleWorkspaceId] =
    useState<ConsoleWorkspaceId | null>(null);
  const [consoleDevMode, setConsoleDevMode] = useState(false);
  const [componentScenarioId, setComponentScenarioId] = useState(
    componentStatusScenarios[0].id,
  );
  const [selectedAttentionCandidateId, setSelectedAttentionCandidateId] =
    useState<string | null>(null);
  const [pulseScenarioSelections, setPulseScenarioSelections] = useState<
    WorkspacePulseScenarioSelections
  >({});
  const [resourceScenarioId, setResourceScenarioId] = useState(
    resourceUsageScenarios[0].id,
  );
  const [activeConsoleEntryIntent, setActiveConsoleEntryIntent] =
    useState<ConsoleEntryIntent | null>(null);
  const activeComponentScenario =
    componentStatusScenarios.find(
      (scenario) => scenario.id === componentScenarioId,
    ) ?? componentStatusScenarios[0];
  const activeResourceScenario =
    resourceUsageScenarios.find(
      (scenario) => scenario.id === resourceScenarioId,
    ) ?? resourceUsageScenarios[0];
  const workspacePulseSnapshot = useMemo(
    () => resolveWorkspacePulseFixture(pulseScenarioSelections),
    [pulseScenarioSelections],
  );
  const pulseSignals = workspacePulseSnapshot.signals;
  const systemMood = workspacePulseSnapshot.posture;
  const attentionSnapshot = useCommandCenterAttention();
  const selectedAttentionCandidate = useMemo(
    () =>
      attentionSnapshot.candidates.find(
        (candidate) =>
          candidate.candidateId === selectedAttentionCandidateId,
      ) ??
      attentionSnapshot.candidates[0] ??
      null,
    [attentionSnapshot.candidates, selectedAttentionCandidateId],
  );
  const {
    clearComponentScenarioSelection,
    clearResourceScenarioSelection,
    selectAlert,
    selectComponent,
    selectResourceMetric,
    selectWorkbenchSurface,
    selectedAlert,
    selectedComponent,
    selectedPulseSignal,
    selectedResourceMetric,
    selectedWorkbenchSurface,
    setPulseSignalSelection,
    setSystemMoodSelection,
    systemMoodOpen,
  } = useConsoleShellSelection<
    OperationWorkbenchSelectorEntry,
    RuntimeComponentObservation,
    WorkspacePulseSignal,
    RuntimeAlertItem,
    ResourceMetricDetail
  >({
    components: activeComponentScenario.components,
    pulseSignals,
    surfaces: operationWorkbenchSelectorEntries,
  });
  const activePulseScenarioOptions = selectedPulseSignal
    ? workspacePulseDesignScenarios[selectedPulseSignal.id]
    : [];
  const activePulseScenarioId = selectedPulseSignal
    ? (pulseScenarioSelections[selectedPulseSignal.id] ??
      activePulseScenarioOptions[0]?.id ??
      "")
    : "";
  const consoleActivity = useConsoleActivity({
    environmentHistory: devIntegrationProfileHistoryFixtures,
    lifecycleTransitions: lifecycleTransitionProjectionFixtures,
  });

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    setConsoleDevMode(parameters.get("dev") === "1");
  }, []);

  const activeAgentContextCandidate = useMemo(
    () =>
      resolveConsoleAgentContextCandidate({
        activeWorkspaceId: activeConsoleWorkspaceId,
        selectedAttentionCandidate,
        selectedAlert,
        selectedComponent,
        selectedWorkbenchSurface,
        selectedPulseSignal,
        selectedResourceMetric,
        systemMood,
        systemMoodOpen,
      }),
    [
      activeConsoleWorkspaceId,
      selectedAttentionCandidate,
      selectedAlert,
      selectedComponent,
      selectedPulseSignal,
      selectedResourceMetric,
      selectedWorkbenchSurface,
      systemMood,
      systemMoodOpen,
    ],
  );

  function scrollToCommandCenterFocus() {
    window.requestAnimationFrame(() => {
      commandCenterFocusRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function openConsoleHome() {
    setActiveConsoleEntryIntent(null);
    setActiveConsoleWorkspaceId(null);
    selectWorkbenchSurface(null);
    window.requestAnimationFrame(() => {
      consoleHomeRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function selectWorkbenchEntry(
    entry: OperationWorkbenchSelectorEntry | null,
  ) {
    setActiveConsoleEntryIntent(null);
    setActiveConsoleWorkspaceId(null);
    selectWorkbenchSurface(entry);
  }

  function openConsoleWorkspace(
    workspaceId: ConsoleWorkspaceId,
    entryIntent: ConsoleEntryIntent | null = null,
  ) {
    setActiveConsoleEntryIntent(entryIntent);
    selectWorkbenchSurface(null);
    setActiveConsoleWorkspaceId(workspaceId);
  }

  function closeConsoleWorkspace() {
    setActiveConsoleEntryIntent(null);
    setActiveConsoleWorkspaceId(null);
  }

  function openWorkbenchSurface(
    surfaceLabel: OperationWorkbenchPathLabel,
    focusIntent: ConsoleSurfaceEntryIntent | null = null,
  ) {
    const path = operationWorkbenchSelectorEntries.find(
      (surface) => surface.label === surfaceLabel,
    );

    if (path) {
      setActiveConsoleEntryIntent(
        focusIntent
          ? {
              ...focusIntent,
              target: {
                id: consoleWorkbenchTargetId(surfaceLabel),
                kind: "workbench-domain",
                surfaceLabel,
              },
            }
          : null,
      );
      setActiveConsoleWorkspaceId(null);
      selectWorkbenchSurface(path);
      scrollToCommandCenterFocus();
    }
  }

  function openConsoleNavigationTarget(
    target: ConsoleNavigationTarget,
    entryIntent: ConsoleEntryIntent | null = null,
  ) {
    if (target.kind === "console") {
      openConsoleHome();
      return;
    }

    if (target.kind === "workspace") {
      openConsoleWorkspace(target.workspaceId, entryIntent);
      return;
    }

    openWorkbenchSurface(target.surfaceLabel, entryIntent);
  }

  function openConsoleEntryIntent(entryIntent: ConsoleEntryIntent) {
    openConsoleNavigationTarget(entryIntent.target, entryIntent);
  }

  function openPulseRoute(route: WorkspacePulseRoute) {
    openConsoleNavigationTarget(route.target);
  }

  function openAttentionCandidate(
    candidate: CommandCenterAttentionCandidate,
  ) {
    if (
      candidate.route.availability === "available" &&
      candidate.route.entryIntent
    ) {
      openConsoleEntryIntent(candidate.route.entryIntent);
      return;
    }

    if (
      candidate.route.availability === "external" &&
      candidate.route.externalHref
    ) {
      openExternalConsoleRoute(candidate.route.externalHref);
    }
  }

  function setComponentScenario(scenarioId: string) {
    clearComponentScenarioSelection();
    setComponentScenarioId(scenarioId);
  }

  function setResourceScenario(scenarioId: string) {
    clearResourceScenarioSelection();
    setResourceScenarioId(scenarioId);
  }

  function setPulseScenario(
    signalId: WorkspacePulseSignal["id"],
    scenarioId: string,
  ) {
    setPulseScenarioSelections((current) => ({
      ...current,
      [signalId]: scenarioId,
    }));
  }

  return {
    activeComponentScenario,
    activeConsoleEntryIntent,
    activeConsoleWorkspaceId,
    activeAgentContextCandidate,
    activePulseScenarioId,
    activePulseScenarioOptions,
    activeResourceScenario,
    consoleHomeRef,
    commandCenterFocusRef,
    componentScenarioId,
    closeConsoleWorkspace,
    consoleActivity,
    consoleDevMode,
    attentionSnapshot,
    devIntegrationProfileHistory: devIntegrationProfileHistoryFixtures,
    devIntegrationProfiles: devIntegrationProfileFixtures,
    environmentLifecycleProducts: productReleaseCapabilityFixtures,
    lifecycleTransitions: lifecycleTransitionProjectionFixtures,
    openConsoleHome,
    openAttentionCandidate,
    openConsoleEntryIntent,
    openPulseRoute,
    openConsoleWorkspace,
    openWorkbenchSurface,
    pulseSignals,
    resourceScenarioId,
    selectAlert,
    selectComponent,
    selectResourceMetric,
    selectWorkbenchSurface: selectWorkbenchEntry,
    selectedAlert,
    selectedAttentionCandidate,
    selectedComponent,
    selectedPulseSignal,
    selectedResourceMetric,
    selectedWorkbenchSurface,
    setComponentScenario,
    setSelectedAttentionCandidateId,
    setPulseSignalSelection,
    setPulseScenario,
    setResourceScenario,
    setSystemMoodSelection,
    systemMood,
    systemMoodOpen,
    workspacePulseSnapshot,
  };
}
