"use client";

import { Download } from "lucide-react";

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
  TerasEmptyState,
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

import { WorkDesignSnapshotPreview } from "./work-design-snapshot-preview.tsx";
import { WorkDesignHandoffNote } from "./work-design-handoff-note.tsx";

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
  artifactAvailable?: boolean;
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
    props.artifactAvailable === false || evidenceOnly || (contextBriefReady && !contextFinalizeRunning);

  return <WorkDesignFinalizedBriefArtifactDialog {...props} preparing={!finalizedView} />;
}

function WorkDesignFinalizedBriefArtifactDialog({
  artifactAvailable = true,
  preparing,
  applyCompleted,
  contextDecision,
  contextFinalizeCanRun,
  contextFinalizeRequirementRows,
  contextFinalizeRunning,
  finalizeContextBrief,
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
  open,
  reopenContextBriefFromFinalize,
}: WorkDesignFinalizedBriefDialogProps & { preparing: boolean }) {
  const canReopenBrief = !preparing && !evidenceOnly && !applyCompleted;

  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      width="wide"
      actions={
        preparing ? (
          <TerasActionButton busy={contextFinalizeRunning}
            disabled={applyCompleted || !contextFinalizeCanRun || contextFinalizeRunning}
            onClick={finalizeContextBrief}
            tone={workDesignFinalizeActionTone(contextFinalizeCanRun) === "danger" ? "danger" : "accent"}>
            {contextFinalizeRunning ? "Finalizing..." : "Finalize Brief"}
          </TerasActionButton>
        ) : canReopenBrief ? (
          <TerasActionButton
            onClick={reopenContextBriefFromFinalize}
            emphasis="secondary"
          >
            Reopen Brief
          </TerasActionButton>
        ) : undefined
      }
      closeDisabled={contextFinalizeRunning}
      closeLabel={preparing ? "Close finalize brief" : "Close finalized brief"}
      description={
        preparing
          ? contextFinalizeRunning ? "Finalizing the saved context brief." : "Review the saved diagrams and note, then finalize this version for the next step."
          : evidenceOnly
          ? (evidenceDescription ?? contextFinalizedBriefDescription)
          : contextFinalizedBriefDescription
      }
      kicker={
        preparing ? "Finalize Brief" : evidenceOnly
          ? (evidenceKicker ?? "Work Design Handoff")
          : "Finalized Brief"
      }
      onClose={onClose}
      open={open}
      title={preparing && !contextFinalizeCanRun ? "Review Context Brief" : artifactAvailable ? contextFinalizedBrief.name : "Finalized Brief"}
    >
      {artifactAvailable ? <TerasZoneLayout variant="main-aside">
        <TerasZone fit="fill">
          <TerasMetadataList
            accent="rail"
            columns={3}
            items={preparing ? [
              { label: "Session", value: contextFinalizeCanRun ? "Saved draft" : "Save required" },
              { label: "Finalization", value: contextFinalizeRunning ? "In progress" : "Not finalized" },
              { label: "Decision", value: contextDecision === "proceed" ? "Proceed" : contextDecision === "attach" ? "Link to existing work" : "Retire duplicate" },
            ] : workDesignFinalizedBriefSummaryMetadata(contextFinalizedBrief)}
          />
          <TerasTrayStack align="start" scroll spacing="comfortable">
            <TerasHighlightPanel>
              <TerasTrayStack spacing="comfortable">
                <TerasPanelHeader
                  description={preparing ? "Review the saved context for this package before locking its handoff version." : "Current package identity. The retained brief content has its own original version and observation."}
                  kicker="Delivery Package"
                  statusLabel={preparing ? contextFinalizeCanRun ? "Awaiting finalization" : "Save required" : "Brief Finalized"}
                  statusTone={preparing ? "warn" : "ok"}
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
            <TerasPanel frame="padded" treatment="state" tone="warn" fit="content" spacing="normal">
              <TerasPanelHeader
                description={contextSnapshotAttachment.summary}
                kicker={contextSnapshotAttachmentSourceLabel}
                statusLabel={contextSnapshotAttachmentStatusLabel}
                statusTone={workDesignSnapshotAttachmentStatusTone(
                  contextSnapshotAttachment.attachmentStatus,
                )}
                title={contextSnapshotAttachment.title}
              />
              {preparing && !contextFinalizeCanRun ? <TerasEmptyState>Save the current Context Session before reviewing and finalizing it. Your draft stays editable.</TerasEmptyState> : <WorkDesignSnapshotPreview
                attachment={contextSnapshotAttachment}
                exportAction={{
                  icon: <Download aria-hidden="true" size={14} />,
                  label: contextSnapshotAttachmentExportLabel,
                  onClick: exportContextSnapshotAttachment,
                  tone: "warn",
                }}
                facts={workDesignSnapshotAttachmentMetadata({
                  contextBoardInventory,
                  contextSnapshotAttachment,
                  contextSnapshotAttachmentSourceLabel,
                })}
                previewAriaLabel="View full context snapshot"
              />}
              <TerasTrayStack topOffset="normal">
                <WorkDesignHandoffNote note={contextFinalizedBrief.note} />
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
              description={preparing ? "Planned handoff for the saved session. Finalize Brief locks the version for this next step." : "Read-only receipt facts for the finalized brief handoff."}
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
              description={preparing ? "Finalization creates the locked version and its retained handoff evidence. These steps remain pending until you confirm." : "Derived checks captured before the brief was locked."}
              kicker="Finalization Checks"
              title={preparing ? "Prepare saved context" : `${contextFinalizedBrief.systemChecks.length} derived checks`}
            />
            <TerasList>
              {preparing ? contextFinalizeRequirementRows.map(item => <TerasStatusItem
                key={item.label} label={item.label} detail={item.detail} status={item.status}
                tone={workDesignFinalizeRequirementTone(item.ready)} />) : contextFinalizedBrief.systemChecks.map((item) => (
                <TerasStatusItem
                  detail={item.detail}
                  key={item.label}
                  label={item.label}
                  status={item.status}
                  tone={item.tone}
                />
              ))}
            </TerasList>
            {!preparing ? <TerasActionRow spacing="normal">
              <TerasActionButton
                onClick={onOpenDetails}
                tone="warn"
                treatment="tonal"
              >
                View Details
              </TerasActionButton>
            </TerasActionRow> : null}
          </TerasPanel>
        </TerasZone>
      </TerasZoneLayout> : <TerasEmptyState>The original finalized brief was not retained in this browser session. Current package metadata is not substituted. Canonical application receipts remain available through History.</TerasEmptyState>}
    </TerasDialog>
  );
}
