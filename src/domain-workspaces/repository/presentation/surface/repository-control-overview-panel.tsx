"use client";

import { Plus } from "lucide-react";

import {
  TerasActionButton,
  TerasActionRow,
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
  canProvisionRepository,
  onOpenRepositoryRequestDraft,
  requestSubmittedAt,
  summary,
  workspaceStatus,
}: {
  canProvisionRepository: boolean;
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
        metrics={summary.map(item => ({
          ...item, label: item.id === "ready" ? "Ready to register" : item.id === "admitted" ? "Registered" : item.id === "blocked" ? "Needs attention" : item.label,
        }))}
        statusButtonAttribute="data-repository-status-button"
        title="Repository posture"
        surfaceStatus={projectOperationSurfaceStatusModel(workspaceStatus)}
      />

      <TerasRecordControlActionPanel
        action={
          <TerasActionRow>
          <TerasActionButton
            data-repository-request-action="true"
            disabled={!canProvisionRepository}
            onClick={onOpenRepositoryRequestDraft}
          >
            <Plus aria-hidden="true" size={14} />
            Create repository
          </TerasActionButton>
          </TerasActionRow>
        }
        boundary={
          <>
            Creation makes the repository available. Workspace registration is a
            separate review when it needs to join managed workspace workflows.
          </>
        }
        boundaryKicker="After creation"
        description={canProvisionRepository
          ? "Create a GitHub organization repository for a new project."
          : "Repository provisioning is unavailable until its exact owner capability is executable."}
        kicker="New repository"
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
        title="Create a repository"
        tone="info"
      />
    </TerasRecordControlOverviewGrid>
  );
}
