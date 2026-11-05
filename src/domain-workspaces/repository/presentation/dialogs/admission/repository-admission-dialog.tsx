"use client";

import { useState } from "react";

import { TerasActionButton, TerasContentTray, TerasModalShell } from "@/teras";

import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import { RepositoryReviewContent } from "../details/repository-review-content.tsx";
import { RepositoryAdmissionPostureDialog } from "./repository-admission-posture.tsx";

export function RepositoryAdmissionDialog({
  registration,
  onOpenRegistration,
  onClose,
  onOpenDeliveryCatalog,
  onOpenHistory,
  onOpenLifecycle,
  repository,
}: {
  registration: { required: boolean; available: boolean; unavailableReason: string | null };
  onOpenRegistration: (repository: RepositoryWorkspaceRecord) => void;
  onClose: () => void;
  onOpenDeliveryCatalog: (repository: RepositoryWorkspaceRecord) => void;
  onOpenHistory: (repository: RepositoryWorkspaceRecord) => void;
  onOpenLifecycle: (repository: RepositoryWorkspaceRecord) => void;
  repository: RepositoryWorkspaceRecord | null;
}) {
  const [activePostureGroupId, setActivePostureGroupId] = useState<
    string | null
  >(null);
  const canManageLifecycle = Boolean(
    repository && repository.admissionState === "admitted",
  );
  const activePostureGroup =
    repository?.admissionPosture.find(
      (group) => group.id === activePostureGroupId,
    ) ?? null;

  function closeAdmissionDialog() {
    setActivePostureGroupId(null);
    onClose();
  }

  if (!repository) {
    return null;
  }

  return (
    <>
      <TerasModalShell
        bodyLayout="scroll"
        height="content"
        width="standard"
        footer={
          <>
            <TerasActionButton
              onClick={closeAdmissionDialog}
              emphasis="secondary"
            >
              Back to Register
            </TerasActionButton>
            <TerasActionButton
              onClick={() => onOpenHistory(repository)}
              emphasis="secondary"
            >
              View History
            </TerasActionButton>

          </>
        }
        kicker="Repository review"
        onClose={closeAdmissionDialog}
        surfaceId="repository-admission"
        title="Repository details"
      >
        <div data-repository-admission-modal="true">
          <RepositoryReviewContent repository={repository} onOpenGroup={setActivePostureGroupId}
            actions={<>
            {canManageLifecycle ? (
              <>
                <TerasContentTray kicker="Use in Delivery" description="Open Delivery’s repository catalog to add this repository or review its existing entry.">
                <TerasActionButton
                  data-repository-catalog-reconcile="true"
                  onClick={() => onOpenDeliveryCatalog(repository)}
                  emphasis="secondary"
                >
                  Open Delivery Catalog
                </TerasActionButton>
                </TerasContentTray>
                <TerasContentTray kicker="Repository changes" description="Transfer responsibility, archive on GitHub, or retire the workspace record.">
                <TerasActionButton
                  data-repository-lifecycle-open="true"
                  onClick={() => {
                    onOpenLifecycle(repository);
                  }}
                  emphasis="primary"
                >
                  Manage Lifecycle
                </TerasActionButton>
                </TerasContentTray>
              </>
            ) : registration.required ? (
              <TerasContentTray kicker="Workspace registration" description={registration.unavailableReason ?? "Review workspace association and registration before adding this repository to the managed workspace."}>
              <TerasActionButton disabled={!registration.available}
                data-repository-intake-open="true" onClick={() => onOpenRegistration(repository)}>
                Continue onboarding in Registry
              </TerasActionButton>
              </TerasContentTray>
            ) : <TerasContentTray kicker="Read-only inspection" description={repository.nextAction} />}
            </>} />
        </div>
      </TerasModalShell>

      <RepositoryAdmissionPostureDialog
        group={activePostureGroup}
        repositoryName={repository.name}
        onClose={() => setActivePostureGroupId(null)}
      />
    </>
  );
}
