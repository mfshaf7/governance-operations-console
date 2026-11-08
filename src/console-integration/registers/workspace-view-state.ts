"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode, type SetStateAction } from "react";

// Shell-lifetime presentation preferences only. No records, source freshness,
// authority, form drafts or open dialogs belong here. Nothing is written to disk.
const ViewStateContext = createContext<Map<string, unknown> | null>(null);

export function WorkspaceViewStateProvider({ children }: { children: ReactNode }) {
  const [values] = useState(() => new Map<string, unknown>());
  return createElement(ViewStateContext.Provider, {value: values}, children);
}

export function useWorkspaceViewState<Value>(key: string, initial: Value | (() => Value)) {
  const values = useContext(ViewStateContext);
  const read = () => values?.has(key)
    ? values.get(key) as Value
    : typeof initial === "function" ? (initial as () => Value)() : initial;
  const [state, setState] = useState(() => ({key, value: read()}));
  if (state.key !== key) setState({key, value: read()});
  const value = state.key === key ? state.value : read();
  const setValue = useCallback((next: SetStateAction<Value>) => {
    setState(previous => {
      const current = previous.key === key ? previous.value : read();
      return {key, value: typeof next === "function" ? (next as (value: Value) => Value)(current) : next};
    });
  }, [key, values]);
  useEffect(() => {
    // Call sites use fixed register/field keys, never a key per result or record.
    // Bound the retained view state even if a future caller violates that rule.
    if (values && (values.has(key) || values.size < 256)) values.set(key, value);
  }, [key, value, values]);
  return [value, setValue] as const;
}
