"use client";
import {useCallback, useEffect, useRef, useState} from "react";
import {readRepositoryCustodyRegister, RepositoryCustodyReadError, type RepositoryCustodySelection} from "./repository-custody-live-readback.ts";
import type {RepositoryCustodyWorkflowResult} from "./repository-custody-live-types.ts";

export function mergeRepositoryRequests(previous: readonly RepositoryCustodyWorkflowResult[], next: readonly RepositoryCustodyWorkflowResult[]) {
  return [...new Map([...previous, ...next].map(record => [record.request.request_id, record])).values()];
}

export function useRepositoryCustodyPages(initial: RepositoryCustodySelection, automatic = false) {
  const [records, setRecords] = useState<RepositoryCustodyWorkflowResult[]>([]);
  const [status, setStatus] = useState<"loading" | "current" | "offline">(automatic ? "loading" : "current");
  const [error, setError] = useState<string | null>(null), [retryable, setRetryable] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null), [loadingMore, setLoadingMore] = useState(false);
  const [continuationError, setContinuationError] = useState<string | null>(null);
  const scope = useRef(initial), active = useRef<AbortController | null>(null), mounted = useRef(true);
  const nextCursor = useRef<string | null>(null), firstSignature = useRef<string | null>(null);
  const cursors = useRef(new Set<string>());
  const read = useCallback(async (more = false, selection?: RepositoryCustodySelection) => {
    const changed = selection && JSON.stringify(selection) !== JSON.stringify(scope.current);
    if (active.current && !changed) return;
    if (changed) {
      active.current?.abort(); scope.current = selection!;
      setLoadingMore(false);
      setRecords([]); setStatus("loading"); nextCursor.current = null; setCursor(null);
      firstSignature.current = null; cursors.current.clear();
    }
    const continuation = more ? nextCursor.current : null;
    if (more && !continuation) return;
    const controller = new AbortController(); active.current = controller;
    if (more) setLoadingMore(true);
    else if (firstSignature.current === null) setStatus("loading");
    setContinuationError(null);
    try {
      const page = await readRepositoryCustodyRegister(fetch, {...scope.current, cursor: continuation, signal: controller.signal});
      if (!mounted.current || controller.signal.aborted) return;
      if (more && page.next_cursor && cursors.current.has(page.next_cursor)) throw new RepositoryCustodyReadError("Repository pagination did not advance.", false);
      const signature = page.records.map(record => `${record.request.request_id}:${record.status}:${record.receipt_ref?.digest}`).join("|");
      if (more || firstSignature.current === null || signature !== firstSignature.current) {
        nextCursor.current = page.next_cursor; setCursor(page.next_cursor);
        if (!more) cursors.current.clear();
        if (page.next_cursor) cursors.current.add(page.next_cursor);
      }
      if (!more) firstSignature.current = signature;
      setRecords(previous => mergeRepositoryRequests(previous, page.records));
      setStatus("current"); setError(null); setRetryable(false);
      return page.records;
    } catch (failure) {
      if (controller.signal.aborted || !mounted.current) return;
      const message = failure instanceof Error ? failure.message : "Repository records could not be loaded.";
      if (more) setContinuationError(message);
      else { setStatus("offline"); setError(message); setRetryable(failure instanceof RepositoryCustodyReadError && failure.retryable); }
    } finally {
      if (active.current === controller) active.current = null;
      if (mounted.current && !controller.signal.aborted) setLoadingMore(false);
    }
  }, []);
  const refresh = useCallback(() => read(), [read]);
  const loadMore = useCallback(() => read(true), [read]);
  const load = useCallback((selection: RepositoryCustodySelection) => read(false, selection), [read]);
  useEffect(() => {
    mounted.current = true;
    if (automatic) void refresh();
    const timer = automatic ? window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 15_000) : null;
    return () => { mounted.current = false; active.current?.abort(); active.current = null; if (timer) window.clearInterval(timer); };
  }, [automatic, refresh]);
  return {records, status, error, retryable, cursor, loadingMore, continuationError, loadMore, refresh, load, selection: scope.current};
}
