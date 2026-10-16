"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PrototypeWorkspaceLiveProjection } from "./prototype-workspace-live-projection.ts";

export function usePrototypeWorkspaceLiveRuntime(enabled: boolean) {
  const [projection, setProjection] = useState<PrototypeWorkspaceLiveProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(enabled), inFlight = useRef(false);
  active.current = enabled;
  const refresh = useCallback(async () => {
    if (!active.current || inFlight.current) return;
    inFlight.current = true;
    try {
      const response = await fetch("/api/prototypes/records", { cache: "no-store" });
      const value = await response.json(), next = value?.projection;
      const observed = Date.parse(next?.readModel?.source?.lastRead);
      if (!response.ok || value.mode !== "live" || !Array.isArray(next?.readModel?.records) || !next.landing || !next.maturity || !next.closure || !Number.isFinite(observed) || Date.now() - observed > 300000 || observed > Date.now() + 30000) throw new Error("Unavailable canonical Prototype records");
      if (active.current) {
        setProjection((current) => current && current.sourceRevision === next.sourceRevision ? {
          ...current, readModel: { ...current.readModel, source: next.readModel.source },
        } : next);
        setError(null);
      }
    } catch {
      if (active.current) { setProjection(null); setError("Canonical Prototype records are unavailable; fixtures are not a fallback."); }
    } finally { inFlight.current = false; }
  }, []);
  useEffect(() => {
    active.current = enabled;
    if (!enabled) { setProjection(null); setError(null); return; }
    void refresh();
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = setInterval(visible, 30000);
    document.addEventListener("visibilitychange", visible);
    return () => { active.current = false; clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [enabled, refresh]);
  return { error, projection, refresh };
}
