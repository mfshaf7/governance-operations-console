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
import type { ModelProfileRequestProjection } from "../../live-runtime/model-operations-live-types.ts";

export function ModelOperationsControlOverviewPanel({
  onOpenRequestSupport,
  onOpenRequest,
  requestAvailable,
  latestRequest,
  summary,
  workspaceStatus,
}: {
  onOpenRequestSupport: () => void;
  onOpenRequest: () => void;
  requestAvailable: boolean;
  latestRequest: ModelProfileRequestProjection | null;
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
            <TerasActionButton disabled={!requestAvailable} onClick={onOpenRequest}>
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
        boundary={
          requestAvailable
            ? "Requests are written only through OOS. Platform owns fulfillment and source; Security owns acceptance."
            : "The configured OOS and Platform projections must both be current before a request can be submitted."
        }
        boundaryKicker="Capability Boundary"
        description={
          latestRequest
            ? `Latest request ${latestRequest.request_id} is ${latestRequest.review_state}; fulfillment is ${latestRequest.fulfillment_state}.`
            : "The primary request path creates one profile intent without direct registry mutation."
        }
        kicker="Profile Requests"
        title={requestAvailable ? "Request a governed profile" : "Request path is unavailable"}
        tone={requestAvailable ? "info" : "warn"}
      />
    </TerasRecordControlOverviewGrid>
  );
}
