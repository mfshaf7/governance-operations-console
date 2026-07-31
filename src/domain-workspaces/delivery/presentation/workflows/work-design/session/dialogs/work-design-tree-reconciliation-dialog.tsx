"use client";

import { TerasDialog, TerasActionButton, TerasMetadataList } from "@/teras";
import type { WorkDesignBriefVersion } from "../../model/work-design-model.ts";
import { workDesignTreeReconciliationMetadata } from "../../artifacts/context-brief/index.ts";

type WorkDesignTreeReconciliationDialogProps = {
  activeBriefVersion: WorkDesignBriefVersion | null;
  metrics: {
    features: number;
    risks: number;
    stories: number;
  };
  onCancel: () => void;
  onKeepCurrentTree: () => void;
  onRegenerateTree: () => void;
  open: boolean;
  treeDraftStale: boolean;
};

export function WorkDesignTreeReconciliationDialog({
  activeBriefVersion,
  metrics,
  onCancel,
  onKeepCurrentTree,
  onRegenerateTree,
  open,
  treeDraftStale,
}: WorkDesignTreeReconciliationDialogProps) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      width="compact"
      actions={
        <>
          <TerasActionButton onClick={onCancel} emphasis="secondary">
            Cancel
          </TerasActionButton>
          <TerasActionButton onClick={onKeepCurrentTree}>
            Keep Current Tree
          </TerasActionButton>
          <TerasActionButton onClick={onRegenerateTree}>
            Regenerate Tree From Brief
          </TerasActionButton>
        </>
      }
      description="The previous Build Tree draft was preserved while the brief was reopened. Choose how the active brief version should bind to the tree."
      kicker="Brief Re-Finalized"
      open={open}
      title="Reconcile Tree Draft"
    >
      <TerasMetadataList
        items={workDesignTreeReconciliationMetadata({
          activeBriefVersion,
          metrics,
          treeDraftStale,
        })}
      />
    </TerasDialog>
  );
}
