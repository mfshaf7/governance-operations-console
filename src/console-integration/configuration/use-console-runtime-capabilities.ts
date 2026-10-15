"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  ConsoleRuntimeCapabilityId,
  ConsoleRuntimeCapabilityProjection,
} from "./console-runtime-configuration.ts";

export type ConsoleRuntimeCapabilitySnapshot = Readonly<{
  error: string | null;
  projection: ConsoleRuntimeCapabilityProjection | null;
  status: "current" | "loading" | "unavailable";
}>;

const initialSnapshot: ConsoleRuntimeCapabilitySnapshot = {
  error: null,
  projection: null,
  status: "loading",
};

export function useConsoleRuntimeCapabilities() {
  const [snapshot, setSnapshot] =
    useState<ConsoleRuntimeCapabilitySnapshot>(initialSnapshot);

  const load = useCallback(async () => {
    setSnapshot((current) => ({ ...current, error: null, status: "loading" }));
    try {
      const response = await fetch("/api/console/capabilities", {
        cache: "no-store",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok || !isConsoleRuntimeCapabilityProjection(body)) {
        throw new Error("Console runtime capability projection is unavailable.");
      }
      setSnapshot({ error: null, projection: body, status: "current" });
      return body;
    } catch (error) {
      setSnapshot({
        error:
          error instanceof Error
            ? error.message
            : "Console runtime capability projection is unavailable.",
        projection: null,
        status: "unavailable",
      });
      return null;
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...snapshot, load };
}

export function consoleRuntimeCapabilityExecutable(
  snapshot: ConsoleRuntimeCapabilitySnapshot,
  capabilityId: ConsoleRuntimeCapabilityId,
  boundary: "mutation" | "source",
) {
  if (snapshot.status !== "current") return false;
  const capability = snapshot.projection?.capabilities.find(
    ({ id }) => id === capabilityId,
  );
  return capability?.[boundary].state === "available";
}

function isConsoleRuntimeCapabilityProjection(
  value: unknown,
): value is ConsoleRuntimeCapabilityProjection {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ConsoleRuntimeCapabilityProjection>;
  return (
    candidate.artifactType === "console-runtime-capability-projection" &&
    candidate.schemaVersion === 1 &&
    ["disconnected-preview", "invalid", "live"].includes(
      candidate.mode ?? "",
    ) &&
    Array.isArray(candidate.capabilities)
  );
}
