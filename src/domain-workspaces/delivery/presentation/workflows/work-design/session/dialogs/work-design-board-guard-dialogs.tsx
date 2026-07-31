"use client";

import { TerasDialog, TerasActionButton } from "@/teras";
import type { WorkDesignBoardTemplateTray } from "../../../../../product-adapters/context-board/index.ts";

type WorkDesignBoardResetGuardDialogProps = {
  onKeepBoard: () => void;
  onResetBoard: () => void;
  open: boolean;
};

export function WorkDesignBoardResetGuardDialog({
  onKeepBoard,
  onResetBoard,
  open,
}: WorkDesignBoardResetGuardDialogProps) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      width="compact"
      actions={
        <>
          <TerasActionButton onClick={onKeepBoard} emphasis="secondary">
            Keep Board
          </TerasActionButton>
          <TerasActionButton
            onClick={onResetBoard}
            tone="danger"
            emphasis="primary"
          >
            Reset Board
          </TerasActionButton>
        </>
      }
      description="This clears custom components, starter templates, connectors, freeform sketch strokes, moved core cards, and board styling. Undo remains available immediately after reset."
      kicker="Board Reset Guard"
      open={open}
      title="Reset Board?"
    />
  );
}

type WorkDesignTemplateTrayDeleteGuardDialogProps = {
  onDeleteTray: () => void;
  onKeepTray: () => void;
  tray: WorkDesignBoardTemplateTray | null;
};

export function WorkDesignTemplateTrayDeleteGuardDialog({
  onDeleteTray,
  onKeepTray,
  tray,
}: WorkDesignTemplateTrayDeleteGuardDialogProps) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      width="compact"
      actions={
        <>
          <TerasActionButton onClick={onKeepTray} emphasis="secondary">
            Keep Tray
          </TerasActionButton>
          <TerasActionButton
            onClick={onDeleteTray}
            tone="danger"
            emphasis="primary"
          >
            Delete Tray
          </TerasActionButton>
        </>
      }
      description={
        tray
          ? `Remove ${tray.label} and ${tray.itemIds.length} contained component${tray.itemIds.length === 1 ? "" : "s"} from this board. Undo remains available immediately after deletion.`
          : undefined
      }
      kicker="Template Delete Guard"
      open={Boolean(tray)}
      title="Delete Template Tray?"
    />
  );
}
