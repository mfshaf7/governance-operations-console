"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AiActivitySnapshot } from "../model/recent-ai-activity";

const initial: AiActivitySnapshot = { mode: null, status: "loading", observedAt: null, items: [], nextCursor: null, coverage: "Checking AI activity…", error: null };
export async function fetchAiActivityPage(cursor: string | null, signal: AbortSignal): Promise<AiActivitySnapshot> {
  const query = cursor ? `?${new URLSearchParams({ cursor })}` : "";
  const response = await fetch(`/api/ai-activity${query}`, { cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
  const page = await response.json();
  if (!response.ok || !["live", "disconnected-preview"].includes(page.mode) || page.status !== "current" || !Array.isArray(page.items) || page.items.length > 50 || !Number.isFinite(Date.parse(page.observedAt)) ||
      (page.nextCursor !== null && (typeof page.nextCursor !== "string" || !/^[A-Za-z0-9_-]{1,2048}$/.test(page.nextCursor)))) throw Error("AI activity is unavailable; the current page is retained.");
  return page;
}

export function useRecentAiActivity() {
  const [snapshot, setSnapshot] = useState<AiActivitySnapshot>(initial);
  const active = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (active.current || document.visibilityState === "hidden") return;
    const controller = new AbortController(); active.current = controller;
    try { const next = await fetchAiActivityPage(null, controller.signal); if (!controller.signal.aborted) setSnapshot(next); }
    catch { if (!controller.signal.aborted) setSnapshot(previous => ({ ...previous, mode: "live", status: previous.items.length ? "stale" : "offline", error: "AI activity refresh is unavailable. Retained entries show the last recorded observation." })); }
    finally { if (active.current === controller) active.current = null; }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 20000);
    const visible = () => void refresh(); document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visible); active.current?.abort(); active.current = null; };
  }, [refresh]);
  return { snapshot, refresh };
}
