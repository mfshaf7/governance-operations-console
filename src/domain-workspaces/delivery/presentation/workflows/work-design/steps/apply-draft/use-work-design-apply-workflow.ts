"use client";

import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { DeliveryPackageSummary } from "../../../../../read-model/index.ts";
import type { WorkDesignApplyReceipt } from "../../../../../work-model/work-design/work-design-types.ts";

import type { WorkDesignSnapshotAttachment } from "../../artifacts/context-brief/index.ts";
import { useWorkDesignApplyBlockerActions } from "../../session-controller/use-work-design-apply-blocker-actions.ts";
import {
  workDesignActiveBlockerViewModel,
  workDesignBlockerRecoveryViewModel,
} from "../../view-model/work-design-blocker-recovery-view-model.ts";
import { workDesignApplyDraftViewModel } from "../../view-model/work-design-session-view-model.ts";
import type {
  WorkDesignContextDecision,
  WorkDesignStep,
} from "../../model/work-design-model.ts";
import type { WorkDesignApplyState } from "./use-work-design-apply-state.ts";

type WorkDesignMetricsSummary = {
  features: number;
  risks: number;
  stories: number;
};

type RunApplyDraft = (
  record: Pick<WorkDesignApplyReceipt, "appliedAt" | "receiptId">,
) => void;

export function useWorkDesignApplyWorkflow({
  activeStep,
  applyReceiptId,
  applyReceiptRecorded,
  applyReady,
  applyState,
  contextBriefAccepted,
  contextDecision,
  contextSnapshotAttachment,
  contextSnapshotAttachmentStatusLabel,
  deliveryPackage,
  metrics,
  setActiveStep,
  setApplyReceiptId,
  setApplyReceiptRecorded,
  setHasUnsavedSessionChanges,
  setDraftValidationAccepted,
  sourceApplyComplete,
}: {
  activeStep: WorkDesignStep;
  applyReceiptId: string | null;
  applyReceiptRecorded: boolean;
  applyReady: boolean;
  applyState: WorkDesignApplyState;
  contextBriefAccepted: boolean;
  contextDecision: WorkDesignContextDecision;
  contextSnapshotAttachment: WorkDesignSnapshotAttachment;
  contextSnapshotAttachmentStatusLabel: string;
  deliveryPackage: DeliveryPackageSummary;
  metrics: WorkDesignMetricsSummary;
  setActiveStep: Dispatch<SetStateAction<WorkDesignStep>>;
  setApplyReceiptId: Dispatch<SetStateAction<string | null>>;
  setApplyReceiptRecorded: Dispatch<SetStateAction<boolean>>;
  setHasUnsavedSessionChanges: Dispatch<SetStateAction<boolean>>;
  setDraftValidationAccepted: Dispatch<SetStateAction<boolean>>;
  sourceApplyComplete: boolean;
}) {
  const {
    applyRunStartedAt,
    applyViewOpenedAt,
    blockerAdvisorPrompt,
    blockerAdvisorTurns,
    blockerDispositionJustification,
    blockerDispositionReceipt,
    blockerRecoveryActionId,
    setApplyRunStartedAt,
    setApplyViewOpenedAt,
    setBlockerAdvisorPrompt,
    setBlockerAdvisorTurns,
    setBlockerDispositionJustification,
    setBlockerDispositionOpen,
    setBlockerDispositionReceipt,
    setBlockerRecoveryActionId,
  } = applyState;

  useEffect(() => {
    if (
      activeStep === "apply" &&
      !applyReceiptRecorded &&
      !sourceApplyComplete
    ) {
      setApplyViewOpenedAt(new Date().toISOString());
    }
  }, [
    activeStep,
    applyReceiptRecorded,
    setApplyViewOpenedAt,
    sourceApplyComplete,
  ]);

  const {
    activeBlockerIssue,
    matchingBlockerDispositionReceipt,
    workDesignBlocked,
  } = workDesignActiveBlockerViewModel({
    blockerDispositionReceipt,
    deliveryPackage,
  });
  const blockerRecoveryViewModel = workDesignBlockerRecoveryViewModel({
    activeBlockerIssue,
    blockerAdvisorTurns,
    blockerDispositionJustification,
    blockerDispositionReceipt,
    blockerRecoveryActionId,
    deliveryPackage,
    matchingBlockerDispositionReceipt,
    workDesignBlocked,
  });
  const {
    openBlockerRecovery,
    recordBlockerDisposition,
    runApplyDraft,
    submitBlockerAdvisorPrompt,
  } = useWorkDesignApplyBlockerActions({
    activeBlockerIssue,
    blockerAdvisorPrompt,
    blockerDispositionJustification,
    blockerRecoveryActions: blockerRecoveryViewModel.blockerRecoveryActions,
    deliveryPackage,
    matchingBlockerDispositionReceipt,
    selectedBlockerRecoveryAction:
      blockerRecoveryViewModel.selectedBlockerRecoveryAction,
    setActiveStep,
    setApplyReceiptId,
    setApplyReceiptRecorded,
    setApplyRunStartedAt,
    setBlockerAdvisorPrompt,
    setBlockerAdvisorTurns,
    setBlockerDispositionJustification,
    setBlockerDispositionOpen,
    setBlockerDispositionReceipt,
    setBlockerRecoveryActionId,
    setHasUnsavedSessionChanges,
    setDraftValidationAccepted,
  });
  const applyDraftViewModel = workDesignApplyDraftViewModel({
    applyReceiptId,
    applyReceiptRecorded,
    applyReady,
    applyRunStartedAt,
    applyViewOpenedAt,
    contextBriefAccepted,
    contextDecision,
    contextSnapshotAttachment,
    contextSnapshotAttachmentStatusLabel,
    deliveryPackage,
    metrics,
    sourceApplyComplete,
  });

  return {
    ...applyState,
    activeBlockerIssue,
    matchingBlockerDispositionReceipt,
    openBlockerRecovery,
    recordBlockerDisposition,
    runApplyDraft: runApplyDraft as RunApplyDraft,
    submitBlockerAdvisorPrompt,
    workDesignBlocked,
    ...blockerRecoveryViewModel,
    ...applyDraftViewModel,
  };
}
