"use client";

import { useState } from "react";

import {
  TerasActionButton,
  TerasStatusItem,
  TerasList,
  TerasDetailGrid,
  TerasFieldStack,
  TerasMetadataList,
  TerasModalShell,
  TerasNoteField,
  TerasPanel,
  TerasPanelHeader,
  TerasSelectField,
  TerasTrayStack,
} from "@/teras";

import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import {
  repositoryGateProjectedRequestMetadata,
  repositoryGateResolutionDraftFromRepository,
  repositoryGateResolutionOption,
  repositoryGateResolutionOptions,
  repositoryGateResolutionProjection,
  type RepositoryGateResolutionDraft,
} from "./repository-gate-resolution-view-model.ts";

export function RepositoryGateResolutionDialog({
  onClose,
  onRecordResolution,
  repository,
}: {
  onClose: () => void;
  onRecordResolution: (
    repository: RepositoryWorkspaceRecord,
    draft: RepositoryGateResolutionDraft,
  ) => void;
  repository: RepositoryWorkspaceRecord | null;
}) {
  const [draft, setDraft] = useState<RepositoryGateResolutionDraft>({
    ...repositoryGateResolutionDraftFromRepository(repository),
  });
  const gateProjection = repositoryGateResolutionProjection({
    draft,
    repository,
  });

  if (!repository) {
    return null;
  }

  function updateDraft(patch: Partial<RepositoryGateResolutionDraft>) {
    setDraft((current) => ({
      ...current,
      ...patch,
    }));
  }

  return (
    <TerasModalShell
      bodyLayout="scroll"
      height="content"
      width="standard"
      description="Record a prototype-local repository gate receipt that Proposal can read before handoff."
      footer={
        <>
          <TerasActionButton onClick={onClose} emphasis="secondary">
            Back
          </TerasActionButton>
          <TerasActionButton
            data-repository-gate-resolution-record="true"
            disabled={!gateProjection.canRecord}
            onClick={() => {
              onRecordResolution(repository, draft);
            }}
          >
            Record Gate Resolution
          </TerasActionButton>
        </>
      }
      kicker="Repository Gate"
      onClose={onClose}
      surfaceId="repository-gate-resolution"
      title="Resolve Repository Gate"
    >
      <TerasDetailGrid
        data-repository-gate-resolution-modal="true"
        scrollGutter
        variant="balanced"
      >
        <TerasPanel frame="padded" treatment="rail" fit="content" tone="warn">
          <TerasPanelHeader
            actionsLayout="inline"
            description={repository.boundary}
            kicker="Request Record"
            statusLabel="Pending"
            statusTone="warn"
            title={repository.name}
          />
          <TerasTrayStack spacing="loose" topOffset="section">
            <TerasMetadataList
              items={repositoryGateProjectedRequestMetadata(repository)}
            />
            <TerasList>
              <TerasStatusItem
                tone="ok"
                detail="Proposal requested a new repository path."
                index="01"
                label="Proposal gate"
                status="captured"
              />
              <TerasStatusItem
                tone={gateProjection.ownerTone}
                detail={gateProjection.ownerDetail}
                index="02"
                label="Owner repo"
                status={gateProjection.ownerStatusLabel}
              />
              <TerasStatusItem
                tone={gateProjection.repoRefTone}
                detail={gateProjection.repoRefDetail}
                index="03"
                label="Repository ref"
                status={gateProjection.repoRefStatusLabel}
              />
            </TerasList>
          </TerasTrayStack>
        </TerasPanel>

        <TerasPanel
          frame="padded"
          treatment="rail"
          fit="content"
          tone={gateProjection.receiptTone}
        >
          <TerasPanelHeader
            actionsLayout="inline"
            description="This writes a local receipt only. Proposal reads the receipt and can continue to handoff; durable repository mutation remains future backend work."
            kicker="Resolution Receipt"
            statusLabel={gateProjection.receiptStatusLabel}
            statusTone={gateProjection.receiptTone}
            title="Repository gate outcome"
          />
          <TerasTrayStack spacing="loose" topOffset="section">
            <TerasFieldStack spacing="loose">
              <TerasSelectField
                aria-label="Owner repository"
                label="Owner repository"
                onValueChange={(value) => {
                  const selection = repositoryGateResolutionOption(value);

                  updateDraft({
                    resolvedOwner: selection?.owner ?? "",
                    resolvedRepoRef: selection?.repoRef ?? "",
                  });
                }}
                options={[
                  { label: "Select admitted owner repo", value: "" },
                  ...repositoryGateResolutionOptions(),
                ]}
                value={draft.resolvedRepoRef}
              />
              <TerasNoteField
                aria-label="Resolution notes"
                label="Resolution notes"
                onValueChange={(value) => updateDraft({ notes: value })}
                placeholder="Record why this owner repo resolves the Proposal repository gate."
                value={draft.notes}
              />
            </TerasFieldStack>
          </TerasTrayStack>
        </TerasPanel>
      </TerasDetailGrid>
    </TerasModalShell>
  );
}
