"use client";

import { useEffect, useState } from "react";

import type { ProposalWorkflowActiveStep } from "../../../work-model/proposal-workflow-step-model.ts";
import {
  proposalWorkflowShellDescription,
  proposalWorkflowShellTitle,
} from "./proposal-workflow-session-view-model.ts";
import { proposalWorkflowSessionState } from "./proposal-workflow-session-state.ts";
import type { UseProposalWorkflowSessionControllerParams } from "./proposal-workflow-session-controller-types.ts";

export function useProposalWorkflowSessionController({
  decisionDraft,
  handoffDraft,
  onApplyDispositionDraft,
  onApplyHandoffDraft,
  onApplyTriageDraft,
  onClose,
  onInspectProposal,
  proposal,
  repositoryGateResolution,
  routeSelectionDraft,
  triageDraft,
}: UseProposalWorkflowSessionControllerParams) {
  const [activeWorkflowStep, setActiveWorkflowStep] =
    useState<ProposalWorkflowActiveStep>("hub");
  const [pendingWorkflowStep, setPendingWorkflowStep] =
    useState<ProposalWorkflowActiveStep | null>(null);
  const [dispositionCloseGuardOpen, setDispositionCloseGuardOpen] =
    useState(false);
  const [handoffCloseGuardOpen, setHandoffCloseGuardOpen] = useState(false);
  const [triageCloseGuardOpen, setTriageCloseGuardOpen] = useState(false);

  useEffect(() => {
    setActiveWorkflowStep("hub");
    setPendingWorkflowStep(null);
    setDispositionCloseGuardOpen(false);
    setHandoffCloseGuardOpen(false);
    setTriageCloseGuardOpen(false);
  }, [proposal?.id]);

  if (!proposal) {
    return null;
  }

  const {
    activeDecisionDraft,
    activeHandoffDraft,
    activeRouteSelectionDraft,
    activeTriageDraft,
    dispositionCanApply,
    dispositionReadOnly,
    footerMove,
    handoffCanApply,
    handoffReadOnly,
    handoffStepAvailable,
    hasPendingDispositionDraft,
    hasPendingHandoffDraft,
    hasPendingTriageDraft,
    hubProjection,
    progressSteps,
    sourceReviewRequired,
    triageCanApply,
    triageReadOnly,
  } = proposalWorkflowSessionState({
    activeWorkflowStep,
    decisionDraft,
    handoffDraft,
    proposal,
    repositoryGateResolution,
    routeSelectionDraft,
    triageDraft,
  });
  const { currentMove } = hubProjection;
  const requestWorkflowStep = (target: ProposalWorkflowActiveStep) => {
    if (target === activeWorkflowStep) {
      return;
    }

    if (hasPendingDispositionDraft) {
      setPendingWorkflowStep(target);
      setDispositionCloseGuardOpen(true);
      return;
    }

    if (hasPendingHandoffDraft) {
      setPendingWorkflowStep(target);
      setHandoffCloseGuardOpen(true);
      return;
    }

    if (hasPendingTriageDraft) {
      setPendingWorkflowStep(target);
      setTriageCloseGuardOpen(true);
      return;
    }

    setActiveWorkflowStep(target);
  };
  const keepEditingWorkflowStep = (setOpen: (open: boolean) => void) => {
    setPendingWorkflowStep(null);
    setOpen(false);
  };
  const runCurrentMove = () => {
    if (currentMove.target === "disposition") {
      requestWorkflowStep("disposition");
      return;
    }

    if (currentMove.target === "handoff") {
      requestWorkflowStep("handoff");
      return;
    }

    if (currentMove.target === "history") {
      requestWorkflowStep("history");
      return;
    }

    if (currentMove.target === "triage") {
      requestWorkflowStep("triage");
      return;
    }

    onInspectProposal(proposal);
  };
  const returnToHub = () => {
    requestWorkflowStep("hub");
  };
  const requestClose = () => {
    if (hasPendingDispositionDraft) {
      setDispositionCloseGuardOpen(true);
      return;
    }

    if (hasPendingHandoffDraft) {
      setHandoffCloseGuardOpen(true);
      return;
    }

    if (hasPendingTriageDraft) {
      setTriageCloseGuardOpen(true);
      return;
    }

    onClose();
  };
  const returnToRegister = () => {
    onClose();
  };
  const applyTriageDraft = async () => {
    if (triageReadOnly || !triageCanApply) {
      return;
    }

    await onApplyTriageDraft(activeTriageDraft);
    setActiveWorkflowStep("hub");
  };
  const applyTriageDraftAndAdvance = async () => {
    if (triageReadOnly || !triageCanApply) {
      return;
    }

    await onApplyTriageDraft(activeTriageDraft);
    setActiveWorkflowStep(sourceReviewRequired ? "hub" : "disposition");
  };
  const applyDispositionDraft = async () => {
    if (dispositionReadOnly || !dispositionCanApply) {
      return;
    }

    await onApplyDispositionDraft({
      decisionDraft: activeDecisionDraft,
      routeSelectionDraft:
        activeDecisionDraft.outcome === "accepted"
          ? activeRouteSelectionDraft
          : null,
    });
    setActiveWorkflowStep("hub");
  };
  const applyDispositionDraftAndAdvance = async () => {
    if (dispositionReadOnly || !dispositionCanApply) {
      return;
    }

    await onApplyDispositionDraft({
      decisionDraft: activeDecisionDraft,
      routeSelectionDraft:
        activeDecisionDraft.outcome === "accepted"
          ? activeRouteSelectionDraft
          : null,
    });
    setActiveWorkflowStep(
      activeDecisionDraft.outcome === "accepted" &&
        activeRouteSelectionDraft.routeTarget !== "Parked"
        ? "handoff"
        : "history",
    );
  };
  const applyHandoffDraft = async () => {
    if (handoffReadOnly || !handoffCanApply) {
      return;
    }

    await onApplyHandoffDraft(activeHandoffDraft);
    setActiveWorkflowStep("hub");
  };
  const runFooterMove = async () => {
    if (!footerMove || footerMove.disabled) {
      return;
    }

    switch (activeWorkflowStep) {
      case "triage":
        if (triageReadOnly || activeTriageDraft.appliedAt) {
          requestWorkflowStep("disposition");
          return;
        }

        await applyTriageDraftAndAdvance();
        return;
      case "disposition":
        if (dispositionReadOnly || activeDecisionDraft.appliedAt) {
          requestWorkflowStep(
            activeDecisionDraft.outcome === "accepted" &&
              activeRouteSelectionDraft.routeTarget !== "Parked"
              ? "handoff"
              : "history",
          );
          return;
        }

        await applyDispositionDraftAndAdvance();
        return;
      case "handoff":
        requestWorkflowStep("history");
        return;
      case "history":
        requestClose();
        return;
      case "hub":
        runCurrentMove();
        return;
    }
  };
  const leaveDisposition = () => {
    setDispositionCloseGuardOpen(false);
    setActiveWorkflowStep(pendingWorkflowStep ?? "hub");
    setPendingWorkflowStep(null);
  };
  const leaveHandoff = () => {
    setHandoffCloseGuardOpen(false);
    setActiveWorkflowStep(pendingWorkflowStep ?? "hub");
    setPendingWorkflowStep(null);
  };
  const leaveTriage = () => {
    setTriageCloseGuardOpen(false);
    setActiveWorkflowStep(pendingWorkflowStep ?? "hub");
    setPendingWorkflowStep(null);
  };
  return {
    activeDecisionDraft,
    activeHandoffDraft,
    activeRouteSelectionDraft,
    activeTriageDraft,
    activeWorkflowStep,
    applyDispositionDraft,
    applyHandoffDraft,
    applyTriageDraft,
    dispositionCloseGuardOpen,
    dispositionReadOnly,
    handoffCloseGuardOpen,
    handoffReadOnly,
    handoffStepAvailable,
    footerMove,
    hubProjection,
    keepDispositionEditing: () =>
      keepEditingWorkflowStep(setDispositionCloseGuardOpen),
    keepHandoffEditing: () => keepEditingWorkflowStep(setHandoffCloseGuardOpen),
    keepTriageEditing: () => keepEditingWorkflowStep(setTriageCloseGuardOpen),
    leaveDisposition,
    leaveHandoff,
    leaveTriage,
    progressSteps,
    requestClose,
    requestWorkflowStep,
    returnToRegister,
    returnToHub,
    runFooterMove,
    runCurrentMove,
    shellDescription: proposalWorkflowShellDescription(activeWorkflowStep),
    shellTitle: proposalWorkflowShellTitle(activeWorkflowStep),
    triageCloseGuardOpen,
    triageReadOnly,
  };
}
