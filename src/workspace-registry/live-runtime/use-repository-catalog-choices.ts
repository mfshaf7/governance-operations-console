"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { readRepositoryCatalogChoices } from "../repository-catalog-choices.ts";

export function useRepositoryCatalogChoices(enabled: boolean, focus = "") {
  const [query, setQuery] = useState(focus);
  const [revision, setRevision] = useState(0);
  const key = query;
  const busy = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [state, setState] = useState<{ key: string; result: Awaited<ReturnType<typeof readRepositoryCatalogChoices>> | null; error: string | null }>({ key: "", result: null, error: null });
  useEffect(() => { setQuery(focus); }, [focus]);
  useEffect(() => {
    if (!enabled) { setState({ key: "", result: null, error: null }); return; }
    const lifetime = new AbortController();
    let active = true;
    busy.current = true;
    const timer = window.setTimeout(() => {
      void readRepositoryCatalogChoices(query, { signal: lifetime.signal }).then(result => {
        if (active) setState({ key, result, error: null });
      }).catch(() => {
        if (active) setState({ key, result: null, error: "Registered repositories could not be loaded. Retry before selecting one." });
      }).finally(() => {
        if (active) { busy.current = false; setRefreshing(false); }
      });
    }, query ? 300 : 0);
    return () => { active = false; busy.current = false; lifetime.abort(); window.clearTimeout(timer); };
  }, [enabled, key, query, revision]);
  const current = enabled && state.key === key ? state : null;
  const refresh = useCallback((background = false) => {
    if (busy.current) return;
    if (!background) setRefreshing(true);
    setRevision(value => value + 1);
  }, []);
  return { result: current?.result ?? null, query,
    loading: enabled && (current === null || refreshing), error: current?.error ?? null,
    onQueryChange: (value: string) => setQuery(value.trim().toLowerCase().slice(0, 128)),
    refresh };
}
