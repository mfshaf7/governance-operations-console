"use client";

import { createContext, Fragment, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { TerasActionButton, TerasActionRow, TerasDialog, TerasEmptyState, TerasStatusPill } from "@/teras";
import { savedWorkBrowserSession, type SavedWorkBrowserSession } from "./browser-session.ts";

const SavedWorkContext = createContext<SavedWorkBrowserSession | null>(null);

export function SavedWorkBoundary({ children, storageKey, onClose, readOnly = false, normalize }: {
  children: ReactNode; storageKey: string; onClose: () => void; readOnly?: boolean; normalize?: (value: unknown) => unknown | null;
}) {
  const session = useMemo(() => savedWorkBrowserSession(storageKey), [storageKey]);
  const [opened, setOpened] = useState(false);
  const normalizer = useRef(normalize); normalizer.current = normalize;
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  useEffect(() => { let active = true; setOpened(false); void session.initialize(readOnly, normalizer.current).finally(() => { if (active) setOpened(true); }); return () => { active = false; }; }, [session, readOnly]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (["ready", "saving", "error", "conflict"].includes(session.getSnapshot().status) && session.getSnapshot().hydrated && !readOnly) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [session, readOnly]);
  if (!opened || !state.hydrated) return <TerasDialog open title="Saved work" kicker="Reading saved draft" onClose={onClose} contentOverflow="auto" height="content" width="standard"
    actions={<><TerasActionButton emphasis="secondary" onClick={onClose}>Close</TerasActionButton>{state.status === "error" ? <TerasActionButton onClick={() => void session.retry()}>Retry</TerasActionButton> : null}</>}>
    <TerasEmptyState>{state.message}</TerasEmptyState>
  </TerasDialog>;
  return <SavedWorkContext.Provider value={session}><Fragment key={`${storageKey}:${state.generation}`}>{children}</Fragment></SavedWorkContext.Provider>;
}

export function SavedWorkStatus() {
  const session = useContext(SavedWorkContext);
  return session ? <SavedWorkStatusContent session={session}/> : null;
}
function SavedWorkStatusContent({ session }: { session: SavedWorkBrowserSession }) {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const [showRecovery, setShowRecovery] = useState(false); const [error, setError] = useState<string | null>(null);
  async function download(id: string) {
    try {
      const record = await session.recovery(id); if (!record) throw new Error("The original record is unavailable.");
      const url = URL.createObjectURL(new Blob([record.raw_value], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "preserved-console-work.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setError(null);
    } catch { setError("The preserved original could not be retrieved. It has not been removed."); }
  }
  return <>
    <TerasActionRow spacing="compact">
      <span role="status" aria-live="polite" title={state.message} data-saved-work-status={state.status}>
        <TerasStatusPill tone={state.status === "saved" ? "ok" : ["error", "conflict"].includes(state.status) ? "warn" : "info"}>
          {state.message}
        </TerasStatusPill>
      </span>
      {state.status === "error" ? <TerasActionButton emphasis="secondary" onClick={() => void session.retry()}>Retry save</TerasActionButton> : null}
      {state.status === "conflict" ? <>
        <TerasActionButton emphasis="secondary" onClick={() => void session.useServerCopy().catch(() => setError("The server copy could not be retrieved."))}>Use server copy</TerasActionButton>
        <TerasActionButton emphasis="secondary" onClick={() => void session.keepBrowserEdits().catch(() => setError("The browser edits could not be saved."))}>Keep browser edits</TerasActionButton>
      </> : null}
      {state.recoveries.length ? <TerasActionButton emphasis="secondary" onClick={() => setShowRecovery(true)}>Preserved browser records</TerasActionButton> : null}
    </TerasActionRow>
    {showRecovery ? <TerasDialog open title="Preserved browser records" kicker="Recovery" onClose={() => setShowRecovery(false)} contentOverflow="auto" height="content" width="standard"
      description="Original browser bytes are retained separately from the current draft. Import time does not prove original authorship or prior approval."
      actions={<TerasActionButton onClick={() => setShowRecovery(false)}>Close</TerasActionButton>}>
      {error ? <TerasEmptyState>{error}</TerasEmptyState> : null}
      <ul>{state.recoveries.map(record => <li key={record.recovery_id}>
        {record.storage_key} · {record.preserved_at} <TerasActionButton emphasis="secondary" onClick={() => void download(record.recovery_id)}>Download original</TerasActionButton>
        <TerasActionButton emphasis="secondary" disabled={session.isReadOnly()} onClick={() => void session.restoreRecovery(record.recovery_id).then(() => { setShowRecovery(false); setError(null); }).catch(error => setError(error instanceof Error ? error.message : "Recovery failed; the original remains preserved."))}>Restore as draft</TerasActionButton>
      </li>)}</ul>
    </TerasDialog> : null}
  </>;
}
