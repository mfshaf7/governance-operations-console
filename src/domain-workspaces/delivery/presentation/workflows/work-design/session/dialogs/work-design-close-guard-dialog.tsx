"use client";

import { TerasDialog, TerasActionButton } from "@/teras";

type WorkDesignCloseGuardDialogProps = {
  onKeepEditing: () => void;
  onLeave: () => void;
  open: boolean;
};

export function WorkDesignCloseGuardDialog({
  onKeepEditing,
  onLeave,
  open,
}: WorkDesignCloseGuardDialogProps) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      width="compact"
      actions={
        <>
          <TerasActionButton onClick={onKeepEditing} emphasis="secondary">
            Keep Editing
          </TerasActionButton>
          <TerasActionButton onClick={onLeave} tone="danger" emphasis="primary">
            Leave
          </TerasActionButton>
        </>
      }
      description="This local work-design draft has unsaved changes. Leaving will return to the register without applying the draft."
      kicker="Unsaved Work Design"
      open={open}
      title="Leave Draft?"
    />
  );
}
