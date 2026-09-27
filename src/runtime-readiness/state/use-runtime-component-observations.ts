"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  ComponentStatusScenario,
  RuntimeComponentProjection,
} from "../model/runtime-readiness-model";
import { componentStatusScenarios } from "../read-model/runtime-readiness-scenarios";

const currentScenario = componentStatusScenarios[0];

export function useRuntimeComponentObservations({
  consoleDevMode,
  scenarioId,
}: {
  consoleDevMode: boolean;
  scenarioId: string;
}) {
  const [projection, setProjection] =
    useState<RuntimeComponentProjection | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/runtime-observations", {
          cache: "no-store",
        });
        const value = await response.json();
        if (!cancelled) setProjection(assertProjection(value));
      } catch {
        if (!cancelled) {
          setProjection({
            artifactType: "console-runtime-component-projection",
            components: [],
            mode: "unavailable",
            reasonCode: "console_runtime_observation_endpoint_unavailable",
            schemaVersion: 1,
            source: {
              authority: "platform-engineering",
              freshness: "unavailable",
              observedAt: null,
              reference: null,
            },
          });
        }
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const activeScenario = useMemo<ComponentStatusScenario>(() => {
    const selected = componentStatusScenarios.find(
      (scenario) => scenario.id === scenarioId,
    );
    if (consoleDevMode && selected?.mode === "synthetic") return selected;
    if (!projection || projection.mode === "disconnected-preview") {
      return currentScenario;
    }
    if (projection.mode === "live") {
      return {
        components: [...projection.components],
        description: "Current Platform-owned runtime observations.",
        id: "current",
        label: "Current",
        mode: "source-projected",
        tone: "ok",
      };
    }
    return {
      components: [],
      description: "The configured Platform observation source is unavailable.",
      id: "current",
      label: "Current",
      mode: "unavailable",
      tone: projection.source.freshness === "stale" ? "stale" : "warn",
    };
  }, [consoleDevMode, projection, scenarioId]);

  return {
    activeScenario,
    error:
      activeScenario.mode === "unavailable"
        ? observationFailureMessage(projection?.reasonCode)
        : null,
    projectionMode: projection?.mode ?? "unavailable",
  };
}

function observationFailureMessage(reasonCode: string | null | undefined) {
  switch (reasonCode) {
    case "console_runtime_observation_stale":
      return "The Platform runtime observation expired before the latest poll.";
    case "console_runtime_observation_projection_invalid":
      return "The Platform runtime observation could not be verified.";
    case "console_runtime_observation_projection_unavailable":
      return "The configured Platform runtime observation could not be read.";
    default:
      return "The Platform runtime observation endpoint is unavailable.";
  }
}

function assertProjection(value: unknown): RuntimeComponentProjection {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid runtime component projection");
  }
  const projection = value as Partial<RuntimeComponentProjection>;
  if (
    projection.artifactType !== "console-runtime-component-projection" ||
    projection.schemaVersion !== 1 ||
    !new Set(["disconnected-preview", "live", "unavailable"]).has(
      projection.mode ?? "",
    ) ||
    !Array.isArray(projection.components) ||
    !projection.source
  ) {
    throw new Error("invalid runtime component projection");
  }
  return projection as RuntimeComponentProjection;
}
