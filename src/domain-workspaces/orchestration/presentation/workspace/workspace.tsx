"use client";

import { useState } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasFieldStack,
  TerasLoadingState,
  TerasFullscreenSurfaceFrame,
  TerasModalShell,
  TerasSurfaceNav,
  TerasSurfaceNavButton,
  TerasSurfaceSummaryHeader,
} from "@/teras";
import { projectOperationSurfaceStatusItems } from "@/domain-workspaces/operation-projections";
import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";
import {
  getOperationWorkbenchSurfaceAttributes,
  type OperationWorkbenchDomainContract,
} from "../../../../operation-workbench/operation-workbench-contract.ts";
import type { OrchestrationWorkspaceReadModel } from "../../read-model/workspace/orchestration-workspace-read-model.ts";
import { OrchestrationDefinitionsSurface } from "../surfaces/definitions/orchestration-definitions-surface.tsx";
import { OrchestrationHomeSurface } from "../surfaces/home/orchestration-home-surface.tsx";
import { OrchestrationRunsSurface } from "../surfaces/runs/orchestration-runs-surface.tsx";
import {
  orchestrationWorkspaceNavMeta,
  orchestrationWorkspaceSurfaces,
  type OrchestrationWorkspaceSurfaceId,
} from "./orchestration-workspace-view-model.ts";
import { useOrchestrationWorkspaceController } from "./use-orchestration-workspace-controller.ts";
import { OrchestrationRunStartDialog } from "../workflows/run-start/orchestration-run-start-dialog.tsx";
import type { OrchestrationRunControlInput, OrchestrationRunControlReceipt } from "../../work-model/run-control/run-control-types.ts";

export type OrchestrationWorkspaceProps = {
  contract: OperationWorkbenchDomainContract;
  entryIntent?: ConsoleSurfaceEntryIntent | null;
  onClose: () => void;
};

export function OrchestrationWorkspace({
  contract,
  entryIntent = null,
  onClose,
}: OrchestrationWorkspaceProps) {
  const {
    activeSurfaceId,
    controlRun,
    refreshOwnerTruth,
    sourceMode,
    sourceLoading,
    readModel,
    setActiveSurfaceId,
    summaryMetrics,
    summaryTitle,
  } = useOrchestrationWorkspaceController({ entryIntent });
  const [runDialog, setRunDialog] = useState<"start" | "recover" | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [focusedRecord, setFocusedRecord] = useState<{ surfaceId: OrchestrationWorkspaceSurfaceId; recordId: string } | null>(null);

  return (
    <><TerasModalShell
      agentHost
      bodyLayout="fill"
      description="Monitor background workflows, resolve exceptions and manage workflow definitions."
      kicker="Orchestration Workspace"
      modalAttributes={getOperationWorkbenchSurfaceAttributes(contract)}
      onClose={onClose}
      height="fill"
      surfaceId="orchestration-workspace-modal"
      title="Orchestration Workspace"
      width="viewport"
    >
      <TerasFullscreenSurfaceFrame
        data-orchestration-workspace-surface={activeSurfaceId}
        nav={
          <TerasSurfaceNav
            ariaLabel="Orchestration workspace sections"
            description="Switch between orchestration control surfaces."
            kicker="Workspace Nav"
            title="Orchestration Areas"
          >
            {orchestrationWorkspaceSurfaces.map((surface) => (
              <TerasSurfaceNavButton
                current={activeSurfaceId === surface.id}
                data-orchestration-workspace-section={surface.id}
                key={surface.id}
                kicker={surface.kicker}
                meta={orchestrationWorkspaceNavMeta(readModel, surface.id)}
                onClick={() => setActiveSurfaceId(surface.id)}
                title={surface.title}
                tone={surface.tone}
              />
            ))}
          </TerasSurfaceNav>
        }
        summary={
          <TerasSurfaceSummaryHeader
            ariaLabel="Orchestration workspace summary"
            metrics={summaryMetrics.map(metric => ({ ...metric, label: metric.label === "Definition Work" ? "Design work" : metric.label }))}
            statuses={projectOperationSurfaceStatusItems(
              readModel.workspaceStatus.items,
            )}
            title={summaryTitle}
          />
        }
      >
        <TerasFieldStack fill="last">
          {sourceMode !== "disconnected-preview" ? <TerasActionRow>
            <TerasActionButton busy={refreshing} emphasis="secondary" disabled={refreshing} onClick={() => {
              setRefreshing(true); void refreshOwnerTruth().finally(() => setRefreshing(false));
            }}>{refreshing ? "Refreshing" : "Refresh status"}</TerasActionButton>
            <TerasActionButton emphasis="secondary" onClick={() => setRunDialog("recover")}>Read original run</TerasActionButton>
          </TerasActionRow> : null}
          {sourceLoading ? <TerasLoadingState fill label="Loading workflow definitions and runs…" /> : <OrchestrationWorkspaceSurfaceContent
          live={sourceMode!=="disconnected-preview"}
          activeSurfaceId={activeSurfaceId}
          controlRun={controlRun}
          entryIntent={entryIntent}
          focusedRecord={focusedRecord}
          onOpenSurface={(surfaceId, recordId) => { setFocusedRecord(recordId ? { surfaceId, recordId } : null); setActiveSurfaceId(surfaceId); }}
          readModel={readModel}
          onStartRun={() => setRunDialog("start")}
        />}
        </TerasFieldStack>
      </TerasFullscreenSurfaceFrame>
    </TerasModalShell>
    {runDialog ? <OrchestrationRunStartDialog mode={runDialog} runs={readModel.runs} onClose={() => setRunDialog(null)} onViewRuns={async (runId) => {
      const current = await refreshOwnerTruth();
      if (current.mode !== "live" || current.status !== "current") throw new Error("The original run remains retained; its current service list is unavailable.");
      if (runId) setFocusedRecord({ surfaceId: "runs", recordId: runId });
      setActiveSurfaceId("runs"); setRunDialog(null);
    }} /> : null}</>
  );
}

