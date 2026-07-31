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

import type { RepositoryWorkspaceSummaryMetric } from "../../read-model/repository-workspace-read-model.ts";

export function RepositoryControlOverviewPanel({
  onOpenRepositoryRequestDraft,
  requestSubmittedAt,
  summary,
  workspaceStatus,
}: {
  onOpenRepositoryRequestDraft: () => void;
  requestSubmittedAt: string | null;
  summary: RepositoryWorkspaceSummaryMetric[];
  workspaceStatus: OperationSurfaceStatusModel;
}) {
  return (
    <TerasRecordControlOverviewGrid>
      <TerasRecordControlSummaryPanel
        description={workspaceStatus.summary}
        kicker="Repository Summary"
        metrics={summary}
        statusButtonAttribute="data-repository-status-button"
        title="Repository posture"
        surfaceStatus={projectOperationSurfaceStatusModel(workspaceStatus)}
      />

      <TerasRecordControlActionPanel
        action={
          <TerasActionButton
            data-repository-request-action="true"
            onClick={onOpenRepositoryRequestDraft}
          >
            <Plus aria-hidden="true" size={14} />
            New Repository Request
          </TerasActionButton>
        }
        boundary={
          <>
            Repository request, admission, and retire actions are modeled
            locally in this control. The current OOS route surface does not
            expose durable repository mutation yet.
          </>
        }
        boundaryKicker="Mutation Boundary"
        description="Prototype-local ingress for a repository request before real OOS/WGCF workflow wiring exists."
        kicker="Repository Ingress"
        receipt={
          requestSubmittedAt
            ? {
                content: (
                  <>
                    Request captured locally at {requestSubmittedAt}. It is
                    visible in the register as a prototype-local proposed
                    repository record.
                  </>
                ),
                props: {
                  "data-repository-request-receipt": "true",
                },
              }
            : null
        }
        title="Request a repository"
        tone="info"
      />
    </TerasRecordControlOverviewGrid>
  );
}
