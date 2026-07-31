"use client";

import { Download } from "lucide-react";
import type {
  DeliveryPackageSummary,
  DeliveryTone,
} from "../../../../../read-model/index.ts";

import {
  workDesignApplyHeaderProjection,
  workDesignApplyInputsProjection,
  workDesignApplyLogFacts,
  workDesignApplyLogPanelProjection,
  workDesignApplyLogRows,
  workDesignApplyReadinessRows,
} from "../../view-model/work-design-apply-model.ts";
import type { WorkDesignSnapshotAttachment } from "../../artifacts/context-brief/index.ts";
import { deliveryPackageSourceMetadata } from "../../../../shared/delivery-package-metadata.ts";
import {
  TerasActivityLogPanel,
  TerasStatusItem,
  TerasList,
  TerasActionButton,
  TerasContentRegion,
  TerasSubjectHero,
  TerasPanel,
  TerasPanelHeader,
  TerasZoneLayout,
  TerasZone,
} from "@/teras";

type WorkDesignApplyChecklistRow = {
  detail: string;
  label: string;
  status: string;
  tone: DeliveryTone;
};

type WorkDesignApplyExecutionLogLine = {
  marker: string;
  text: string;
  timestamp: string;
  tone: DeliveryTone;
};

type WorkDesignApplyDraftViewProps = {
  applyReceiptRecorded: boolean;
  applyBackendChecklistRows: WorkDesignApplyChecklistRow[];
  applyDraftRef: string;
  applyExecutionLogLines: WorkDesignApplyExecutionLogLine[];
  applyLogRecordedAt: string;
  applyReady: boolean;
  applySnapshotActionLabel: string;
  applyTargetRecordRef: string;
  contextSnapshotAttachment: WorkDesignSnapshotAttachment;
  deliveryPackage: DeliveryPackageSummary;
  exportApplyLog: () => void;
  hasUnsavedSessionChanges: boolean;
  onOpenFinalizedBrief: () => void;
  draftReviewAccepted: boolean;
  sourceApplyComplete: boolean;
};

export function WorkDesignApplyDraftView({
  applyReceiptRecorded,
  applyBackendChecklistRows,
  applyDraftRef,
  applyExecutionLogLines,
  applyLogRecordedAt,
  applyReady,
  applySnapshotActionLabel,
  applyTargetRecordRef,
  contextSnapshotAttachment,
  deliveryPackage,
  exportApplyLog,
  hasUnsavedSessionChanges,
  onOpenFinalizedBrief,
  draftReviewAccepted,
  sourceApplyComplete,
}: WorkDesignApplyDraftViewProps) {
  const headerProjection = workDesignApplyHeaderProjection({
    applyReady,
    applyReceiptRecorded,
    sourceApplyComplete,
  });
  const applyComplete = headerProjection.applyComplete;
  const inputsProjection = workDesignApplyInputsProjection({
    applyComplete,
    applyReady,
  });
  const logProjection = workDesignApplyLogPanelProjection({
    applyComplete,
    applyReady,
    applyReceiptRecorded,
    sourceApplyComplete,
  });
  const applyLogRows = workDesignApplyLogRows(applyExecutionLogLines);

  return (
    <TerasContentRegion gap="normal">
      <TerasZoneLayout variant="main-aside">
        <TerasZone fit="fill">
          <TerasSubjectHero
            actionDetail="Snapshot and finalization checks"
            actionLabel="View Finalized Brief"
            onAction={onOpenFinalizedBrief}
            subject={{
              eyebrow: "Selected Package",
              meta: deliveryPackageSourceMetadata(deliveryPackage),
              title: deliveryPackage.display_name,
            }}
          />
          <TerasPanel
            frame="padded"
            treatment="state"
            layout="header-body"
            tone="info"
          >
            <TerasPanelHeader
              kicker="Apply Review"
              statusLabel={headerProjection.statusLabel}
              statusTone="info"
              title={headerProjection.title}
              description={headerProjection.description}
            />
            <TerasList>
              {applyBackendChecklistRows.map((item, index) => (
                <TerasStatusItem
                  tone={item.tone}
                  detail={item.detail}
                  index={String(index + 1).padStart(2, "0")}
                  key={item.label}
                  label={item.label}
                  status={item.status}
                />
              ))}
            </TerasList>
          </TerasPanel>
        </TerasZone>
        <TerasZone fit="fill">
          <TerasPanel
            density="compact"
            frame="padded"
            treatment="rail"
            layout="header-toolbar-body"
            overflow="hidden"
            tone={inputsProjection.tone}
          >
            <TerasPanelHeader
              kicker="Apply Inputs"
              statusLabel={inputsProjection.statusLabel}
              statusTone={inputsProjection.statusTone}
              title={inputsProjection.title}
              description="Inputs checked before apply starts."
            />
            <TerasList>
              {workDesignApplyReadinessRows({
                applyTargetRecordRef,
                hasUnsavedSessionChanges,
                draftReviewAccepted,
                snapshotAction: applySnapshotActionLabel,
                snapshotStatus: contextSnapshotAttachment.attachmentStatus,
                sourceApplyComplete,
              }).map((gate) => (
                <TerasStatusItem
                  detail={gate.detail}
                  key={gate.label}
                  label={gate.label}
                  status={gate.status}
                  tone={gate.tone}
                />
              ))}
            </TerasList>
          </TerasPanel>
          <TerasActivityLogPanel
            description={logProjection.description}
            fullLog={{
              actions: (
                <TerasActionButton onClick={exportApplyLog}>
                  <Download aria-hidden="true" size={14} />
                  Export Log
                </TerasActionButton>
              ),
              closeLabel: "Close full apply log",
              description:
                "Timestamped preview record for apply troubleshooting. Live wiring will replace these mock rows with streamed backend events.",
              facts: workDesignApplyLogFacts({
                applyDraftRef,
                applyLogRecordedAt,
                applyTargetRecordRef,
                packageName: deliveryPackage.display_name,
              }),
              title: "Apply Run Log",
            }}
            rows={applyLogRows}
            statusLabel={logProjection.statusLabel}
            statusTone={logProjection.statusTone}
            title="Apply Run Log"
            tone={logProjection.tone}
          />
        </TerasZone>
      </TerasZoneLayout>
    </TerasContentRegion>
  );
}
