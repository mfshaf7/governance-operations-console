"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { TerasActionButton, TerasDialog, TerasNoteField } from "@/teras";
import { WORK_DESIGN_CONTEXT_NOTE_MAX_LENGTH } from "../../../../../work-model/work-design/work-design-session-model.ts";

export function WorkDesignContextNoteEditor({ value, onChange, readOnly }: {
  value: string; onChange: (value: string) => void; readOnly: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = `Context note (${value.length}/${WORK_DESIGN_CONTEXT_NOTE_MAX_LENGTH})`;
  return <>
    <TerasNoteField aria-label="Work Design context note" density="compact" label={label}
      maxLength={WORK_DESIGN_CONTEXT_NOTE_MAX_LENGTH} minimumHeight="short"
      onValueChange={onChange} placeholder="Current and proposed system, key interactions, evidence and open questions."
      readOnly={readOnly} value={value}
      actions={<TerasActionButton aria-label="Expand context note" title="Open larger note editor"
        size="table-compact" treatment="tonal" onClick={() => setOpen(true)}>
        <Maximize2 aria-hidden="true" size={14} />
      </TerasActionButton>} />
    <TerasDialog open={open} onClose={() => setOpen(false)} title="Context Note" kicker="Context Session"
      description={readOnly ? "This finalized note is read-only. Reopen the brief to edit it." : "Edits update the current draft. Use Save Session in Context Session before finalizing."}
      closeLabel="Close context note editor" contentOverflow="hidden" height="fill" width="large"
      actions={<TerasActionButton onClick={() => setOpen(false)} emphasis="secondary">Done</TerasActionButton>}>
      <TerasNoteField aria-label="Expanded Work Design context note" label={label} fill
        maxLength={WORK_DESIGN_CONTEXT_NOTE_MAX_LENGTH} onValueChange={onChange}
        readOnly={readOnly} value={value} />
    </TerasDialog>
  </>;
}
