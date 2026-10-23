import { useEffect, useState } from "react";

import {
  TerasActionButton,
  TerasDialog,
  TerasFieldStack,
  TerasList,
  TerasSignalItem,
  TerasTextField,
  TerasSelectField,
} from "@/teras";
import { parseExecutionWorkItemReference } from "./execution-work-session-target.ts";

export function ExecutionWorkSessionTargetDialog({
  onClose,
  onOpenTarget,
  onInspectTarget,
  onCompleteTarget,
  open,
}: {
  onClose: () => void;
  onOpenTarget: (workItemId: number) => void;
  onInspectTarget?: (workItemId: number) => void;
  onCompleteTarget?: (workItemId: number) => void;
  open: boolean;
}) {
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [workPath, setWorkPath] = useState("source");

  useEffect(() => {
    if (!open) {
      setReference("");
      setError(null);
      setWorkPath("source");
    }
  }, [open]);

  function openTarget(inspect = false) {
    try {
      const workItemId = parseExecutionWorkItemReference(reference);
      if (inspect && onInspectTarget) onInspectTarget(workItemId);
      else if (workPath === "completion" && onCompleteTarget) onCompleteTarget(workItemId);
      else onOpenTarget(workItemId);
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
          {onInspectTarget ? (
            <TerasActionButton disabled={!reference.trim()} emphasis="secondary" onClick={() => openTarget(true)}>
              Inspect ART Tree
            </TerasActionButton>
          ) : null}
          <TerasActionButton disabled={!reference.trim()} onClick={() => openTarget()}>
            {workPath === "completion" ? "Open Completion" : "Open Session"}
          </TerasActionButton>
        </>
      }
      closeLabel="Close work item entry"
      contentOverflow="auto"
      description="Enter the exact ART item. Inspect its canonical initiative tree without starting work, or open its governed session. Inspection does not grant execution eligibility or mutation authority."
      height="content"
      kicker="Execution Board"
      onClose={onClose}
      open={open}
      title="Open Governed Work"
      width="compact"
    >
      <TerasFieldStack spacing="normal">
        {onCompleteTarget ? <TerasSelectField label="Work path" value={workPath} onValueChange={setWorkPath}
          options={[{ label: "Governed source session", value: "source" }, { label: "Non-source completion", value: "completion" }]} /> : null}
        <TerasTextField
          aria-label="ART work item"
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
