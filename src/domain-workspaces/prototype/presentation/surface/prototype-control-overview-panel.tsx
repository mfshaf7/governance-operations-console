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
  unavailable=false,
  canRequestPrototype,
  onOpenPrototypeRequest,
  requestSubmittedAt,
  summary,
  workspaceStatus,
}: {
  unavailable?: boolean;
  canRequestPrototype: boolean;
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
        metrics={summary.map(metric=>({...metric,value:unavailable?"—":metric.value}))}
        statusButtonAttribute="data-prototype-status-button"
        title="Prototype registry"
        surfaceStatus={projectOperationSurfaceStatusModel(workspaceStatus)}
      />

      <TerasRecordControlActionPanel
        action={
          <TerasActionButton
            data-prototype-request-action="true"
            disabled={!canRequestPrototype}
            onClick={onOpenPrototypeRequest}
          >
            <Plus aria-hidden="true" size={14} />
            New Prototype Request
          </TerasActionButton>
        }
        boundary={
          <>
            {canRequestPrototype
              ? "Direct requests create local preview records. Landing defines their setup and first required move."
              : "Start in Proposal Control, then use its Prototype route. Landing defines the setup and first required move after the handoff."}
          </>
        }
        boundaryKicker="Request Boundary"
        description={canRequestPrototype
          ? "Prototype-local ingress for a direct prototype request."
          : "Create and route a Proposal to begin a prototype. Direct capture here is not connected yet."}
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
