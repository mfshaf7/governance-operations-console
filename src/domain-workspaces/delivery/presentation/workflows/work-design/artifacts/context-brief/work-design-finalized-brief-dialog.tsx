"use client";

import { Download, Maximize2 } from "lucide-react";

import type { DeliveryPackageSummary } from "../../../../../read-model/index.ts";
import type { WorkDesignContextDecision } from "../../model/work-design-model.ts";
import { workDesignSnapshotAttachmentStatusTone } from "../../view-model/work-design-display-formatters.ts";
import {
  TerasActionButton,
  TerasActionRow,
  TerasStatusItem,
  TerasList,
  TerasHighlightPanel,
  TerasDialog,
  TerasContentTray,
  TerasMediaSnapshot,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasTrayStack,
  TerasZone,
  TerasZoneLayout,
} from "@/teras";

import type {
  WorkDesignFinalizedBrief,
  WorkDesignSnapshotAttachment,
} from "./work-design-context-brief-model.ts";
import {
  workDesignFinalizeActionTone,
  workDesignFinalizeRequirementTone,
  workDesignFinalizedBriefPackageMetadata,
  workDesignFinalizedBriefSummaryMetadata,
  workDesignSnapshotAttachmentMetadata,
} from "./work-design-context-brief-model.ts";

type WorkDesignBoardInventorySummary = {
  summary: string;
};

type WorkDesignFinalizedBriefReceiptRow = {
  label: string;
  value: string;
};

type WorkDesignFinalizeRequirementRow = {
  detail: string;
  label: string;
  ready: boolean;
  status: string;
};

type WorkDesignFinalizedBriefDialogProps = {
  applyCompleted: boolean;
  contextBoardInventory: WorkDesignBoardInventorySummary;
  contextBriefReady: boolean;
  contextDecision: WorkDesignContextDecision;
  contextFinalizeCanRun: boolean;
  contextFinalizeRequirementRows: WorkDesignFinalizeRequirementRow[];
  contextFinalizeRunning: boolean;
  contextFinalizedBrief: WorkDesignFinalizedBrief;
  contextFinalizedBriefDescription: string;
  contextFinalizedBriefHandoffLabel: string;
  contextFinalizedBriefReceiptRows: WorkDesignFinalizedBriefReceiptRow[];
  contextFinalizedBriefTargetTitle: string;
  contextSnapshotAttachment: WorkDesignSnapshotAttachment;
  contextSnapshotAttachmentExportLabel: string;
  contextSnapshotAttachmentSourceLabel: string;
  contextSnapshotAttachmentStatusLabel: string;
  deliveryPackage: DeliveryPackageSummary;
  evidenceOnly?: boolean;
  evidenceDescription?: string;
  evidenceKicker?: string;
  exportContextSnapshotAttachment: () => void;
  finalizeContextBrief: () => void;
  onClose: () => void;
  onOpenDetails: () => void;
  onOpenSnapshot: () => void;
  open: boolean;
  reopenContextBriefFromFinalize: () => void;
};

export function WorkDesignFinalizedBriefDialog(
  props: WorkDesignFinalizedBriefDialogProps,
) {
  const {
    contextBriefReady,
    contextFinalizeRunning,
    evidenceOnly = false,
  } = props;
  const finalizedView =
    evidenceOnly || (contextBriefReady && !contextFinalizeRunning);

  return finalizedView ? (
    <WorkDesignFinalizedBriefArtifactDialog
      {...props}
      evidenceOnly={evidenceOnly}
    />
  ) : (
    <WorkDesignFinalizeBriefPreparationDialog {...props} />
  );
}

function WorkDesignFinalizeBriefPreparationDialog({
  contextDecision,
  contextFinalizeCanRun,
  contextFinalizeRequirementRows,
  contextFinalizeRunning,
  finalizeContextBrief,
  onClose,
  open,
}: WorkDesignFinalizedBriefDialogProps) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      width="standard"
      actions={
        <TerasActionButton
          disabled={!contextFinalizeCanRun || contextFinalizeRunning}
          onClick={finalizeContextBrief}
          tone={
            workDesignFinalizeActionTone(contextFinalizeCanRun) === "danger"
              ? "danger"
              : "accent"
          }
        >
          {contextFinalizeRunning ? "Finalizing..." : "Finalize Brief"}
        </TerasActionButton>
      }
      closeDisabled={contextFinalizeRunning}
      closeLabel="Close finalize brief"
      description={
        contextFinalizeRunning
          ? contextDecision === "proceed"
            ? "The loaded session is being locked, packetized, and captured for Build Tree."
            : "The loaded session is being locked, packetized, and captured as a decision record."
          : "Finalization prepares the loaded session for the next step. Each requirement updates as the handoff is prepared."
      }
      kicker="Finalize Brief"
      onClose={onClose}
      open={open}
      title={
        contextFinalizeRunning
          ? "Finalizing Context Handoff"
          : "Prepare Context Handoff"
      }
    >
      <TerasList columns={2}>
        {contextFinalizeRequirementRows.map((item) => (
          <TerasStatusItem
            tone={workDesignFinalizeRequirementTone(item.ready)}
            detail={item.detail}
            key={item.label}
            label={item.label}
            status={item.status}
          />
        ))}
      </TerasList>
    </TerasDialog>
  );
}

