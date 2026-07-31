export type Tone =
  | "danger"
  | "info"
  | "muted"
  | "ok"
  | "stale"
  | "warn";

export type ResourcePanelTab = "alerts" | "components" | "resources";
export type ObservationFreshness =
  | "current"
  | "scenario"
  | "stale"
  | "unavailable";
export type ObservationSourceMode =
  | "live"
  | "source-projected"
  | "synthetic-scenario"
  | "unavailable";
export type ResourceTelemetryState =
  | "live"
  | "mock"
  | "stale"
  | "unavailable"
  | "warming";

export type WslCpuCounters = {
  idle: number;
  total: number;
};

export type WslNetworkCounters = {
  interfaces: string[];
  rxBytes: number;
  totalBytes: number;
  txBytes: number;
};

export type WslResourceSnapshot = {
  capturedAt: string;
  cpu: {
    cores: number;
    counters: WslCpuCounters;
    load1: number;
    load5: number;
    load15: number;
    pressurePercent: number;
  };
  disk: {
    availableBytes: number;
    mount: string;
    totalBytes: number;
    usedBytes: number;
    usedPercent: number;
  };
  host: {
    hostname: string;
    platform: string;
    uptimeSeconds: number;
  };
  memory: {
    availableBytes: number;
    totalBytes: number;
    usedBytes: number;
    usedPercent: number;
  };
  network: WslNetworkCounters;
  source: string;
  virtualMemory: {
    commitLimitBytes: number;
    commitPercent: number;
    committedBytes: number;
    swapTotalBytes: number;
    swapUsedBytes: number;
    swapUsedPercent: number;
  };
};

export type WslResourceSample = {
  capturedAt: string;
  cpuPercent: number;
  diskPercent: number;
  memoryPercent: number;
  networkKibps: number;
  rxKibps: number;
  txKibps: number;
  virtualMemoryPercent: number;
};

export type RuntimeComponentObservation = {
  alertEligible: boolean;
  environment: "dev-integration";
  freshness: ObservationFreshness;
  href: string | null;
  id: string;
  label: string;
  observedAt: string | null;
  sourceAuthority: string;
  sourceMode: ObservationSourceMode;
  sourceRef: string;
  status: string;
  surface: string;
  tone: Tone;
};

export type DevScenarioOption = {
  description: string;
  id: string;
  label: string;
  tone: Tone;
};

export type ComponentStatusScenario = DevScenarioOption & {
  components: RuntimeComponentObservation[];
  mode: "catalog" | "synthetic";
};

export type ResourceMetricCard = {
  detail: string;
  label: string;
  tone: Tone;
  value: string;
};

export type ResourceMetricId =
  | "Bandwidth"
  | "CPU"
  | "Disk"
  | "RAM"
  | "Uptime"
  | "VMEM";

export type ResourceMetricDetail = {
  average: string;
  axisTicks: Array<{ label: string; y: number }>;
  capturedAt: string;
  chartSeries: Array<{
    areaPath?: string;
    className: string;
    label: string;
    path: string;
    value: string;
  }>;
  current: string;
  detail: string;
  facts: Array<{ label: string; value: string }>;
  id: ResourceMetricId;
  min: string;
  normalRange: string;
  operatorRead: string;
  peak: string;
  referenceBands: Array<{
    className: string;
    height: number;
    label: string;
    y: number;
  }>;
  referenceLines: Array<{
    className: string;
    label: string;
    y: number;
  }>;
  sampleCount: string;
  sourceLabel: string;
  sourceMode: "live" | "mock";
  threshold: string;
  tone: Tone;
  trend: string;
  value: string;
  visualization: "chart" | "summary";
  windowLabel: string;
  freshness: ResourceTelemetryState;
};

export type RuntimeAlertItem = {
  detail: string;
  evidence: string;
  freshness: ObservationFreshness;
  id: string;
  label: string;
  nextMove: string;
  observedAt: string | null;
  scope: string;
  source: string;
  sourceMode: ObservationSourceMode;
  status: string;
  tone: Tone;
};

export type ResourceUsageScenario = DevScenarioOption & {
  metricCards?: ResourceMetricCard[];
  mode: "live" | "mock";
  samples?: WslResourceSample[];
  sourceLabel: string;
  statusLabel: string;
  statusTone: Tone;
};
