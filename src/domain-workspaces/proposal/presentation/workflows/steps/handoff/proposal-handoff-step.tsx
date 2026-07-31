"use client";

import {
  TerasContentFrame,
  TerasContentRegion,
  TerasSubjectHero,
  TerasZone,
  TerasZoneLayout,
} from "@/teras";

import type { ProposalRepositoryGateResolution } from "../../../../../operation-integrations/proposal-repository-request-projection.ts";
import type { ProposalHandoffDraft } from "../../../../work-model/proposal-handoff-model.ts";
import type { ProposalRouteSelectionDraft } from "../../../../work-model/proposal-disposition-model.ts";
import type { ProposalWorkflowNavigationTarget } from "../../../../work-model/proposal-workflow-navigation.ts";
import type { ProposalWorkflowStepProjection } from "../../../../work-model/proposal-workflow-step-model.ts";
import type { ProposalWorkspaceScenario } from "../../../../read-model/proposal-workspace-read-model.ts";
import { ProposalWorkflowProgressPanel } from "../../session/proposal-workflow-progress-panel.tsx";
import { proposalSubjectMetadata } from "../../../shared/proposal-display-model.ts";
import { ProposalHandoffApplyPanel } from "./proposal-handoff-apply-panel.tsx";
import { ProposalHandoffRepositoryGatePanel } from "./proposal-handoff-repository-gate-panel.tsx";
import { ProposalHandoffRouteStatePanel } from "./proposal-handoff-route-state-panel.tsx";
import { proposalHandoffStepProjection } from "./proposal-handoff-step-view-model.ts";

export function ProposalHandoffStep({
  draft,
  onApplyDraft,
  onChangeDraft,
  onOpenDetails,
  onOpenRepositorySurface,
  onSelectStep,
  proposal,
  progressSteps,
  readOnly = false,
  repositoryGateResolution,
  routeSelectionDraft,
  workflowReady = true,
}: {
  draft: ProposalHandoffDraft;
  onApplyDraft: () => void;
  onChangeDraft: (draft: ProposalHandoffDraft) => void;
  onOpenDetails: () => void;
  onOpenRepositorySurface?: (proposalId: string) => void;
  onSelectStep: (step: ProposalWorkflowNavigationTarget) => void;
  proposal: ProposalWorkspaceScenario;
  progressSteps: ProposalWorkflowStepProjection[];
  readOnly?: boolean;
  repositoryGateResolution?: ProposalRepositoryGateResolution | null;
  routeSelectionDraft: ProposalRouteSelectionDraft;
  workflowReady?: boolean;
}) {
  const projection = proposalHandoffStepProjection({
    draft,
    readOnly,
    repositoryGateResolution,
    routeSelectionDraft,
    workflowReady,
  });
  const {
    handoffPanelTitle,
    handoffRecorded,
    handoffStatusLabel,
    handoffTone,
    repositoryCueAction,
    repositoryCueActionTone,
    repositoryCueActionEmphasis,
    repositoryCueBody,
    repositoryCueState,
    repositoryCueTitle,
    repositoryCueTone,
    repositoryGateBlocked,
    repositoryGateLabel,
    repositoryGateOwner,
    repositoryGateRef,
    repositoryGateResolved,
    routeHasRepositoryGate,
    workflowBlocked,
  } = projection;

  function updateDraft(patch: Partial<ProposalHandoffDraft>) {
    if (handoffRecorded || workflowBlocked || repositoryGateBlocked) {
      return;
    }

    onChangeDraft({
      ...draft,
      ...patch,
    });
  }

  return (
    <TerasContentFrame
      fill
      variant="standard"
      data-proposal-handoff-modal="true"
    >
      <ProposalWorkflowProgressPanel
        description="Review the selected route and repository handling, then record whether the handoff review is clear or blocked."
        onSelectStep={onSelectStep}
        statusLabel={handoffStatusLabel}
        statusTone={handoffTone}
        steps={progressSteps}
        title={handoffPanelTitle}
      />

      <TerasZoneLayout variant="main-aside">
        <TerasZone fit="fill">
          <TerasSubjectHero
            actionDetail="Brief and source facts"
            actionLabel="Open Proposal Record"
            onAction={onOpenDetails}
            subject={{
              eyebrow: "Selected Proposal",
              meta: proposalSubjectMetadata(proposal),
              title: proposal.title,
            }}
          />
          <TerasContentRegion fill gap="normal" scroll>
            <ProposalHandoffRouteStatePanel
              repositoryGateLabel={repositoryGateLabel}
              repositoryGateOwner={repositoryGateOwner}
              repositoryGateResolved={repositoryGateResolved}
              routeSelectionDraft={routeSelectionDraft}
            />
            <ProposalHandoffRepositoryGatePanel
              onOpenRepositorySurface={onOpenRepositorySurface}
              proposalId={proposal.id}
              repositoryCueAction={repositoryCueAction}
              repositoryCueActionTone={repositoryCueActionTone}
              repositoryCueActionEmphasis={repositoryCueActionEmphasis}
              repositoryCueBody={repositoryCueBody}
              repositoryCueState={repositoryCueState}
              repositoryCueTitle={repositoryCueTitle}
              repositoryCueTone={repositoryCueTone}
              repositoryGateRef={repositoryGateRef}
              routeHasRepositoryGate={routeHasRepositoryGate}
            />
          </TerasContentRegion>
        </TerasZone>

        <TerasZone fit="fill">
          <ProposalHandoffApplyPanel
            draft={draft}
            onApplyDraft={onApplyDraft}
            onNotesChange={(value) => updateDraft({ notes: value })}
            projection={projection}
            routeSelectionDraft={routeSelectionDraft}
          />
        </TerasZone>
      </TerasZoneLayout>
    </TerasContentFrame>
  );
}
