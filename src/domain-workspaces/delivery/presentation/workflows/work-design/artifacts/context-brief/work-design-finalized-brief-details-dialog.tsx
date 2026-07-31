"use client";

import { TerasDialog, TerasMetadataList } from "@/teras";

import type {
  WorkDesignFinalizedBrief,
  WorkDesignSnapshotAttachment,
} from "./work-design-context-brief-model.ts";
import { workDesignFinalizedBriefReferenceMetadata } from "./work-design-context-brief-model.ts";

type WorkDesignFinalizedBriefDetailsDialogProps = {
  contextFinalizedBrief: WorkDesignFinalizedBrief;
  contextSnapshotAttachment: WorkDesignSnapshotAttachment;
  onClose: () => void;
  open: boolean;
};

export function WorkDesignFinalizedBriefDetailsDialog({
  contextFinalizedBrief,
  contextSnapshotAttachment,
  onClose,
  open,
}: WorkDesignFinalizedBriefDetailsDialogProps) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      width="standard"
      closeLabel="Close finalized brief details"
      description="Inspect machine-readable refs that are not repeated in the summary view."
      kicker="Finalized Brief Record"
      onClose={onClose}
      open={open}
      title="Record References"
    >
      <TerasMetadataList
        items={workDesignFinalizedBriefReferenceMetadata({
          contextFinalizedBrief,
          contextSnapshotAttachment,
        })}
      />
    </TerasDialog>
  );
}
