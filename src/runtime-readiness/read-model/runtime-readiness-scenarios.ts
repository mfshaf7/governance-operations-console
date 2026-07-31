import { runtimeReadinessFixture } from "../fixtures/runtime-readiness.fixture";
import type {
  ComponentStatusScenario,
  ResourceMetricCard,
  ResourceUsageScenario,
  RuntimeComponentObservation,
  Tone,
  WslResourceSample,
} from "../model/runtime-readiness-model";
import {
  formatBandwidth,
  formatPercent,
  usageTone,
} from "./resource-read-model";

function asComponents(
  status: string,
  tone: Tone,
  labels?: string[],
): RuntimeComponentObservation[] {
  return runtimeReadinessFixture.componentObservations.map((component) => {
    if (labels && !labels.includes(component.label)) {
      return {
        ...component,
        freshness: "scenario",
        sourceAuthority: "Runtime Readiness dev scenario",
        sourceMode: "synthetic-scenario",
        sourceRef: `scenario:${status}`,
      };
    }

    return {
      ...component,
      alertEligible: false,
      freshness: "scenario",
      sourceAuthority: "Runtime Readiness dev scenario",
      sourceMode: "synthetic-scenario",
      sourceRef: `scenario:${status}`,
      status,
      tone,
    };
  });
}

export const componentStatusScenarios: ComponentStatusScenario[] = [
  {
    components: runtimeReadinessFixture.componentObservations,
    description:
      "Declared component routes without a connected observation adapter.",
    id: "current",
    label: "Current",
    mode: "catalog",
    tone: "muted",
  },
  {
    components: asComponents("online", "ok"),
    description: "Synthetic reachable-state presentation check.",
    id: "healthy",
    label: "Healthy",
    mode: "synthetic",
    tone: "ok",
  },
  {
    components: asComponents("offline", "danger", [
      "OpenProject",
      "WGCF API",
      "CGG API",
      "Vault",
      "Argo CD",
    ]),
    description: "Synthetic outage presentation check.",
    id: "outage",
    label: "Outage",
    mode: "synthetic",
    tone: "danger",
  },
  {
    components: asComponents("not wired", "info"),
    description: "Synthetic missing-adapter presentation check.",
    id: "not-wired",
    label: "Not wired",
    mode: "synthetic",
    tone: "info",
  },
  {
    components: asComponents("stale", "stale"),
    description: "Synthetic stale-observation presentation check.",
    id: "stale",
    label: "Stale",
    mode: "synthetic",
    tone: "stale",
  },
];

function mockResourceSamples(
  cpu: number[],
  memory: number[],
  virtualMemory: number[],
  disk: number[],
  network: number[],
): WslResourceSample[] {
  return cpu.map((cpuPercent, index) => ({
    capturedAt: `mock-${String(index + 1).padStart(2, "0")}`,
    cpuPercent,
    diskPercent: disk[index] ?? disk.at(-1) ?? 0,
    memoryPercent: memory[index] ?? memory.at(-1) ?? 0,
    networkKibps: network[index] ?? network.at(-1) ?? 0,
    rxKibps: (network[index] ?? network.at(-1) ?? 0) * 0.62,
    txKibps: (network[index] ?? network.at(-1) ?? 0) * 0.38,
    virtualMemoryPercent:
      virtualMemory[index] ?? virtualMemory.at(-1) ?? 0,
  }));
}

function resourceCardsFromSample(
  sample: WslResourceSample,
  label: string,
): ResourceMetricCard[] {
  return [
    {
      detail: `${label} CPU pressure fixture`,
      label: "CPU",
      tone: usageTone(sample.cpuPercent),
      value: formatPercent(sample.cpuPercent),
    },
    {
      detail: `${label} RAM pressure fixture`,
      label: "RAM",
      tone: usageTone(sample.memoryPercent),
      value: formatPercent(sample.memoryPercent),
    },
    {
      detail: `${label} virtual memory fixture`,
      label: "VMEM",
      tone: usageTone(sample.virtualMemoryPercent),
      value: formatPercent(sample.virtualMemoryPercent),
    },
    {
      detail: `${label} disk pressure fixture`,
      label: "Disk",
      tone: usageTone(sample.diskPercent),
      value: formatPercent(sample.diskPercent),
    },
    {
      detail: `${label} network throughput fixture`,
      label: "Bandwidth",
      tone: sample.networkKibps > 4096 ? "warn" : "info",
      value: formatBandwidth(sample.networkKibps),
    },
  ];
}

const calmResourceSamples = mockResourceSamples(
  [11, 13, 9, 16, 12, 15, 10, 14],
  [28, 30, 29, 31, 30, 32, 31, 29],
  [24, 25, 25, 26, 26, 27, 26, 25],
  [34, 34, 35, 35, 35, 36, 36, 36],
  [90, 110, 85, 140, 120, 160, 125, 100],
);
const pressureResourceSamples = mockResourceSamples(
  [42, 48, 57, 63, 70, 66, 74, 69],
  [56, 59, 64, 67, 71, 69, 73, 68],
  [48, 51, 56, 62, 65, 63, 66, 64],
  [61, 62, 64, 65, 67, 68, 68, 69],
  [820, 940, 1250, 1520, 1880, 1640, 2100, 1760],
);
const criticalResourceSamples = mockResourceSamples(
  [74, 82, 91, 93, 88, 95, 92, 89],
  [76, 84, 89, 92, 94, 91, 95, 93],
  [70, 79, 85, 91, 93, 96, 94, 92],
  [80, 83, 87, 90, 91, 93, 94, 95],
  [3100, 4200, 5200, 6200, 5800, 7100, 6400, 5600],
);

export const resourceUsageScenarios: ResourceUsageScenario[] = [
  {
    description: "Use the live local telemetry endpoint.",
    id: "live",
    label: "Live",
    mode: "live",
    sourceLabel: "local /proc",
    statusLabel: "live",
    statusTone: "ok",
    tone: "ok",
  },
  {
    description: "Low-pressure synthetic host state.",
    id: "calm",
    label: "Calm",
    metricCards: resourceCardsFromSample(calmResourceSamples.at(-1)!, "calm"),
    mode: "mock",
    samples: calmResourceSamples,
    sourceLabel: "mock calm fixture",
    statusLabel: "mock calm",
    statusTone: "ok",
    tone: "ok",
  },
  {
    description: "Resource pressure is visible but not critical.",
    id: "pressure",
    label: "Pressure",
    metricCards: resourceCardsFromSample(
      pressureResourceSamples.at(-1)!,
      "pressure",
    ),
    mode: "mock",
    samples: pressureResourceSamples,
    sourceLabel: "mock pressure fixture",
    statusLabel: "mock warn",
    statusTone: "warn",
    tone: "warn",
  },
  {
    description: "Host capacity is unsafe for more workload.",
    id: "critical",
    label: "Critical",
    metricCards: resourceCardsFromSample(
      criticalResourceSamples.at(-1)!,
      "critical",
    ),
    mode: "mock",
    samples: criticalResourceSamples,
    sourceLabel: "mock critical fixture",
    statusLabel: "mock danger",
    statusTone: "danger",
    tone: "danger",
  },
  {
    description: "Telemetry source is stale or not admitted.",
    id: "stale",
    label: "Stale",
    metricCards: resourceCardsFromSample(
      pressureResourceSamples.at(-1)!,
      "stale",
    ),
    mode: "mock",
    samples: pressureResourceSamples,
    sourceLabel: "mock stale fixture",
    statusLabel: "mock stale",
    statusTone: "stale",
    tone: "stale",
  },
];
