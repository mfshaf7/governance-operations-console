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
  canCapture,
  onCaptureProposal,
  summary,
  workspaceStatus,
}: {
  canCapture: boolean;
  onCaptureProposal: () => void;
  summary: ProposalWorkspaceSummaryMetric[];
  workspaceStatus: OperationSurfaceStatusModel;
}) {
  return (
    <TerasRecordControlOverviewGrid>
      <TerasRecordControlSummaryPanel
        description={workspaceStatus.summary}
        kicker="Proposal Summary"
        metrics={summary}
        statusButtonAttribute="data-proposal-status-button"
        title="Proposal posture"
        surfaceStatus={projectOperationSurfaceStatusModel(workspaceStatus)}
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
          <>
            Console capture adds a proposal to this preview register. External
            API, agent, and system proposals arrive through the source refresh.
          </>
        }
        boundaryKicker="Ingress Boundary"
        description="Direct console ingress for operator-created proposals."
        kicker="Console Ingress"
        title="Capture a proposal"
        tone="info"
      />
    </TerasRecordControlOverviewGrid>
  );
}
