"use client";

import type { ComponentProps } from "react";
import { Download } from "lucide-react";

import { ContextBoardSnapshotCaptureSurface } from "@/product-apps/context-board";
import { WorkDesignApplyLogDialog } from "../steps/apply-draft/work-design-apply-log-dialog.tsx";
import {
  WorkDesignFinalizedBriefDetailsDialog,
  WorkDesignFinalizedBriefDialog,
} from "../artifacts/context-brief/index.ts";
import type { WorkDesignSnapshotAttachment } from "../artifacts/context-brief/index.ts";
import { WorkDesignReviewTreeDialog } from "../steps/review-draft/work-design-review-tree-dialog.tsx";
import {
  DeliveryBlockerActionInfoDialog,
  DeliveryBlockerRecoveryDialog,
} from "../../shared/blocker-recovery/index.ts";
import {
  WorkDesignBoardResetGuardDialog,
  WorkDesignTemplateTrayDeleteGuardDialog,
} from "./dialogs/work-design-board-guard-dialogs.tsx";
import { WorkDesignCloseGuardDialog } from "./dialogs/work-design-close-guard-dialog.tsx";
import {
  WorkDesignSavedSessionsDialog,
  WorkDesignSaveSessionDialog,
} from "./dialogs/work-design-session-checkpoint-dialogs.tsx";
import { WorkDesignTreeReconciliationDialog } from "./dialogs/work-design-tree-reconciliation-dialog.tsx";
import {
  WorkDesignDeleteDraftItemDialog,
  WorkDesignDeleteGuardDialog,
  WorkDesignScaffoldDialog,
} from "../embedded-products/build-tree/index.ts";
import { TerasMediaSnapshotViewerDialog } from "@/teras";

type WorkDesignSnapshotViewerDialogProps = {
  contextSnapshotAttachment: WorkDesignSnapshotAttachment;
  contextSnapshotAttachmentExportLabel: string;
  contextSnapshotAttachmentSourceLabel: string;
  exportContextSnapshotAttachment: () => void;
  onClose: () => void;
  open: boolean;
};

type WorkDesignSessionDialogStackProps = {
  applyLogDialog: ComponentProps<typeof WorkDesignApplyLogDialog>;
  blockerActionInfoDialog: ComponentProps<
    typeof DeliveryBlockerActionInfoDialog
  >;
  blockerRecoveryDialog: ComponentProps<typeof DeliveryBlockerRecoveryDialog>;
  boardResetGuardDialog: ComponentProps<typeof WorkDesignBoardResetGuardDialog>;
  closeGuardDialog: ComponentProps<typeof WorkDesignCloseGuardDialog>;
  deleteDraftItemDialog: ComponentProps<typeof WorkDesignDeleteDraftItemDialog>;
  deleteGuardDialog: ComponentProps<typeof WorkDesignDeleteGuardDialog>;
  finalizedBriefDetailsDialog: ComponentProps<
    typeof WorkDesignFinalizedBriefDetailsDialog
  >;
  finalizedBriefDialog: ComponentProps<typeof WorkDesignFinalizedBriefDialog>;
  reviewTreeDialog: ComponentProps<typeof WorkDesignReviewTreeDialog>;
  saveSessionDialog: ComponentProps<typeof WorkDesignSaveSessionDialog>;
  savedSessionsDialog: ComponentProps<typeof WorkDesignSavedSessionsDialog>;
  scaffoldDialog: ComponentProps<typeof WorkDesignScaffoldDialog>;
  snapshotCapture: ComponentProps<
    typeof ContextBoardSnapshotCaptureSurface
  > | null;
  snapshotViewerDialog: WorkDesignSnapshotViewerDialogProps;
  templateTrayDeleteGuardDialog: ComponentProps<
    typeof WorkDesignTemplateTrayDeleteGuardDialog
  >;
  treeReconciliationDialog: ComponentProps<
    typeof WorkDesignTreeReconciliationDialog
  >;
};

export function WorkDesignSessionDialogStack({
  applyLogDialog,
  blockerActionInfoDialog,
  blockerRecoveryDialog,
  boardResetGuardDialog,
  closeGuardDialog,
  deleteDraftItemDialog,
  deleteGuardDialog,
  finalizedBriefDetailsDialog,
  finalizedBriefDialog,
  reviewTreeDialog,
  saveSessionDialog,
  savedSessionsDialog,
  scaffoldDialog,
  snapshotCapture,
  snapshotViewerDialog,
  templateTrayDeleteGuardDialog,
  treeReconciliationDialog,
}: WorkDesignSessionDialogStackProps) {
  return (
    <>
      {snapshotCapture ? (
        <ContextBoardSnapshotCaptureSurface {...snapshotCapture} />
      ) : null}

      <WorkDesignApplyLogDialog {...applyLogDialog} />
      <WorkDesignFinalizedBriefDialog {...finalizedBriefDialog} />
      <WorkDesignReviewTreeDialog {...reviewTreeDialog} />
      <TerasMediaSnapshotViewerDialog
        description={
          snapshotViewerDialog.contextSnapshotAttachment.source ===
          "canvas_screenshot"
            ? "Rendered canvas screenshot attached to the finalized context brief."
            : "Stored board-state preview shown because no live canvas screenshot is available for this session."
        }
        exportAction={{
          icon: <Download aria-hidden="true" size={14} />,
          label: snapshotViewerDialog.contextSnapshotAttachmentExportLabel,
          onClick: snapshotViewerDialog.exportContextSnapshotAttachment,
          tone: "warn",
        }}
        imageAlt={`${snapshotViewerDialog.contextSnapshotAttachment.title} full snapshot attachment`}
        imageSrc={snapshotViewerDialog.contextSnapshotAttachment.dataUrl}
        kicker={snapshotViewerDialog.contextSnapshotAttachmentSourceLabel}
        onClose={snapshotViewerDialog.onClose}
        open={snapshotViewerDialog.open}
        title="Context Snapshot Viewer"
        toolbarTitle={snapshotViewerDialog.contextSnapshotAttachment.fileName}
      />
      <WorkDesignFinalizedBriefDetailsDialog {...finalizedBriefDetailsDialog} />
      <WorkDesignSaveSessionDialog {...saveSessionDialog} />
      <WorkDesignSavedSessionsDialog {...savedSessionsDialog} />
      <WorkDesignTreeReconciliationDialog {...treeReconciliationDialog} />
      <DeliveryBlockerRecoveryDialog {...blockerRecoveryDialog} />
      <DeliveryBlockerActionInfoDialog {...blockerActionInfoDialog} />
      <WorkDesignScaffoldDialog {...scaffoldDialog} />
      <WorkDesignBoardResetGuardDialog {...boardResetGuardDialog} />
      <WorkDesignTemplateTrayDeleteGuardDialog
        {...templateTrayDeleteGuardDialog}
      />
      <WorkDesignDeleteDraftItemDialog {...deleteDraftItemDialog} />
      <WorkDesignDeleteGuardDialog {...deleteGuardDialog} />
      <WorkDesignCloseGuardDialog {...closeGuardDialog} />
    </>
  );
}
