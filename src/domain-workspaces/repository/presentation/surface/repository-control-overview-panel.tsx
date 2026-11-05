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
  canOpenRepositoryRequest,
  canLinkRepository,
  onOpenExistingRepositoryLink,
  onOpenRepositoryRequestDraft,
  requestSubmittedAt,
  summary,
  workspaceStatus,
  partial = false, unavailable = false,
}: {
  canOpenRepositoryRequest: boolean;
  canLinkRepository: boolean;
  onOpenExistingRepositoryLink: () => void;
  onOpenRepositoryRequestDraft: () => void;
  requestSubmittedAt: string | null;
  summary: RepositoryWorkspaceSummaryMetric[];
  workspaceStatus: OperationSurfaceStatusModel;
  partial?: boolean; unavailable?: boolean;
}) {
  return (
    <TerasRecordControlOverviewGrid>
      <TerasRecordControlSummaryPanel
        description={unavailable ? "Repository totals are unavailable until the register can be read." : partial ? "Summary of loaded repositories. Load more in the register to include remaining records." : workspaceStatus.summary}
        kicker="Repository Summary"
        metrics={summary.map(item => ({
          ...item, value: unavailable ? "—" : item.value, label: item.id === "ready" ? "Ready to register" : item.id === "admitted" ? "Registered" : item.id === "blocked" ? "Needs attention" : item.label,
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
            disabled={!canOpenRepositoryRequest}
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
