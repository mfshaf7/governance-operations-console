"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";

import type { DeliveryPackageSummary } from "../../../../../read-model/index.ts";
import {
  workDesignBoardInventory,
  workDesignContextBoardCoreNodes,
  workDesignSnapshotAttachment,
} from "../../../../../product-adapters/context-board/index.ts";
import {
  workDesignGeneratedSeedSummary,
  workDesignGeneratedTreeSeedMetrics,
} from "../../../../../product-adapters/build-tree/index.ts";
import { workDesignContextDecisionCopy } from "../../view-model/work-design-context-decision-model.ts";
import { workDesignSnapshotAttachmentStatusLabel } from "../../view-model/work-design-display-formatters.ts";
import {
  TerasDialog,
  TerasContentTray,
  TerasMediaSnapshotViewerDialog,
} from "@/teras";
import { downloadConsoleHref } from "@/console-integration/browser-download";

import {
  workDesignFinalizedBriefView,
  workDesignFinalizedContextBoardSnapshot,
  workDesignSnapshotAttachmentSourceLabel,
} from "./work-design-context-brief-model.ts";
import { WorkDesignFinalizedBriefDetailsDialog } from "./work-design-finalized-brief-details-dialog.tsx";
import { WorkDesignFinalizedBriefDialog } from "./work-design-finalized-brief-dialog.tsx";

type WorkDesignFinalizedBriefEvidenceDialogProps = {
  deliveryPackage: DeliveryPackageSummary | null;
  description?: string;
  handoffReceiptId?: string;
  kicker?: string;
  onClose: () => void;
  open: boolean;
};

