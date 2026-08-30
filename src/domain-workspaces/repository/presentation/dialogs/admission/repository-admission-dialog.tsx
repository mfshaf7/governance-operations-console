"use client";

import { useState } from "react";

import {
  TerasActionButton,
  TerasStatusItem,
  TerasList,
  TerasContentTray,
  TerasDetailGrid,
  TerasMetadataList,
  TerasModalShell,
  TerasPanel,
  TerasPanelHeader,
  TerasTrayStack,
} from "@/teras";

import type { RepositoryAdmissionReceipt } from "../../../local-runtime/repository-runtime.ts";
import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import {
  repositoryAdmissionPosturePanelProjection,
  repositoryBlockerDetail,
  repositoryBlockerSeverityLabel,
} from "./repository-admission-view-model.ts";
import {
  repositoryContextMetadata,
  repositoryRecordStatusLabel,
} from "../../shared/repository-display-model.ts";
import {
  RepositoryAdmissionPostureDialog,
  RepositoryAdmissionPostureList,
} from "./repository-admission-posture.tsx";

export function RepositoryAdmissionDialog({
  onClose,
  onOpenHistory,
  onOpenLifecycle,
  onStart,
  receipt,
  repository,
}: {
  onClose: () => void;
  onOpenHistory: (repository: RepositoryWorkspaceRecord) => void;
  onOpenLifecycle: (repository: RepositoryWorkspaceRecord) => void;
  onStart: (repository: RepositoryWorkspaceRecord) => void;
  receipt?: RepositoryAdmissionReceipt;
  repository: RepositoryWorkspaceRecord | null;
}) {
  const [activePostureGroupId, setActivePostureGroupId] = useState<
    string | null
  >(null);
  const canStart = Boolean(
    repository &&
    repository.blockers.length === 0 &&
    repository.admissionState === "ready" &&
    !receipt,
  );
  const canManageLifecycle = Boolean(
    repository && repository.admissionState === "admitted",
  );
  const isAdmittedRecord = repository?.admissionState === "admitted";
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

  const postureProjection =
    repositoryAdmissionPosturePanelProjection(repository);

  return (
    <>
      <TerasModalShell
        bodyLayout="scroll"
        height="content"
        width="standard"
        description={repository.purpose}
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
            {canManageLifecycle ? (
              <TerasActionButton
                data-repository-lifecycle-open="true"
                onClick={() => {
                  onOpenLifecycle(repository);
                }}
                emphasis="primary"
              >
                Manage Lifecycle
              </TerasActionButton>
            ) : (
              <TerasActionButton
                disabled={!canStart}
                onClick={() => {
                  onStart(repository);
                }}
              >
                Start Admission Review
              </TerasActionButton>
            )}
          </>
        }
        kicker={isAdmittedRecord ? "Repository Review" : "Repository Admission"}
        onClose={closeAdmissionDialog}
        surfaceId="repository-admission"
        title="Repository Admission"
      >
        <TerasDetailGrid
          data-repository-admission-modal="true"
          scrollGutter
          variant="balanced"
        >
          <TerasPanel
            frame="padded"
            treatment="rail"
            fit="content"
            tone={postureProjection.tone}
          >
            <TerasPanelHeader
              description={postureProjection.description}
              kicker={postureProjection.kicker}
              title={postureProjection.title}
            />
            <TerasTrayStack spacing="loose" topOffset="section">
              <RepositoryAdmissionPostureList
                activeGroupId={activePostureGroupId}
                groups={repository.admissionPosture}
                onOpenGroup={setActivePostureGroupId}
              />
            </TerasTrayStack>
          </TerasPanel>

          <TerasTrayStack align="start" spacing="loose">
            <TerasPanel frame="padded" treatment="rail" tone={repository.tone}>
              <TerasPanelHeader
                actionsLayout="inline"
                description={repository.purpose}
                kicker="Repository Context"
                statusLabel={repositoryRecordStatusLabel(repository)}
                statusTone={repository.tone}
                title={repository.name}
              />
              <TerasTrayStack spacing="loose" topOffset="section">
                <TerasMetadataList
                  items={repositoryContextMetadata(repository)}
                />
              </TerasTrayStack>
            </TerasPanel>

            {repository.blockers.length > 0 ? (
              <TerasContentTray kicker="Blocking Issues">
                <TerasList>
                  {repository.blockers.map((blocker, index) => (
                    <TerasStatusItem
                      tone={blocker.severity === "blocked" ? "danger" : "warn"}
                      detail={repositoryBlockerDetail(blocker)}
                      index={String(index + 1).padStart(2, "0")}
                      key={blocker.id}
                      label={blocker.label}
                      status={repositoryBlockerSeverityLabel(blocker.severity)}
                    />
                  ))}
                </TerasList>
              </TerasContentTray>
            ) : (
              <TerasContentTray
                description="No blocking repository issues are present in the current record."
                kicker="Blocking Issues"
              />
            )}
          </TerasTrayStack>
        </TerasDetailGrid>
      </TerasModalShell>

      <RepositoryAdmissionPostureDialog
        group={activePostureGroup}
        onClose={() => setActivePostureGroupId(null)}
      />
    </>
  );
}
