"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { assertSourcePreview, type SourcePreviewAdapter, type SourcePreviewSnapshot } from "../source-preview-contract.ts";

export function useSourcePreview(adapter: SourcePreviewAdapter | undefined, active: boolean) {
  const [snapshot, setSnapshot] = useState<SourcePreviewSnapshot | null>(null), [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null);
  const reader = useRef(adapter), request = useRef<AbortController | null>(null), generation = useRef(0);
  reader.current = adapter;
  const refresh = useCallback(async (background = false) => {
    const selected = reader.current; if (!selected) return;
    request.current?.abort(); const controller = new AbortController(), version = ++generation.current;
    request.current = controller; if (!background) setPending(true); setError(null);
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const value = assertSourcePreview(await selected.read(controller.signal), selected.id, window.location.origin);
      if (!controller.signal.aborted && version === generation.current) setSnapshot(value);
    } catch (caught) {
      if (version === generation.current) { setSnapshot(null); setError(controller.signal.aborted ? "The preview status check timed out. Retry when the runtime is available." : caught instanceof Error ? caught.message : "The preview runtime could not be checked."); }
    } finally {
      clearTimeout(timeout); if (version === generation.current) { request.current = null; setPending(false); }
    }
  }, []);
  useEffect(() => {
    ++generation.current; request.current?.abort(); setSnapshot(null); setError(null); setPending(false);
    return () => { ++generation.current; request.current?.abort(); };
  }, [adapter?.id]);
  useEffect(() => {
    if (!active || !adapter) return;
    void refresh();
    // Only visible previews poll; source editing never launches an owner read.
    const timer = setInterval(() => { if (document.visibilityState === "visible" && !request.current) void refresh(true); }, 30000);
    return () => { clearInterval(timer); ++generation.current; request.current?.abort(); setPending(false); };
  }, [active, adapter?.id, refresh]);
  return { snapshot: snapshot?.subjectId === adapter?.id ? snapshot : null, pending, error, refresh };
}
