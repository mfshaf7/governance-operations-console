"use client";

import {
  TerasActionButton,
  TerasFieldStack,
  TerasContentTray,
  TerasModalShell,
  TerasNoteField,
  TerasTextField,
} from "@/teras";

export function ProposalCaptureModal({
  canSubmit,
  context,
  onClose,
  onContextChange,
  onSubmit,
  onTitleChange,
  open,
  title,
}: {
  canSubmit: boolean;
  context: string;
  onClose: () => void;
  onContextChange: (value: string) => void;
  onSubmit: () => void;
  onTitleChange: (value: string) => void;
  open: boolean;
  title: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <TerasModalShell
      bodyLayout="scroll"
      height="content"
      width="standard"
      description="Prototype-local console ingress for creating a captured proposal in this control surface."
      footer={
        <>
          <TerasActionButton onClick={onClose} emphasis="secondary">
            Back to Register
          </TerasActionButton>
          <TerasActionButton disabled={!canSubmit} onClick={onSubmit}>
            Submit Capture
          </TerasActionButton>
        </>
      }
      kicker="Console Ingress"
      onClose={onClose}
      surfaceId="proposal-capture"
      title="Capture Proposal"
    >
      <TerasFieldStack data-proposal-capture-modal="true" spacing="comfortable">
        <TerasTextField
          aria-label="Proposal title"
          label="Proposal title"
          onValueChange={onTitleChange}
          placeholder="New workspace proposal"
          value={title}
        />
        <TerasNoteField
          aria-label="Proposal context"
          label="Context"
          onValueChange={onContextChange}
          placeholder="Describe the problem, intended outcome, likely owner boundary, and why this belongs in Workspace Proposals."
          value={context}
        />
        <TerasContentTray kicker="Capture Boundary">
          This adds a captured proposal to the local preview register. It does
          not send a backend proposal command yet.
        </TerasContentTray>
      </TerasFieldStack>
    </TerasModalShell>
  );
}
