"use client";

import { Download } from "lucide-react";
import type { WorkDesignApplyFeedback } from "../../view-model/work-design-live-apply-feedback.ts";
import type { WorkDesignLiveMode } from "../../../../../live-runtime/work-design-live-types.ts";
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
  TerasLoadingState,
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
  feedback: WorkDesignApplyFeedback;
  runtimeMode: WorkDesignLiveMode;
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
  feedback,
  runtimeMode,
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
        <TerasZone scroll fit="fill">
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
          <TerasPanel spacing="normal"
            frame="padded"
            treatment="state"
            layout="header-body"
            tone="info"
          >
            <TerasPanelHeader
              kicker="Apply Review"
              statusLabel={feedback.pending ? applyComplete ? "refreshing" : "processing" : feedback.needsCheck && !applyComplete ? "unconfirmed" : headerProjection.statusLabel}
              statusTone="info"
              title={feedback.pending ? applyComplete ? "Refreshing Delivery" : "Applying Work Design" : feedback.needsCheck && !applyComplete ? "Check Apply Status" : headerProjection.title}
              description={feedback.needsCheck && !applyComplete ? "The result is not confirmed. Check the original application before submitting again." : headerProjection.description}
            />
            {feedback.pending ? <TerasLoadingState inline skeleton="none" label={applyComplete ? "Refreshing Delivery…" : feedback.needsCheck ? "Checking original application…" : "Applying reviewed tree…"} detail={applyComplete ? "Application is confirmed. Reading current Delivery status." : "Waiting for the backend response; intermediate stages are not streamed."} /> : null}
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
        <TerasZone scroll fit="fill">
          <TerasPanel spacing="normal"
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
                runtimeMode,
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
            description={feedback.pending ? "Submission is recorded below. Waiting for the confirmed backend result." : feedback.needsCheck && !applyComplete ? "The result is unconfirmed. Check the original application; no automatic retry is made." : logProjection.description}
            fullLog={{
              actions: (
                <TerasActionButton onClick={exportApplyLog}>
                  <Download aria-hidden="true" size={14} />
                  Export Log
                </TerasActionButton>
              ),
              closeLabel: "Close full apply log",
              description:
                "Timestamped apply record for troubleshooting, including the authoritative receipt when live apply completes.",
              facts: workDesignApplyLogFacts({
                applyDraftRef,
                applyLogRecordedAt,
                applyTargetRecordRef,
                packageName: deliveryPackage.display_name,
              }),
              title: "Apply Run Log",
            }}
            rows={applyLogRows}
            statusLabel={feedback.pending ? "processing" : feedback.needsCheck && !applyComplete ? "unconfirmed" : logProjection.statusLabel}
            statusTone={logProjection.statusTone}
            title="Apply Run Log"
            tone={logProjection.tone}
          />
        </TerasZone>
      </TerasZoneLayout>
    </TerasContentRegion>
  );
}
