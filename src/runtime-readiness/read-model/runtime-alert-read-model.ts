import type {
  ObservationFreshness,
  ObservationSourceMode,
  ResourceTelemetryState,
  RuntimeAlertItem,
  RuntimeComponentObservation,
  Tone,
  WslResourceSample,
} from "../model/runtime-readiness-model.ts";
import {
  formatPercent,
  usageTone,
} from "./resource-read-model.ts";

function stableAlertId(prefix: string, label: string) {
  return `${prefix}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

function componentCanAssertAlert(component: RuntimeComponentObservation) {
  return (
    component.alertEligible &&
    (component.sourceMode === "live" ||
      component.sourceMode === "source-projected") &&
    component.observedAt !== null
  );
}

function resourceSourceMetadata(
  sourceState: ResourceTelemetryState,
): {
  freshness: ObservationFreshness;
  sourceMode: ObservationSourceMode;
} {
  if (sourceState === "mock") {
    return {
      freshness: "scenario",
      sourceMode: "synthetic-scenario",
    };
  }

  if (sourceState === "stale") {
    return {
      freshness: "stale",
      sourceMode: "live",
    };
  }

  if (sourceState === "live") {
    return {
      freshness: "current",
      sourceMode: "live",
    };
  }

  return {
    freshness: "unavailable",
    sourceMode: "unavailable",
  };
}

export function buildRuntimeAlerts({
  components,
  error,
  latestSample,
  resourceSourceLabel,
  resourceSourceState,
}: {
  components: RuntimeComponentObservation[];
  error: string | null;
  latestSample: WslResourceSample | undefined;
  resourceSourceLabel: string;
  resourceSourceState: ResourceTelemetryState;
}): RuntimeAlertItem[] {
  const eligibleComponents = components.filter(componentCanAssertAlert);
  const offlineComponents = eligibleComponents.filter(
    (component) => component.tone === "danger",
  );
  const warningComponents = eligibleComponents.filter(
    (component) => component.tone === "warn",
  );
  const resourceMetadata = resourceSourceMetadata(resourceSourceState);
  const resourceSampleIsEligible =
    resourceSourceState === "live" || resourceSourceState === "mock";
  const resourceAlerts =
    latestSample && resourceSampleIsEligible
      ? [
          {
            label: "CPU pressure",
            tone: usageTone(latestSample.cpuPercent),
            value: formatPercent(latestSample.cpuPercent),
          },
          {
            label: "RAM pressure",
            tone: usageTone(latestSample.memoryPercent),
            value: formatPercent(latestSample.memoryPercent),
          },
          {
            label: "VMEM pressure",
            tone: usageTone(latestSample.virtualMemoryPercent),
            value: formatPercent(latestSample.virtualMemoryPercent),
          },
          {
            label: "Disk pressure",
            tone: usageTone(latestSample.diskPercent),
            value: formatPercent(latestSample.diskPercent),
          },
        ].filter((alert) => alert.tone !== "ok")
      : [];

  return [
    ...offlineComponents.map((component) => ({
      detail: `${component.surface} / ${component.status}`,
      evidence: `${component.label} was observed as ${component.status} at ${component.surface}.`,
      freshness: component.freshness,
      id: stableAlertId("component-offline", component.label),
      label: `${component.label} unavailable`,
      nextMove:
        "Verify the declared route against the owning runtime before escalating.",
      observedAt: component.observedAt,
      scope: component.label,
      source: component.sourceAuthority,
      sourceMode: component.sourceMode,
      status: component.status,
      tone: "danger" as Tone,
    })),
    ...warningComponents.map((component) => ({
      detail: `${component.surface} / ${component.status}`,
      evidence: `${component.label} was observed as ${component.status} at ${component.surface}.`,
      freshness: component.freshness,
      id: stableAlertId("component-warning", component.label),
      label: `${component.label} needs attention`,
      nextMove:
        "Confirm the observation against the owning runtime and assess operator impact.",
      observedAt: component.observedAt,
      scope: component.label,
      source: component.sourceAuthority,
      sourceMode: component.sourceMode,
      status: component.status,
      tone: "warn" as Tone,
    })),
    ...resourceAlerts.map((alert) => ({
      detail: `${alert.value} current usage`,
      evidence: `${alert.label} sampled at ${alert.value} using prototype-local advisory thresholds.`,
      freshness: resourceMetadata.freshness,
      id: stableAlertId("resource", alert.label),
      label: alert.label,
      nextMove:
        "Review the resource trend before escalating; one sample does not prove sustained pressure.",
      observedAt: latestSample?.capturedAt ?? null,
      scope: "Local host resources",
      source: resourceSourceLabel,
      sourceMode: resourceMetadata.sourceMode,
      status: alert.value,
      tone: alert.tone,
    })),
    ...(error
      ? [
          {
            detail:
              resourceSourceState === "stale"
                ? "The latest probe failed; retained values are marked stale."
                : "The local telemetry endpoint did not return a usable sample.",
            evidence: error,
            freshness: resourceMetadata.freshness,
            id:
              resourceSourceState === "stale"
                ? "resource-telemetry-stale"
                : "resource-telemetry-unavailable",
            label:
              resourceSourceState === "stale"
                ? "Resource telemetry stale"
                : "Resource telemetry unavailable",
            nextMove:
              "Check the local console telemetry endpoint if the next polling cycle does not recover.",
            observedAt: latestSample?.capturedAt ?? null,
            scope: "Local host resources",
            source: resourceSourceLabel,
            sourceMode: resourceMetadata.sourceMode,
            status: resourceSourceState,
            tone:
              resourceSourceState === "stale"
                ? ("stale" as Tone)
                : ("warn" as Tone),
          },
        ]
      : []),
  ];
}
