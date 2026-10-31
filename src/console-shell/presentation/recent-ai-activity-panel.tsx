"use client";

import { useEffect, useRef, useState } from "react";
import { TerasDialog, TerasMetadataList, TerasUtilityButton } from "@/teras";
import { selectRecentAiActivity, useRecentAiActivity, fetchAiActivityPage, aiActivityWorkspace, type AiActivitySnapshot, type RecentAiActivity } from "../../agent-console";
import { consoleToneClass } from "../console-shell-status";
import { ConsoleSurfaceTechnicalDetails } from "../console-surface-controls";
import styles from "./agent-runtime-dock.module.css";

const stateLabels = { working: "Working", completed: "Completed", cancelled: "Cancelled", failed: "Failed", interrupted: "Unconfirmed" } as const;
const stateTones = { working: "info", completed: "ok", cancelled: "muted", failed: "danger", interrupted: "warn" } as const;
function activityTime(value: string, observedAt: string | null) {
  const minutes = Math.max(0, Math.floor((Date.parse(observedAt ?? value) - Date.parse(value)) / 60_000));
  return minutes < 1 ? "Just now" : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`;
}
function displayPage(snapshot: AiActivitySnapshot) {
  const preview = selectRecentAiActivity({ ...snapshot, status: snapshot.status === "stale" ? "offline" : snapshot.status });
  return { examples: preview.examples, items: preview.examples ? preview.items : snapshot.items,
    message: preview.examples ? preview.message : snapshot.error ?? (snapshot.status === "loading" ? "Checking AI activity…" : snapshot.status === "offline" ? "AI request history is unavailable." : snapshot.items.length ? "Recorded requests · latest owner observation" : "No recorded AI requests.") };
}
function ActivityRow({ item, observedAt, selected, onClick }: { item: RecentAiActivity; observedAt: string | null; selected?: boolean; onClick: () => void }) {
  return <button aria-label={`Inspect activity: ${item.task}`} aria-pressed={selected} className={styles.runtimeRow} onClick={onClick} type="button">
    <span className={styles.runtimeRowHeader}><strong>{item.task}</strong>
      <span className={`${styles.runtimeRowStatus} ${consoleToneClass[stateTones[item.state]]}`}><span aria-hidden="true" className={styles.statusDot} />{stateLabels[item.state]}</span>
    </span>
    <span className={styles.runtimeRowMeta}><span>{item.surface} · {item.subject}</span><time dateTime={item.occurredAt}>{activityTime(item.occurredAt, observedAt)}</time></span>
  </button>;
}

export function RecentAiActivityPanel({ onOpenItem }: { onOpenItem?: (item: RecentAiActivity) => void }) {
  const { snapshot, refresh } = useRecentAiActivity();
  const head = displayPage(snapshot);
  const [historyOpen, setHistoryOpen] = useState(false), [selectedId, setSelectedId] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState<AiActivitySnapshot | null>(null), [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(false), [error, setError] = useState<string | null>(null);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  const currentPage = historyPage ?? snapshot, current = displayPage(currentPage);
  const selected = current.items.find(item => item.id === selectedId) ?? current.items[0] ?? null;
  function close() { active.current?.abort(); active.current = null; setLoading(false); setHistoryOpen(false); }
  function latest() { active.current?.abort(); active.current = null; setLoading(false); setHistoryPage(null); setPageNumber(1); setError(null); setSelectedId(null); void refresh(); }
  async function older() {
    if (!currentPage.nextCursor || active.current) return;
    const controller = new AbortController(); active.current = controller; setLoading(true); setError(null);
    try { const next = await fetchAiActivityPage(currentPage.nextCursor, controller.signal); if (!controller.signal.aborted) { setHistoryPage(next); setPageNumber(value => value + 1); setSelectedId(null); } }
    catch { if (!controller.signal.aborted) setError("Earlier activity is unavailable. This page is retained; try again."); }
    finally { if (active.current === controller) { active.current = null; setLoading(false); } }
  }
  return <>
    <section aria-label="Recent AI activity" className={styles.roster}>
      <div className={styles.rosterHeader}><p>Recent AI activity</p><button className={styles.historyButton} onClick={() => setHistoryOpen(true)} type="button">History</button></div>
      <p className={styles.activityCoverage} role={snapshot.error ? "status" : undefined}>{head.message}</p>
      <div className={styles.runtimeList}>
        {head.items.length ? head.items.map(item => <ActivityRow key={item.id} item={item} observedAt={snapshot.observedAt} onClick={() => { setHistoryPage(null); setPageNumber(1); setSelectedId(item.id); setHistoryOpen(true); }} />)
          : <p className={styles.emptyRoster}>{snapshot.status === "offline" ? "Restore the owner connection or refresh History." : "Requests appear here after you ask an assistant."}</p>}
      </div>
    </section>
    <TerasDialog title="AI Activity" kicker="Agent Runtime" width="standard" height="content" contentOverflow="auto"
      description={current.examples ? "Preview examples for layout review. These requests were not executed and have no owner receipts or linked records." : currentPage.coverage}
      open={historyOpen} onClose={close}>
      <div className={styles.activityHistoryActions}>
        <p role="status">Page {pageNumber}{currentPage.status === "stale" ? " · retained observation" : ""}</p>
        <TerasUtilityButton disabled={loading} onClick={latest}>Latest / refresh</TerasUtilityButton>
        <TerasUtilityButton disabled={loading || !currentPage.nextCursor} onClick={() => void older()}>{loading ? "Loading earlier activity" : "Earlier activity"}</TerasUtilityButton>
      </div>
      {error ? <p className={styles.activityDescription} role="alert">{error}</p> : null}
      {snapshot.error && historyPage ? <p className={styles.activityDescription} role="alert">Owner refresh is unavailable. This page retains its recorded observation.</p> : null}
      <div aria-label="AI activity history" className={styles.activityHistoryList}>
        {current.items.length ? current.items.map(item => <ActivityRow key={item.id} item={item} observedAt={currentPage.observedAt} selected={selected?.id === item.id} onClick={() => setSelectedId(item.id)} />) : <p className={styles.emptyRoster}>{current.message}</p>}
      </div>
      {selected ? <div className={styles.activitySelected}>
        <p className={styles.activityDescription}>{selected.detail}</p>
        <TerasMetadataList wrap items={[
          { label: "Task", value: selected.task }, { label: "Workspace", value: selected.surface },
          { label: "Item", value: selected.subject }, { label: "Result", value: stateLabels[selected.state] },
          { label: "Requested", value: new Date(selected.occurredAt).toLocaleString() },
          { label: "History read", value: currentPage.observedAt ? new Date(currentPage.observedAt).toLocaleString() : "Not observed" },
          { label: "Source", value: current.examples ? "Disconnected preview example — no execution receipt" : "OOS request record" },
        ]} />
        {!current.examples ? <ConsoleSurfaceTechnicalDetails items={[
            { label: "Activity record", value: selected.id },
            { label: "Receipt", value: selected.receiptRef ?? "No invocation receipt recorded for this request path" },
            { label: "Model audit", value: selected.auditRef ?? "Not recorded" },
            { label: "Context evidence", value: selected.contextRef ?? "Not recorded" },
            ...(selected.errorCode ? [{ label: "Failure code", value: selected.errorCode }] : []),
          ]} /> : null}
        {!current.examples && onOpenItem && aiActivityWorkspace(selected) ? <TerasUtilityButton onClick={() => { close(); onOpenItem(selected); }}>Open related item</TerasUtilityButton> : null}
      </div> : null}
    </TerasDialog>
  </>;
}
