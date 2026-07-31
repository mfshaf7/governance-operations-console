import type { FormEvent } from "react";

import type {
  DeliveryPackageSummary,
  DeliveryTone,
} from "../../../../read-model/index.ts";

import type {
  DeliveryBlockerDispositionReceipt,
  DeliveryBlockerIssue,
  DeliveryBlockerRecoveryAction,
  DeliveryBlockerRecoveryActionId,
} from "./blocker-recovery-model.ts";

export const deliveryBlockerEditorFieldProps = {
  autoCapitalize: "off",
  autoCorrect: "off",
  spellCheck: false,
} as const;

export type DeliveryBlockerAdvisorTranscriptLine = {
  id: string;
  role: "advisor" | "operator";
  text: string;
};

export type DeliveryBlockerDispositionCopy = {
  recoveryAction: string;
  resultLabel: string;
  title: string;
};

export type DeliveryBlockerRecoveryDialogCopy = {
  advisorPlaceholder?: string;
  advisorProfileLabel?: string;
  advisorStatusTitle?: string;
  backLabel?: string;
  closeLabel?: string;
  description?: string;
  kicker?: string;
  resultBlockedWorkflowValue?: string;
  resultClearedWorkflowValue?: string;
  title?: string;
};

export type DeliveryBlockerRecoveryDialogProps = {
  activeBlockerIssue: DeliveryBlockerIssue | null;
  blockerAdvisorPrompt: string;
  blockerAdvisorTranscript: DeliveryBlockerAdvisorTranscriptLine[];
  blockerDispositionJustification: string;
  blockerDispositionRecordedCopy: DeliveryBlockerDispositionCopy | null;
  blockerDispositionReceiptRecordedAt: string | null;
  blockerProblemClearanceValue: string;
  blockerProblemLockValue: string;
  blockerProblemRecoveryValue: string;
  blockerProblemStatusLabel: string;
  blockerProblemStatusTone: DeliveryTone;
  blockerRecoveryActions: DeliveryBlockerRecoveryAction[];
  blockerRecoveryNoteLabel: string;
  blockerRecoveryNotePlaceholder: string;
  blockerResultRecoveryAction: DeliveryBlockerRecoveryAction | null | undefined;
  blockerResultVisualTone: DeliveryTone;
  copy?: DeliveryBlockerRecoveryDialogCopy;
  deliveryPackage: DeliveryPackageSummary;
  matchingBlockerDispositionReceipt: DeliveryBlockerDispositionReceipt | null;
  onChangeBlockerAdvisorPrompt: (value: string) => void;
  onChangeBlockerDispositionJustification: (value: string) => void;
  onClose: () => void;
  onOpenActionInfo: () => void;
  onRecordBlockerDisposition: (action: DeliveryBlockerRecoveryAction) => void;
  onSelectBlockerRecoveryAction: (
    actionId: DeliveryBlockerRecoveryActionId,
  ) => void;
  open: boolean;
  selectedBlockerRecoveryAction: DeliveryBlockerRecoveryAction;
  selectedBlockerRecoveryActionRecorded: boolean;
  selectedBlockerRecoveryBlockerLabel: string;
  selectedBlockerRecoveryCanRun: boolean;
  selectedBlockerRecoveryDispositionLabel: string;
  selectedBlockerRecoveryRequiresNote: boolean;
  selectedBlockerRecoveryStatusLabel: string;
  selectedBlockerRecoveryVisualTone: DeliveryTone;
  submitBlockerAdvisorPrompt: (event: FormEvent<HTMLFormElement>) => void;
};
