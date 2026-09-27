"use client";

import { useEffect, useState } from "react";

import type { GovernanceActivitySnapshot } from "./governance-activity-types.ts";

const refreshIntervalMs = 20_000;

const loadingSnapshot: GovernanceActivitySnapshot = {
  error: null,
  events: [],
  mode: "live",
  observedAt: new Date(0).toISOString(),
  sources: [],
  status: "partial",
  truncated: false,
};

export function useGovernanceActivityRuntime() {
  const [snapshot, setSnapshot] = useState<GovernanceActivitySnapshot>(loadingSnapshot);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function refresh() {
      try {
        const response = await fetch("/api/governance-activity", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const body = await response.json().catch(() => null);
        if (!active) return;
        setSnapshot(parseRuntimeSnapshot(body, response.ok));
      } catch {
        if (!active) return;
        setSnapshot({
          ...loadingSnapshot,
          error: "Governance Activity is unavailable.",
          observedAt: new Date().toISOString(),
          status: "offline",
        });
      } finally {
        if (active) timer = setTimeout(refresh, refreshIntervalMs);
      }
    }

    void refresh();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return snapshot;
}

function parseRuntimeSnapshot(value: unknown, responseOk: boolean): GovernanceActivitySnapshot {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalidSnapshot("Governance Activity returned an invalid response.");
  }
  const result = value as Partial<GovernanceActivitySnapshot>;
  if (
    !["disconnected-preview", "live"].includes(String(result.mode)) ||
    !["current", "partial", "offline"].includes(String(result.status)) ||
    !Array.isArray(result.events) ||
    !Array.isArray(result.sources) ||
    typeof result.observedAt !== "string" ||
    Number.isNaN(Date.parse(result.observedAt)) ||
    typeof result.truncated !== "boolean"
  ) {
    return invalidSnapshot("Governance Activity returned an invalid response.");
  }
  if (!responseOk || result.status === "offline") {
    return {
      error: typeof result.error === "string" ? result.error : "Governance Activity is unavailable.",
      events: [],
      mode: "live",
      observedAt: result.observedAt,
      sources: result.sources,
      status: "offline",
      truncated: result.truncated,
    } as GovernanceActivitySnapshot;
  }
  return result as GovernanceActivitySnapshot;
}

function invalidSnapshot(error: string): GovernanceActivitySnapshot {
  return {
    ...loadingSnapshot,
    error,
    observedAt: new Date().toISOString(),
    status: "offline",
  };
}
