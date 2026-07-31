"use client";

import { CircleHelp, Plus } from "lucide-react";

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

import type { ModelOperationsSummaryMetric } from "../../read-model/types/model-operations-types.ts";

export function ModelOperationsControlOverviewPanel({
  onOpenRequestSupport,
  summary,
  workspaceStatus,
}: {
  onOpenRequestSupport: () => void;
  summary: ModelOperationsSummaryMetric[];
  workspaceStatus: OperationSurfaceStatusModel;
}) {
  return (
    <TerasRecordControlOverviewGrid>
      <TerasRecordControlSummaryPanel
        description={workspaceStatus.summary}
        kicker="Profile Summary"
        metrics={summary}
        statusButtonAttribute="data-model-operations-status-button"
        surfaceStatus={projectOperationSurfaceStatusModel(workspaceStatus)}
        title="Governed profile posture"
      />

      <TerasRecordControlActionPanel
        action={
          <>
            <TerasActionButton disabled>
              <Plus aria-hidden="true" size={14} />
              Request Profile
            </TerasActionButton>
            <TerasActionButton
              onClick={onOpenRequestSupport}
              emphasis="secondary"
            >
              <CircleHelp aria-hidden="true" size={14} />
              Request Requirements
            </TerasActionButton>
          </>
        }
        boundary="No admitted request API, review projection, fulfillment command, or registry reconciliation receipt exists yet."
        boundaryKicker="Capability Boundary"
        description="The future request path will cover profile creation and lifecycle changes without direct registry mutation."
        kicker="Profile Requests"
        title="Request path is not available"
        tone="warn"
      />
    </TerasRecordControlOverviewGrid>
  );
}