function WorkDesignFinalizedBriefArtifactDialog({
  applyCompleted,
  contextBoardInventory,
  contextFinalizedBrief,
  contextFinalizedBriefDescription,
  contextFinalizedBriefHandoffLabel,
  contextFinalizedBriefReceiptRows,
  contextFinalizedBriefTargetTitle,
  contextSnapshotAttachment,
  contextSnapshotAttachmentExportLabel,
  contextSnapshotAttachmentSourceLabel,
  contextSnapshotAttachmentStatusLabel,
  deliveryPackage,
  evidenceOnly = false,
  evidenceDescription,
  evidenceKicker,
  exportContextSnapshotAttachment,
  onClose,
  onOpenDetails,
  onOpenSnapshot,
  open,
  reopenContextBriefFromFinalize,
}: WorkDesignFinalizedBriefDialogProps) {
  const canReopenBrief = !evidenceOnly && !applyCompleted;

  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      width="wide"
      actions={
        canReopenBrief ? (
          <TerasActionButton
            onClick={reopenContextBriefFromFinalize}
            emphasis="secondary"
          >
            Reopen Brief
          </TerasActionButton>
        ) : undefined
      }
      closeLabel="Close finalized brief"
      description={
        evidenceOnly
          ? (evidenceDescription ?? contextFinalizedBriefDescription)
          : contextFinalizedBriefDescription
      }
      kicker={
        evidenceOnly
          ? (evidenceKicker ?? "Work Design Handoff")
          : "Finalized Brief"
      }
      onClose={onClose}
      open={open}
      title={contextFinalizedBrief.name}
    >
      <TerasZoneLayout variant="main-aside">
        <TerasZone fit="fill">
          <TerasMetadataList
            accent="rail"
            columns={3}
            items={workDesignFinalizedBriefSummaryMetadata(
              contextFinalizedBrief,
            )}
          />
          <TerasTrayStack align="start" scroll spacing="comfortable">
            <TerasHighlightPanel>
              <TerasTrayStack spacing="comfortable">
                <TerasPanelHeader
                  description="Delivery package identity for the finalized brief artifact."
                  kicker="Delivery Package"
                  statusLabel="Brief Finalized"
                  statusTone="ok"
                  title={deliveryPackage.display_name}
                />
                <TerasMetadataList
                  items={workDesignFinalizedBriefPackageMetadata(
                    deliveryPackage,
                  )}
                  shape="line"
                  treatment="chip"
                  wrap
                />
              </TerasTrayStack>
            </TerasHighlightPanel>
            <TerasPanel frame="padded" treatment="state" tone="warn">
              <TerasPanelHeader
                description={contextSnapshotAttachment.summary}
                kicker={contextSnapshotAttachmentSourceLabel}
                statusLabel={contextSnapshotAttachmentStatusLabel}
                statusTone={workDesignSnapshotAttachmentStatusTone(
                  contextSnapshotAttachment.attachmentStatus,
                )}
                title={contextSnapshotAttachment.title}
              />
              <TerasMediaSnapshot
                actions={[
                  {
                    icon: <Maximize2 aria-hidden="true" size={14} />,
                    label: "View Snapshot",
                    onClick: onOpenSnapshot,
                    tone: "warn",
                  },
                  {
                    icon: <Download aria-hidden="true" size={14} />,
                    label: contextSnapshotAttachmentExportLabel,
                    onClick: exportContextSnapshotAttachment,
                    tone: "warn",
                  },
                ]}
                facts={workDesignSnapshotAttachmentMetadata({
                  contextBoardInventory,
                  contextSnapshotAttachment,
                  contextSnapshotAttachmentSourceLabel,
                })}
                imageAlt={`${contextSnapshotAttachment.title} snapshot attachment`}
                imageSrc={contextSnapshotAttachment.dataUrl}
                onPreview={onOpenSnapshot}
                previewAriaLabel="View full context snapshot"
              />
              <TerasTrayStack topOffset="normal">
                <TerasContentTray
                  description={contextFinalizedBrief.note}
                  kicker="Handoff Note"
                />
              </TerasTrayStack>
            </TerasPanel>
          </TerasTrayStack>
        </TerasZone>

        <TerasZone fit="fill">
          <TerasPanel
            frame="padded"
            treatment="rail"
            spacing="normal"
            tone="warn"
          >
            <TerasPanelHeader
              description="Read-only receipt facts for the finalized brief handoff."
              kicker={contextFinalizedBriefHandoffLabel}
              title={contextFinalizedBriefTargetTitle}
            />
            <TerasMetadataList items={contextFinalizedBriefReceiptRows} />
          </TerasPanel>
          <TerasPanel
            frame="padded"
            treatment="rail"
            fit="content"
            spacing="normal"
            tone="warn"
          >
            <TerasPanelHeader
              description="Derived checks captured before the brief was locked."
              kicker="Finalization Checks"
              title={`${contextFinalizedBrief.systemChecks.length} derived checks`}
            />
            <TerasList>
              {contextFinalizedBrief.systemChecks.map((item) => (
                <TerasStatusItem
                  detail={item.detail}
                  key={item.label}
                  label={item.label}
                  status={item.status}
                  tone={item.tone}
                />
              ))}
            </TerasList>
            <TerasActionRow spacing="normal">
              <TerasActionButton
                onClick={onOpenDetails}
                tone="warn"
                treatment="tonal"
              >
                View Details
              </TerasActionButton>
            </TerasActionRow>
          </TerasPanel>
        </TerasZone>
      </TerasZoneLayout>
    </TerasDialog>
  );
}
