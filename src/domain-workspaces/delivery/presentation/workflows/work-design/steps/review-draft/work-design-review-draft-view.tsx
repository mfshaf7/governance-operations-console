"use client";

import { Download, Maximize2 } from "lucide-react";
import type {
  DeliveryPackageSummary,
  DeliveryTone,
} from "../../../../../read-model/index.ts";

import type {
  WorkDesignFinalizedBrief,
  WorkDesignSnapshotAttachment,
} from "../../artifacts/context-brief/index.ts";
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
  TerasContentTray,
  TerasMediaSnapshot,
  TerasNoteField,
  TerasSubjectHero,
  TerasUtilityButton,
  TerasPanelHeader,
  TerasPanel,
  TerasStatGroup,
  TerasStatItem,
  TerasTrayStack,
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
  onOpenSnapshot: () => void;
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
  onOpenSnapshot,
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
            {briefUnavailable ? <TerasEmptyState>No retained finalized snapshot is available. Current package metadata is not an original diagram.</TerasEmptyState> : <TerasMediaSnapshot
              density="compact"
              facts={briefUnavailable ? [{label:"Original snapshot",value:"Not retained"},{label:"Preview",value:"Current local board preview"}] : workDesignReviewSnapshotFacts(contextSnapshotAttachment)}
              imageAlt={`${contextSnapshotAttachment.title} snapshot preview`}
              imageSrc={contextSnapshotAttachment.dataUrl}
              kicker="Context Snapshot"
              onPreview={onOpenSnapshot}
              previewDisabled={briefUnavailable}
              previewAriaLabel="View finalized context snapshot"
              title={briefUnavailable ? "Original snapshot not retained" : contextSnapshotAttachment.title}
              actions={[
                {
                  icon: <Maximize2 aria-hidden="true" size={14} />,
                  label: "View Snapshot",
                  disabled: briefUnavailable,
                  onClick: onOpenSnapshot,
                  tone: "warn",
                },
                {
                  icon: <Download aria-hidden="true" size={14} />,
                  label: contextSnapshotAttachmentExportLabel,
                  disabled: briefUnavailable,
                  onClick: onExportSnapshot,
                  tone: "warn",
                },
              ]}
            />}
            <TerasTrayStack spacing="compact">
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
              <TerasContentTray
                description="Full branch detail opens in a read-only tree viewer."
                kicker="Tree Summary"
                title={workDesignNodeDisplayTitle(tree)}
              >
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
              </TerasContentTray>
            </TerasTrayStack>
          </TerasDetailGrid>
        </TerasPanel>
      </TerasZone>
      <TerasPanel
        fit="content"
        frame="padded"
        treatment="rail"
        layout="header-body"
        spacing="compact"
        tone={reviewGateProjection.gateTone}
      >
        <TerasPanelHeader
          kicker="Operator Review Gate"
          title={reviewGateProjection.gateTitle}
          description="Apply Draft stays locked until the operator confirms the tree is the intended draft."
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
    </TerasZoneLayout>
  );
}