export function WorkDesignFinalizedBriefEvidenceDialog({
  deliveryPackage,
  description = "Read-only Work Design finalized brief evidence carried into this downstream workflow.",
  handoffReceiptId,
  kicker = "Work Design Handoff",
  onClose,
  open,
}: WorkDesignFinalizedBriefEvidenceDialogProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const evidence = useMemo(() => {
    if (!deliveryPackage?.work_design_context_session?.accepted) {
      return null;
    }

    const session = deliveryPackage.work_design_context_session;
    const finalizedBrief = workDesignFinalizedBriefView({
      decision: session.decision,
      deliveryPackage,
      note: session.note,
      savedSession: null,
      session,
    });
    const boardSnapshot = workDesignFinalizedContextBoardSnapshot({
      deliveryPackage,
    });
    const snapshotCoreNodes = workDesignContextBoardCoreNodes(
      deliveryPackage,
      finalizedBrief.decision,
    );
    const boardInventory = workDesignBoardInventory(
      boardSnapshot,
      snapshotCoreNodes,
    );
    const snapshotAttachment = workDesignSnapshotAttachment({
      artifact: finalizedBrief.snapshotArtifact,
      coreNodes: snapshotCoreNodes,
      ref: finalizedBrief.boardSnapshotRef,
      snapshot: boardSnapshot,
      summary: finalizedBrief.diagramSummary,
      title: finalizedBrief.diagramTitle,
    });
    const buildSeedMetrics = workDesignGeneratedTreeSeedMetrics(
      session.generated_tree,
    );
    const nextSurface =
      finalizedBrief.carriedMetadata.find(
        (item) => item.label === "Next Surface",
      )?.value ??
      (finalizedBrief.decision === "proceed"
        ? "Build Tree Inputs"
        : "Decision Record");
    const receiptRows = [
      {
        label: "Apply Receipt",
        value: handoffReceiptId ?? "No apply receipt in handoff packet",
      },
      {
        label: "Decision",
        value: workDesignContextDecisionCopy(finalizedBrief.decision).label,
      },
      {
        label: "Next Step",
        value: nextSurface,
      },
      {
        label: "Canvas Contents",
        value: boardInventory.summary,
      },
      {
        label: "Draft Seeds",
        value: workDesignGeneratedSeedSummary(buildSeedMetrics),
      },
    ];

    return {
      boardInventory,
      finalizedBrief,
      receiptRows,
      snapshotAttachment,
      snapshotAttachmentExportLabel:
        snapshotAttachment.source === "canvas_screenshot"
          ? "Export Screenshot"
          : "Export Preview",
      snapshotAttachmentSourceLabel: workDesignSnapshotAttachmentSourceLabel(
        snapshotAttachment.source,
      ),
      snapshotAttachmentStatusLabel: workDesignSnapshotAttachmentStatusLabel(
        snapshotAttachment.attachmentStatus,
      ),
      targetTitle:
        finalizedBrief.decision === "proceed"
          ? "Build Tree Inputs"
          : finalizedBrief.decision === "attach"
            ? "Existing Work Link"
            : "Retirement Record",
    };
  }, [deliveryPackage, handoffReceiptId]);

  function exportSnapshotAttachment() {
    if (!evidence) {
      return;
    }

    downloadConsoleHref(
      evidence.snapshotAttachment.dataUrl,
      evidence.snapshotAttachment.fileName,
    );
  }

  if (!evidence || !deliveryPackage) {
    return (
      <TerasDialog
        contentOverflow="auto"
        height="content"
        width="standard"
        description={description}
        kicker={kicker}
        onClose={onClose}
        open={open}
        title="Finalized Brief Source Unavailable"
      >
        <TerasContentTray
          kicker="Unavailable Evidence"
          title="Work Design finalized brief is not loaded"
        >
          The Refinement packet points to Work Design evidence, but this local
          read model does not include a finalized Work Design source package for
          that pointer.
        </TerasContentTray>
      </TerasDialog>
    );
  }

  return (
    <>
      <WorkDesignFinalizedBriefDialog
        applyCompleted
        contextBoardInventory={evidence.boardInventory}
        contextBriefReady
        contextDecision={evidence.finalizedBrief.decision}
        contextFinalizeCanRun={false}
        contextFinalizeRequirementRows={[]}
        contextFinalizeRunning={false}
        contextFinalizedBrief={evidence.finalizedBrief}
        contextFinalizedBriefDescription={description}
        contextFinalizedBriefHandoffLabel="Applied Work Design Source"
        contextFinalizedBriefReceiptRows={evidence.receiptRows}
        contextFinalizedBriefTargetTitle={evidence.targetTitle}
        contextSnapshotAttachment={evidence.snapshotAttachment}
        contextSnapshotAttachmentExportLabel={
          evidence.snapshotAttachmentExportLabel
        }
        contextSnapshotAttachmentSourceLabel={
          evidence.snapshotAttachmentSourceLabel
        }
        contextSnapshotAttachmentStatusLabel={
          evidence.snapshotAttachmentStatusLabel
        }
        deliveryPackage={deliveryPackage}
        evidenceOnly
        evidenceDescription={description}
        evidenceKicker={kicker}
        exportContextSnapshotAttachment={exportSnapshotAttachment}
        finalizeContextBrief={() => undefined}
        onClose={onClose}
        onOpenDetails={() => setDetailsOpen(true)}
        onOpenSnapshot={() => setSnapshotOpen(true)}
        open={open}
        reopenContextBriefFromFinalize={() => undefined}
      />
      <TerasMediaSnapshotViewerDialog
        description={
          evidence.snapshotAttachment.source === "canvas_screenshot"
            ? "Rendered canvas screenshot attached to the finalized context brief."
            : "Stored board-state preview shown because no live canvas screenshot is available for this session."
        }
        exportAction={{
          icon: <Download aria-hidden="true" size={14} />,
          label: evidence.snapshotAttachmentExportLabel,
          onClick: exportSnapshotAttachment,
          tone: "warn",
        }}
        imageAlt={`${evidence.snapshotAttachment.title} full snapshot attachment`}
        imageSrc={evidence.snapshotAttachment.dataUrl}
        kicker={evidence.snapshotAttachmentSourceLabel}
        onClose={() => setSnapshotOpen(false)}
        open={snapshotOpen}
        title="Context Snapshot Viewer"
        toolbarTitle={evidence.snapshotAttachment.fileName}
      />
      <WorkDesignFinalizedBriefDetailsDialog
        contextFinalizedBrief={evidence.finalizedBrief}
        contextSnapshotAttachment={evidence.snapshotAttachment}
        onClose={() => setDetailsOpen(false)}
        open={detailsOpen}
      />
    </>
  );
}
