"use client";

import { useState, type FormEvent } from "react";

import {
  TerasAdvisorPanel,
  TerasContentFrame,
  TerasPanelStack,
  TerasSubjectHero,
  TerasZone,
  TerasZoneLayout,
} from "@/teras";

import {
  proposalRepositoryRequestRef,
  proposalRouteSelectionSupportsRepository,
  type ProposalDecisionDraft,
  type ProposalDecisionOutcome,
  type ProposalRouteSelectionDraft,
  type ProposalRouteSelectionRepoMode,
  type ProposalRouteSelectionTarget,
} from "../../../../work-model/proposal-disposition-model.ts";
import type { ProposalWorkflowNavigationTarget } from "../../../../work-model/proposal-workflow-navigation.ts";
import type { ProposalWorkflowStepProjection } from "../../../../work-model/proposal-workflow-step-model.ts";
import type { ProposalWorkspaceScenario } from "../../../../read-model/proposal-workspace-read-model.ts";
import { ProposalWorkflowProgressPanel } from "../../session/proposal-workflow-progress-panel.tsx";
import { proposalSubjectMetadata } from "../../../shared/proposal-display-model.ts";
import { ProposalDispositionDecisionPanel } from "./proposal-disposition-decision-panel.tsx";
import { ProposalDispositionRoutePanel } from "./proposal-disposition-route-panel.tsx";
import {
  proposalAcceptedRouteTarget,
  proposalDispositionAdvisorDraft,
  proposalDispositionStepProjection,
  proposalRegisteredRepoOptions,
} from "./proposal-disposition-step-view-model.ts";

