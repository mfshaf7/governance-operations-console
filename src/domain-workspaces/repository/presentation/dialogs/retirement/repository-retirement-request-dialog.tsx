"use client";

import {
  TerasActionButton,
  TerasStatusItem,
  TerasList,
  TerasDetailGrid,
  TerasContentTray,
  TerasMetadataList,
  TerasModalShell,
  TerasPanel,
  TerasPanelHeader,
  TerasTrayStack,
} from "@/teras";

import type { RepositoryRetirementRequestReceipt } from "../../../local-runtime/repository-runtime.ts";
import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import {
  repositoryRetirementBoundaryProjection,
  repositoryRetirementMetadata,
  repositoryRetirementRequestChecklist,
  repositoryRetirementRequestPanelProjection,
} from "./repository-retirement-view-model.ts";

export function RepositoryRetirementRequestDialog({
  onClose,
  onRequestRecord,
  receipt,
  repository,
}: {
  onClose: () => void;
  onRequestRecord: () => void;
  receipt?: RepositoryRetirementRequestReceipt;
  repository: RepositoryWorkspaceRecord | null;
}) {
  const checklist = repositoryRetirementRequestChecklist(receipt);

  if (!repository) {
    return null;
  }

  const requestProjection = repositoryRetirementRequestPanelProjection(receipt);
  const boundaryProjection = repositoryRetirementBoundaryProjection(receipt);

  return (
    <TerasModalShell
      bodyLayout="scroll"
      height="content"
      width="standard"
      description="Prepare a prototype-local retirement request for an admitted repository. Real retirement still belongs to the future owner-routed workflow."
      footer={
        <>
          <TerasActionButton onClick={onClose} emphasis="secondary">
            Back to Register
          </TerasActionButton>
          <TerasActionButton
            data-repository-retirement-request-record="true"
            disabled={Boolean(receipt)}
            onClick={onRequestRecord}
            tone="danger"
            emphasis="primary"
          >
            Record Retirement Request
          </TerasActionButton>
        </>
      }
      kicker="Repository Retirement"
      onClose={onClose}
      surfaceId="repository-retirement-request"
      title="Repository Retirement"
    >
      <TerasDetailGrid
        data-repository-retirement-request-modal="true"
        scrollGutter
        variant="balanced"
      >
        <TerasTrayStack align="start" spacing="loose">
          <TerasPanel
            frame="padded"
            treatment="rail"
            tone={requestProjection.tone}
          >
            <TerasPanelHeader
              actionsLayout="inline"
              description={requestProjection.description}
              kicker={requestProjection.kicker}
              statusLabel={requestProjection.statusLabel}
              statusTone={requestProjection.statusTone}
              title={requestProjection.title}
            />
            <TerasTrayStack spacing="loose" topOffset="section">
              <TerasList>
                {checklist.map((item, index) => (
                  <TerasStatusItem
                    tone={item.tone}
                    detail={item.detail}
                    index={String(index + 1).padStart(2, "0")}
                    key={item.label}
                    label={item.label}
                    status={item.status}
                  />
                ))}
              </TerasList>
            </TerasTrayStack>
          </TerasPanel>
        </TerasTrayStack>

        <TerasTrayStack align="start" spacing="loose">
          <TerasPanel frame="padded" treatment="rail" tone="danger">
            <TerasPanelHeader
              actionsLayout="inline"
              description={repository.purpose}
              kicker="Admitted Repository"
              statusLabel="Retirement"
              statusTone="danger"
              title={repository.name}
            />
            <TerasTrayStack spacing="loose" topOffset="section">
              <TerasMetadataList
                items={repositoryRetirementMetadata(repository)}
              />
            </TerasTrayStack>
          </TerasPanel>

          <TerasContentTray
            data-repository-retirement-request-receipt={
              receipt ? "true" : undefined
            }
            description={boundaryProjection.description}
            kicker={boundaryProjection.kicker}
          />
        </TerasTrayStack>
      </TerasDetailGrid>
    </TerasModalShell>
  );
}
