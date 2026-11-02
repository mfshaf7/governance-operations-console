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
  pending = false,
  error = null,
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
  pending?: boolean;
  error?: string | null;
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
      busy={pending}
      busyLabel="Recording proposal…"
      bodyLayout="scroll"
      height="content"
      width="standard"
      description={previewMode ? "Capture a proposal in the disconnected preview." : "Capture a proposal in Workspace Proposals for review."}
      footer={
        <>
          <TerasActionButton disabled={pending} onClick={onClose} emphasis="secondary">
            Back to Register
          </TerasActionButton>
          <TerasActionButton busy={pending} disabled={!canSubmit} onClick={onSubmit}>
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
          disabled={pending}
          aria-label="Proposal title"
          label="Proposal title"
          onValueChange={onTitleChange}
          placeholder="New workspace proposal"
          value={title}
        />
        <TerasNoteField
          disabled={pending}
          aria-label="Proposal context"
          label="Context"
          onValueChange={onContextChange}
          placeholder="Describe the problem, intended outcome, likely owner boundary, and why this belongs in Workspace Proposals."
          value={context}
        />
        {error ? <p role="alert">{error}</p> : null}
        <TerasContentTray kicker="Capture Boundary">
          {previewMode
            ? "Creates a local preview proposal. No backend proposal is sent."
            : "Creates a proposal in Workspace Proposals. Triage, disposition and handoff remain separate reviewed actions."}
        </TerasContentTray>
      </TerasFieldStack>
    </TerasModalShell>
  );
}
