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
  canLinkRepository,
  onOpenExistingRepositoryLink,
  onOpenRepositoryRequestDraft,
  requestSubmittedAt,
  summary,
  workspaceStatus,
}: {
  canProvisionRepository: boolean;
  canLinkRepository: boolean;
  onOpenExistingRepositoryLink: () => void;
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
          <TerasActionButton emphasis="secondary" disabled={!canLinkRepository} onClick={onOpenExistingRepositoryLink}>
            Link existing repository
          </TerasActionButton>
          </TerasActionRow>
        }
        boundary={
          <>
            Creating or linking makes the repository available here. Workspace registration is a
            separate review when it needs to join managed workspace workflows.
          </>
        }
        boundaryKicker="Workspace registration"
        description="Create a GitHub repository, or connect one you already have."
        kicker="Repository actions"
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
        title="Add a repository"
        tone="info"
      />
    </TerasRecordControlOverviewGrid>
  );
}
