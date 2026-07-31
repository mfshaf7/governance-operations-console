"use client";

import type {
  ComponentStatusScenario,
  ResourceMetricCard,
  ResourceMetricDetail,
  ResourceTelemetryState,
  ResourceUsageScenario,
  RuntimeAlertItem,
  RuntimeComponentObservation,
  Tone,
  WslResourceSample,
} from "../model/runtime-readiness-model";
import {
  buildChartPath,
  buildRelativeChartPath,
  buildResourceMetricDetail,
  formatBandwidth,
  formatBytes,
  formatPercent,
  formatUptime,
  usageTone,
} from "../read-model/resource-read-model";
import { buildRuntimeAlerts } from "../read-model/runtime-alert-read-model";
import {
  componentStatusScenarios,
  resourceUsageScenarios,
} from "../read-model/runtime-readiness-scenarios";
import { useWslResourceTelemetry } from "../state/use-wsl-resource-telemetry";
import {
  ComponentIcon,
  DevScenarioSwitch,
  Panel,
  SectionTitle,
  StatusDot,
  statusCardClass,
} from "./runtime-readiness-support";

function ComponentStatusView({
  components,
  onSelectComponent,
  selectedComponent,
}: {
  components: RuntimeComponentObservation[];
  onSelectComponent: (component: RuntimeComponentObservation | null) => void;
  selectedComponent: RuntimeComponentObservation | null;
}) {
  return (
    <div className="component-status-view mt-5 rounded-3xl p-3">
      <div className="component-status-list grid gap-2">
        {components.map((component) => (
          <button
            key={component.id}
            className={statusCardClass(
              component.tone,
              `component-status-row rounded-xl px-3 py-2 ${
                selectedComponent?.id === component.id ? "component-status-row-active" : ""
              }`,
            )}
            type="button"
            onClick={() => onSelectComponent(selectedComponent?.id === component.id ? null : component)}
          >
            {selectedComponent?.id === component.id ? (
              <span className="component-side-bridge" aria-hidden="true" />
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="component-status-row-title">
                  <span className="component-status-row-icon" aria-hidden="true">
                    <ComponentIcon component={component} />
                  </span>
                  <p className="component-status-row-name truncate text-sm font-semibold tracking-[-0.03em]">
                    {component.label}
                  </p>
                </div>
                <p className="component-status-row-surface mono mt-1 truncate text-[9px] uppercase tracking-[0.12em]">
                  {component.surface}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <StatusDot tone={component.tone} />
                <span className={`component-status-pill component-status-${component.tone} mono`}>
                  {component.status}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AlertsView({
  components,
  error,
  latestSample,
  onSelectAlert,
  resourceSourceLabel,
  resourceSourceState,
  selectedAlert,
}: {
  components: RuntimeComponentObservation[];
  error: string | null;
  latestSample: WslResourceSample | undefined;
  onSelectAlert: (alert: RuntimeAlertItem | null) => void;
  resourceSourceLabel: string;
  resourceSourceState: ResourceTelemetryState;
  selectedAlert: RuntimeAlertItem | null;
}) {
  const alerts = buildRuntimeAlerts({
    components,
    error,
    latestSample,
    resourceSourceLabel,
    resourceSourceState,
  });

  return (
    <div className="alerts-view mt-5 grid gap-2">
      {alerts.length === 0 ? (
        <div className={statusCardClass("muted", "rounded-2xl p-3")}>
          <div className="flex items-start gap-3">
            <span className="alert-row-indicator" aria-hidden="true">
              <StatusDot tone="muted" />
            </span>
            <div className="min-w-0">
              <p className="alert-row-title text-sm font-semibold tracking-[-0.03em]">
                No asserted runtime alerts
              </p>
              <p className="alert-row-detail mt-1 text-xs leading-5">
                Component observation is not connected; only the local host telemetry adapter is alert-eligible.
              </p>
            </div>
          </div>
        </div>
      ) : (
        alerts.map((alert) => (
          <button
            key={alert.id}
            aria-pressed={selectedAlert?.id === alert.id}
            className={statusCardClass(
              alert.tone,
              `alert-row rounded-2xl p-3 ${selectedAlert?.id === alert.id ? "alert-row-active" : ""}`,
            )}
            type="button"
            onClick={() => onSelectAlert(selectedAlert?.id === alert.id ? null : alert)}
          >
            {selectedAlert?.id === alert.id ? <span className="alert-side-bridge" aria-hidden="true" /> : null}
            <div className="flex items-start gap-3">
              <span className="alert-row-indicator" aria-hidden="true">
                <StatusDot tone={alert.tone} />
              </span>
              <div className="min-w-0">
                <p className="alert-row-title text-sm font-semibold tracking-[-0.03em]">{alert.label}</p>
                <p className="alert-row-detail mt-1 text-xs leading-5">{alert.detail}</p>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

export function WslResourceUsage({
  activeComponentScenario,
  activeResourceScenario,
  componentScenarioId,
  consoleDevMode,
  onComponentScenarioChange,
  onSelectAlert,
  onSelectComponent,
  onSelectResourceMetric,
  onResourceScenarioChange,
  resourceScenarioId,
  selectedAlert,
  selectedComponent,
  selectedResourceMetric,
}: {
  activeComponentScenario: ComponentStatusScenario;
  activeResourceScenario: ResourceUsageScenario;
  componentScenarioId: string;
  consoleDevMode: boolean;
  onComponentScenarioChange: (scenarioId: string) => void;
  onSelectAlert: (alert: RuntimeAlertItem | null) => void;
  onSelectComponent: (component: RuntimeComponentObservation | null) => void;
  onSelectResourceMetric: (metric: ResourceMetricDetail | null) => void;
  onResourceScenarioChange: (scenarioId: string) => void;
  resourceScenarioId: string;
  selectedAlert: RuntimeAlertItem | null;
  selectedComponent: RuntimeComponentObservation | null;
  selectedResourceMetric: ResourceMetricDetail | null;
}) {
  const {
    activeResourceTab,
    error,
    latest,
    samples,
    setActiveResourceTab,
    sourceState,
    usingMockResources,
  } = useWslResourceTelemetry({
    activeResourceScenario,
    consoleDevMode,
  });

  const latestSample = samples.at(-1);
  const statusTone: Tone =
    sourceState === "mock"
      ? activeResourceScenario.statusTone
      : sourceState === "live"
        ? "ok"
        : sourceState === "stale"
          ? "stale"
          : sourceState === "unavailable"
            ? "warn"
            : "info";
  const statusLabel = usingMockResources
    ? activeResourceScenario.statusLabel
    : sourceState;
  const resourceSourceLabel = usingMockResources
    ? activeResourceScenario.sourceLabel
    : latest
      ? `${latest.host.platform} / local /proc`
      : "local /proc telemetry";
  const chartSeries = [
    { className: "wsl-chart-line-cpu", path: buildChartPath(samples, (sample) => sample.cpuPercent) },
    {
      className: "wsl-chart-line-memory",
      path: buildChartPath(samples, (sample) => sample.memoryPercent),
    },
    {
      className: "wsl-chart-line-vmem",
      path: buildChartPath(samples, (sample) => sample.virtualMemoryPercent),
    },
    { className: "wsl-chart-line-disk", path: buildChartPath(samples, (sample) => sample.diskPercent) },
    {
      className: "wsl-chart-line-network",
      path: buildRelativeChartPath(samples, Math.max(1, ...samples.map((sample) => sample.networkKibps)), (sample) => sample.networkKibps),
    },
  ];
  const chartLegend = [
    { className: "wsl-legend-cpu", label: "CPU" },
    { className: "wsl-legend-memory", label: "RAM" },
    { className: "wsl-legend-vmem", label: "VMEM" },
    { className: "wsl-legend-disk", label: "DISK" },
    { className: "wsl-legend-network", label: "NET" },
  ];
  const baseResourceMetricCards: ResourceMetricCard[] =
    usingMockResources && activeResourceScenario.metricCards
      ? activeResourceScenario.metricCards
      : [
          {
            label: "CPU",
            tone: latestSample ? usageTone(latestSample.cpuPercent) : ("info" as Tone),
            value: latestSample ? formatPercent(latestSample.cpuPercent) : "--",
            detail: latest ? `${latest.cpu.cores} cores / load ${latest.cpu.load1.toFixed(2)}` : "sampling",
          },
          {
            label: "RAM",
            tone: latestSample ? usageTone(latestSample.memoryPercent) : ("info" as Tone),
            value: latestSample ? formatPercent(latestSample.memoryPercent) : "--",
            detail: latest
              ? `${formatBytes(latest.memory.usedBytes)} / ${formatBytes(latest.memory.totalBytes)}`
              : "sampling",
          },
          {
            label: "VMEM",
            tone: latestSample ? usageTone(latestSample.virtualMemoryPercent) : ("info" as Tone),
            value: latestSample ? formatPercent(latestSample.virtualMemoryPercent) : "--",
            detail: latest
              ? `${formatBytes(latest.virtualMemory.committedBytes)} committed / ${formatBytes(
                  latest.virtualMemory.commitLimitBytes,
                )} limit`
              : "sampling",
          },
          {
            label: "Disk",
            tone: latestSample ? usageTone(latestSample.diskPercent) : ("info" as Tone),
            value: latestSample ? formatPercent(latestSample.diskPercent) : "--",
            detail: latest
              ? `${formatBytes(latest.disk.usedBytes)} / ${formatBytes(latest.disk.totalBytes)}`
              : "sampling",
          },
          {
            label: "Bandwidth",
            tone: "info" as Tone,
            value: latestSample ? formatBandwidth(latestSample.networkKibps) : "--",
            detail: latestSample
              ? `down ${formatBandwidth(latestSample.rxKibps)} / up ${formatBandwidth(latestSample.txKibps)}`
              : "sampling",
          },
        ];
  const uptimeTone: Tone =
    sourceState === "stale"
      ? "stale"
      : sourceState === "unavailable" || sourceState === "mock"
        ? "muted"
        : "info";
  const sourceAwareMetricCards = baseResourceMetricCards.map((metric) => ({
    ...metric,
    detail:
      sourceState === "stale"
        ? `${metric.detail} / retained sample`
        : metric.detail,
    tone:
      sourceState === "stale"
        ? ("stale" as Tone)
        : sourceState === "unavailable"
          ? ("muted" as Tone)
          : metric.tone,
  }));
  const resourceMetricCards: ResourceMetricCard[] = [
    ...sourceAwareMetricCards,
    {
      detail: latest
        ? `${latest.host.platform} / ${latest.host.hostname}`
        : usingMockResources
          ? "not included in synthetic resource scenario"
          : "waiting for host sample",
      label: "Uptime",
      tone: uptimeTone,
      value: latest ? formatUptime(latest.host.uptimeSeconds) : "--",
    },
  ];

  return (
    <Panel
      className={`wsl-resource-panel tabbed-resource-panel ${
        selectedComponent && activeResourceTab === "components" ? "component-status-open" : ""
      } ${
        selectedAlert && activeResourceTab === "alerts" ? "alert-status-open" : ""
      } ${
        selectedResourceMetric && activeResourceTab === "resources" ? "resource-status-open" : ""
      }`}
    >
      <div
        className="resource-browser-tabs"
        role="tablist"
        aria-label="Capacity monitor tabs"
      >
        {[
          { id: "resources" as const, label: "Resources" },
          {
            id: "components" as const,
            label: "Components",
          },
          { id: "alerts" as const, label: "Alerts" },
        ].map((tab) => (
          <button
            key={tab.id}
            aria-pressed={activeResourceTab === tab.id}
            className={`resource-panel-tab px-3 py-2 text-center ${
              activeResourceTab === tab.id ? "resource-panel-tab-active" : ""
            }`}
            type="button"
            onClick={() => {
              setActiveResourceTab(tab.id);
              if (tab.id !== "components") {
                onSelectComponent(null);
              }
              if (tab.id !== "alerts") {
                onSelectAlert(null);
              }
              if (tab.id !== "resources") {
                onSelectResourceMetric(null);
              }
            }}
          >
            <span className="mono block text-[10px] font-black uppercase tracking-[0.16em]">
              {tab.label.toUpperCase()}
            </span>
          </button>
        ))}
      </div>

      <div
        className="resource-tab-body rounded-b-[26px] p-4"
      >
        {activeResourceTab === "components" ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <SectionTitle kicker="Component Status" title="Operator Surfaces" />
              <span className="component-status-count mono rounded-full px-2.5 py-1 text-[9px] uppercase tracking-[0.16em]">
                {activeComponentScenario.mode === "synthetic"
                  ? "synthetic"
                  : `${activeComponentScenario.components.length} catalog`}
              </span>
            </div>
            <DevScenarioSwitch
              activeId={componentScenarioId}
              className="component-dev-switcher"
              devMode={consoleDevMode}
              label="Components"
              options={componentStatusScenarios}
              onChange={onComponentScenarioChange}
            />
            <ComponentStatusView
              components={activeComponentScenario.components}
              selectedComponent={selectedComponent}
              onSelectComponent={onSelectComponent}
            />
          </>
        ) : null}

        {activeResourceTab === "alerts" ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <SectionTitle kicker="Runtime Alerts" title="Attention Queue" />
              <span className="alerts-count mono rounded-full px-2.5 py-1 text-[9px] uppercase tracking-[0.16em]">
                {sourceState} source
              </span>
            </div>
            <AlertsView
              components={activeComponentScenario.components}
              error={error}
              latestSample={latestSample}
              resourceSourceLabel={resourceSourceLabel}
              resourceSourceState={sourceState}
              selectedAlert={selectedAlert}
              onSelectAlert={onSelectAlert}
            />
          </>
        ) : null}

        {activeResourceTab === "resources" ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <SectionTitle kicker="Platform Resources" title="Capacity Monitor" />
              <span className={`wsl-live-pill wsl-live-pill-${statusTone} rounded-full px-3 py-1`}>
                {statusLabel}
              </span>
            </div>
            <DevScenarioSwitch
              activeId={resourceScenarioId}
              className="resource-dev-switcher"
              devMode={consoleDevMode}
              label="Resources"
              options={resourceUsageScenarios}
              onChange={onResourceScenarioChange}
            />

            <div className="wsl-chart-card mt-5 rounded-3xl p-4">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Live resource trend</p>
                  <p className="mono mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--subtle)]">
                    {usingMockResources
                      ? activeResourceScenario.sourceLabel
                      : latest
                        ? `${latest.host.platform} telemetry`
                        : "waiting for sample"}
                  </p>
                </div>
                <p className="mono text-right text-[10px] uppercase tracking-[0.16em] text-[var(--subtle)]">
                  {usingMockResources ? "mock dataset" : latest ? "local /proc" : "not ready"}
                </p>
              </div>
              <svg className="wsl-chart" viewBox="0 0 280 96" role="img" aria-label="WSL resource usage trend">
                <path d="M 0 96 L 280 96" className="wsl-chart-baseline" />
                {[24, 48, 72].map((y) => (
                  <path key={y} d={`M 0 ${y} L 280 ${y}`} className="wsl-chart-grid" />
                ))}
                {chartSeries.map((series) =>
                  series.path ? (
                    <path key={series.className} d={series.path} className={`wsl-chart-line ${series.className}`} />
                  ) : null,
                )}
              </svg>
              <div className="wsl-chart-legend mt-4 flex flex-wrap gap-2">
                {chartLegend.map((item) => (
                  <span key={item.label} className={`wsl-legend-pill ${item.className}`}>
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {resourceMetricCards.map((metric) => (
                <button
                  key={metric.label}
                  aria-pressed={selectedResourceMetric?.id === metric.label}
                  className={statusCardClass(
                    metric.tone,
                    `wsl-resource-card rounded-2xl p-3 ${
                      selectedResourceMetric?.id === metric.label ? "wsl-resource-card-active" : ""
                    }`,
                  )}
                  type="button"
                  onClick={() => {
                    const detail = buildResourceMetricDetail({
                      card: metric,
                      freshness: sourceState,
                      latest,
                      samples,
                      sourceLabel: resourceSourceLabel,
                      sourceMode: usingMockResources ? "mock" : "live",
                    });
                    onSelectResourceMetric(selectedResourceMetric?.id === detail.id ? null : detail);
                  }}
                >
                  {selectedResourceMetric?.id === metric.label ? (
                    <span className="resource-side-bridge" aria-hidden="true" />
                  ) : null}
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{metric.label}</p>
                    <strong className="wsl-resource-value mono">{metric.value}</strong>
                  </div>
                  <p className="mt-1 text-xs text-[var(--subtle)]">{metric.detail}</p>
                </button>
              ))}
            </div>

            {error ? (
              <p className="mt-3 text-xs leading-5 text-[var(--amber)]">
                {sourceState === "stale"
                  ? `Latest probe failed; retained values are stale. ${error}`
                  : `Telemetry unavailable. ${error}`}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </Panel>
  );
}
