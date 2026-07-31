"use client";

import {
  TerasDialog,
  TerasActionButton,
  TerasZone,
  TerasZoneLayout,
} from "@/teras";

import { DeliveryBlockerProblemPanel } from "./blocker-problem-panel.tsx";
import { DeliveryBlockerRecoveryActionPanel } from "./blocker-recovery-action-panel.tsx";
import { DeliveryBlockerRecoveryAdvisorPanel } from "./blocker-recovery-advisor-panel.tsx";
import type { DeliveryBlockerRecoveryDialogProps } from "./blocker-recovery-dialog-types.ts";
import { deliveryBlockerRecoveryDialogShellCopy } from "./blocker-recovery-model.ts";
import { DeliveryBlockerRecoveryResultPanel } from "./blocker-recovery-result-panel.tsx";

export function DeliveryBlockerRecoveryDialog({
  activeBlockerIssue,
  blockerAdvisorPrompt,
  blockerAdvisorTranscript,
  blockerDispositionJustification,
  blockerDispositionRecordedCopy,
  blockerDispositionReceiptRecordedAt,
  blockerProblemClearanceValue,
  blockerProblemLockValue,
  blockerProblemRecoveryValue,
  blockerProblemStatusLabel,
  blockerProblemStatusTone,
  blockerRecoveryActions,
  blockerRecoveryNoteLabel,
  blockerRecoveryNotePlaceholder,
  blockerResultRecoveryAction,
  blockerResultVisualTone,
  copy,
  deliveryPackage,
  matchingBlockerDispositionReceipt,
  onChangeBlockerAdvisorPrompt,
  onChangeBlockerDispositionJustification,
  onClose,
  onOpenActionInfo,
  onRecordBlockerDisposition,
  onSelectBlockerRecoveryAction,
  open,
  selectedBlockerRecoveryAction,
  selectedBlockerRecoveryActionRecorded,
  selectedBlockerRecoveryBlockerLabel,
  selectedBlockerRecoveryCanRun,
  selectedBlockerRecoveryDispositionLabel,
  selectedBlockerRecoveryRequiresNote,
  selectedBlockerRecoveryStatusLabel,
  selectedBlockerRecoveryVisualTone,
  submitBlockerAdvisorPrompt,
}: DeliveryBlockerRecoveryDialogProps) {
  const shellCopy = deliveryBlockerRecoveryDialogShellCopy(copy);

  return (
    <TerasDialog
      contentOverflow="hidden"
      height="fill"
      width="wide"
      actions={
        <TerasActionButton onClick={onClose} emphasis="secondary">
          {shellCopy.backLabel}
        </TerasActionButton>
      }
      closeLabel={shellCopy.closeLabel}
      description={shellCopy.description}
      kicker={shellCopy.kicker}
      onClose={onClose}
      open={open}
      title={shellCopy.title}
    >
      <TerasZoneLayout variant="main-aside">
        <TerasZone fit="fill">
          <DeliveryBlockerProblemPanel
            activeBlockerIssue={activeBlockerIssue}
            blockerProblemClearanceValue={blockerProblemClearanceValue}
            blockerProblemLockValue={blockerProblemLockValue}
            blockerProblemRecoveryValue={blockerProblemRecoveryValue}
            blockerProblemStatusLabel={blockerProblemStatusLabel}
            blockerProblemStatusTone={blockerProblemStatusTone}
            deliveryPackage={deliveryPackage}
          />
          <DeliveryBlockerRecoveryActionPanel
            blockerDispositionJustification={blockerDispositionJustification}
            blockerRecoveryActions={blockerRecoveryActions}
            blockerRecoveryNoteLabel={blockerRecoveryNoteLabel}
            blockerRecoveryNotePlaceholder={blockerRecoveryNotePlaceholder}
            matchingBlockerDispositionReceipt={
              matchingBlockerDispositionReceipt
            }
            onChangeBlockerDispositionJustification={
              onChangeBlockerDispositionJustification
            }
            onOpenActionInfo={onOpenActionInfo}
            onRecordBlockerDisposition={onRecordBlockerDisposition}
            onSelectBlockerRecoveryAction={onSelectBlockerRecoveryAction}
            selectedBlockerRecoveryAction={selectedBlockerRecoveryAction}
            selectedBlockerRecoveryActionRecorded={
              selectedBlockerRecoveryActionRecorded
            }
            selectedBlockerRecoveryBlockerLabel={
              selectedBlockerRecoveryBlockerLabel
            }
            selectedBlockerRecoveryCanRun={selectedBlockerRecoveryCanRun}
            selectedBlockerRecoveryDispositionLabel={
              selectedBlockerRecoveryDispositionLabel
            }
            selectedBlockerRecoveryRequiresNote={
              selectedBlockerRecoveryRequiresNote
            }
            selectedBlockerRecoveryStatusLabel={
              selectedBlockerRecoveryStatusLabel
            }
            selectedBlockerRecoveryVisualTone={
              selectedBlockerRecoveryVisualTone
            }
          />
        </TerasZone>

        <TerasZone fit="fill">
          <DeliveryBlockerRecoveryResultPanel
            blockerDispositionRecordedCopy={blockerDispositionRecordedCopy}
            blockerDispositionReceiptRecordedAt={
              blockerDispositionReceiptRecordedAt
            }
            blockerResultRecoveryAction={blockerResultRecoveryAction}
            blockerResultVisualTone={blockerResultVisualTone}
            copy={copy}
            matchingBlockerDispositionReceipt={
              matchingBlockerDispositionReceipt
            }
            selectedBlockerRecoveryAction={selectedBlockerRecoveryAction}
            selectedBlockerRecoveryBlockerLabel={
              selectedBlockerRecoveryBlockerLabel
            }
            selectedBlockerRecoveryStatusLabel={
              selectedBlockerRecoveryStatusLabel
            }
          />
          <DeliveryBlockerRecoveryAdvisorPanel
            blockerAdvisorPrompt={blockerAdvisorPrompt}
            blockerAdvisorTranscript={blockerAdvisorTranscript}
            copy={copy}
            onChangeBlockerAdvisorPrompt={onChangeBlockerAdvisorPrompt}
            submitBlockerAdvisorPrompt={submitBlockerAdvisorPrompt}
          />
        </TerasZone>
      </TerasZoneLayout>
    </TerasDialog>
  );
}
