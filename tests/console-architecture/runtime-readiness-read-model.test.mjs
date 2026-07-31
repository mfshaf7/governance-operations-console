import assert from "node:assert/strict";
import test from "node:test";

import { buildComponentObservationDetail } from "../../src/runtime-readiness/read-model/component-read-model.ts";
import {
  buildChartPath,
  buildResourceMetricDetail,
  calculateCpuPercent,
  calculateNetworkRates,
  formatUptime,
  resolveResourceTelemetryState,
  usageTone,
} from "../../src/runtime-readiness/read-model/resource-read-model.ts";
import { buildRuntimeAlerts } from "../../src/runtime-readiness/read-model/runtime-alert-read-model.ts";

test("Runtime Readiness calculates telemetry deltas without browser state", () => {
  assert.equal(calculateCpuPercent(null, { idle: 20, total: 100 }, 32), 32);
  assert.equal(
    calculateCpuPercent(
      { idle: 20, total: 100 },
      { idle: 40, total: 200 },
      0,
    ),
    80,
  );

  const rates = calculateNetworkRates(
    {
      capturedAtMs: Date.parse("2026-07-17T00:00:00.000Z"),
      counters: {
        interfaces: ["eth0"],
        rxBytes: 1_024,
        totalBytes: 3_072,
        txBytes: 2_048,
      },
    },
    {
      interfaces: ["eth0"],
      rxBytes: 5_120,
      totalBytes: 11_264,
      txBytes: 6_144,
    },
    "2026-07-17T00:00:02.000Z",
  );

  assert.equal(rates.rxKibps, 2);
  assert.equal(rates.txKibps, 2);
  assert.equal(rates.networkKibps, 4);
  assert.equal(usageTone(67.9), "ok");
  assert.equal(usageTone(68), "warn");
  assert.equal(usageTone(88), "danger");
});

test("Runtime Readiness chart projection remains deterministic", () => {
  const sample = (cpuPercent) => ({
    capturedAt: "2026-07-17T00:00:00.000Z",
    cpuPercent,
    diskPercent: 20,
    memoryPercent: 30,
    networkKibps: 4,
    rxKibps: 2,
    txKibps: 2,
    virtualMemoryPercent: 40,
  });

  assert.equal(buildChartPath([], ({ cpuPercent }) => cpuPercent), "");
  assert.equal(
    buildChartPath(
      [sample(0), sample(50), sample(100)],
      ({ cpuPercent }) => cpuPercent,
      100,
      200,
    ),
    "M 0.0 100.0 L 100.0 50.0 L 200.0 0.0",
  );
});

test("Runtime alerts exclude unavailable and synthetic component observations", () => {
  const component = {
    alertEligible: true,
    environment: "dev-integration",
    freshness: "current",
    href: "http://one.local",
    id: "one",
    label: "One",
    observedAt: "2026-07-17T00:00:00.000Z",
    sourceAuthority: "Runtime probe",
    sourceMode: "live",
    sourceRef: "probe:one",
    status: "offline",
    surface: "one.local",
    tone: "danger",
  };
  const components = [
    component,
    {
      ...component,
      id: "two",
      label: "Two",
      sourceMode: "source-projected",
      status: "degraded",
      tone: "warn",
    },
    {
      ...component,
      alertEligible: false,
      freshness: "scenario",
      id: "synthetic",
      label: "Synthetic",
      sourceMode: "synthetic-scenario",
    },
    {
      ...component,
      alertEligible: false,
      freshness: "unavailable",
      id: "catalog-only",
      label: "Catalog only",
      observedAt: null,
      sourceMode: "unavailable",
    },
  ];
  const latestSample = {
    capturedAt: "2026-07-17T00:00:00.000Z",
    cpuPercent: 90,
    diskPercent: 20,
    memoryPercent: 70,
    networkKibps: 0,
    rxKibps: 0,
    txKibps: 0,
    virtualMemoryPercent: 30,
  };
  const alerts = buildRuntimeAlerts({
    components,
    error: null,
    latestSample,
    resourceSourceLabel: "local /proc",
    resourceSourceState: "live",
  });

  assert.deepEqual(
    alerts.map(({ id }) => id),
    [
      "component-offline-one",
      "component-warning-two",
      "resource-cpu-pressure",
      "resource-ram-pressure",
    ],
  );
});

test("Component detail exposes observation coverage without inventing environments", () => {
  const detail = buildComponentObservationDetail({
    alertEligible: false,
    environment: "dev-integration",
    freshness: "unavailable",
    href: "http://surface.local",
    id: "surface",
    label: "Surface",
    observedAt: null,
    sourceAuthority: "Prototype component catalog",
    sourceMode: "unavailable",
    sourceRef: "runtime-readiness.fixture",
    status: "unobserved",
    surface: "surface.local",
    tone: "muted",
  });

  assert.equal(detail.accessHref, "http://surface.local");
  assert.equal(detail.status, "unobserved");
  assert.equal(
    detail.coverageRows.find(({ label }) => label === "Boundary")?.value,
    "No runtime health adapter connected",
  );
  assert.equal(JSON.stringify(detail).includes("ready to promote"), false);
  assert.equal(JSON.stringify(detail).includes('"stage"'), false);
  assert.equal(JSON.stringify(detail).includes('"prod"'), false);
});

test("Retained telemetry becomes stale after a failed probe", () => {
  assert.equal(
    resolveResourceTelemetryState({
      error: "probe failed",
      hasSnapshot: true,
      usingMockResources: false,
    }),
    "stale",
  );
  assert.equal(
    resolveResourceTelemetryState({
      error: "probe failed",
      hasSnapshot: false,
      usingMockResources: false,
    }),
    "unavailable",
  );

  const alerts = buildRuntimeAlerts({
    components: [],
    error: "probe failed",
    latestSample: {
      capturedAt: "2026-07-17T00:00:00.000Z",
      cpuPercent: 90,
      diskPercent: 90,
      memoryPercent: 90,
      networkKibps: 0,
      rxKibps: 0,
      txKibps: 0,
      virtualMemoryPercent: 90,
    },
    resourceSourceLabel: "local /proc",
    resourceSourceState: "stale",
  });

  assert.deepEqual(alerts.map(({ id }) => id), [
    "resource-telemetry-stale",
  ]);
  assert.equal(alerts[0].freshness, "stale");
});

test("System uptime is projected from the host snapshot", () => {
  assert.equal(formatUptime(171_935), "1d 23h 45m");

  const detail = buildResourceMetricDetail({
    card: {
      detail: "Platform-Core / host",
      label: "Uptime",
      tone: "info",
      value: "1d 23h 45m",
    },
    freshness: "live",
    latest: {
      capturedAt: "2026-07-17T00:00:00.000Z",
      host: {
        hostname: "host",
        platform: "Platform-Core",
        uptimeSeconds: 171_935,
      },
    },
    samples: [],
    sourceLabel: "Platform-Core / local /proc",
    sourceMode: "live",
  });

  assert.equal(detail.id, "Uptime");
  assert.equal(detail.current, "1d 23h 45m");
  assert.equal(detail.visualization, "summary");
  assert.equal(
    detail.facts.find(({ label }) => label === "Host")?.value,
    "host",
  );
});
