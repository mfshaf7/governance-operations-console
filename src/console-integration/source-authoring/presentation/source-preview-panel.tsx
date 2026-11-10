"use client";
import { useEffect, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasEmptyState, TerasLoadingState, TerasTechnicalDetails } from "@/teras";
import { openExternalConsoleRoute } from "../../external-route.ts";
import { useSourcePreview } from "../live-runtime/use-source-preview.ts";
import { sourcePreviewEndpoint, type SourcePreviewAdapter } from "../source-preview-contract.ts";
import styles from "./source-editor-workspace.module.css";

export function SourcePreviewPanel({ adapter, active, hasDraftChanges }: { adapter?: SourcePreviewAdapter; active: boolean; hasDraftChanges: boolean }) {
  const runtime = useSourcePreview(adapter, active), value = runtime.snapshot;
  const [reload, setReload] = useState(0), [frameLoaded, setFrameLoaded] = useState(false), [frameFailed, setFrameFailed] = useState(false), [frameSlow, setFrameSlow] = useState(false);
  const endpoint = value?.state === "running" && value.endpoint ? sourcePreviewEndpoint(value.endpoint, window.location.origin) : null;
  const embedded = !!value?.embeddingOrigins.includes(window.location.origin);
  const frameKey = `${value?.instanceId}:${value?.sourceDigest}:${reload}`;
  useEffect(() => { setFrameLoaded(false); setFrameFailed(false); setFrameSlow(false); }, [frameKey]);
  useEffect(() => {
    if (!endpoint || !embedded || !active || frameLoaded) return;
    const timer = setTimeout(() => setFrameSlow(true), 12000); return () => clearTimeout(timer);
  }, [endpoint, embedded, active, frameLoaded, frameKey]);
  const refresh = () => { setReload(current => current + 1); void runtime.refresh(); };
  return <div className={styles.previewWorkspace}>
    <TerasContentTray kicker={runtime.pending ? "Checking runtime" : value?.state === "running" ? "Running source" : "Preview status"} className={styles.previewStatus}>
      <p className={styles.message}>{hasDraftChanges ? "This preview does not include your unapplied draft changes." : "Shows the project's applied source. Editing here does not update the runtime automatically."}</p>
      {value ? <TerasTechnicalDetails summary={`Preview source · ${value.sourceRevision.slice(0, 8)}`} items={[{ label: "Runtime source revision", value: value.sourceRevision }, { label: "App source digest", value: value.sourceDigest }, { label: "Instance", value: value.instanceId ?? "Not running" }, { label: "Runtime", value: value.state }]} /> : null}
      <TerasActionRow>
        <TerasActionButton emphasis="secondary" disabled={runtime.pending || !adapter} onClick={refresh}>Refresh preview</TerasActionButton>
        {endpoint ? <TerasActionButton emphasis="secondary" onClick={() => openExternalConsoleRoute(endpoint)}>Open in browser</TerasActionButton> : null}
      </TerasActionRow>
    </TerasContentTray>
    {runtime.pending ? <TerasLoadingState label="Checking the project's preview runtime…" skeleton="details" />
      : runtime.error ? <TerasEmptyState>{runtime.error} Your source edits are retained.</TerasEmptyState>
      : !adapter ? <TerasEmptyState>No preview runtime is connected to this source session.</TerasEmptyState>
      : value?.state === "stopped" ? <TerasEmptyState>The preview is stopped. Save your draft before leaving the editor, then start the project's existing Preview Runtime and refresh here.</TerasEmptyState>
      : value?.state === "stale" ? <TerasEmptyState>The runtime needs reconciliation with its reviewed source. Use the existing Preview Runtime controls, then refresh here. Your draft is not applied by refreshing.</TerasEmptyState>
      : endpoint && !embedded ? <TerasEmptyState>This runtime is available in a browser. Embedded viewing is not enabled for this Console in the project's preview profile.</TerasEmptyState>
      : endpoint ? <div className={styles.previewFrameHost} aria-busy={!frameLoaded&&!frameFailed}><iframe key={frameKey} className={styles.previewFrame} style={{visibility:frameLoaded?"visible":"hidden"}} onLoad={()=>{setFrameLoaded(true);setFrameSlow(false);}} onError={()=>setFrameFailed(true)} title={`${adapter?.label ?? "Project"} preview`} src={endpoint} sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" allow="camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'" />{!frameLoaded?<div className={styles.frameOverlay}>{frameFailed?<TerasEmptyState>The embedded page could not load. Try Refresh preview or Open in browser.</TerasEmptyState>:frameSlow?<TerasEmptyState>The page is taking longer to load. You can open it in a browser or refresh; your source edits are retained.</TerasEmptyState>:<TerasLoadingState label="Loading application preview…" skeleton="details"/>}</div>:null}</div>
      : <TerasEmptyState>Preview status has not been confirmed.</TerasEmptyState>}
  </div>;
}
