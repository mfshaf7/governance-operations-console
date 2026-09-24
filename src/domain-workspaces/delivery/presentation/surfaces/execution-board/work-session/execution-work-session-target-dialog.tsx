import { useEffect, useState } from "react";

import {
  TerasActionButton,
  TerasDialog,
  TerasFieldStack,
  TerasList,
  TerasSignalItem,
  TerasTextField,
} from "@/teras";
import { parseExecutionWorkItemReference } from "./execution-work-session-target.ts";

export function ExecutionWorkSessionTargetDialog({
  onClose,
  onOpenTarget,
  open,
}: {
  onClose: () => void;
  onOpenTarget: (workItemId: number) => void;
  open: boolean;
}) {
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setReference("");
      setError(null);
    }
  }, [open]);

  function openTarget() {
    try {
      onOpenTarget(parseExecutionWorkItemReference(reference));
      setReference("");
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The ART work item reference is invalid.",
      );
    }
  }

  return (
    <TerasDialog
      actions={
        <>
          <TerasActionButton emphasis="secondary" onClick={onClose}>
            Back to Board
          </TerasActionButton>
          <TerasActionButton disabled={!reference.trim()} onClick={openTarget}>
            Open Session
          </TerasActionButton>
        </>
      }
      closeLabel="Close work item entry"
      contentOverflow="auto"
      description="Enter the exact ART item. OOS will read its current authority and lifecycle state before any action is available."
      height="content"
      kicker="Execution Board"
      onClose={onClose}
      open={open}
      title="Open Governed Work"
      width="compact"
    >
      <TerasFieldStack spacing="normal">
        <TerasTextField
          autoFocus
          label="ART work item"
          onKeyDown={(event) => {
            if (event.key === "Enter" && reference.trim()) openTarget();
          }}
          onValueChange={(value) => {
            setReference(value);
            setError(null);
          }}
          placeholder="1175"
          prefix="#"
          value={reference}
        />
        {error ? (
          <TerasList frame="contained">
            <TerasSignalItem
              detail={error}
              label="Invalid reference"
              title="Work item could not be opened"
              tone="danger"
            />
          </TerasList>
        ) : null}
      </TerasFieldStack>
    </TerasDialog>
  );
}
