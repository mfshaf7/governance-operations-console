"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DeliveryReadModel } from "../read-model/delivery-read-model.ts";

export function useDeliveryWorkspaceLiveRuntime(enabled: boolean) {
  const [model, setModel] = useState<DeliveryReadModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(false);
  const active = useRef(enabled);
  active.current = enabled;

  const refresh = useCallback(async () => {
    if (!active.current || request.current) return;
    request.current = true;
    try {
      const response = await fetch("/api/delivery/workspace", { cache: "no-store" });
      const value = await response.json();
      const next = value?.projection;
      if (!response.ok || value.mode !== "live" || next?.schema_version !== 1 || next.source_truth !== "OpenProject-backed OOS" || !Array.isArray(next.packages) || !Array.isArray(next.art_tree?.roots) ||
          !Number.isFinite(Date.parse(next.generated_at)) || Date.now() - Date.parse(next.generated_at) > 300000 || Date.parse(next.generated_at) > Date.now() + 30000) throw new Error("Canonical Delivery records are unavailable.");
      if (active.current) {
        setModel((current) => current?.projection_state.source_revision === next.projection_state.source_revision ? {
          ...current, generated_at: next.generated_at, projection_state: next.projection_state,
        } : next);
        setError(null);
      }
    } catch {
      if (active.current) { setModel(null); setError("Canonical Delivery records are unavailable. Restore the OOS owner projection; fixtures are not a fallback."); }
    } finally { request.current = false; }
  }, []);

  useEffect(() => {
    active.current = enabled;
    if (!enabled) { setModel(null); setError(null); return; }
    void refresh();
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = setInterval(visible, 30000);
    document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visible); active.current = false; };
  }, [enabled, refresh]);

  return { error, model, refresh };
}
