"use client";

import { Download } from "lucide-react";
import type {
  DeliveryPackageSummary,
  DeliveryTone,
} from "../../../../../read-model/index.ts";

import type {
  WorkDesignFinalizedBrief,
  WorkDesignSnapshotAttachment,
} from "../../artifacts/context-brief/index.ts";
import { WorkDesignSnapshotPreview } from "../../artifacts/context-brief/work-design-snapshot-preview.tsx";
import { workDesignNodeDisplayTitle } from "../../../../../product-adapters/build-tree/index.ts";
import type { WorkDesignNode } from "../../model/work-design-model.ts";
import {
  workDesignReviewApprovalFacts,
  workDesignReviewGateProjection,
  workDesignReviewSnapshotFacts,
} from "../../view-model/work-design-session-view-model.ts";
import { deliveryPackageSourceMetadata } from "../../../../shared/delivery-package-metadata.ts";
import {
  TerasActionRow,
  TerasSubjectCard,
  TerasActionButton,
  TerasNoteField,
  TerasSubjectHero,
  TerasUtilityButton,
  TerasPanelHeader,
  TerasPanel,
  TerasStatGroup,
  TerasStatItem,
  TerasPanelStack,
  TerasDetailGrid,
  TerasEmptyState,
  TerasZoneLayout,
  TerasZone,
} from "@/teras";

const workDesignEditorFieldProps = {
  autoCapitalize: "off",
  autoCorrect: "off",
  spellCheck: false,
} as const;

type WorkDesignReviewMetrics = {
  features: number;
  risks: number;
  stories: number;
};

type WorkDesignReviewDraftViewProps = {
  briefUnavailable?: boolean;
  applyCompleted: boolean;
  contextFinalizedBrief: WorkDesignFinalizedBrief;
  contextSnapshotAttachment: WorkDesignSnapshotAttachment;
  contextSnapshotAttachmentExportLabel: string;
  deliveryPackage: DeliveryPackageSummary;
  metrics: WorkDesignReviewMetrics;
  onChangeOperatorDraft: (value: string) => void;
  onExportSnapshot: () => void;
  onMarkReviewed: () => void;
  onOpenFinalizedBrief: () => void;
  onOpenReviewTree: () => void;
  reviewHandoffNote: string;
  draftReviewAccepted: boolean;
  reviewHandoffNoteReady: boolean;
  reviewReady: boolean;
  reviewSnapshotHandoffLabel: string;
  reviewSnapshotTone: DeliveryTone;
  reviewSystemCheckPassCount: number;
  tree: WorkDesignNode;
};

