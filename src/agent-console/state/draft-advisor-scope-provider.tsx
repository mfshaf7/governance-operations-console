"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { AdvisorScope, GovernedAdvisorReply } from "../model/advisor-drafts";

export type AdvisorRunContext = {
  signal?: AbortSignal;
  session?: { nonce: string; openedAt: string };
  conversation?: Array<{ role: "operator" | "advisor"; text: string }>;
};
type Registration = {
  getScope: () => AdvisorScope;
  run: (prompt: string, context?: AdvisorRunContext) => Promise<GovernedAdvisorReply>;
  undo: () => void;
};
type Registry = { entries: Map<string, Registration>; register: (id: string, entry: Registration) => () => void };
const DraftScopeContext = createContext<Registry | null>(null);

/** Local surface discovery only. The owning surface validates and applies edits. */
export function DraftAdvisorScopeProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState(new Map<string, Registration>());
  const register = useCallback((id: string, entry: Registration) => {
    setEntries((current) => new Map(current).set(id, entry));
    return () => setEntries((current) => { const next = new Map(current); next.delete(id); return next; });
  }, []);
  const value = useMemo(() => ({ entries, register }), [entries, register]);
  return <DraftScopeContext.Provider value={value}>{children}</DraftScopeContext.Provider>;
}

export function useDraftScopeRegistration(entry: Registration, active: boolean) {
  const registry = useContext(DraftScopeContext), register = registry?.register;
  const id = useId(), current = useRef(entry); current.current = entry;
  useEffect(() => {
    if (!active || !register) return;
    return register(id, { getScope: () => current.current.getScope(), run: (prompt, context) => current.current.run(prompt, context), undo: () => current.current.undo() });
  }, [active, id, register]);
}

export function useFocusedDraftScope() {
  const registry = useContext(DraftScopeContext);
  return registry ? [...registry.entries.values()].at(-1) ?? null : null;
}
