"use client";

import { useState } from "react";

import { TerasDialog, TerasActionButton, TerasContentTray } from "@/teras";

import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import { repositoryCanResolveProposalGate } from "../../shared/repository-control-projection.ts";
import { repositoryDetailDialogProjection } from "./repository-detail-view-model.ts";
import { RepositoryAdmissionPostureDialog } from "../admission/repository-admission-posture.tsx";
import { RepositoryReviewContent } from "./repository-review-content.tsx";

export function RepositoryDetailDialog({
  onClose,
  onOpenHistory,
  onOpenLifecycle,
  onResolveProposalGate,
  repository,
}: {
  onClose: () => void;
  onOpenHistory: (repository: RepositoryWorkspaceRecord) => void;
  onOpenLifecycle: (repository: RepositoryWorkspaceRecord) => void;
  onResolveProposalGate: (repository: RepositoryWorkspaceRecord) => void;
  repository: RepositoryWorkspaceRecord | null;
}) {
  const [activePostureGroupId, setActivePostureGroupId] = useState<
    string | null
  >(null);
  const isRetiredRecord = repository?.admissionState === "retired";
  const isBlockedRecord = repository?.admissionState === "blocked";
  const canResolveProposalGate = Boolean(
    repository && repositoryCanResolveProposalGate(repository),
  );
  const detailProjection = repositoryDetailDialogProjection(repository);
  const activePostureGroup =
    repository?.admissionPosture.find(
      (group) => group.id === activePostureGroupId,
    ) ?? null;

  function closeDetailDialog() {
    setActivePostureGroupId(null);
    onClose();
  }

  return (
    <>
      <TerasDialog
        contentOverflow="auto"
        height="content"
        width="large"
        actions={
          repository ? (
            <>
              <TerasActionButton
                onClick={() => onOpenHistory(repository)}
                emphasis="secondary"
              >
                View History
              </TerasActionButton>

            </>
          ) : undefined
        }
        closeLabel={detailProjection.closeLabel}
        description={detailProjection.description}
        kicker="Repository review"
        onClose={closeDetailDialog}
        open={Boolean(repository)}
        title={detailProjection.title}
      >
        {repository ? (
          <div data-repository-detail-modal="true">
            <RepositoryReviewContent repository={repository} onOpenGroup={setActivePostureGroupId}
              actions={<>
              {isRetiredRecord && repository.providerIdentity ? (
                <TerasContentTray kicker="Restore workspace record" description="Review restoring the retired workspace record. Restoring it does not unarchive the GitHub repository.">
                <TerasActionButton
                  data-repository-lifecycle-open="true"
                  onClick={() => onOpenLifecycle(repository)}
                >
                  Manage Lifecycle
                </TerasActionButton>
                </TerasContentTray>
              ) : null}
              {isBlockedRecord && canResolveProposalGate ? (
                <TerasContentTray kicker="Repository request" description="Review the repository association requested by the linked Proposal.">
                <TerasActionButton
                  data-repository-gate-resolution-open="true"
                  onClick={() => onResolveProposalGate(repository)}
                >
                  Resolve repository request
                </TerasActionButton>
                </TerasContentTray>
              ) : null}
              {!(isRetiredRecord && repository.providerIdentity) && !(isBlockedRecord && canResolveProposalGate)
                ? <TerasContentTray kicker="Read-only inspection" description={repository.nextAction} /> : null}
              </>} />
          </div>
        ) : null}
      </TerasDialog>

      <RepositoryAdmissionPostureDialog
        group={activePostureGroup}
        repositoryName={repository?.name}
        onClose={() => setActivePostureGroupId(null)}
      />
    </>
  );
}
