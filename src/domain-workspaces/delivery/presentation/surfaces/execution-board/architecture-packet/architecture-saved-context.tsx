"use client";
import { useEffect, useMemo, useState } from "react";
import { TerasActionButton, TerasContentTray, TerasTechnicalDetails, TerasEmptyState, TerasFieldStack, TerasLoadingState, TerasMediaSnapshot, TerasMediaSnapshotViewerDialog, TerasMetadataList, TerasPanel, TerasPanelHeader, TerasSelectField } from "@/teras";
import { normalizeWorkDesignPersistedSession } from "../../../../local-runtime/persistence/work-design-session-persistence.ts";
import type { WorkDesignBriefVersion } from "../../../../work-model/work-design/work-design-types.ts";
import { contextBoardDiagrams } from "../../../../../../product-apps/context-board/context-board-diagrams.ts";
import { workDesignSnapshotAttachment } from "../../../../product-adapters/context-board/work-design-context-board-rendering.ts";

export function useArchitectureSavedContext(deliveryId: string, live: boolean) {
  const [state, setState] = useState<{ key: string; brief: WorkDesignBriefVersion | null; error: string | null }>({ key: "", brief: null, error: null });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!live || !/^delivery-[1-9][0-9]*$/.test(deliveryId)) return;
    const lifetime = new AbortController(); let active = true;
    void (async () => {
      try {
        const response = await fetch(`/api/saved-work/work-design/${deliveryId}`, { cache: "no-store", signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(15_000)]) });
        const body = await response.json(), snapshot = body.snapshot;
        if (!response.ok || body.mode !== "live" || snapshot?.kind !== "work-design" || snapshot.subject_id !== deliveryId) throw Error("Saved Work Design context could not be verified.");
        if (!snapshot.record) { if (active) setState({ key: deliveryId, brief: null, error: null }); return; }
        const session = normalizeWorkDesignPersistedSession(JSON.parse(snapshot.record.payload_json), deliveryId);
        if (!session) throw Error("The saved Work Design brief is unavailable in this version.");
        const brief = session.briefVersions.find(item => item.briefVersionId === session.activeBriefVersionId)
          ?? [...session.briefVersions].sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt))[0] ?? null;
        if (active) setState({ key: deliveryId, brief, error: null });
      } catch (error) { if (active) setState({ key: deliveryId, brief: null, error: error instanceof Error ? error.message : "Saved context is unavailable." }); }
    })();
    return () => { active = false; lifetime.abort(); };
  }, [deliveryId, live, retry]);
  const current = state.key === deliveryId ? state : null;
  return { brief: current?.brief ?? null, error: current?.error ?? null, loading: live && !current,
    retry: () => { setState({key:"",brief:null,error:null}); setRetry(value=>value+1); } };
}

export function ArchitectureSavedContext({ deliveryId, live, context }: { deliveryId: string; live: boolean; context: ReturnType<typeof useArchitectureSavedContext> }) {
  const [viewerOpen,setViewerOpen]=useState(false),[selectedDiagram,setSelectedDiagram]=useState("all");
  const brief=context.brief;
  const diagrams=useMemo(()=>brief?contextBoardDiagrams(brief.snapshot):[],[brief]);
  const diagram=diagrams.find(view=>view.id===selectedDiagram);
  const attachment = useMemo(() => {
    if (!brief?.coreNodes || !brief.finalizedBrief) return null;
    try { return workDesignSnapshotAttachment({ artifact: diagram ? null : brief.finalizedBrief.snapshotArtifact, coreNodes: brief.coreNodes,
      ref: brief.boardSnapshotRef, snapshot: diagram?.snapshot ?? brief.snapshot, summary: diagram?.description ?? brief.finalizedBrief.diagramSummary, title: diagram?.name ?? brief.name }); }
    catch { return null; }
  }, [brief,diagram]);
  return <TerasPanel frame="padded" spacing="normal" treatment="neutral">
    <TerasPanelHeader kicker="Work Design context" title="Saved architecture brief"
      description="Read the finalized brief and diagrams while preparing the implementation plan. This saved context does not replace an architecture approval." />
    {!live ? <TerasEmptyState>Saved Work Design context requires the connected workflow service.</TerasEmptyState>
      : !/^delivery-[1-9][0-9]*$/.test(deliveryId) ? <TerasEmptyState>Select a Delivery package to read its context.</TerasEmptyState>
      : context.loading ? <TerasLoadingState inline label="Reading saved architecture context…" />
      : context.error ? <TerasEmptyState>{context.error}<TerasActionButton emphasis="secondary" onClick={context.retry}>Retry saved context</TerasActionButton></TerasEmptyState>
      : !brief ? <TerasEmptyState>No saved finalized brief was returned for this package. No diagram or architecture is inferred.</TerasEmptyState>
      : <TerasFieldStack spacing="normal">
        <TerasMetadataList shape="line" treatment="chip" wrap items={[{ label: "Brief", value: brief.name }, { label: "Version", value: brief.versionLabel }, {label:"Decision",value:brief.decision}]} />
        {diagrams.length>1?<TerasSelectField label="Saved diagram" value={diagram?.id ?? "all"} onValueChange={setSelectedDiagram}
          options={[{value:"all",label:"All retained diagrams"},...diagrams.map(view=>({value:view.id,label:view.name}))]}/>:null}
        {brief.finalizedBrief ? <>
          <TerasContentTray title="Finalized architecture brief" description={brief.finalizedBrief.note} descriptionFormat="lines"/>
          <TerasContentTray title="Diagram context" description={brief.finalizedBrief.diagramSummary} descriptionFormat="lines"/>
          {attachment ? <TerasMediaSnapshot title="Saved diagrams" kicker="Read-only context" density="compact" facts={[]}
            imageAlt={attachment.description} imageSrc={attachment.dataUrl} onPreview={() => setViewerOpen(true)} />
            : <TerasEmptyState>The original diagram cannot be rendered from this retained record. It has not been reconstructed from current data.</TerasEmptyState>}
          <TerasTechnicalDetails summary="Brief provenance" items={[{label:"Finalized",value:brief.finalizedAt},{label:"Snapshot reference",value:brief.boardSnapshotRef},{label:"Metadata reference",value:brief.metadataPacketRef}]}/>
        </> : <TerasEmptyState>This retained version has no frozen brief narrative. Its saved reference is available in Work Design.</TerasEmptyState>}
      </TerasFieldStack>}
    {attachment ? <TerasMediaSnapshotViewerDialog open={viewerOpen} onClose={() => setViewerOpen(false)} kicker="Saved Work Design context"
      title={attachment.title} toolbarTitle="Saved diagrams" imageSrc={attachment.dataUrl} imageAlt={attachment.description} /> : null}
  </TerasPanel>;
}
