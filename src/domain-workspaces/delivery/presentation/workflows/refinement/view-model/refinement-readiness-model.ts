import type { TerasMetadataItem } from "@/teras";
import type {
  DeliveryRefinementPacket,
  DeliveryTone,
} from "../../../../read-model/index.ts";

import { refinementGateReviewState } from "./refinement-gate-model.ts";
import {
  refinementFieldStatusTone,
  refinementMetadataResolutionLabel,
  refinementMetadataTargets,
  type RefinementMetadataWorkbenchSummary,
} from "./refinement-metadata-model.ts";
import type { RefinementMetadataFieldResolutionMap } from "../model/refinement-model.ts";

export type RefinementReadinessDecisionRow = {
  draftValue: string;
  fieldLabel: string;
  groupTitle: string;
  key: string;
  nodeTitle: string;
  statusLabel: string;
  tone: DeliveryTone;
};

export type RefinementReadinessGateRow = {
  detail: string;
  gateId: string;
  label: string;
  oosRoute?: string;
  statusLabel: string;
  tone: DeliveryTone;
};

export type RefinementReadinessReviewProjection = {
  acceptedCount: number;
  aiDraftedCount: number;
  applyGateDescription: string;
  applyGateTitle: string;
  applyGateActionTone: DeliveryTone;
  applyRouteCount: number;
  blockedGateCount: number;
  decisionRows: RefinementReadinessDecisionRow[];
  draftReadyGateCount: number;
  gateRows: RefinementReadinessGateRow[];
  openGateCount: number;
  repairedCount: number;
  reviewTone: DeliveryTone;
  targetRecordCount: number;
};

export function refinementReadinessReviewProjection({
  canApply,
  metadataDraftValues,
  metadataFieldResolutions,
  metadataWorkbenchSummary,
  packet,
}: {
  canApply: boolean;
  metadataDraftValues: Record<string, string>;
  metadataFieldResolutions: RefinementMetadataFieldResolutionMap;
  metadataWorkbenchSummary: RefinementMetadataWorkbenchSummary;
  packet: DeliveryRefinementPacket;
}): RefinementReadinessReviewProjection {
  const metadataTargets = refinementMetadataTargets(packet);
  const actionableTargets = metadataTargets.filter(
    (target) => target.status !== "complete",
  );
  const decisionTargets = actionableTargets.filter(
    (target) => metadataFieldResolutions[target.key],
  );
  const aiDraftedCount = decisionTargets.filter(
    (target) => metadataFieldResolutions[target.key] === "ai_drafted",
  ).length;
  const repairedCount = decisionTargets.filter(
    (target) => metadataFieldResolutions[target.key] === "repaired",
  ).length;
  const acceptedCount = decisionTargets.filter(
    (target) => metadataFieldResolutions[target.key] === "accepted",
  ).length;
  const targetRecordCount = new Set(
    metadataTargets.map((target) => target.node.id),
  ).size;
  const applyRouteCount = new Set(packet.apply_plan.expected_routes).size;
  const gateRows = packet.readiness_gates.map((gate) => {
    const reviewState = refinementGateReviewState({
      gate,
      metadataReady: metadataWorkbenchSummary.ready,
    });

    return {
      detail: reviewState.detail,
      gateId: gate.gate_id,
      label: gate.label,
      oosRoute: gate.oos_route,
      statusLabel: reviewState.label,
      tone: reviewState.tone,
    };
  });
  const draftReadyGateCount = gateRows.filter(
    (row) => row.statusLabel === "draft ready",
  ).length;
  const blockedGateCount = gateRows.filter(
    (row) => row.tone === "danger",
  ).length;
  const openGateCount = gateRows.filter((row) => row.tone === "warn").length;

  return {
    acceptedCount,
    aiDraftedCount,
    applyGateActionTone: canApply ? "ok" : "warn",
    applyGateDescription: canApply
      ? "Metadata decisions and readiness gates are ready for operator apply-plan review."
      : "Apply stays locked until metadata workbench decisions and readiness gates are reviewable.",
    applyGateTitle: canApply ? "Apply Plan Available" : "Apply Locked",
    applyRouteCount,
    blockedGateCount,
    decisionRows: actionableTargets.map((target) => {
      const resolution = metadataFieldResolutions[target.key];
      const tone = refinementFieldStatusTone({
        resolution,
        status: target.status,
      });

      return {
        draftValue: metadataDraftValues[target.key] ?? target.sourceValue,
        fieldLabel: target.field.label,
        groupTitle: target.group.title,
        key: target.key,
        nodeTitle: target.node.title,
        statusLabel: resolution
          ? refinementMetadataResolutionLabel(resolution)
          : target.status,
        tone,
      };
    }),
    draftReadyGateCount,
    gateRows,
    openGateCount,
    repairedCount,
    reviewTone: canApply ? "ok" : blockedGateCount > 0 ? "danger" : "warn",
    targetRecordCount,
  };
}

export function refinementApplyReviewGateFacts({
  canApply,
  metadataWorkbenchSummary,
}: {
  canApply: boolean;
  metadataWorkbenchSummary: RefinementMetadataWorkbenchSummary;
}): TerasMetadataItem[] {
  return [
    {
      label: "Metadata",
      value: metadataWorkbenchSummary.ready ? "ready" : "not ready",
    },
    {
      label: "Gates",
      value: canApply ? "reviewable" : "blocked",
    },
  ];
}
