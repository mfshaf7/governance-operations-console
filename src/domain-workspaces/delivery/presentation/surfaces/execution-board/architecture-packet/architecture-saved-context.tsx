"use client";
import { useEffect, useMemo, useState } from "react";
import { TerasPlanning, TerasActionButton, TerasEmptyState, TerasLoadingState, TerasPanel, TerasPanelHeader, TerasReadoutField, TerasTechnicalDetails } from "@/teras";
import { normalizeWorkDesignPersistedSession } from "../../../../local-runtime/persistence/work-design-session-persistence.ts";
import type { WorkDesignBriefVersion } from "../../../../work-model/work-design/work-design-types.ts";
import { workDesignSnapshotAttachment } from "../../../../product-adapters/context-board/work-design-context-board-rendering.ts";
import { WorkDesignSnapshotPreview } from "../../../workflows/work-design/artifacts/context-brief/work-design-snapshot-preview.tsx";
import { WorkDesignHandoffNoteText } from "../../../workflows/work-design/artifacts/context-brief/work-design-handoff-note.tsx";

const architectureReferenceViews = [
  { value: "diagrams", label: "Architecture diagrams" },
  { value: "brief", label: "Finalized brief" },
] as const;

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
  const [referenceView, setReferenceView] = useState<typeof architectureReferenceViews[number]["value"]>("diagrams");
  const brief = context.brief;
  const finalized = brief?.finalizedBrief;
  const attachment = useMemo(() => {
    if (!brief?.coreNodes || !brief.finalizedBrief) return null;
    try { return workDesignSnapshotAttachment({ artifact: brief.finalizedBrief.snapshotArtifact, coreNodes: brief.coreNodes,
      ref: brief.boardSnapshotRef, snapshot: brief.snapshot, summary: brief.finalizedBrief.diagramSummary, title: brief.name }); }
    catch { return null; }
  }, [brief]);
  return <TerasPanel frame="padded" spacing="compact" density="compact" treatment="neutral" fit="fill" layout="header-body">
    <TerasPanelHeader kicker="Work Design" title={brief?.name ?? "Saved architecture"} actionsLayout="inline"
      actions={finalized ? <TerasPlanning.ReferenceTabs ariaLabel="Saved architecture panels"
        size="compact" options={architectureReferenceViews} value={referenceView} onValueChange={setReferenceView} /> : undefined}
      description={finalized ? undefined : "This view shows the architecture saved with the finalized Work Design brief."} />
    <TerasPlanning.ReferenceRegion section={finalized ? "body" : undefined}
      fill scroll role="region" aria-label="Saved architecture content" tabIndex={0}>
      {!live ? <TerasEmptyState>Saved Work Design context requires the connected workflow service.</TerasEmptyState>
        : !/^delivery-[1-9][0-9]*$/.test(deliveryId) ? <TerasEmptyState>Select a Delivery package to read its context.</TerasEmptyState>
        : context.loading ? <TerasLoadingState inline label="Reading saved architecture context…" />
        : context.error ? <TerasEmptyState>{context.error}<TerasActionButton emphasis="secondary" onClick={context.retry}>Retry saved context</TerasActionButton></TerasEmptyState>
        : !brief ? <TerasEmptyState>No finalized Work Design brief is saved for this package.</TerasEmptyState>
        : !finalized ? <TerasEmptyState>This retained version has no frozen brief narrative. Its saved reference is available in Work Design.</TerasEmptyState>
        : <TerasPlanning.ReferenceColumns data-reference-view={referenceView}>
          <TerasPanel frame="padded" spacing="tight" density="compact" treatment="neutral" fit="fill" layout="header-body"
            data-reference-panel={referenceView === "diagrams"}>
            <TerasPanelHeader kicker="Snapshot" title="Architecture diagrams"
              description="Open a saved diagram to zoom in." />
            <TerasPlanning.ReferenceRegion section="diagrams" fill scroll
              role="region" aria-label="Architecture diagrams" tabIndex={0}>
              {attachment ? <WorkDesignSnapshotPreview attachment={attachment} layout="diagram" facts={[]}

                previewAriaLabel="Open saved diagram viewer"
                viewerDescription="Browse the diagrams saved in Work Design and zoom in to inspect details." />
                : <TerasEmptyState>The original diagram cannot be rendered from this retained record. It has not been reconstructed from current data.</TerasEmptyState>}
            </TerasPlanning.ReferenceRegion>
          </TerasPanel>
          <TerasPanel frame="padded" spacing="tight" density="compact" treatment="neutral" fit="fill" layout="header-body"
            data-reference-panel={referenceView === "brief"}>
            <TerasPanelHeader kicker="Handoff" title="Finalized brief"
              description="The handoff note saved in Work Design." />
            <TerasPlanning.ReferenceRegion section="brief" fill scroll
              role="region" aria-label="Finalized brief" tabIndex={0}>
              <TerasPlanning.BriefStack spacing="compact">
                {finalized.note.trim() ? <TerasReadoutField label="Handoff note" surface="field" scrollHeight="fill"
                  value={<WorkDesignHandoffNoteText note={finalized.note} />} /> :
                  <TerasEmptyState>No handoff note was saved with this brief.</TerasEmptyState>}
                <TerasTechnicalDetails summary="Brief provenance" items={[
                  { label: "Finalized", value: brief.finalizedAt }, { label: "Version", value: brief.versionLabel },
                  { label: "Decision", value: brief.decision }, { label: "Snapshot reference", value: brief.boardSnapshotRef },
                  { label: "Metadata reference", value: brief.metadataPacketRef },
                ]} />
              </TerasPlanning.BriefStack>
            </TerasPlanning.ReferenceRegion>
          </TerasPanel>
        </TerasPlanning.ReferenceColumns>}
    </TerasPlanning.ReferenceRegion>
  </TerasPanel>;
}