function OrchestrationWorkspaceSurfaceContent({
  live,
  activeSurfaceId,
  controlRun,
  entryIntent,
  focusedRecord,
  onOpenSurface,
  readModel,
  onStartRun,
}: {
  live:boolean;
  activeSurfaceId: OrchestrationWorkspaceSurfaceId;
  controlRun: (runId: string, input: OrchestrationRunControlInput) => Promise<OrchestrationRunControlReceipt>;
  entryIntent: ConsoleSurfaceEntryIntent | null;
  onOpenSurface: (surfaceId: OrchestrationWorkspaceSurfaceId, recordId?: string) => void;
  focusedRecord: { surfaceId: OrchestrationWorkspaceSurfaceId; recordId: string } | null;
  readModel: OrchestrationWorkspaceReadModel;
  onStartRun: () => void;
}) {
  switch (activeSurfaceId) {
    case "home":
      return (
        <OrchestrationHomeSurface
          onOpenSurface={onOpenSurface}
          readModel={readModel}
        />
      );
    case "definitions":
      return (
        <OrchestrationDefinitionsSurface
          focusRecordId={focusedRecord?.surfaceId === "definitions" ? focusedRecord.recordId : orchestrationFocusRecordId(entryIntent, "definition")}
          records={readModel.definitions}
          onStartRun={onStartRun}
        />
      );
    case "runs":
      return (
        <OrchestrationRunsSurface
          live={live}
          onControl={controlRun}
          focusRecordId={focusedRecord?.surfaceId === "runs" ? focusedRecord.recordId : orchestrationFocusRecordId(entryIntent, "run")}
          records={readModel.runs}
        />
      );
  }
}

function orchestrationFocusRecordId(
  entryIntent: ConsoleSurfaceEntryIntent | null,
  kind: "definition" | "run",
) {
  if (
    kind === "run" &&
    entryIntent?.requiredMoveRef.startsWith("orchestration.runs.")
  ) {
    return entryIntent.subjectRef;
  }

  const prefix = `${kind}:`;

  return entryIntent?.subjectRef.startsWith(prefix)
    ? entryIntent.subjectRef.slice(prefix.length)
    : null;
}
