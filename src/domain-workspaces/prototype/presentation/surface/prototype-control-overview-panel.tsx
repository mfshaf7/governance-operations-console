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

import type { PrototypeSummaryMetric } from "./prototype-control-view-model.ts";

export function PrototypeControlOverviewPanel({
  onOpenPrototypeRequest,
  requestSubmittedAt,
  summary,
  workspaceStatus,
}: {
  onOpenPrototypeRequest: () => void;
  requestSubmittedAt: string | null;
  summary: PrototypeSummaryMetric[];
  workspaceStatus: OperationSurfaceStatusModel;
}) {
  return (
    <TerasRecordControlOverviewGrid>
      <TerasRecordControlSummaryPanel
        description={workspaceStatus.summary}
        kicker="Prototype Control"
        metrics={summary}
        statusButtonAttribute="data-prototype-status-button"
        title="Prototype registry"
        surfaceStatus={projectOperationSurfaceStatusModel(workspaceStatus)}
      />

      <TerasRecordControlActionPanel
        action={
          <TerasActionButton
            data-prototype-request-action="true"
            onClick={onOpenPrototypeRequest}
          >
            <Plus aria-hidden="true" size={14} />
            New Prototype Request
          </TerasActionButton>
        }
        boundary={
          <>
            Direct requests create local-entry records in Prototype Studio.
            Landing still decides setup, tools, preview need, and first required
            move before baseline, runtime, or Movement request work.
          </>
        }
        boundaryKicker="Request Boundary"
        description="Prototype-local ingress for a direct prototype request."
        kicker="Prototype Ingress"
        receipt={
          requestSubmittedAt
            ? {
                content: (
                  <>
                    Request captured locally at {requestSubmittedAt}. It is
                    visible in the register as a prototype-local record waiting
                    for Landing.
                  </>
                ),
                props: {
                  "data-prototype-request-receipt": "true",
                },
              }
            : null
        }
        title="Request a prototype"
        tone="info"
      />
    </TerasRecordControlOverviewGrid>
  );
}
