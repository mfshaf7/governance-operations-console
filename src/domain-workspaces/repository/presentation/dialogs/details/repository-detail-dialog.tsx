"use client";

import { useState } from "react";

import {
  TerasStatusItem,
  TerasList,
  TerasDetailGrid,
  TerasDialog,
  TerasActionButton,
  TerasContentTray,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasTrayStack,
} from "@/teras";

import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import { repositoryCanResolveProposalGate } from "../../shared/repository-control-projection.ts";
import {
  repositoryBlockerDetail,
  repositoryBlockerSeverityLabel,
} from "../admission/repository-admission-view-model.ts";
import { repositoryDetailDialogProjection } from "./repository-detail-view-model.ts";
import {
  repositoryContextMetadata,
  repositoryRecordStatusLabel,
} from "../../shared/repository-display-model.ts";
import {
  RepositoryAdmissionPostureDialog,
  RepositoryAdmissionPostureList,
} from "../admission/repository-admission-posture.tsx";

export function RepositoryDetailDialog({
  onClose,
  onOpenHistory,
  onResolveProposalGate,
  repository,
}: {
  onClose: () => void;
  onOpenHistory: (repository: RepositoryWorkspaceRecord) => void;
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
              {isBlockedRecord && canResolveProposalGate ? (
                <TerasActionButton
                  data-repository-gate-resolution-open="true"
                  onClick={() => onResolveProposalGate(repository)}
                >
                  Resolve Repository Gate
                </TerasActionButton>
              ) : null}
            </>
          ) : undefined
        }
        closeLabel={detailProjection.closeLabel}
        description={detailProjection.description}
        kicker="Repository Record"
        onClose={closeDetailDialog}
        open={Boolean(repository)}
        title={detailProjection.title}
      >
        {repository ? (
          <TerasDetailGrid
            data-repository-detail-modal="true"
            scrollGutter
            variant="balanced"
          >
            <TerasTrayStack align="start" spacing="loose">
              <TerasPanel
                frame="padded"
                treatment="rail"
                tone={detailProjection.postureTone}
              >
                <TerasPanelHeader
                  description="Repository admission posture from the current control record."
                  kicker={detailProjection.postureKicker}
                  title={detailProjection.postureTitle}
                />
                <TerasTrayStack spacing="loose" topOffset="section">
                  <RepositoryAdmissionPostureList
                    activeGroupId={activePostureGroupId}
                    groups={repository.admissionPosture}
                    onOpenGroup={setActivePostureGroupId}
                  />
                </TerasTrayStack>
              </TerasPanel>
              {isRetiredRecord ? (
                <TerasContentTray
                  description="This repository is already retired. The console should not offer another retirement action for it. Reopening or reversing retirement requires an explicit workspace-governance decision outside this prototype."
                  kicker="Retirement Handling"
                />
              ) : null}
            </TerasTrayStack>

            <TerasTrayStack align="start" spacing="loose">
              <TerasPanel
                frame="padded"
                treatment="rail"
                tone={detailProjection.repositoryTone}
              >
                <TerasPanelHeader
                  actionsLayout="inline"
                  description={repository.purpose}
                  kicker="Repository Context"
                  statusLabel={repositoryRecordStatusLabel(repository)}
                  statusTone={detailProjection.repositoryTone}
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
                        tone={
                          blocker.severity === "blocked" ? "danger" : "warn"
                        }
                        detail={repositoryBlockerDetail(blocker)}
                        index={String(index + 1).padStart(2, "0")}
                        key={blocker.id}
                        label={blocker.label}
                        status={repositoryBlockerSeverityLabel(
                          blocker.severity,
                        )}
                      />
                    ))}
                  </TerasList>
                </TerasContentTray>
              ) : !isBlockedRecord && !isRetiredRecord ? (
                <TerasContentTray
                  description="No repository blocker is listed for this record."
                  kicker="Blocking Issues"
                />
              ) : null}
            </TerasTrayStack>
          </TerasDetailGrid>
        ) : null}
      </TerasDialog>

      <RepositoryAdmissionPostureDialog
        group={activePostureGroup}
        onClose={() => setActivePostureGroupId(null)}
      />
    </>
  );
}