export function ProposalDispositionStep({
  decisionDraft,
  onApplyDraft,
  onChangeDecisionDraft,
  onChangeRouteSelectionDraft,
  onOpenDetails,
  onSelectStep,
  proposal,
  progressSteps,
  readOnly = false,
  routeSelectionDraft,
}: {
  decisionDraft: ProposalDecisionDraft;
  onApplyDraft: () => void;
  onChangeDecisionDraft: (draft: ProposalDecisionDraft) => void;
  onChangeRouteSelectionDraft: (draft: ProposalRouteSelectionDraft) => void;
  onOpenDetails: () => void;
  onSelectStep: (step: ProposalWorkflowNavigationTarget) => void;
  proposal: ProposalWorkspaceScenario;
  progressSteps: ProposalWorkflowStepProjection[];
  readOnly?: boolean;
  routeSelectionDraft: ProposalRouteSelectionDraft;
}) {
  const {
    accepting,
    actionLabel,
    advisorPrompt,
    advisorStatusLabel,
    advisorStatusTitle,
    advisorStatusTone,
    advisorTranscript,
    canApply,
    decisionDescription,
    decisionTitle,
    dispositionCompleted,
    dispositionTone,
    progressTitle,
    routeHasRepositoryGate,
    routeSupportsRepository,
    selectedRepo,
    statusLabel,
  } = proposalDispositionStepProjection({
    decisionDraft,
    proposal,
    readOnly,
    routeSelectionDraft,
  });
  const [advisorCollapsed, setAdvisorCollapsed] = useState(true);
  const decisionPanelCollapsed = !advisorCollapsed;
  const toggleAdvisorCollapsed = () =>
    setAdvisorCollapsed((current) => !current);

  function updateDecisionDraft(patch: Partial<ProposalDecisionDraft>) {
    if (dispositionCompleted) {
      return;
    }

    onChangeDecisionDraft({
      ...decisionDraft,
      ...patch,
    });
  }

  function updateRouteSelectionDraft(
    patch: Partial<ProposalRouteSelectionDraft>,
  ) {
    if (dispositionCompleted || !accepting) {
      return;
    }

    onChangeRouteSelectionDraft({
      ...routeSelectionDraft,
      ...patch,
    });
  }

  function selectOutcome(outcome: ProposalDecisionOutcome) {
    if (dispositionCompleted) {
      return;
    }

    updateDecisionDraft({ outcome });

    if (outcome === "accepted") {
      const routeTarget =
        routeSelectionDraft.routeTarget === "Parked"
          ? proposalAcceptedRouteTarget(proposal)
          : routeSelectionDraft.routeTarget;
      const routeSupportsSelectionRepo =
        proposalRouteSelectionSupportsRepository(routeTarget);
      const keepRepositoryFields =
        routeSupportsSelectionRepo &&
        routeSelectionDraft.repoMode !== "not-required";

      onChangeRouteSelectionDraft({
        ...routeSelectionDraft,
        repoMode: routeSupportsSelectionRepo
          ? routeSelectionDraft.repoMode
          : "not-required",
        repoOwner: keepRepositoryFields ? routeSelectionDraft.repoOwner : "",
        repoRef: keepRepositoryFields
          ? routeSelectionDraft.repoRef ||
            (routeSelectionDraft.repoMode === "new"
              ? proposalRepositoryRequestRef(proposal.id)
              : "")
          : "",
        routeTarget,
      });
      return;
    }

    if (outcome === "parked") {
      onChangeRouteSelectionDraft({
        ...routeSelectionDraft,
        repoMode: "not-required",
        repoOwner: "",
        repoRef: "",
        routeTarget: "Parked",
      });
    }
  }

  function selectRouteTarget(routeTarget: ProposalRouteSelectionTarget) {
    if (!proposalRouteSelectionSupportsRepository(routeTarget)) {
      updateRouteSelectionDraft({
        repoMode: "not-required",
        repoOwner: "",
        repoRef: "",
        routeTarget,
      });
      return;
    }

    updateRouteSelectionDraft({
      repoMode: routeSelectionDraft.repoMode,
      repoOwner:
        routeSelectionDraft.repoMode === "not-required"
          ? ""
          : routeSelectionDraft.repoOwner,
      repoRef:
        routeSelectionDraft.repoMode === "not-required"
          ? ""
          : routeSelectionDraft.repoRef ||
            (routeSelectionDraft.repoMode === "new"
              ? proposalRepositoryRequestRef(proposal.id)
              : ""),
      routeTarget,
    });
  }

  function selectRepoMode(repoMode: ProposalRouteSelectionRepoMode) {
    if (!routeSupportsRepository || repoMode === "not-required") {
      updateRouteSelectionDraft({
        repoMode: "not-required",
        repoOwner: "",
        repoRef: "",
      });
      return;
    }

    updateRouteSelectionDraft({
      repoMode,
      repoOwner:
        repoMode === "new"
          ? "Repository Operation"
          : routeSelectionDraft.repoOwner,
      repoRef:
        repoMode === "new" ? proposalRepositoryRequestRef(proposal.id) : "",
    });
  }

  function selectRegisteredRepo(repoRef: string) {
    const repo =
      proposalRegisteredRepoOptions.find(
        (option) => option.value === repoRef,
      ) ?? null;

    updateRouteSelectionDraft({
      repoOwner: repo?.label ?? "",
      repoRef: repo?.value ?? "",
    });
  }

  function runAdvisor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (dispositionCompleted) {
      return;
    }

    const prompt = advisorPrompt.trim();

    if (!prompt) {
      return;
    }

    updateDecisionDraft({
      advisorDraft: proposalDispositionAdvisorDraft({
        accepting,
        decisionDraft,
        proposal,
        prompt,
        routeHasRepositoryGate,
        routeSelectionDraft,
      }),
      advisorPrompt: "",
    });
  }

  return (
    <TerasContentFrame
      fill
      variant="standard"
      data-proposal-disposition-modal="true"
    >
      <ProposalWorkflowProgressPanel
        description="Record accept and route together, or park/reject without opening the handoff path."
        onSelectStep={onSelectStep}
        statusLabel={statusLabel}
        statusTone={dispositionTone}
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
          <ProposalDispositionRoutePanel
            accepting={accepting}
            decisionDraft={decisionDraft}
            dispositionCompleted={dispositionCompleted}
            onRegisteredRepoSelect={selectRegisteredRepo}
            onRepoModeSelect={selectRepoMode}
            onRouteDraftPatch={updateRouteSelectionDraft}
            onRouteTargetSelect={selectRouteTarget}
            routeHasRepositoryGate={routeHasRepositoryGate}
            routeSelectionDraft={routeSelectionDraft}
            routeSupportsRepository={routeSupportsRepository}
            selectedRepo={selectedRepo}
          />
        </TerasZone>

        <TerasZone fit="fill">
          <TerasPanelStack fill={decisionPanelCollapsed ? "last" : "first"}>
            <ProposalDispositionDecisionPanel
              actionLabel={actionLabel}
              canApply={canApply}
              collapsed={decisionPanelCollapsed}
              decisionDraft={decisionDraft}
              description={decisionDescription}
              decisionTitle={decisionTitle}
              dispositionCompleted={dispositionCompleted}
              dispositionTone={dispositionTone}
              onApplyDraft={onApplyDraft}
              onNotesChange={(notes) => updateDecisionDraft({ notes })}
              onSelectOutcome={selectOutcome}
              onToggleCollapsed={toggleAdvisorCollapsed}
              statusLabel={statusLabel}
            />

            <TerasAdvisorPanel
              collapsed={advisorCollapsed}
              density="compact"
              fill
              onToggleCollapsed={toggleAdvisorCollapsed}
              profileLabel="Proposal Disposition Advisor"
              prompt={{
                ariaLabel: "Proposal disposition advisor prompt",
                disabled: dispositionCompleted,
                onChange: (value) =>
                  updateDecisionDraft({ advisorPrompt: value }),
                onSubmit: runAdvisor,
                placeholder: "Ask the advisor to challenge outcome or route...",
                readOnly: dispositionCompleted,
                rows: 3,
                value: advisorPrompt,
              }}
              statusLabel={advisorStatusLabel}
              statusTitle={advisorStatusTitle}
              statusTone={advisorStatusTone}
              transcript={advisorTranscript}
            />
          </TerasPanelStack>
        </TerasZone>
      </TerasZoneLayout>
    </TerasContentFrame>
  );
}
