"use client";

import { proposalWorkflowTextLimit } from "../../../../work-model/proposal-text-limits.ts";

import { useProposalExistingRepositories } from "../../../../../operation-integrations/use-proposal-existing-repositories.ts";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useDraftAdvisor } from "@/agent-console";

import {
  TerasAdvisorPanel,
  TerasActionButton,
  TerasContentTray,
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
  proposalStudioSelection,
  proposalUsesPrototypeStudio,
  proposalCanReviewSourceHome,
  type ProposalRepositoryChoice,
  type ProposalDecisionDraft,
  type ProposalDecisionOutcome,
  type ProposalRouteSelectionDraft,
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
  const repositories = useProposalExistingRepositories();
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
    canApply: draftCanApply,
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
    registeredRepositories: repositories.options,
    decisionDraft,
    proposal,
    readOnly,
    routeSelectionDraft,
  });
  const canApply = draftCanApply && (!accepting || routeSelectionDraft.repoMode !== "existing" ||
    (repositories.ready && repositories.options.some(repo => repo.value === routeSelectionDraft.repoRef)));
  useEffect(() => {
    const current = routeDraftRef.current;
    if (dispositionCompleted || !accepting || !repositories.ready ||
        !proposalUsesPrototypeStudio(current) || current.repoOwner) return;
    const selected = proposalStudioSelection(repositories.options);
    if (!selected.repoOwner) return;
    const next = { ...current, ...selected };
    routeDraftRef.current = next;
    onChangeRouteSelectionDraft(next);
  }, [accepting, dispositionCompleted, repositories.ready, repositories.options, onChangeRouteSelectionDraft]);
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
    if (dispositionCompleted || decisionDraft.sourceHomeCorrection) {
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
    if (decisionDraft.sourceHomeCorrection) return;
    if (routeTarget === "Prototype" && (routeSelectionDraft.repoMode === "not-required" ||
        (routeSelectionDraft.repoMode === "existing" && !routeSelectionDraft.repoRef))) {
      updateRouteSelectionDraft({ routeTarget, ...proposalStudioSelection(repositories.ready ? repositories.options : []) });
      return;
    }
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

  function selectRepoMode(repoMode: ProposalRepositoryChoice) {
    if (repoMode === "studio") {
      updateRouteSelectionDraft(proposalStudioSelection(repositories.ready ? repositories.options : []));
      return;
    }
    if (routeSelectionDraft.routeTarget === "Prototype" && repoMode === "not-required") return;
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
          : "",
      repoRef:
        repoMode === "new" ? proposalRepositoryRequestRef(proposal.id) : "",
    });
  }

  function selectRegisteredRepo(repoRef: string) {
    const repo =
      repositories.options.find(
        (option) => option.value === repoRef,
      ) ?? null;

    updateRouteSelectionDraft({
      repoOwner: repo?.label ?? "",
      repoRef: repo?.value ?? "",
    });
  }

  function startSourceHomeCorrection() {
    if (!dispositionCompleted || !proposalCanReviewSourceHome(proposal, routeDraftRef.current)) return;
    // New local decision, submitted later through the unchanged version-bound
    // Disposition command. Canonical receipts and source history remain intact.
    onChangeDecisionDraft({ ...decisionDraftRef.current, appliedAt: undefined,
      appliedReceiptId: undefined,
      notes: "Review the source home for this accepted Prototype proposal. Preserve the original decision in History.",
      sourceHomeCorrection: true, outcome: "accepted" });
    onChangeRouteSelectionDraft({ ...routeDraftRef.current, appliedAt: undefined,
      appliedReceiptId: undefined, rationale: "", ...proposalStudioSelection(repositories.ready ? repositories.options : []) });
  }

  const advisor = useDraftAdvisor({
    disabled: dispositionCompleted,
    getScope: () => ({ role: "proposal-disposition", ref: proposal.id, sourceRef: proposal.backendRecordId,
      sourceRevision: proposal.recordVersion,
      context: JSON.stringify({ title: proposal.title, body: proposal.bodyPreview, status: proposal.status,
        selectedOutcome: decisionDraft.outcome, selectedRoute: routeSelectionDraft.routeTarget,
        boundary: "Outcome and route are operator decisions; only their explanatory drafts are editable." }),
      fields: [{ key: "notes", label: "Decision notes", value: decisionDraft.notes, maxLength: proposalWorkflowTextLimit },
        ...(accepting ? [{ key: "rationale", label: "Route rationale", value: routeSelectionDraft.rationale, maxLength: proposalWorkflowTextLimit }] : [])] }),
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
          {dispositionCompleted && proposalCanReviewSourceHome(proposal, routeSelectionDraft) ? <TerasContentTray
            kicker="Prototype source home missing"
            description="This accepted decision has no source home. Review a new source-home decision; the original remains in History and nothing changes until you record the new decision."
            actions={<TerasActionButton onClick={startSourceHomeCorrection}>Change source home</TerasActionButton>} /> : null}
          {decisionDraft.sourceHomeCorrection && !dispositionCompleted ? <TerasContentTray
            kicker="Source-home change draft"
            description="Review the source home and explain your choice. The accepted Prototype outcome stays the same; the original decision remains in History. Nothing is recorded until submission." /> : null}
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
            registeredRepositories={repositories.options}
            repositorySearch={repositories.search}
            repositoriesCurrent={repositories.ready}
            repositoriesLoading={repositories.loading}
            onRefreshRepositories={() => { void repositories.refresh().catch(() => undefined); }}
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
              onApplyDraft={() => { if (canApply) onApplyDraft(); }}
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
