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
  previewMode,
  context,
  onClose,
  onContextChange,
  onSubmit,
  onTitleChange,
  open,
  title,
}: {
  canSubmit: boolean;
  previewMode: boolean;
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
      description={previewMode ? "Capture a proposal in the disconnected preview." : "Capture a proposal in Workspace Proposals for review."}
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
          {previewMode
            ? "Creates a local preview proposal. No backend proposal is sent."
            : "Creates a proposal in Workspace Proposals. Triage, disposition and handoff remain separate reviewed actions."}
        </TerasContentTray>
      </TerasFieldStack>
    </TerasModalShell>
  );
}