export function WorkDesignReviewDraftView({
  briefUnavailable = false,
  applyCompleted,
  contextFinalizedBrief,
  contextSnapshotAttachment,
  contextSnapshotAttachmentExportLabel,
  deliveryPackage,
  metrics,
  onChangeOperatorDraft,
  onExportSnapshot,
  onMarkReviewed,
  onOpenFinalizedBrief,
  onOpenReviewTree,
  reviewHandoffNote,
  draftReviewAccepted,
  reviewHandoffNoteReady,
  reviewReady,
  reviewSnapshotHandoffLabel,
  reviewSnapshotTone,
  reviewSystemCheckPassCount,
  tree,
}: WorkDesignReviewDraftViewProps) {
  const reviewGateProjection = workDesignReviewGateProjection({
    draftReviewAccepted,
    reviewReady,
  });

  return (
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
        <TerasPanel
          fit="fill"
          frame="padded"
          treatment="state"
          layout="header-body"
          spacing="tight"
          tone="info"
        >
          <TerasPanelHeader
            kicker="Draft Review"
            statusLabel={reviewSnapshotHandoffLabel}
            statusTone={reviewSnapshotTone}
            title="Draft Review Packet"
            description="Review the context handoff and tree shape before accepting this draft for Apply Draft."
          />
          <TerasDetailGrid variant="media">
            {briefUnavailable ? <TerasEmptyState>No retained finalized snapshot is available. Current package metadata is not an original diagram.</TerasEmptyState> : <WorkDesignSnapshotPreview
              attachment={contextSnapshotAttachment}
              density="compact"
              fit="fill"
              facts={workDesignReviewSnapshotFacts(contextSnapshotAttachment)}
              kicker="Context Snapshot"
              previewAriaLabel="View finalized context snapshot"
              exportAction={{
                icon: <Download aria-hidden="true" size={14} />,
                label: contextSnapshotAttachmentExportLabel,
                onClick: onExportSnapshot,
                tone: "warn",
              }}
            />}
            <TerasPanelStack fill="last">
              <TerasStatGroup offset="none">
                <TerasStatItem
                  detail={!briefUnavailable && contextFinalizedBrief.systemChecks.length ? `${reviewSystemCheckPassCount}/${contextFinalizedBrief.systemChecks.length} finalization checks accepted` : "Original finalization checks were not retained."}
                  element="article"
                  label="Context Brief"
                  variant="plain"
                  value={briefUnavailable ? "Not retained" : contextFinalizedBrief.name}
                />
                <TerasStatItem
                  detail={
                    metrics.risks > 0
                      ? `${metrics.risks} Risk branch${metrics.risks === 1 ? "" : "es"} captured`
                      : "No explicit risk branch"
                  }
                  element="article"
                  label="Draft Tree"
                  variant="plain"
                  value={`${metrics.features} Feature / ${metrics.stories} Stories`}
                />
              </TerasStatGroup>
              <TerasPanel
                fit="fill"
                frame="padded"
                layout="header-body-footer"
                spacing="compact"
                treatment="neutral"
              >
                <TerasPanelHeader
                  description="Full branch detail opens in a read-only tree viewer."
                  kicker="Tree Summary"
                  title={workDesignNodeDisplayTitle(tree)}
                />
                <TerasStatGroup offset="none">
                  <TerasStatItem label="Epic" value="1" />
                  <TerasStatItem label="Features" value={metrics.features} />
                  <TerasStatItem label="User Stories" value={metrics.stories} />
                  <TerasStatItem label="Risks" value={metrics.risks} />
                </TerasStatGroup>
                <TerasActionRow>
                  <TerasUtilityButton onClick={onOpenReviewTree}>
                    View Full Tree
                  </TerasUtilityButton>
                </TerasActionRow>
              </TerasPanel>
            </TerasPanelStack>
          </TerasDetailGrid>
        </TerasPanel>
      </TerasZone>
      <TerasZone scroll fit="fill">
        <TerasPanel
          fit="content"
          frame="padded"
          treatment="rail"
          spacing="compact"
          tone={reviewGateProjection.gateTone}
        >
          <TerasPanelHeader
            kicker="Operator Review Gate"
            title={reviewGateProjection.gateTitle}
            description={reviewGateProjection.gateDescription}
          />
          <TerasSubjectCard
            description="This covers the finalized brief snapshot, draft tree, finalization checks, and any handoff note recorded below."
            facts={workDesignReviewApprovalFacts({
              reviewHandoffNoteReady,
              reviewSnapshotHandoffLabel,
            })}
            kicker="Approval Scope"
            title="Accept current draft for Apply Draft."
          />
          <TerasNoteField
            {...workDesignEditorFieldProps}
            label="Package Handoff Note"
            onValueChange={onChangeOperatorDraft}
            placeholder="Summarize the intended tree, known gaps, and why this can move to Apply Draft."
            readOnly={applyCompleted}
            value={reviewHandoffNote}
          />
          <TerasActionRow>
            <TerasActionButton
              disabled={applyCompleted || !reviewReady || draftReviewAccepted}
              onClick={onMarkReviewed}
              tone={
                reviewGateProjection.actionTone === "danger" ? "danger" : "accent"
              }
            >
              {reviewGateProjection.actionLabel}
            </TerasActionButton>
          </TerasActionRow>
        </TerasPanel>
      </TerasZone>
    </TerasZoneLayout>
  );
}
