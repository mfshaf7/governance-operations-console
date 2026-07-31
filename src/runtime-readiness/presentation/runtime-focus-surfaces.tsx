"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import type {
  ResourceMetricDetail,
  RuntimeAlertItem,
  RuntimeComponentObservation,
} from "../model/runtime-readiness-model";
import { buildComponentObservationDetail } from "../read-model/component-read-model";
import {
  RESOURCE_CHART_WIDTH,
  RESOURCE_PERFORMANCE_CHART_HEIGHT,
} from "../read-model/resource-read-model";
import {
  getComponentIcon,
  StatusDot,
} from "./runtime-readiness-support";

export function ResourceMetricFocus({ metric }: { metric: ResourceMetricDetail }) {
  const primaryLabel =
    metric.id === "Bandwidth"
      ? "Throughput"
      : metric.id === "Uptime"
        ? "Duration"
        : "Utilization";
  const statusLabel =
    metric.tone === "danger"
      ? "Critical"
      : metric.tone === "warn"
        ? "Warn"
        : metric.tone === "stale"
          ? "Stale"
          : metric.tone === "muted"
            ? "Muted"
            : metric.tone === "info"
              ? "Info"
              : "OK";
  const statBlocks = [
    { label: primaryLabel, value: metric.current },
    { label: "Average", value: metric.average },
    { label: "Peak", value: metric.peak },
    { label: "Minimum", value: metric.min },
    { label: "Samples", value: metric.sampleCount },
  ];
  const evidenceRows = [
    { label: "Threshold", value: metric.threshold },
    { label: "Scale", value: metric.normalRange },
    { label: "Source", value: `${metric.sourceMode} / ${metric.sourceLabel}` },
    { label: "Freshness", value: metric.freshness },
    { label: "Captured", value: metric.capturedAt },
    ...metric.facts,
  ];

  return (
    <div className="component-focus-content resource-focus-content">
      <div className="resource-performance-panel rounded-3xl p-4 md:p-5">
        <div className="resource-performance-head">
          <div>
            <p className="resource-performance-kicker mono">Performance</p>
            <h3>{metric.id}</h3>
            <p>{metric.operatorRead}</p>
          </div>
          <div className={`resource-performance-current resource-performance-status-${metric.tone}`}>
            <span className="mono">Status</span>
            <strong>{statusLabel}</strong>
          </div>
        </div>

        {metric.visualization === "chart" ? (
          <>
            <div className="resource-performance-grid mt-5">
              <div className="resource-performance-graph-shell rounded-2xl p-3">
                <div className="resource-performance-graph-top mono">
                  <span>{metric.id} {metric.id === "Bandwidth" ? "throughput" : "usage"}</span>
                  <span>{metric.axisTicks[0]?.label ?? "100%"}</span>
                </div>
                <svg
                  className="resource-performance-graph"
                  preserveAspectRatio="none"
                  viewBox={`-18 -6 306 ${RESOURCE_PERFORMANCE_CHART_HEIGHT + 16}`}
                  role="img"
                  aria-label={`${metric.id} performance graph`}
                >
                  <rect className="resource-performance-plot" height={RESOURCE_PERFORMANCE_CHART_HEIGHT} width={RESOURCE_CHART_WIDTH} x="0" y="0" />
                  {Array.from({ length: 15 }, (_, index) => (
                    <path
                      key={`v-${index}`}
                      d={`M ${(index / 14) * RESOURCE_CHART_WIDTH} 0 L ${(index / 14) * RESOURCE_CHART_WIDTH} ${RESOURCE_PERFORMANCE_CHART_HEIGHT}`}
                      className="resource-performance-grid-line resource-performance-grid-line-vertical"
                    />
                  ))}
                  {Array.from({ length: 9 }, (_, index) => (
                    <path
                      key={`h-${index}`}
                      d={`M 0 ${index * (RESOURCE_PERFORMANCE_CHART_HEIGHT / 8)} L ${RESOURCE_CHART_WIDTH} ${index * (RESOURCE_PERFORMANCE_CHART_HEIGHT / 8)}`}
                      className="resource-performance-grid-line"
                    />
                  ))}
                  {metric.referenceBands.map((band) => (
                    <rect
                      key={band.label}
                      className={`resource-reference-band ${band.className}`}
                      height={band.height}
                      width={RESOURCE_CHART_WIDTH}
                      x="0"
                      y={band.y}
                    />
                  ))}
                  {metric.axisTicks.map((tick) => (
                    <g key={tick.label}>
                      <text className="resource-axis-label" x="-3.5" y={tick.y + 2.2} textAnchor="end">
                        {tick.label}
                      </text>
                    </g>
                  ))}
                  {metric.chartSeries.map((series) =>
                    series.areaPath ? (
                      <path key={`${series.label}-area`} d={series.areaPath} className={`resource-performance-area ${series.className}`} />
                    ) : null,
                  )}
                  {metric.referenceLines.map((line) => (
                    <path key={line.label} d={`M 0 ${line.y} L ${RESOURCE_CHART_WIDTH} ${line.y}`} className={`resource-reference-line ${line.className}`} />
                  ))}
                  <path d={`M 0 ${RESOURCE_PERFORMANCE_CHART_HEIGHT} L ${RESOURCE_CHART_WIDTH} ${RESOURCE_PERFORMANCE_CHART_HEIGHT}`} className="resource-performance-axis" />
                  <path d={`M 0 0 L 0 ${RESOURCE_PERFORMANCE_CHART_HEIGHT}`} className="resource-performance-axis" />
                  {metric.chartSeries.map((series) =>
                    series.path ? (
                      <path key={series.label} d={series.path} className={`resource-performance-line ${series.className}`} />
                    ) : null,
                  )}
                </svg>
                <div className="resource-performance-graph-bottom mono">
                  <span>{metric.windowLabel}</span>
                  <span>{metric.axisTicks.at(-1)?.label ?? "0%"}</span>
                </div>
              </div>

              <div className="resource-performance-stats">
                {statBlocks.map((item, index) => (
                  <div key={item.label} className={`resource-performance-stat ${index === 0 ? "resource-performance-stat-primary" : ""} rounded-2xl p-3`}>
                    <p className="mono">{item.label}</p>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="resource-focus-inline-legend mt-4 flex flex-wrap gap-2">
              {metric.chartSeries.map((series) => (
                <span key={series.label} className={`resource-focus-legend-chip ${series.className} mono`}>
                  {series.label}: {series.value}
                </span>
              ))}
              {metric.referenceLines.map((line) => (
                <span key={line.label} className={`resource-focus-legend-chip resource-threshold-chip ${line.className} mono`}>
                  {line.label}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="component-focus-grid mt-5 grid gap-3 md:grid-cols-2">
            {[
              { label: "Current uptime", value: metric.current },
              { label: "Freshness", value: metric.freshness },
              { label: "Source", value: metric.sourceLabel },
              { label: "Captured", value: metric.capturedAt },
            ].map((item) => (
              <div key={item.label} className="component-focus-row status-card-info rounded-2xl p-3">
                <div>
                  <p className="mono text-[9px] font-black uppercase tracking-[0.16em]">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold leading-5">{item.value}</p>
                </div>
                <StatusDot tone="info" />
              </div>
            ))}
          </div>
        )}

        <div className="resource-focus-evidence mt-4 rounded-2xl p-3">
          {evidenceRows.map((item) => (
            <div key={`${item.label}-${item.value}`} className="resource-focus-evidence-row">
              <p className="mono">{item.label}</p>
              <p>{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AlertDetailFocus({ alert }: { alert: RuntimeAlertItem }) {
  const statusLabel =
    alert.tone === "danger"
      ? "blocking"
      : alert.tone === "warn"
        ? "attention"
        : alert.tone;

  return (
    <div className="component-focus-content alert-focus-content">
      <div className="component-focus-hero rounded-3xl p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="component-focus-kicker mono text-xs font-black uppercase tracking-[0.22em]">
              Runtime Alert
            </p>
            <div className="component-focus-title-line mt-2">
              <span className={`component-focus-title-icon status-card-${alert.tone}`} aria-hidden="true">
                <AlertTriangle className="component-focus-title-svg" strokeWidth={2.15} />
              </span>
              <h2 className="text-3xl font-black tracking-[-0.055em] md:text-4xl">
                {alert.label}
              </h2>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6">
              {alert.detail}
            </p>
          </div>
          <span className={`component-focus-status status-card-${alert.tone} mono rounded-full px-3 py-2`}>
            <StatusDot tone={alert.tone} />
            {statusLabel}
          </span>
        </div>

        <div className="component-focus-facts mt-5 grid gap-3 md:grid-cols-3">
          {[
            { label: "Scope", value: alert.scope },
            { label: "Source mode", value: alert.sourceMode },
            { label: "Freshness", value: alert.freshness },
          ].map((fact) => (
            <div key={fact.label} className="component-focus-fact rounded-2xl p-3">
              <p className="mono text-[9px] font-black uppercase tracking-[0.18em]">{fact.label}</p>
              <p className="mt-2 truncate text-sm font-semibold">{fact.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="component-focus-grid mt-5 grid gap-3 md:grid-cols-2">
        {[
          {
            label: "Evidence",
            value: alert.evidence,
          },
          {
            label: "Next safe move",
            value: alert.nextMove,
          },
          {
            label: "Source authority",
            value: alert.source,
          },
          {
            label: "Observed",
            value: alert.observedAt ?? "not observed",
          },
        ].map((item) => (
          <div key={item.label} className={`component-focus-row alert-focus-row status-card-${alert.tone} rounded-2xl p-3`}>
            <div>
              <p className="mono text-[9px] font-black uppercase tracking-[0.16em]">{item.label}</p>
              <p className="mt-1 text-xs font-medium leading-5">{item.value}</p>
            </div>
            <StatusDot tone={alert.tone} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ComponentDetailFocus({
  component,
}: {
  component: RuntimeComponentObservation;
}) {
  const detail = buildComponentObservationDetail(component);
  const Icon = getComponentIcon(component.label);

  return (
    <div className="component-focus-content">
      <div className="component-focus-hero rounded-3xl p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="component-focus-kicker mono text-xs font-black uppercase tracking-[0.22em]">
              Component Detail
            </p>
            <div className="component-focus-title-line mt-2">
              <span className={`component-focus-title-icon status-card-${detail.tone}`} aria-hidden="true">
                <Icon className="component-focus-title-svg" strokeWidth={2.15} />
              </span>
              <h2 className="text-3xl font-black tracking-[-0.055em] md:text-4xl">
                {component.label}
              </h2>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6">
              Declared access and source-backed observation coverage for this component.
            </p>
          </div>
          <span className={`component-focus-status status-card-${detail.tone} mono rounded-full px-3 py-2`}>
            <StatusDot tone={detail.tone} />
            {detail.status}
          </span>
        </div>

        <div className="component-focus-facts mt-5 grid gap-3 md:grid-cols-3">
          {detail.facts.map((fact) => (
            <div key={fact.label} className="component-focus-fact rounded-2xl p-3">
              <p className="mono text-[9px] font-black uppercase tracking-[0.18em]">{fact.label}</p>
              <p className="mt-2 truncate text-sm font-semibold">{fact.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="component-focus-grid mt-5 grid gap-3 md:grid-cols-2">
        <div className="component-focus-section rounded-3xl p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="mono text-[10px] font-black uppercase tracking-[0.2em]">
              Observation
            </p>
            <span className="component-focus-count mono rounded-full px-2.5 py-1 text-[9px] uppercase tracking-[0.16em]">
              {component.sourceMode}
            </span>
          </div>
          <div className="mt-3 grid gap-2">
            {detail.observationRows.map((item) => (
              <div key={item.label} className={`component-focus-row status-card-${item.tone} rounded-2xl p-3`}>
                <div>
                  <p className="mono text-[9px] font-black uppercase tracking-[0.16em]">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold leading-5">{item.value}</p>
                </div>
                <StatusDot tone={item.tone} />
              </div>
            ))}
          </div>
        </div>

        <div className="component-focus-section rounded-3xl p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="mono text-[10px] font-black uppercase tracking-[0.2em]">
              Coverage
            </p>
            <span className="component-focus-count mono rounded-full px-2.5 py-1 text-[9px] uppercase tracking-[0.16em]">
              read only
            </span>
          </div>
          <div className="mt-3 grid gap-2">
            {detail.coverageRows.map((item) => (
              <div key={item.label} className={`component-focus-row status-card-${item.tone} rounded-2xl p-3`}>
                <div>
                  <p className="mono text-[9px] font-black uppercase tracking-[0.16em]">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold leading-5">{item.value}</p>
                </div>
                <StatusDot tone={item.tone} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {detail.accessHref ? (
        <div className="component-focus-actions mt-5 rounded-3xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="mono text-[10px] font-black uppercase tracking-[0.2em]">
                Declared Access
              </p>
              <p className="mt-2 text-sm leading-6">
                Open the cataloged route without treating availability as observed health.
              </p>
            </div>
            <a
              className="component-focus-action rounded-2xl p-3 text-left"
              href={detail.accessHref}
              rel="noreferrer"
              target="_blank"
            >
              <span className="mono block text-[9px] font-black uppercase tracking-[0.16em]">
                Open route
              </span>
              <span className="mt-2 flex items-center gap-2 text-xs leading-5">
                {component.surface}
                <ExternalLink aria-hidden="true" size={14} />
              </span>
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
