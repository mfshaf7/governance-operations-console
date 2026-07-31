"use client";

import {
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
    readModel,
    setActiveSurfaceId,
    summaryMetrics,
    summaryTitle,
  } = useOrchestrationWorkspaceController({ entryIntent });

  return (
    <TerasModalShell
      bodyLayout="fill"
      description="Fullscreen orchestration workspace for durable-definition qualification, definition review, run inspection, and bounded run control."
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
            metrics={summaryMetrics}
            statuses={projectOperationSurfaceStatusItems(
              readModel.workspaceStatus.items,
            )}
            title={summaryTitle}
          />
        }
      >
        <OrchestrationWorkspaceSurfaceContent
          activeSurfaceId={activeSurfaceId}
          entryIntent={entryIntent}
          onOpenSurface={setActiveSurfaceId}
          readModel={readModel}
        />
      </TerasFullscreenSurfaceFrame>
    </TerasModalShell>
  );
}

function OrchestrationWorkspaceSurfaceContent({
  activeSurfaceId,
  entryIntent,
  onOpenSurface,
  readModel,
}: {
  activeSurfaceId: OrchestrationWorkspaceSurfaceId;
  entryIntent: ConsoleSurfaceEntryIntent | null;
  onOpenSurface: (surfaceId: OrchestrationWorkspaceSurfaceId) => void;
  readModel: OrchestrationWorkspaceReadModel;
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
          focusRecordId={orchestrationFocusRecordId(entryIntent, "definition")}
          records={readModel.definitions}
        />
      );
    case "runs":
      return (
        <OrchestrationRunsSurface
          focusRecordId={orchestrationFocusRecordId(entryIntent, "run")}
          records={readModel.runs}
        />
      );
  }
}

function orchestrationFocusRecordId(
  entryIntent: ConsoleSurfaceEntryIntent | null,
  kind: "definition" | "run",
) {
  const prefix = `${kind}:`;

  return entryIntent?.subjectRef.startsWith(prefix)
    ? entryIntent.subjectRef.slice(prefix.length)
    : null;
}
