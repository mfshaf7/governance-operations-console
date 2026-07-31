"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import type { DeliveryPackageSummary } from "../../../../../read-model/index.ts";

import {
  DeliveryBlockerActionInfoDialog,
  DeliveryBlockerRecoveryDialog,
} from "../../../shared/blocker-recovery/index.ts";
import {
  deliveryBlockerRecoveryDefaultJustification,
  deliveryBlockerRecoveryRequiresNote,
  deliveryDefaultBlockerRecoveryActionId,
  type DeliveryBlockerDispositionReceipt,
  type DeliveryBlockerRecoveryAction,
  type DeliveryBlockerRecoveryActionId,
} from "../../../shared/blocker-recovery/index.ts";
import { formatDeliveryDateTime } from "../../../../shared/format/format-date-time.ts";
import {
  refinementBlockerAdvisorResponse,
  refinementBlockerIssue,
  refinementBlockerRecoveryActions,
  refinementBlockerResultProjection,
  refinementFallbackBlockerRecoveryAction,
  refinementSelectedBlockerRecoveryProjection,
} from "./refinement-blocker-model.ts";

type RefinementAdvisorTranscriptLine = {
  id: string;
  role: "advisor" | "operator";
  text: string;
};

export function DeliveryRefinementBlockerRecoveryDialog({
  deliveryPackage,
  onClose,
  onRecordDisposition,
  open,
}: {
  deliveryPackage: DeliveryPackageSummary;
  onClose: () => void;
  onRecordDisposition: (input: {
    action: DeliveryBlockerRecoveryAction;
    activeBlockerIssue: NonNullable<ReturnType<typeof refinementBlockerIssue>>;
    fallbackJustification: string;
    justification: string;
  }) => DeliveryBlockerDispositionReceipt;
  open: boolean;
}) {
  const activeBlockerIssue = useMemo(
    () => refinementBlockerIssue(deliveryPackage),
    [deliveryPackage],
  );
  const blockerRecoveryActions = useMemo(
    () => refinementBlockerRecoveryActions(activeBlockerIssue),
    [activeBlockerIssue],
  );
  const [blockerAdvisorPrompt, setBlockerAdvisorPrompt] = useState("");
  const [blockerAdvisorTurns, setBlockerAdvisorTurns] = useState<
    RefinementAdvisorTranscriptLine[]
  >([]);
  const [blockerDispositionJustification, setBlockerDispositionJustification] =
    useState("");
  const [blockerDispositionReceipt, setBlockerDispositionReceipt] =
    useState<DeliveryBlockerDispositionReceipt | null>(null);
  const [blockerRecoveryActionId, setBlockerRecoveryActionId] =
    useState<DeliveryBlockerRecoveryActionId>(
      deliveryDefaultBlockerRecoveryActionId(
        blockerRecoveryActions,
        refinementFallbackBlockerRecoveryAction,
      ),
    );
  const [actionInfoOpen, setActionInfoOpen] = useState(false);

  const matchingBlockerDispositionReceipt =
    blockerDispositionReceipt?.issueId === activeBlockerIssue?.id
      ? blockerDispositionReceipt
      : null;
  const selectedBlockerRecoveryAction =
    blockerRecoveryActions.find(
      (action) => action.id === blockerRecoveryActionId,
    ) ??
    blockerRecoveryActions[0] ??
    refinementFallbackBlockerRecoveryAction;
  const selectedBlockerRecoveryProjection =
    refinementSelectedBlockerRecoveryProjection({
      matchingReceipt: matchingBlockerDispositionReceipt,
      selectedAction: selectedBlockerRecoveryAction,
    });
  const selectedBlockerRecoveryRequiresNote =
    deliveryBlockerRecoveryRequiresNote(selectedBlockerRecoveryAction);
  const selectedBlockerRecoveryCanRun =
    !selectedBlockerRecoveryAction.disabled &&
    (!selectedBlockerRecoveryRequiresNote ||
      blockerDispositionJustification.trim().length > 0);
  const blockerResultProjection = refinementBlockerResultProjection({
    activeBlockerIssue,
    actions: blockerRecoveryActions,
    matchingReceipt: matchingBlockerDispositionReceipt,
  });
  const blockerAdvisorTranscript: RefinementAdvisorTranscriptLine[] = [
    {
      id: "advisor-refinement-blocker-opening",
      role: "advisor",
      text: "Blocker recovery is locked to this Refinement package. Diagnose the blocked metadata gate, then record either a valid metadata repair, keep-blocked decision, or explicit risk acceptance.",
    },
    {
      id: "advisor-refinement-blocker-current",
      role: "advisor",
      text: `Current blocker: ${
        activeBlockerIssue?.summary ?? deliveryPackage.summary
      } Source: ${deliveryPackage.source_ref}. Selected recovery: ${
        selectedBlockerRecoveryAction.label
      }.`,
    },
    ...blockerAdvisorTurns,
  ];

  function submitBlockerAdvisorPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const prompt = blockerAdvisorPrompt.trim();

    if (!prompt) {
      return;
    }

    const turnId = Date.now();

    setBlockerAdvisorPrompt("");
    setBlockerAdvisorTurns((current) => [
      ...current,
      {
        id: `operator-refinement-blocker-${turnId}`,
        role: "operator",
        text: prompt,
      },
      {
        id: `advisor-refinement-blocker-${turnId}`,
        role: "advisor",
        text: refinementBlockerAdvisorResponse({
          activeBlockerIssue,
          deliveryPackage,
          prompt,
          recoveryAction: selectedBlockerRecoveryAction,
        }),
      },
    ]);
  }

  function recordBlockerDisposition(action: DeliveryBlockerRecoveryAction) {
    if (!activeBlockerIssue) {
      return;
    }

    const justification = blockerDispositionJustification.trim();
    const requiresNote = deliveryBlockerRecoveryRequiresNote(action);

    if (action.disabled || (requiresNote && !justification)) {
      return;
    }

    setBlockerRecoveryActionId(action.id);
    setBlockerDispositionReceipt(
      onRecordDisposition({
        action,
        activeBlockerIssue,
        fallbackJustification:
          deliveryBlockerRecoveryDefaultJustification(action),
        justification,
      }),
    );
  }

  return (
    <>
      <DeliveryBlockerRecoveryDialog
        activeBlockerIssue={activeBlockerIssue}
        blockerAdvisorPrompt={blockerAdvisorPrompt}
        blockerAdvisorTranscript={blockerAdvisorTranscript}
        blockerDispositionJustification={blockerDispositionJustification}
        blockerDispositionRecordedCopy={blockerResultProjection.dispositionCopy}
        blockerDispositionReceiptRecordedAt={
          matchingBlockerDispositionReceipt
            ? formatDeliveryDateTime(
                matchingBlockerDispositionReceipt.recordedAt,
              )
            : null
        }
        blockerProblemClearanceValue={
          blockerResultProjection.problemClearanceValue
        }
        blockerProblemLockValue={blockerResultProjection.problemLockValue}
        blockerProblemRecoveryValue={
          blockerResultProjection.problemRecoveryValue
        }
        blockerProblemStatusLabel={blockerResultProjection.problemStatusLabel}
        blockerProblemStatusTone={blockerResultProjection.problemStatusTone}
        blockerRecoveryActions={blockerRecoveryActions}
        blockerRecoveryNoteLabel={
          selectedBlockerRecoveryRequiresNote
            ? "Decision Rationale Required"
            : "Operator Note Optional"
        }
        blockerRecoveryNotePlaceholder={
          selectedBlockerRecoveryRequiresNote
            ? "Record why this blocker should remain unresolved or why the risk can be accepted."
            : "Optional context for the metadata recovery result."
        }
        blockerResultRecoveryAction={blockerResultProjection.recoveryAction}
        blockerResultVisualTone={blockerResultProjection.visualTone}
        copy={{
          advisorPlaceholder:
            "Ask which metadata recovery action fits this blocker...",
          advisorProfileLabel: "Refinement Blocker Advisor",
          advisorStatusTitle:
            "Local mock advisor only. Future live support must run through CGG admission and OOS-owned Refinement tooling.",
          description:
            "Normal Refinement stays locked. Diagnose the blocked metadata gate here, choose a valid recovery action, and record proof that either clears the blocker or keeps it blocked.",
          kicker: "Refinement Blocker",
          resultBlockedWorkflowValue: "Normal Refinement stays locked",
          resultClearedWorkflowValue:
            "Refinement blocker cleared or risk accepted",
          title: "Blocker Recovery",
        }}
        deliveryPackage={deliveryPackage}
        matchingBlockerDispositionReceipt={matchingBlockerDispositionReceipt}
        onChangeBlockerAdvisorPrompt={setBlockerAdvisorPrompt}
        onChangeBlockerDispositionJustification={
          setBlockerDispositionJustification
        }
        onClose={onClose}
        onOpenActionInfo={() => setActionInfoOpen(true)}
        onRecordBlockerDisposition={recordBlockerDisposition}
        onSelectBlockerRecoveryAction={setBlockerRecoveryActionId}
        open={open}
        selectedBlockerRecoveryAction={selectedBlockerRecoveryAction}
        selectedBlockerRecoveryActionRecorded={
          selectedBlockerRecoveryProjection.recorded
        }
        selectedBlockerRecoveryBlockerLabel={
          selectedBlockerRecoveryProjection.blockerLabel
        }
        selectedBlockerRecoveryCanRun={selectedBlockerRecoveryCanRun}
        selectedBlockerRecoveryDispositionLabel={
          selectedBlockerRecoveryProjection.dispositionLabel
        }
        selectedBlockerRecoveryRequiresNote={
          selectedBlockerRecoveryRequiresNote
        }
        selectedBlockerRecoveryStatusLabel={
          selectedBlockerRecoveryProjection.statusLabel
        }
        selectedBlockerRecoveryVisualTone={
          selectedBlockerRecoveryProjection.visualTone
        }
        submitBlockerAdvisorPrompt={submitBlockerAdvisorPrompt}
      />

      <DeliveryBlockerActionInfoDialog
        blockerCheckLocations={activeBlockerIssue?.checkLocations ?? []}
        blockerPossibleCauses={activeBlockerIssue?.possibleCauses ?? []}
        onClose={() => setActionInfoOpen(false)}
        open={actionInfoOpen}
        selectedBlockerRecoveryAction={selectedBlockerRecoveryAction}
      />
    </>
  );
}
