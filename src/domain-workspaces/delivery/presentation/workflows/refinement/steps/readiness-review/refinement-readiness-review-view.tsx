"use client";

import {
  TerasSubjectCard,
  TerasActionButton,
  TerasEmptyState,
  TerasContentTray,
  TerasActionRow,
  TerasPanel,
  TerasPanelHeader,
  TerasList,
  TerasSignalItem,
  TerasStatGroup,
  TerasStatItem,
  TerasSubjectHero,
  TerasDetailGrid,
  TerasZoneLayout,
  TerasZone,
} from "@/teras";
import type {
  DeliveryPackageSummary,
  DeliveryRefinementPacket,
} from "../../../../../read-model/index.ts";

import type { RefinementMetadataWorkbenchSummary } from "../../view-model/refinement-metadata-model.ts";
import {
  refinementApplyReviewGateFacts,
  refinementReadinessReviewProjection,
} from "../../view-model/refinement-readiness-model.ts";
import { deliveryPackagePacketMetadata } from "../../../../shared/delivery-package-metadata.ts";
import type { RefinementMetadataFieldResolutionMap } from "../../model/refinement-model.ts";

export function RefinementReadinessReviewView({
  canApply,
  deliveryPackage,
  metadataDraftValues,
  metadataFieldResolutions,
  metadataWorkbenchSummary,
  onOpenApplyPlan,
  onOpenHandoff,
  packet,
}: {
  canApply: boolean;
  deliveryPackage: DeliveryPackageSummary;
  metadataDraftValues: Record<string, string>;
  metadataFieldResolutions: RefinementMetadataFieldResolutionMap;
  metadataWorkbenchSummary: RefinementMetadataWorkbenchSummary;
  onOpenApplyPlan: () => void;
  onOpenHandoff: () => void;
  packet: DeliveryRefinementPacket;
}) {
  const reviewProjection = refinementReadinessReviewProjection({
    canApply,
    metadataDraftValues,
    metadataFieldResolutions,
    metadataWorkbenchSummary,
    packet,
  });

  return (
    <TerasZoneLayout variant="main-aside">
      <TerasZone fit="fill">
        <TerasSubjectHero
          actionDetail="Finalized brief and Work Design apply receipt"
          actionLabel="View Work Design Handoff"
          onAction={onOpenHandoff}
          subject={{
            eyebrow: "Selected Package",
            meta: deliveryPackagePacketMetadata({
              deliveryPackage,
              packetId: packet.packet_id,
            }),
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
            kicker="Readiness Review"
            statusLabel={metadataWorkbenchSummary.statusLabel}
            statusTone={metadataWorkbenchSummary.tone}
            title="Metadata Review Packet"
            description="Review item-scoped metadata decisions and readiness gates before opening the apply plan."
          />
          <TerasDetailGrid scrollGutter variant="balanced">
            <TerasContentTray
              description={`${metadataWorkbenchSummary.resolvedCount}/${metadataWorkbenchSummary.actionableCount} actionable metadata decisions recorded.`}
              kicker="Workbench Decisions"
              title="Metadata Decisions"
            >
              <TerasStatGroup offset="none">
                <TerasStatItem
                  detail={`${metadataWorkbenchSummary.totalCount} item-scoped fields reviewed`}
                  element="article"
                  label="ART Records"
                  value={reviewProjection.targetRecordCount}
                />
                <TerasStatItem
                  detail={`${reviewProjection.repairedCount} repaired / ${reviewProjection.acceptedCount} accepted`}
                  element="article"
                  label="Operator Decisions"
                  value={
                    reviewProjection.repairedCount +
                    reviewProjection.acceptedCount +
                    reviewProjection.aiDraftedCount
                  }
                />
                <TerasStatItem
                  detail="Must stay visible before Apply Refinement."
                  element="article"
                  label="AI Drafted Metadata"
                  value={reviewProjection.aiDraftedCount}
                />
                <TerasStatItem
                  detail={`${reviewProjection.applyRouteCount} bounded OOS route${reviewProjection.applyRouteCount === 1 ? "" : "s"}`}
                  element="article"
                  label="Apply Routes"
                  value={packet.apply_plan.operations.length}
                />
              </TerasStatGroup>
              {reviewProjection.decisionRows.length > 0 ? (
                <TerasList frame="contained">
                  {reviewProjection.decisionRows.map((row) => (
                    <TerasSignalItem
                      detail={row.draftValue}
                      key={`decision-${row.key}`}
                      label={row.groupTitle}
                      meta={row.nodeTitle}
                      statusLabel={row.statusLabel}
                      title={row.fieldLabel}
                      tone={row.tone}
                    />
                  ))}
                </TerasList>
              ) : (
                <TerasEmptyState>
                  No operator metadata decisions required. The handoff metadata
                  is already complete. Review the gate findings before opening
                  the apply plan.
                </TerasEmptyState>
              )}
            </TerasContentTray>

            <TerasContentTray
              description={`${reviewProjection.draftReadyGateCount} draft-ready / ${reviewProjection.openGateCount} open / ${reviewProjection.blockedGateCount} blocked.`}
              kicker="Gate Findings"
              title="Readiness Gate Findings"
            >
              <TerasList frame="contained">
                {reviewProjection.gateRows.map((row) => (
                  <TerasSignalItem
                    detail={row.detail}
                    key={`review-${row.gateId}`}
                    label="Readiness Gate"
                    meta={row.oosRoute}
                    statusLabel={row.statusLabel}
                    title={row.label}
                    tone={row.tone}
                  />
                ))}
              </TerasList>
            </TerasContentTray>
          </TerasDetailGrid>
        </TerasPanel>
      </TerasZone>

      <TerasPanel
        fit="content"
        frame="padded"
        treatment="rail"
        layout="header-body"
        spacing="compact"
        tone={reviewProjection.reviewTone}
      >
        <TerasPanelHeader
          kicker="Apply Review Gate"
          title={reviewProjection.applyGateTitle}
          description={reviewProjection.applyGateDescription}
        />
        <TerasSubjectCard
          description="This review covers the Work Design handoff tree, item-scoped metadata decisions, AI-drafted values, readiness gates, and bounded OOS apply routes."
          facts={refinementApplyReviewGateFacts({
            canApply,
            metadataWorkbenchSummary,
          })}
          kicker="Review Scope"
          title="Confirm refinement can move to Apply."
        />
        <TerasStatGroup offset="none">
          <TerasStatItem
            label="Draft Ready"
            value={reviewProjection.draftReadyGateCount}
          />
          <TerasStatItem label="Open" value={reviewProjection.openGateCount} />
          <TerasStatItem
            label="Blocked"
            value={reviewProjection.blockedGateCount}
          />
          <TerasStatItem
            label="Routes"
            value={reviewProjection.applyRouteCount}
          />
        </TerasStatGroup>
        <TerasActionRow>
          <TerasActionButton
            data-refinement-action="review-apply-plan"
            disabled={!canApply}
            onClick={onOpenApplyPlan}
            tone={
              reviewProjection.applyGateActionTone === "danger"
                ? "danger"
                : "accent"
            }
          >
            Review Apply Plan
          </TerasActionButton>
        </TerasActionRow>
      </TerasPanel>
    </TerasZoneLayout>
  );
}
