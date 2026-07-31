"use client";

import type { FormEvent } from "react";

import {
  TerasActionRow,
  TerasAdvisorPanel,
  TerasActionButton,
  TerasFieldStack,
  TerasContentFrame,
  TerasNoteField,
  TerasPanel,
  TerasPanelHeader,
  TerasReadoutField,
  TerasSubjectHero,
  TerasZone,
  TerasZoneLayout,
} from "@/teras";

import type { ProposalTriageDraft } from "../../../../work-model/proposal-triage-model.ts";
import type { ProposalWorkflowNavigationTarget } from "../../../../work-model/proposal-workflow-navigation.ts";
import type { ProposalWorkflowStepProjection } from "../../../../work-model/proposal-workflow-step-model.ts";
import type { ProposalWorkspaceScenario } from "../../../../read-model/proposal-workspace-read-model.ts";
import { ProposalWorkflowProgressPanel } from "../../session/proposal-workflow-progress-panel.tsx";
import { proposalSubjectMetadata } from "../../../shared/proposal-display-model.ts";
import {
  proposalTriageAdvisorDraft,
  proposalTriageStepProjection,
} from "./proposal-triage-step-view-model.ts";

export function ProposalTriageStep({
  draft,
  onApplyDraft,
  onChangeDraft,
  onOpenDetails,
  onSelectStep,
  proposal,
  progressSteps,
  readOnly = false,
}: {
  draft: ProposalTriageDraft;
  onApplyDraft: () => void;
  onChangeDraft: (draft: ProposalTriageDraft) => void;
  onOpenDetails: () => void;
  onSelectStep: (step: ProposalWorkflowNavigationTarget) => void;
  proposal: ProposalWorkspaceScenario;
  progressSteps: ProposalWorkflowStepProjection[];
  readOnly?: boolean;
}) {
  const {
    advisorStatusLabel,
    advisorStatusTitle,
    advisorStatusTone,
    advisorTranscript,
    canApply,
    gateStatusLabel,
    gateTitle,
    progressStatusLabel,
    progressTitle,
    triageActionDescription,
    triageActionLabel,
    triageLocked,
    triageTone,
  } = proposalTriageStepProjection({
    draft,
    proposal,
    readOnly,
  });

  function updateDraft(patch: Partial<ProposalTriageDraft>) {
    if (triageLocked) {
      return;
    }

    onChangeDraft({
      ...draft,
      ...patch,
    });
  }

  function runAdvisor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (triageLocked) {
      return;
    }

    const prompt = draft.advisorPrompt.trim();

    if (!prompt) {
      return;
    }

    updateDraft({
      advisorDraft: proposalTriageAdvisorDraft({ proposal, prompt }),
      advisorPrompt: "",
    });
  }

  return (
    <TerasContentFrame
      fill
      variant="standard"
      data-proposal-triage-modal="true"
    >
      <ProposalWorkflowProgressPanel
        description="Write the short triage summary the Disposition step can consume."
        onSelectStep={onSelectStep}
        statusLabel={progressStatusLabel}
        statusTone={triageTone}
        steps={progressSteps}
        title={progressTitle}
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
          <TerasPanel
            frame="padded"
            treatment="state"
            layout="header-body"
            overflow="hidden"
            spacing="normal"
            tone="info"
          >
            <TerasPanelHeader
              description="Write one source summary for the Disposition step. Do not choose route, repository, acceptance, rejection, parking, or handoff here."
              kicker="Triage Draft"
              title="Triage summary"
            />
            <TerasFieldStack fill="last" spacing="loose">
              <TerasReadoutField
                label="Body Preview"
                scrollHeight="medium"
                treatment="quote"
                value={proposal.bodyPreview}
              />
              <TerasNoteField
                fill
                label="Summary"
                onValueChange={(value) => updateDraft({ summary: value })}
                placeholder="Summarize source completeness, confidence, missing context, and what the Disposition step should know."
                readOnly={triageLocked}
                value={draft.summary}
              />
            </TerasFieldStack>
          </TerasPanel>
        </TerasZone>

        <TerasZone fit="fill">
          <TerasPanel
            frame="padded"
            treatment="rail"
            spacing="normal"
            tone={triageTone}
          >
            <TerasPanelHeader
              description={triageActionDescription}
              kicker="Triage Gate"
              statusLabel={gateStatusLabel}
              statusTone={triageTone}
              title={gateTitle}
            />
            <TerasActionRow>
              <TerasActionButton
                data-proposal-triage-primary-action="true"
                disabled={triageLocked || !canApply}
                emphasis="primary"
                onClick={onApplyDraft}
                tone="accent"
              >
                {triageActionLabel}
              </TerasActionButton>
            </TerasActionRow>
          </TerasPanel>

          <TerasAdvisorPanel
            fill
            profileLabel="Proposal Triage Advisor"
            prompt={{
              ariaLabel: "Proposal triage advisor prompt",
              disabled: triageLocked,
              onChange: (value) => updateDraft({ advisorPrompt: value }),
              onSubmit: runAdvisor,
              placeholder: "Ask the advisor to challenge source context...",
              readOnly: triageLocked,
              rows: 3,
              value: draft.advisorPrompt,
            }}
            statusLabel={advisorStatusLabel}
            statusTitle={advisorStatusTitle}
            statusTone={advisorStatusTone}
            transcript={advisorTranscript}
          />
        </TerasZone>
      </TerasZoneLayout>
    </TerasContentFrame>
  );
}
