"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ResourcePanelTab,
  ResourceUsageScenario,
  WslCpuCounters,
  WslNetworkCounters,
  WslResourceSample,
  WslResourceSnapshot,
} from "../model/runtime-readiness-model";
import {
  calculateCpuPercent,
  calculateNetworkRates,
  resolveResourceTelemetryState,
} from "../read-model/resource-read-model";

export function useWslResourceTelemetry({
  activeResourceScenario,
  consoleDevMode,
}: {
  activeResourceScenario: ResourceUsageScenario;
  consoleDevMode: boolean;
}) {
  const previousNetworkCounters = useRef<{ capturedAtMs: number; counters: WslNetworkCounters } | null>(null);
  const previousCpuCounters = useRef<WslCpuCounters | null>(null);
  const [activeResourceTab, setActiveResourceTab] = useState<ResourcePanelTab>("resources");
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<WslResourceSnapshot | null>(null);
  const [samples, setSamples] = useState<WslResourceSample[]>([]);
  const usingMockResources = consoleDevMode && activeResourceScenario.mode === "mock";
  const sourceState = resolveResourceTelemetryState({
    error,
    hasSnapshot: latest !== null,
    usingMockResources,
  });

  useEffect(() => {
    if (usingMockResources) {
      setError(null);
      setLatest(null);
      setSamples(activeResourceScenario.samples ?? []);
      previousCpuCounters.current = null;
      previousNetworkCounters.current = null;
      return;
    }

    let cancelled = false;

    async function loadResources() {
      try {
        const response = await fetch("/api/wsl-resources", { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`metrics endpoint returned ${response.status}`);
        }

        const snapshot = (await response.json()) as WslResourceSnapshot;

        if (cancelled) {
          return;
        }

        const cpuPercent = calculateCpuPercent(
          previousCpuCounters.current,
          snapshot.cpu.counters,
          snapshot.cpu.pressurePercent,
        );
        const networkRates = calculateNetworkRates(
          previousNetworkCounters.current,
          snapshot.network,
          snapshot.capturedAt,
        );

        previousCpuCounters.current = snapshot.cpu.counters;
        previousNetworkCounters.current = {
          capturedAtMs: networkRates.capturedAtMs,
          counters: snapshot.network,
        };
        setLatest(snapshot);
        setError(null);
        setSamples((current) =>
          [
            ...current,
            {
              capturedAt: snapshot.capturedAt,
              cpuPercent,
              diskPercent: snapshot.disk.usedPercent,
              memoryPercent: snapshot.memory.usedPercent,
              networkKibps: networkRates.networkKibps,
              rxKibps: networkRates.rxKibps,
              txKibps: networkRates.txKibps,
              virtualMemoryPercent: snapshot.virtualMemory.commitPercent,
            },
          ].slice(-24),
        );
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "metrics unavailable");
        }
      }
    }

    void loadResources();
    const interval = window.setInterval(() => void loadResources(), 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeResourceScenario.samples, usingMockResources]);

  return {
    activeResourceTab,
    error,
    latest,
    samples,
    setActiveResourceTab,
    sourceState,
    usingMockResources,
  };
}
