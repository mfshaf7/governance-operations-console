"use client";

import { useRef, useState, type FormEvent } from "react";
import { useDraftAdvisor } from "@/agent-console";

import {
  TerasAdvisorPanel,
  TerasContentFrame,
  TerasEmptyState,
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
import { proposalWorkflowClosed } from "../../../../domain/proposal-types.ts";
import { ProposalDispositionRoutePanel } from "./proposal-disposition-route-panel.tsx";
import {
  proposalAcceptedRouteTarget,
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
  const decisionDraftRef = useRef(decisionDraft);
  const routeDraftRef = useRef(routeSelectionDraft);
  decisionDraftRef.current = decisionDraft;
  routeDraftRef.current = routeSelectionDraft;
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

    const next = { ...decisionDraftRef.current, ...patch };
    decisionDraftRef.current = next;
    onChangeDecisionDraft(next);
  }

  function updateRouteSelectionDraft(
    patch: Partial<ProposalRouteSelectionDraft>,
  ) {
    if (dispositionCompleted || !accepting) {
      return;
    }

    const next = { ...routeDraftRef.current, ...patch };
    routeDraftRef.current = next;
    onChangeRouteSelectionDraft(next);
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

  const advisor = useDraftAdvisor({
    disabled: dispositionCompleted,
    getScope: () => ({ role: "proposal-disposition", ref: proposal.id, sourceRef: proposal.backendRecordId,
      sourceRevision: proposal.recordVersion,
      context: JSON.stringify({ title: proposal.title, body: proposal.bodyPreview, status: proposal.status,
        selectedOutcome: decisionDraft.outcome, selectedRoute: routeSelectionDraft.routeTarget,
        boundary: "Outcome and route are operator decisions; only their explanatory drafts are editable." }),
      fields: [{ key: "notes", label: "Decision notes", value: decisionDraft.notes, maxLength: 8000 },
        ...(accepting ? [{ key: "rationale", label: "Route rationale", value: routeSelectionDraft.rationale, maxLength: 8000 }] : [])] }),
    apply: (edits) => {
      const notes = edits.find((edit) => edit.field === "notes");
      const rationale = edits.find((edit) => edit.field === "rationale");
      if (notes) updateDecisionDraft({ notes: String(notes.value) });
      if (rationale) updateRouteSelectionDraft({ rationale: String(rationale.value) });
      return edits;
    },
  });

  async function runAdvisor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (dispositionCompleted) {
      return;
    }

    const prompt = advisorPrompt.trim();

    if (!prompt) {
      return;
    }

    updateDecisionDraft({ advisorPrompt: "" });
    try { const reply = await advisor.run(prompt); updateDecisionDraft({ advisorDraft: reply.message }); }
    catch (error) { updateDecisionDraft({ advisorDraft: error instanceof Error ? error.message : "Governed advisor unavailable." }); }
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
            historicalRouteMissing={proposalWorkflowClosed(proposal) && !routeSelectionDraft.appliedAt}
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
            {proposalWorkflowClosed(proposal) && !decisionDraft.appliedAt ? (
              <TerasEmptyState>
                No decision notes were recorded for this completed proposal.
              </TerasEmptyState>
            ) : (
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
            )}

            <TerasAdvisorPanel
              collapsed={advisorCollapsed}
              density="compact"
              fill
              onToggleCollapsed={toggleAdvisorCollapsed}
              profileLabel="Proposal Disposition Advisor"
              draftControls={advisor.panelControls}
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
