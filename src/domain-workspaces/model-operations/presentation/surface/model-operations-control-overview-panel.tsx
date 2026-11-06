"use client";

import { CircleHelp, Plus } from "lucide-react";

import {
  TerasActionButton,
  TerasLoadingState,
  TerasPanel,
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
  preview = false,
  recoveryPending = false, sourceUnavailable = false, loading = false,
  onOpenRequestSupport,
  onOpenRequest,
  requestAvailable,
  latestRequest,
  onOpenHistory,
  historyAvailable,
  summary,
  workspaceStatus,
}: {
  preview?: boolean;
  loading?: boolean;
  recoveryPending?: boolean; sourceUnavailable?: boolean;
  onOpenRequestSupport: () => void;
  onOpenRequest: () => void;
  requestAvailable: boolean;
  latestRequest: ModelProfileRequestProjection | null;
  onOpenHistory: () => void;
  historyAvailable: boolean;
  summary: ModelOperationsSummaryMetric[];
  workspaceStatus: OperationSurfaceStatusModel;
}) {
  if (loading) return <TerasRecordControlOverviewGrid>
    <TerasPanel frame="padded" treatment="neutral" spacing="normal">
      <TerasLoadingState label="Loading purpose profile summary…" skeleton="details" />
    </TerasPanel>
    <TerasPanel frame="padded" treatment="neutral" spacing="normal">
      <TerasLoadingState label="Checking available profile actions…" skeleton="details" />
    </TerasPanel>
  </TerasRecordControlOverviewGrid>;
  return (
    <TerasRecordControlOverviewGrid>
      <TerasRecordControlSummaryPanel
        description={sourceUnavailable ? workspaceStatus.summary : "Purpose profiles define which workflows may use AI. Choose providers, models and effort in Models & routing."}
        kicker="Profile Summary"
        metrics={sourceUnavailable ? summary.map(metric=>({...metric,value:"—"})) : summary}
        statusButtonAttribute="data-model-operations-status-button"
        surfaceStatus={projectOperationSurfaceStatusModel(workspaceStatus)}
        title="Purpose profiles"
      />

      <TerasRecordControlActionPanel
        action={
          <>
            <TerasActionButton disabled={!requestAvailable} onClick={onOpenRequest}>
              <Plus aria-hidden="true" size={14} />
              {recoveryPending ? "Check request result" : "Request Profile"}
            </TerasActionButton>
            <TerasActionButton
              onClick={onOpenHistory}
              disabled={!historyAvailable}
              emphasis="secondary"
            >
              Manage Requests
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
          preview ? "Design preview: open forms and sample history. Submissions and review decisions are disabled." : requestAvailable
            ? "Requests are written only through OOS. Platform owns fulfillment and source; Security owns acceptance."
            : "The configured OOS and Platform projections must both be current before a request can be submitted."
        }
        boundaryKicker="Capability Boundary"
        description={
          latestRequest
            ? `Latest request is ${latestRequest.review_state}; fulfillment is ${latestRequest.fulfillment_state}. Open Manage Requests for its reference and evidence.`
            : "The primary request path creates one profile intent without direct registry mutation."
        }
        kicker="Profile Requests"
        title={preview ? "Inspect profile forms" : requestAvailable ? "Request a governed profile" : "Request path is unavailable"}
        tone={requestAvailable ? "info" : "warn"}
      />
    </TerasRecordControlOverviewGrid>
  );
}
