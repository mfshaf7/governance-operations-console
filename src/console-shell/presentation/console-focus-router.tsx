"use client";

import {
  CommandCenterFocus,
  CommandCenterPulseMetricFocus,
  CommandCenterSystemMoodFocus,
  type CommandCenterAttentionCandidate,
  type CommandCenterAttentionSnapshot,
  type WorkspacePulseDesignScenario,
  type WorkspacePulseRoute,
  type WorkspacePulseSignal,
  type WorkspacePulseSnapshot,
} from "../../command-center";
import {
  OperationWorkbenchHost,
  operationWorkbenchPathLabels,
  type OperationWorkbenchPathLabel,
  type OperationWorkbenchSelectorEntry,
} from "../../operation-workbench";
import {
  AlertDetailFocus,
  ComponentDetailFocus,
  ResourceMetricFocus,
  type ResourceMetricDetail,
  type RuntimeAlertItem,
  type RuntimeComponentObservation,
} from "../../runtime-readiness";
import type {
  ConsoleEntryIntent,
  ConsoleSurfaceEntryIntent,
} from "../../console-architecture";
import { ConsoleShellPanel } from "../console-shell-panel";

export type ConsoleFocusRouterProps = {
  activeConsoleEntryIntent: ConsoleEntryIntent | null;
  activePulseScenarioId: string;
  activePulseScenarioOptions: readonly WorkspacePulseDesignScenario[];
  attentionSnapshot: CommandCenterAttentionSnapshot;
  consoleDevMode: boolean;
  onBackFromPulse: () => void;
  onCloseSelectedWorkbenchSurface: () => void;
  onOpenAttentionCandidate: (
    candidate: CommandCenterAttentionCandidate,
  ) => void;
  onOpenPulseRoute: (route: WorkspacePulseRoute) => void;
  onOpenWorkbenchSurface: (
    surfaceLabel: OperationWorkbenchPathLabel,
    focusIntent?: ConsoleSurfaceEntryIntent | null,
  ) => void;
  onPulseScenarioChange: (
    signalId: WorkspacePulseSignal["id"],
    scenarioId: string,
  ) => void;
  onSelectAttentionCandidate: (candidateId: string) => void;
  onSelectPulseSignal: (signal: WorkspacePulseSignal) => void;
  selectedAttentionCandidate: CommandCenterAttentionCandidate | null;
  selectedAlert: RuntimeAlertItem | null;
  selectedComponent: RuntimeComponentObservation | null;
  selectedPulseSignal: WorkspacePulseSignal | null;
  selectedResourceMetric: ResourceMetricDetail | null;
  selectedWorkbenchSurface: OperationWorkbenchSelectorEntry | null;
  systemMoodOpen: boolean;
  workspacePulseSnapshot: WorkspacePulseSnapshot;
};

export function ConsoleFocusRouter({
  activeConsoleEntryIntent,
  activePulseScenarioId,
  activePulseScenarioOptions,
  attentionSnapshot,
  consoleDevMode,
  onBackFromPulse,
  onCloseSelectedWorkbenchSurface,
  onOpenAttentionCandidate,
  onOpenPulseRoute,
  onOpenWorkbenchSurface,
  onPulseScenarioChange,
  onSelectAttentionCandidate,
  onSelectPulseSignal,
  selectedAttentionCandidate,
  selectedAlert,
  selectedComponent,
  selectedPulseSignal,
  selectedResourceMetric,
  selectedWorkbenchSurface,
  systemMoodOpen,
  workspacePulseSnapshot,
}: ConsoleFocusRouterProps) {
  return (
    <ConsoleShellPanel
      className={`focus-panel relative overflow-hidden ${
        selectedWorkbenchSurface
          ? "focus-panel-workbench"
          : selectedComponent || selectedAlert || selectedResourceMetric
            ? `focus-panel-component component-focus-panel ${
                selectedComponent
                  ? `status-card-${selectedComponent.tone}`
                  : selectedAlert
                    ? `alert-focus-panel status-card-${selectedAlert.tone}`
                    : selectedResourceMetric
                      ? `resource-focus-panel status-card-${selectedResourceMetric.tone}`
                      : ""
              }`
            : systemMoodOpen
              ? `focus-panel-system-mood status-card-${workspacePulseSnapshot.posture.tone}`
              : selectedPulseSignal
                ? `focus-panel-system-mood pulse-focus-panel status-card-${selectedPulseSignal.tone}`
                : "focus-panel-default"
      }`}
    >
      <div className="focus-panel-bottom-glow" />
      {(systemMoodOpen || selectedPulseSignal) && !selectedWorkbenchSurface ? (
        <span className="system-mood-bottom-corner-cap" aria-hidden="true" />
      ) : null}
      {(selectedComponent || selectedAlert || selectedResourceMetric) &&
      !selectedWorkbenchSurface ? (
        <span className="component-focus-side-cap" aria-hidden="true" />
      ) : null}
      <div className="relative h-full min-h-0">
        {selectedWorkbenchSurface ? (
          <OperationWorkbenchHost
            entryIntent={
              activeConsoleEntryIntent?.target.kind === "workbench-domain"
                ? activeConsoleEntryIntent
                : null
            }
            onClose={onCloseSelectedWorkbenchSurface}
            onOpenRepositorySurface={(proposalId) =>
              onOpenWorkbenchSurface(operationWorkbenchPathLabels.repository, {
                mode: "resolve",
                requiredMoveRef: "repository.resolve-proposal-gate",
                subjectRef: proposalId,
              })
            }
            selected={selectedWorkbenchSurface}
          />
        ) : selectedResourceMetric ? (
          <ResourceMetricFocus metric={selectedResourceMetric} />
        ) : selectedAlert ? (
          <AlertDetailFocus alert={selectedAlert} />
        ) : selectedComponent ? (
          <ComponentDetailFocus component={selectedComponent} />
        ) : systemMoodOpen ? (
          <CommandCenterSystemMoodFocus
            snapshot={workspacePulseSnapshot}
            onBack={onBackFromPulse}
            onSelectSignal={onSelectPulseSignal}
          />
        ) : selectedPulseSignal ? (
          <CommandCenterPulseMetricFocus
            activeScenarioId={activePulseScenarioId}
            designMode={consoleDevMode}
            scenarioOptions={activePulseScenarioOptions}
            signal={selectedPulseSignal}
            snapshot={workspacePulseSnapshot}
            onBack={onBackFromPulse}
            onOpenRoute={onOpenPulseRoute}
            onScenarioChange={(scenarioId) =>
              onPulseScenarioChange(selectedPulseSignal.id, scenarioId)
            }
          />
        ) : (
          <CommandCenterFocus
            onOpenCandidate={onOpenAttentionCandidate}
            onSelectCandidate={onSelectAttentionCandidate}
            selectedCandidate={selectedAttentionCandidate}
            snapshot={attentionSnapshot}
          />
        )}
      </div>
    </ConsoleShellPanel>
  );
}
