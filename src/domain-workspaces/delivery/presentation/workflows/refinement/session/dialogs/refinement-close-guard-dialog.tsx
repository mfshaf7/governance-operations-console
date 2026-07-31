"use client";

import { TerasDraftCloseGuardDialog } from "@/teras";

export function RefinementCloseGuardDialog({
  onKeepEditing,
  onLeave,
  open,
}: {
  onKeepEditing: () => void;
  onLeave: () => void;
  open: boolean;
}) {
  return (
    <TerasDraftCloseGuardDialog
      description="This local Refinement session has metadata decisions that are autosaved but not applied. Leaving will return to the register; reopening the package restores the session."
      kicker="Unapplied Refinement"
      onKeepEditing={onKeepEditing}
      onLeave={onLeave}
      open={open}
      title="Leave Refinement?"
    />
  );
}
