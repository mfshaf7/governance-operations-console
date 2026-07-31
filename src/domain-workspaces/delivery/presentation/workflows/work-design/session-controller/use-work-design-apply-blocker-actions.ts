"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";

import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";
import { createLocalDeliveryBlockerDispositionReceipt } from "../../../../local-runtime/index.ts";
import type { WorkDesignApplyReceipt } from "../../../../work-model/work-design/work-design-types.ts";

import {
  workDesignBlockerAdvisorResponse,
  workDesignBlockerRecoveryDefaultJustification,
  workDesignBlockerRecoveryRequiresNote,
  workDesignDefaultBlockerRecoveryActionId,
} from "../support/blocker-recovery/work-design-blocker-model.ts";
import type { WorkDesignBlockerRecoveryAction } from "../support/blocker-recovery/work-design-blocker-model.ts";
import type { WorkDesignAdvisorTranscriptLine } from "../view-model/work-design-context-advisor-view-model.ts";
import type {
  WorkDesignBlockerDispositionReceipt,
  WorkDesignBlockerIssue,
  WorkDesignBlockerRecoveryActionId,
  WorkDesignStep,
} from "../model/work-design-model.ts";

type UseWorkDesignApplyBlockerActionsParams = {
  activeBlockerIssue: WorkDesignBlockerIssue | null;
  blockerAdvisorPrompt: string;
  blockerDispositionJustification: string;
  blockerRecoveryActions: WorkDesignBlockerRecoveryAction[];
  deliveryPackage: DeliveryPackageSummary;
  matchingBlockerDispositionReceipt: WorkDesignBlockerDispositionReceipt | null;
  selectedBlockerRecoveryAction: WorkDesignBlockerRecoveryAction;
  setActiveStep: Dispatch<SetStateAction<WorkDesignStep>>;
  setApplyReceiptId: Dispatch<SetStateAction<string | null>>;
  setApplyReceiptRecorded: Dispatch<SetStateAction<boolean>>;
  setApplyRunStartedAt: Dispatch<SetStateAction<string | null>>;
  setBlockerAdvisorPrompt: Dispatch<SetStateAction<string>>;
  setBlockerAdvisorTurns: Dispatch<
    SetStateAction<WorkDesignAdvisorTranscriptLine[]>
  >;
  setBlockerDispositionJustification: Dispatch<SetStateAction<string>>;
  setBlockerDispositionOpen: Dispatch<SetStateAction<boolean>>;
  setBlockerDispositionReceipt: Dispatch<
    SetStateAction<WorkDesignBlockerDispositionReceipt | null>
  >;
  setBlockerRecoveryActionId: Dispatch<
    SetStateAction<WorkDesignBlockerRecoveryActionId>
  >;
  setHasUnsavedSessionChanges: Dispatch<SetStateAction<boolean>>;
  setDraftValidationAccepted: Dispatch<SetStateAction<boolean>>;
};

export function useWorkDesignApplyBlockerActions({
  activeBlockerIssue,
  blockerAdvisorPrompt,
  blockerDispositionJustification,
  blockerRecoveryActions,
  deliveryPackage,
  matchingBlockerDispositionReceipt,
  selectedBlockerRecoveryAction,
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
}: UseWorkDesignApplyBlockerActionsParams) {
  function submitBlockerAdvisorPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const prompt = blockerAdvisorPrompt.trim();

    if (!prompt) {
      return;
    }

    const turnId = Date.now();
    const response = workDesignBlockerAdvisorResponse({
      deliveryPackage,
      prompt,
      recoveryAction: selectedBlockerRecoveryAction,
    });

    setBlockerAdvisorPrompt("");
    setBlockerAdvisorTurns((current) => [
      ...current,
      {
        id: `operator-blocker-${turnId}`,
        role: "operator",
        text: prompt,
      },
      {
        id: `advisor-blocker-${turnId}`,
        role: "advisor",
        text: response,
      },
    ]);
  }

  function recordBlockerDisposition(
    actionOverride?: WorkDesignBlockerRecoveryAction,
  ) {
    if (!activeBlockerIssue) {
      return;
    }

    const action = actionOverride ?? selectedBlockerRecoveryAction;
    const justification = blockerDispositionJustification.trim();
    const requiresNote = workDesignBlockerRecoveryRequiresNote(action);

    if (action.disabled || (requiresNote && !justification)) {
      return;
    }

    const receipt = createLocalDeliveryBlockerDispositionReceipt({
      action,
      activeBlockerIssue,
      deliveryPackage,
      fallbackJustification:
        workDesignBlockerRecoveryDefaultJustification(action),
      justification,
    });

    setBlockerRecoveryActionId(action.id);
    setBlockerDispositionReceipt(receipt);

    if (action.clearsBlocker) {
      setApplyReceiptRecorded(false);
      setActiveStep(activeBlockerIssue.source === "apply" ? "apply" : "hub");
    }
  }

  function runApplyDraft(
    record: Pick<WorkDesignApplyReceipt, "appliedAt" | "receiptId">,
  ) {
    setApplyReceiptId(record.receiptId);
    setApplyRunStartedAt(record.appliedAt);
    setDraftValidationAccepted(true);
    setHasUnsavedSessionChanges(false);
    setApplyReceiptRecorded(true);
  }

  function openBlockerRecovery() {
    if (
      activeBlockerIssue &&
      matchingBlockerDispositionReceipt?.recoveryActionId
    ) {
      setBlockerRecoveryActionId(
        matchingBlockerDispositionReceipt.recoveryActionId,
      );
    } else if (activeBlockerIssue && !matchingBlockerDispositionReceipt) {
      setBlockerRecoveryActionId(
        workDesignDefaultBlockerRecoveryActionId(blockerRecoveryActions),
      );
      setBlockerDispositionJustification("");
    }

    setBlockerDispositionOpen(true);
  }

  return {
    openBlockerRecovery,
    recordBlockerDisposition,
    runApplyDraft,
    submitBlockerAdvisorPrompt,
  };
}
