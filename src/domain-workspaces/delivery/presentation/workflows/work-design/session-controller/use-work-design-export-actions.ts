"use client";

import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";

import { formatWorkDesignDateTime } from "../view-model/work-design-display-formatters.ts";
import {
  WORK_DESIGN_BOARD_HEIGHT,
  WORK_DESIGN_BOARD_WIDTH,
  downloadWorkDesignBlob,
  exportWorkDesignSnapshotAttachment,
  workDesignSnapshotCaptureBounds,
} from "../../../../product-adapters/context-board/index.ts";
import {
  workDesignCanvasScreenshotAttachment,
  workDesignFileSlug,
  type WorkDesignSnapshotAttachment,
} from "../artifacts/context-brief/index.ts";
import type {
  WorkDesignBoardSnapshot,
  WorkDesignContextDecision,
} from "../model/work-design-model.ts";

type WorkDesignApplyExecutionLogLine = {
  marker: string;
  text: string;
  timestamp: string;
};

type WorkDesignHistoryReceiptRow = {
  label: string;
  value: string;
};

type WorkDesignHistoryTimelineRow = {
  detail: string;
  label: string;
  status: string;
  timestamp: string;
};

type CaptureRenderedBoardScreenshotAttachmentParams = {
  fingerprint: string;
  plane: HTMLElement | null;
  snapshot: WorkDesignBoardSnapshot;
};

type UseWorkDesignExportActionsParams = {
  applyDraftRef: string;
  applyExecutionLogLines: WorkDesignApplyExecutionLogLine[];
  applyLogRecordedAt: string;
  applyReceiptRecorded: boolean;
  applyTargetRecordRef: string;
  contextDecision: WorkDesignContextDecision;
  contextGeneratedSnapshotAttachment: WorkDesignSnapshotAttachment;
  contextSnapshotAttachment: WorkDesignSnapshotAttachment;
  deliveryPackage: DeliveryPackageSummary;
  historyReceiptRows: WorkDesignHistoryReceiptRow[];
  historyTimelineRows: WorkDesignHistoryTimelineRow[];
};

export function useWorkDesignExportActions({
  applyDraftRef,
  applyExecutionLogLines,
  applyLogRecordedAt,
  applyReceiptRecorded,
  applyTargetRecordRef,
  contextDecision,
  contextGeneratedSnapshotAttachment,
  contextSnapshotAttachment,
  deliveryPackage,
  historyReceiptRows,
  historyTimelineRows,
}: UseWorkDesignExportActionsParams) {
  async function captureRenderedBoardScreenshotAttachment({
    fingerprint,
    plane,
    snapshot,
  }: CaptureRenderedBoardScreenshotAttachmentParams): Promise<WorkDesignSnapshotAttachment | null> {
    if (!plane) {
      return null;
    }

    const bounds = workDesignSnapshotCaptureBounds(snapshot);

    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(plane, {
        cacheBust: true,
        height: bounds.height,
        pixelRatio: 1,
        skipFonts: true,
        style: {
          height: `${WORK_DESIGN_BOARD_HEIGHT}px`,
          left: "0",
          top: "0",
          transform: `translate(${-bounds.minX}px, ${-bounds.minY}px)`,
          transformOrigin: "0 0",
          width: `${WORK_DESIGN_BOARD_WIDTH}px`,
        },
        width: bounds.width,
      });

      return workDesignCanvasScreenshotAttachment({
        baseAttachment: contextGeneratedSnapshotAttachment,
        bounds,
        dataUrl,
        fingerprint,
      });
    } catch {
      return null;
    }
  }

  function exportContextSnapshotAttachment() {
    exportWorkDesignSnapshotAttachment(contextSnapshotAttachment);
  }

  function exportApplyLog() {
    const fileName = `work-design-apply-log-${workDesignFileSlug(
      deliveryPackage.display_name,
    )}-${applyLogRecordedAt.replace(/[:.]/g, "-")}.txt`;
    const content = [
      "Work Design Apply Run Log",
      `Package: ${deliveryPackage.display_name}`,
      `Target: ${applyTargetRecordRef}`,
      `Draft Ref: ${applyDraftRef}`,
      `Recorded: ${formatWorkDesignDateTime(applyLogRecordedAt)}`,
      "",
      ...applyExecutionLogLines.map(
        (line) =>
          `${formatWorkDesignDateTime(line.timestamp)} ${line.marker} ${line.text}`,
      ),
      "",
    ].join("\n");

    downloadWorkDesignBlob(
      new Blob([content], { type: "text/plain;charset=utf-8" }),
      fileName,
    );
  }

  function exportWorkDesignReceipt() {
    const terminalDecisionExport =
      contextDecision !== "proceed" && !applyReceiptRecorded;
    const exportKind = terminalDecisionExport ? "decision-record" : "receipt";
    const fileName = `work-design-${exportKind}-${workDesignFileSlug(
      deliveryPackage.display_name,
    )}-${applyLogRecordedAt.replace(/[:.]/g, "-")}.txt`;
    const content = [
      terminalDecisionExport
        ? "Work Design Decision Record"
        : "Work Design Receipt History",
      `Package: ${deliveryPackage.display_name}`,
      `Epic: #${deliveryPackage.legacy_epic_id}`,
      `Source: ${deliveryPackage.source_ref}`,
      "",
      terminalDecisionExport ? "Decision Summary" : "Receipt Summary",
      ...historyReceiptRows.map((row) => `${row.label}: ${row.value}`),
      "",
      "Timeline",
      ...historyTimelineRows.map(
        (row) =>
          `${formatWorkDesignDateTime(row.timestamp)} ${row.status.toUpperCase()} ${row.label} - ${row.detail}`,
      ),
      "",
    ].join("\n");

    downloadWorkDesignBlob(
      new Blob([content], { type: "text/plain;charset=utf-8" }),
      fileName,
    );
  }

  return {
    captureRenderedBoardScreenshotAttachment,
    exportApplyLog,
    exportContextSnapshotAttachment,
    exportWorkDesignReceipt,
  };
}
