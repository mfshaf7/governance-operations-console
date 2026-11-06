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
  outcomeUnknown = false,
  canRetry = false,
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
  outcomeUnknown?: boolean;
  canRetry?:boolean;
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
      description={outcomeUnknown ? "Keep the original details while checking whether this proposal was saved." : "Record an idea or problem before deciding how to develop it."}
      footer={
        <>
          <TerasActionButton disabled={pending} onClick={onClose} emphasis="secondary">
            Back to Register
          </TerasActionButton>
          <TerasActionButton busy={pending} disabled={!canSubmit} onClick={onSubmit}>
            {outcomeUnknown ? canRetry ? "Retry original capture" : "Check capture result" : "Create proposal"}
          </TerasActionButton>
        </>
      }
      kicker="Proposal"
      onClose={onClose}
      surfaceId="proposal-capture"
      title="Capture Proposal"
    >
      <TerasFieldStack data-proposal-capture-modal="true" spacing="comfortable">
        <TerasTextField
          disabled={pending || outcomeUnknown}
          aria-label="Proposal title"
          label="Proposal title"
          onValueChange={onTitleChange}
          placeholder="New workspace proposal"
          value={title}
        />
        <TerasNoteField
          disabled={pending || outcomeUnknown}
          aria-label="Proposal context"
          label="Describe your idea"
          onValueChange={onContextChange}
          placeholder="What is the idea or problem? What outcome do you want?"
          value={context}
        />
        {error ? <p role="alert">{error}</p> : null}
        <TerasContentTray kicker="What happens next">
          {previewMode
            ? "Creates a local preview proposal. No backend proposal is sent."
            : "Save the idea to your backlog. Review it, choose a direction, then hand it over when ready."}
        </TerasContentTray>
      </TerasFieldStack>
    </TerasModalShell>
  );
}
