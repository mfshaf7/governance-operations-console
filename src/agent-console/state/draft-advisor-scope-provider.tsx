"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { AdvisorScope, GovernedAdvisorReply } from "../model/advisor-drafts";
import { selectedProjectKey, type ProjectContextChoice } from "../model/selected-project-context.ts";

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
type Registry = { entries: Map<string, Registration>; register: (id: string, entry: Registration) => () => void;
  projects: Map<string, ProjectContextChoice[]>; lastProjects: ProjectContextChoice[];
  registerProjects: (id: string, choices: ProjectContextChoice[]) => () => void };
const DraftScopeContext = createContext<Registry | null>(null);

/** Local surface discovery only. The owning surface validates and applies edits. */
export function DraftAdvisorScopeProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState(new Map<string, Registration>());
  const [projects, setProjects] = useState(new Map<string, ProjectContextChoice[]>());
  const [lastProjects, setLastProjects] = useState<ProjectContextChoice[]>([]);
  const registerProjects = useCallback((id: string, choices: ProjectContextChoice[]) => {
    setProjects(current => new Map(current).set(id, choices));
    // Keep only the last visible selection's ID/title when its modal closes.
    // This lets the primary agent offer it without preloading/exporting content.
    setLastProjects(choices);
    return () => setProjects(current => { const next = new Map(current); next.delete(id); return next; });
  }, []);
  const register = useCallback((id: string, entry: Registration) => {
    setEntries((current) => new Map(current).set(id, entry));
    return () => setEntries((current) => { const next = new Map(current); next.delete(id); return next; });
  }, []);
  const value = useMemo(() => ({ entries, register, projects, lastProjects, registerProjects }), [entries, register, projects, lastProjects, registerProjects]);
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

/** Visible owner-projected choices only. Registration never exports content. */
export function useProjectContextChoices(choices: ProjectContextChoice[]) {
  const registry = useContext(DraftScopeContext), register = registry?.registerProjects, id = useId();
  const signature = JSON.stringify(choices);
  useEffect(() => {
    if (!register || signature === "[]") return;
    return register(id, JSON.parse(signature) as ProjectContextChoice[]);
  }, [id, register, signature]);
}
export function useAvailableProjectContexts() {
  const registry = useContext(DraftScopeContext);
  const current = [...(registry?.projects.values() ?? [])].flat();
  return [...new Map((current.length ? current : registry?.lastProjects ?? []).map(choice => [selectedProjectKey(choice), choice])).values()];
}
