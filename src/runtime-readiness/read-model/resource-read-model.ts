import type {
  ResourceMetricCard,
  ResourceMetricDetail,
  ResourceMetricId,
  ResourceTelemetryState,
  Tone,
  WslCpuCounters,
  WslNetworkCounters,
  WslResourceSample,
  WslResourceSnapshot,
} from "../model/runtime-readiness-model.ts";

export const RESOURCE_CHART_WIDTH = 280;
export const RESOURCE_CHART_HEIGHT = 96;
export const RESOURCE_PERFORMANCE_CHART_HEIGHT = 160;

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function formatPercent(value: number) {
  return `${Math.round(clampPercent(value))}%`;
}

export function formatBytes(bytes: number) {
  const gib = bytes / 1024 ** 3;
  return `${gib.toFixed(gib >= 10 ? 0 : 1)} GiB`;
}

export function formatBandwidth(kibps: number) {
  if (kibps >= 1024) {
    return `${(kibps / 1024).toFixed(kibps >= 10240 ? 0 : 1)} MiB/s`;
  }

  return `${Math.round(kibps)} KiB/s`;
}

export function formatUptime(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  }

  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function usageTone(percent: number): Tone {
  if (percent >= 88) {
    return "danger";
  }

  if (percent >= 68) {
    return "warn";
  }

  return "ok";
}

export function resolveResourceTelemetryState({
  error,
  hasSnapshot,
  usingMockResources,
}: {
  error: string | null;
  hasSnapshot: boolean;
  usingMockResources: boolean;
}): ResourceTelemetryState {
  if (usingMockResources) {
    return "mock";
  }

  if (error) {
    return hasSnapshot ? "stale" : "unavailable";
  }

  return hasSnapshot ? "live" : "warming";
}

export function calculateCpuPercent(
  previous: WslCpuCounters | null,
  next: WslCpuCounters,
  fallback: number,
) {
  if (!previous) {
    return clampPercent(fallback);
  }

  const totalDelta = next.total - previous.total;
  const idleDelta = next.idle - previous.idle;

  if (totalDelta <= 0) {
    return clampPercent(fallback);
  }

  return clampPercent((1 - idleDelta / totalDelta) * 100);
}

export function calculateNetworkRates(
  previous: { capturedAtMs: number; counters: WslNetworkCounters } | null,
  next: WslNetworkCounters,
  capturedAt: string,
) {
  const capturedAtMs = new Date(capturedAt).getTime();

  if (!previous) {
    return {
      capturedAtMs,
      networkKibps: 0,
      rxKibps: 0,
      txKibps: 0,
    };
  }

  const elapsedSeconds = Math.max(
    1,
    (capturedAtMs - previous.capturedAtMs) / 1000,
  );
  const rxKibps = Math.max(
    0,
    (next.rxBytes - previous.counters.rxBytes) / 1024 / elapsedSeconds,
  );
  const txKibps = Math.max(
    0,
    (next.txBytes - previous.counters.txBytes) / 1024 / elapsedSeconds,
  );

  return {
    capturedAtMs,
    networkKibps: rxKibps + txKibps,
    rxKibps,
    txKibps,
  };
}

