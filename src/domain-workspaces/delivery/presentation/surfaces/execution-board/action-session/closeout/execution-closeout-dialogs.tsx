import {
  TerasActionButton,
  TerasDialog,
  TerasFieldGrid,
  TerasNoteField,
} from "@/teras";

import type { ExecutionCloseoutDraft } from "./execution-closeout-model.ts";
import { ExecutionCloseoutProductPicker } from "./execution-closeout-product-picker.tsx";
import { ExecutionCloseoutImpactEditor } from "./execution-closeout-impact-editor.tsx";

export function ExecutionCloseoutEvidenceDialog({
  draft,
  onClose,
  onDraftChange,
  open,
}: {
  draft: ExecutionCloseoutDraft;
  onClose: () => void;
  onDraftChange: (draft: ExecutionCloseoutDraft) => void;
  open: boolean;
}) {
  function update(field: keyof ExecutionCloseoutDraft, value: string) {
    onDraftChange({ ...draft, [field]: value });
  }

  return (
    <TerasDialog
      actions={
        <TerasActionButton onClick={onClose} emphasis="primary">
          Done
        </TerasActionButton>
      }
      closeLabel="Close supporting evidence"
      contentOverflow="auto"
      description="Record the demonstration and inspection evidence required by the closeout contract."
      height="fill"
      kicker="Delivery Closeout"
      onClose={onClose}
      open={open}
      title="Supporting Evidence"
      width="large"
    >
      <TerasFieldGrid columns={2} align="stretch">
        <TerasNoteField
          label="Demo summary"
          minimumHeight="short"
          onValueChange={(value) => update("demoSummary", value)}
          placeholder="Summarize what was demonstrated."
          value={draft.demoSummary}
        />
        <TerasNoteField
          label="Demo outcome"
          minimumHeight="short"
          onValueChange={(value) => update("demoOutcome", value)}
          placeholder="Record the reviewed outcome."
          value={draft.demoOutcome}
        />
        <TerasNoteField
          label="Demo evidence"
          minimumHeight="short"
          onValueChange={(value) => update("demoEvidence", value)}
          placeholder="Reference the bounded demonstration proof."
          value={draft.demoEvidence}
        />
        <TerasNoteField
          label="Inspection summary"
          minimumHeight="short"
          onValueChange={(value) => update("inspectSummary", value)}
          placeholder="Summarize the closeout inspection."
          value={draft.inspectSummary}
        />
        <TerasNoteField
          label="Inspection actions"
          minimumHeight="short"
          onValueChange={(value) => update("inspectActionItems", value)}
          placeholder="Record retained actions or state that none remain."
          value={draft.inspectActionItems}
        />
        <TerasNoteField
          label="Completion note"
          minimumHeight="short"
          onValueChange={(value) => update("completionNote", value)}
          placeholder="Optional operator closeout note."
          value={draft.completionNote}
        />
        <TerasNoteField
          label="Residual follow-up"
          minimumHeight="short"
          onValueChange={(value) => update("residualFollowUp", value)}
          placeholder="Optional follow-up that remains outside closeout."
          value={draft.residualFollowUp}
        />
      </TerasFieldGrid>
    </TerasDialog>
  );
}

export function ExecutionCloseoutImpactDialog({ draft, onClose, onDraftChange, open, live = false }: {
  draft: ExecutionCloseoutDraft; onClose: () => void;
  onDraftChange: (draft: ExecutionCloseoutDraft) => void; open: boolean; live?: boolean;
}) {
  if (!open || draft.impactKind === "none") return null;
  return <TerasDialog actions={<TerasActionButton onClick={onClose}>Done</TerasActionButton>}
    closeLabel="Close impact details" contentOverflow="auto" height="fill" width="large"
    description={draft.impactKind === "existing-product-change"
      ? "Choose the registered product and describe the delivered change. Its identity and version are read from Workspace Registry."
      : "Describe the item to onboard and its responsibilities. The system assigns the source reference and version when closeout is recorded."}
    kicker="Delivery Closeout" onClose={onClose} open
    title={draft.impactKind === "existing-product-change" ? "Existing Product Impact" : "Workspace Entrant Impact"}>
    {draft.impactKind === "existing-product-change"
      ? <ExecutionCloseoutProductPicker value={draft.existingProduct} live={live}
          onChange={existingProduct => onDraftChange({ ...draft, existingProduct })} />
      : <ExecutionCloseoutImpactEditor draft={draft} live={live} onDraftChange={onDraftChange} />}
  </TerasDialog>;
}
