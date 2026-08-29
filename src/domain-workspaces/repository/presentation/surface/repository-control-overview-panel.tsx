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
            Provision Repository
          </TerasActionButton>
        }
        boundary={
          <>
            OOS owns provisioning, WGCF owns readiness, and GitHub provides
            provider truth. Workspace Intake and active inventory remain
            separate governed actions.
          </>
        }
        boundaryKicker="Mutation Boundary"
        description="Governed organization-repository creation with exact provider readback and a terminal receipt."
        kicker="Repository Provisioning"
        receipt={
          requestSubmittedAt
            ? {
                content: (
                  <>
                    Repository provisioned at {requestSubmittedAt}. Provider
                    identity is visible in the register for separate onboarding.
                  </>
                ),
                props: {
                  "data-repository-request-receipt": "true",
                },
              }
            : null
        }
        title="Provision a repository"
        tone="info"
      />
    </TerasRecordControlOverviewGrid>
  );
}