export function buildChartPath(
  samples: WslResourceSample[],
  valueForSample: (sample: WslResourceSample) => number,
  height = RESOURCE_CHART_HEIGHT,
  width = RESOURCE_CHART_WIDTH,
) {
  if (samples.length === 0) {
    return "";
  }

  return samples
    .map((sample, index) => {
      const x =
        samples.length === 1 ? 0 : (index / (samples.length - 1)) * width;
      const y =
        height - (clampPercent(valueForSample(sample)) / 100) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function buildRelativeChartPath(
  samples: WslResourceSample[],
  maxValue: number,
  valueForSample: (sample: WslResourceSample) => number,
  height = RESOURCE_CHART_HEIGHT,
  width = RESOURCE_CHART_WIDTH,
) {
  return buildChartPath(
    samples,
    (sample) =>
      (valueForSample(sample) / Math.max(1, maxValue)) * 100,
    height,
    width,
  );
}

function buildChartAreaPath(
  path: string,
  height = RESOURCE_CHART_HEIGHT,
  width = RESOURCE_CHART_WIDTH,
) {
  return path ? `${path} L ${width} ${height} L 0 ${height} Z` : "";
}

function resourceMetricValue(
  sample: WslResourceSample,
  metric: ResourceMetricId,
) {
  if (metric === "CPU") {
    return sample.cpuPercent;
  }

  if (metric === "RAM") {
    return sample.memoryPercent;
  }

  if (metric === "VMEM") {
    return sample.virtualMemoryPercent;
  }

  if (metric === "Disk") {
    return sample.diskPercent;
  }

  if (metric === "Uptime") {
    return 0;
  }

  return sample.networkKibps;
}

function formatResourceMetricValue(metric: ResourceMetricId, value: number) {
  if (metric === "Bandwidth") {
    return formatBandwidth(value);
  }

  if (metric === "Uptime") {
    return formatUptime(value);
  }

  return formatPercent(value);
}

function resourceMetricTone(
  metric: ResourceMetricId,
  value: number,
  fallback: Tone,
) {
  return metric === "Bandwidth" ? fallback : usageTone(value);
}

function resourceMetricThreshold(metric: ResourceMetricId) {
  if (metric === "Bandwidth" || metric === "Uptime") {
    return "No threshold; this metric is informational.";
  }

  return "Prototype-local advisory: warn at 68%; danger at 88%.";
}

function resourceTrend(values: number[], metric: ResourceMetricId) {
  if (values.length < 2) {
    return "single sample";
  }

  const first = values[0];
  const last = values.at(-1) ?? first;
  const delta = last - first;
  const threshold = metric === "Bandwidth" ? 64 : 2;

  if (Math.abs(delta) < threshold) {
    return "stable";
  }

  return delta > 0 ? "rising" : "falling";
}

function shortSampleLabel(value: string | undefined) {
  if (!value) {
    return "--";
  }

  if (value.startsWith("mock-")) {
    return value;
  }

  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(timestamp);
}

function resourceOperatorRead(metric: ResourceMetricId, tone: Tone) {
  if (metric === "Bandwidth") {
    return "RX/TX throughput sample. No capacity threshold.";
  }

  if (metric === "Uptime") {
    return "Elapsed runtime for the current local host environment.";
  }

  if (tone === "danger") {
    return `${metric} is above the danger threshold in the current sample window.`;
  }

  if (tone === "warn") {
    return `${metric} is above the warning threshold in the current sample window.`;
  }

  return `${metric} is below the warning threshold in the current sample window.`;
}

function resourceMetricChartSeries(
  metric: ResourceMetricId,
  samples: WslResourceSample[],
) {
  if (metric === "Bandwidth") {
    const maxBandwidth = Math.max(
      1,
      ...samples.map((sample) => sample.networkKibps),
    );
    const totalPath = buildRelativeChartPath(
      samples,
      maxBandwidth,
      (sample) => sample.networkKibps,
      RESOURCE_PERFORMANCE_CHART_HEIGHT,
    );
    const rxPath = buildRelativeChartPath(
      samples,
      maxBandwidth,
      (sample) => sample.rxKibps,
      RESOURCE_PERFORMANCE_CHART_HEIGHT,
    );
    const txPath = buildRelativeChartPath(
      samples,
      maxBandwidth,
      (sample) => sample.txKibps,
      RESOURCE_PERFORMANCE_CHART_HEIGHT,
    );

    return [
      {
        areaPath: buildChartAreaPath(
          totalPath,
          RESOURCE_PERFORMANCE_CHART_HEIGHT,
        ),
        className: "wsl-chart-line-network",
        label: "TOTAL",
        path: totalPath,
        value: samples.at(-1)
          ? formatBandwidth(samples.at(-1)!.networkKibps)
          : "--",
      },
      {
        className: "wsl-chart-line-rx",
        label: "RX",
        path: rxPath,
        value: samples.at(-1)
          ? formatBandwidth(samples.at(-1)!.rxKibps)
          : "--",
      },
      {
        className: "wsl-chart-line-tx",
        label: "TX",
        path: txPath,
        value: samples.at(-1)
          ? formatBandwidth(samples.at(-1)!.txKibps)
          : "--",
      },
    ];
  }

  const className =
    metric === "CPU"
      ? "wsl-chart-line-cpu"
      : metric === "RAM"
        ? "wsl-chart-line-memory"
        : metric === "VMEM"
          ? "wsl-chart-line-vmem"
          : "wsl-chart-line-disk";

  const path = buildChartPath(
    samples,
    (sample) => resourceMetricValue(sample, metric),
    RESOURCE_PERFORMANCE_CHART_HEIGHT,
  );

  return [
    {
      areaPath: buildChartAreaPath(path, RESOURCE_PERFORMANCE_CHART_HEIGHT),
      className,
      label: metric.toUpperCase(),
      path,
      value: samples.at(-1)
        ? formatPercent(resourceMetricValue(samples.at(-1)!, metric))
        : "--",
    },
  ];
}

function chartYForPercent(
  percent: number,
  height = RESOURCE_CHART_HEIGHT,
) {
  return height - (clampPercent(percent) / 100) * height;
}

function resourceMetricScale(metric: ResourceMetricId, values: number[]) {
  if (metric === "Bandwidth") {
    const maxValue = Math.max(1, ...values);

    return {
      axisTicks: [
        { label: formatBandwidth(maxValue), y: 0 },
        {
          label: formatBandwidth(maxValue / 2),
          y: RESOURCE_PERFORMANCE_CHART_HEIGHT / 2,
        },
        { label: "0 KiB/s", y: RESOURCE_PERFORMANCE_CHART_HEIGHT },
      ],
      normalRange:
        "No governed normal threshold; graph is scaled to current window peak.",
      referenceBands: [],
      referenceLines: [],
    };
  }

  return {
    axisTicks: [
      { label: "100%", y: 0 },
      { label: "75%", y: RESOURCE_PERFORMANCE_CHART_HEIGHT * 0.25 },
      { label: "50%", y: RESOURCE_PERFORMANCE_CHART_HEIGHT * 0.5 },
      { label: "25%", y: RESOURCE_PERFORMANCE_CHART_HEIGHT * 0.75 },
      { label: "0%", y: RESOURCE_PERFORMANCE_CHART_HEIGHT },
    ],
    normalRange:
      "Prototype-local advisory range: 0-67%; warning starts at 68%; danger starts at 88%.",
    referenceBands: [
      {
        className: "resource-reference-normal",
        height:
          RESOURCE_PERFORMANCE_CHART_HEIGHT -
          chartYForPercent(68, RESOURCE_PERFORMANCE_CHART_HEIGHT),
        label: "normal",
        y: chartYForPercent(68, RESOURCE_PERFORMANCE_CHART_HEIGHT),
      },
    ],
    referenceLines: [
      {
        className: "resource-reference-warn",
        label: "warn 68%",
        y: chartYForPercent(68, RESOURCE_PERFORMANCE_CHART_HEIGHT),
      },
      {
        className: "resource-reference-danger",
        label: "danger 88%",
        y: chartYForPercent(88, RESOURCE_PERFORMANCE_CHART_HEIGHT),
      },
    ],
  };
}

function resourceMetricFacts(
  metric: ResourceMetricId,
  latest: WslResourceSnapshot | null,
  sample: WslResourceSample | undefined,
) {
  if (!latest) {
    return [
      { label: "Sample", value: sample?.capturedAt ?? "not sampled" },
      { label: "Fixture scope", value: "sample series only" },
      { label: "Snapshot fields", value: "not available in mock fixture" },
    ];
  }

  if (metric === "CPU") {
    return [
      { label: "Core count", value: String(latest.cpu.cores) },
      {
        label: "Load averages",
        value: `${latest.cpu.load1.toFixed(2)} / ${latest.cpu.load5.toFixed(2)} / ${latest.cpu.load15.toFixed(2)}`,
      },
      {
        label: "Pressure",
        value: formatPercent(
          sample?.cpuPercent ?? latest.cpu.pressurePercent,
        ),
      },
    ];
  }

  if (metric === "RAM") {
    return [
      { label: "Used", value: formatBytes(latest.memory.usedBytes) },
      {
        label: "Available",
        value: formatBytes(latest.memory.availableBytes),
      },
      { label: "Total", value: formatBytes(latest.memory.totalBytes) },
    ];
  }

  if (metric === "VMEM") {
    return [
      {
        label: "Committed",
        value: formatBytes(latest.virtualMemory.committedBytes),
      },
      {
        label: "Commit limit",
        value: formatBytes(latest.virtualMemory.commitLimitBytes),
      },
      {
        label: "Swap",
        value: `${formatBytes(latest.virtualMemory.swapUsedBytes)} / ${formatBytes(latest.virtualMemory.swapTotalBytes)}`,
      },
    ];
  }

  if (metric === "Disk") {
    return [
      { label: "Mount", value: latest.disk.mount },
      { label: "Used", value: formatBytes(latest.disk.usedBytes) },
      {
        label: "Available",
        value: formatBytes(latest.disk.availableBytes),
      },
    ];
  }

  return [
    {
      label: "Interfaces",
      value: latest.network.interfaces.join(", ") || "not reported",
    },
    { label: "RX", value: sample ? formatBandwidth(sample.rxKibps) : "--" },
    { label: "TX", value: sample ? formatBandwidth(sample.txKibps) : "--" },
  ];
}

export function buildResourceMetricDetail({
  card,
  freshness,
  latest,
  samples,
  sourceLabel,
  sourceMode,
}: {
  card: ResourceMetricCard;
  freshness: ResourceTelemetryState;
  latest: WslResourceSnapshot | null;
  samples: WslResourceSample[];
  sourceLabel: string;
  sourceMode: "live" | "mock";
}): ResourceMetricDetail {
  const id = card.label as ResourceMetricId;

  if (id === "Uptime") {
    const uptimeSeconds = latest?.host.uptimeSeconds;
    const capturedAt = latest?.capturedAt ?? "not sampled";
    const bootedAt =
      latest && uptimeSeconds != null
        ? new Date(
            new Date(latest.capturedAt).getTime() - uptimeSeconds * 1000,
          ).toISOString()
        : "not available";

    return {
      average: "--",
      axisTicks: [],
      capturedAt,
      chartSeries: [],
      current:
        uptimeSeconds == null ? card.value : formatUptime(uptimeSeconds),
      detail: card.detail,
      facts: [
        { label: "Host", value: latest?.host.hostname ?? "not available" },
        { label: "Platform", value: latest?.host.platform ?? "not available" },
        { label: "Booted", value: bootedAt },
        { label: "Captured", value: capturedAt },
      ],
      freshness,
      id,
      min: "--",
      normalRange: "Uptime is an informational host fact, not a health gate.",
      operatorRead: resourceOperatorRead(id, card.tone),
      peak: "--",
      referenceBands: [],
      referenceLines: [],
      sampleCount: latest ? "1" : "0",
      sourceLabel,
      sourceMode,
      threshold: resourceMetricThreshold(id),
      tone: card.tone,
      trend: "continuous",
      value: card.value,
      visualization: "summary",
      windowLabel: capturedAt,
    };
  }

  const latestSample = samples.at(-1);
  const values = samples.map((sample) => resourceMetricValue(sample, id));
  const currentValue = values.at(-1);
  const averageValue =
    values.length > 0
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
  const peakValue = values.length > 0 ? Math.max(...values) : null;
  const minValue = values.length > 0 ? Math.min(...values) : null;
  const tone =
    currentValue == null
      ? card.tone
      : resourceMetricTone(id, currentValue, card.tone);
  const scale = resourceMetricScale(id, values);
  const firstSample = samples.at(0);

  return {
    average:
      averageValue == null
        ? "--"
        : formatResourceMetricValue(id, averageValue),
    axisTicks: scale.axisTicks,
    capturedAt: latestSample?.capturedAt ?? latest?.capturedAt ?? "not sampled",
    chartSeries: resourceMetricChartSeries(id, samples),
    current:
      currentValue == null
        ? card.value
        : formatResourceMetricValue(id, currentValue),
    detail: card.detail,
    facts: resourceMetricFacts(id, latest, latestSample),
    freshness,
    id,
    min: minValue == null ? "--" : formatResourceMetricValue(id, minValue),
    normalRange: scale.normalRange,
    operatorRead: resourceOperatorRead(id, tone),
    peak: peakValue == null ? "--" : formatResourceMetricValue(id, peakValue),
    referenceBands: scale.referenceBands,
    referenceLines: scale.referenceLines,
    sampleCount: String(samples.length),
    sourceLabel,
    sourceMode,
    threshold: resourceMetricThreshold(id),
    tone,
    trend: resourceTrend(values, id),
    value: card.value,
    visualization: "chart",
    windowLabel: `${shortSampleLabel(firstSample?.capturedAt)} -> ${shortSampleLabel(latestSample?.capturedAt)}`,
  };
}
