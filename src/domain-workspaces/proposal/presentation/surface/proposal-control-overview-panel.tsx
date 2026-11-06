"use client";

import { Plus } from "lucide-react";

import {
  TerasActionButton,
  TerasRecordControlActionPanel,
  TerasRecordControlOverviewGrid,
  TerasRecordControlSummaryPanel,
} from "@/teras";
import {
  projectOperationSurfaceStatusModel,
  type OperationSurfaceStatusModel,
} from "@/domain-workspaces/operation-projections";

import type { ProposalWorkspaceSummaryMetric } from "../../read-model/proposal-workspace-read-model.ts";

export function ProposalControlOverviewPanel({
  paged = false,
  canCapture,
  onCaptureProposal,
  previewMode,
  summary,
  workspaceStatus,
}: {
  paged?: boolean;
  canCapture: boolean;
  onCaptureProposal: () => void;
  previewMode: boolean;
  summary: ProposalWorkspaceSummaryMetric[];
  workspaceStatus: OperationSurfaceStatusModel;
}) {
  const status=projectOperationSurfaceStatusModel(workspaceStatus);
  status.items=status.items.map(item=>({...item,stateLabel:item.stateLabel==="current"?"Online":item.stateLabel==="local"?"Preview":item.stateLabel==="syncing"?"Loading":item.stateLabel}));
  return (
    <TerasRecordControlOverviewGrid>
      <TerasRecordControlSummaryPanel
        description={paged ? "Counts describe this page of results. Search and filters check the full backlog." : status.items.some(item=>item.stateLabel === "offline") ? "Proposal data is unavailable. Retry the failed read in the register." : workspaceStatus.summary}
        kicker={paged ? "Current Page" : "Proposal Summary"}
        metrics={summary}
        statusButtonAttribute="data-proposal-status-button"
        title="Proposal overview"
        surfaceStatus={status}
      />

      <TerasRecordControlActionPanel
        action={
          <TerasActionButton
            data-proposal-capture-action="true"
            disabled={!canCapture}
            onClick={onCaptureProposal}
          >
            <Plus aria-hidden="true" size={14} />
            Capture Proposal
          </TerasActionButton>
        }
        boundary={
          previewMode
            ? "Console capture adds a local proposal to this disconnected preview. It does not create a canonical Workspace Proposal."
            : "Save an idea to your proposal backlog, then review it and choose its next step."
        }
        boundaryKicker="Start here"
        description="Describe the idea or problem you want to work on."
        kicker="New Idea"
        title="Capture a proposal"
        tone="info"
      />
    </TerasRecordControlOverviewGrid>
  );
}
