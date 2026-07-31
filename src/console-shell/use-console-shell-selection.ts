import { useState } from "react";

type LabeledSelection = {
  label: string;
};

type IdentifiedSelection = {
  id: string;
};

export type UseConsoleShellSelectionOptions<
  TSurface extends LabeledSelection,
  TComponent extends LabeledSelection,
  TPulse extends IdentifiedSelection,
> = {
  components: readonly TComponent[];
  pulseSignals: readonly TPulse[];
  surfaces: readonly TSurface[];
};

export function useConsoleShellSelection<
  TSurface extends LabeledSelection,
  TComponent extends LabeledSelection,
  TPulse extends IdentifiedSelection,
  TAlert,
  TResource,
>({
  components,
  pulseSignals,
  surfaces,
}: UseConsoleShellSelectionOptions<TSurface, TComponent, TPulse>) {
  const [selectedWorkbenchLabel, setSelectedWorkbenchLabel] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<TAlert | null>(null);
  const [selectedComponentLabel, setSelectedComponentLabel] = useState<string | null>(null);
  const [selectedPulseId, setSelectedPulseId] = useState<string | null>(null);
  const [selectedResourceMetric, setSelectedResourceMetric] = useState<TResource | null>(null);
  const [systemMoodOpen, setSystemMoodOpen] = useState(false);

  const selectedWorkbenchSurface = selectedWorkbenchLabel
    ? surfaces.find((surface) => surface.label === selectedWorkbenchLabel) ?? null
    : null;
  const selectedComponent = selectedComponentLabel
    ? components.find((component) => component.label === selectedComponentLabel) ?? null
    : null;
  const selectedPulseSignal = selectedPulseId
    ? pulseSignals.find((signal) => signal.id === selectedPulseId) ?? null
    : null;

  function clearMajorSurfaceSelection() {
    setSelectedAlert(null);
    setSelectedComponentLabel(null);
    setSelectedPulseId(null);
    setSelectedResourceMetric(null);
    setSelectedWorkbenchLabel(null);
    setSystemMoodOpen(false);
  }

  function selectWorkbenchSurface(surface: TSurface | null) {
    clearMajorSurfaceSelection();
    setSelectedWorkbenchLabel(surface?.label ?? null);
  }

  function setSystemMoodSelection(open: boolean) {
    clearMajorSurfaceSelection();
    setSystemMoodOpen(open);
  }

  function setPulseSignalSelection(signal: TPulse | null) {
    clearMajorSurfaceSelection();
    setSelectedPulseId(signal?.id ?? null);
  }

  function selectComponent(component: TComponent | null) {
    clearMajorSurfaceSelection();
    setSelectedComponentLabel(component?.label ?? null);
  }

  function selectAlert(alert: TAlert | null) {
    clearMajorSurfaceSelection();
    setSelectedAlert(alert);
  }

  function selectResourceMetric(metric: TResource | null) {
    clearMajorSurfaceSelection();
    setSelectedResourceMetric(metric);
  }

  function clearComponentScenarioSelection() {
    setSelectedAlert(null);
    setSelectedComponentLabel(null);
    setSelectedResourceMetric(null);
  }

  function clearResourceScenarioSelection() {
    setSelectedAlert(null);
    setSelectedResourceMetric(null);
  }

  return {
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
  };
}
