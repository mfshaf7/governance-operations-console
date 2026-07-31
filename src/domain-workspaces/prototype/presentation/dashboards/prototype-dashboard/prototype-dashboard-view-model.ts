import type { TerasTone } from "@/teras";

import type { PrototypeProjectedReceipt } from "../../../read-model/prototype-workspace-read-model.ts";
import { prototypeBasePlatformLabel } from "@/domain-workspaces/prototype/domain/support/prototype-setup-profile-model";
import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import { prototypeMovementRequestStateTone } from "../../../read-model/selectors/prototype-workspace-selectors.ts";
import {
  prototypeBaselineStatus,
  prototypeCompactSupportBundleLabel,
  prototypeDataModeLabel,
  prototypeIngressLabel,
  prototypeLandingStatus,
  prototypeLifecycleStatus,
  prototypeMovementStateLabel,
  prototypeMutationBoundaryLabel,
  prototypePreviewStatus,
  prototypeVisibilityLabel,
} from "../../shared/prototype-record-display-model.ts";

export type PrototypeDashboardStatusAreaId =
  "evidence" | "landing" | "movement" | "receipts" | "source";

export type PrototypeDashboardStatusArea = {
  badge: string;
  detail: string;
  id: PrototypeDashboardStatusAreaId;
  kicker: string;
  title: string;
  tone: TerasTone;
};

export function prototypeDashboardFacts(record: PrototypeRecord) {
  return [
    { label: "Owner", value: record.owner },
    {
      label: "Landing",
      value: prototypeLandingStatus(record).label,
    },
    {
      label: "Visibility",
      value: prototypeVisibilityLabel(record.visibilityTier),
    },
    { label: "Source", value: record.sourcePath },
    { label: "Record Version", value: record.projectionVersion },
    { label: "Freshness", value: record.projectionFreshness },
    {
      label: "Movement",
      value: prototypeMovementStateLabel(record.movementRequest.state),
    },
  ];
}

export function prototypeDashboardCards(record: PrototypeRecord) {
  const lifecycle = prototypeLifecycleStatus(record);
  const landing = prototypeLandingStatus(record);
  const preview = prototypePreviewStatus(record);
  const baseline = prototypeBaselineStatus(record);
  const movementTone = prototypeMovementRequestStateTone(
    record.movementRequest.state,
  );

  return [
    { label: "Lifecycle", tone: lifecycle.tone, value: lifecycle.label },
    { label: "Landing", tone: landing.tone, value: landing.label },
    { label: "Preview", tone: preview.tone, value: preview.label },
    { label: "Baseline", tone: baseline.tone, value: baseline.label },
    {
      label: "Movement",
      tone: movementTone,
      value: prototypeMovementStateLabel(record.movementRequest.state),
    },
  ];
}

export function prototypeDashboardPostureFacts(record: PrototypeRecord) {
  return [
    { label: "Record", value: record.id },
    { label: "Owner", value: record.owner },
    { label: "Ingress", value: prototypeIngressLabel(record.ingress) },
    { label: "Lifecycle", value: prototypeLifecycleStatus(record).label },
    {
      label: "Visibility",
      value: prototypeVisibilityLabel(record.visibilityTier),
    },
    { label: "Data", value: prototypeDataModeLabel(record.dataMode) },
    {
      label: "Base platform",
      value: prototypeBasePlatformLabel(record.landing.basePlatform),
    },
    {
      label: "Boundary",
      value: prototypeMutationBoundaryLabel(record.mutationBoundary),
    },
    { label: "Source ref", value: record.sourceRef },
  ];
}

export function prototypeDashboardMovementFacts(record: PrototypeRecord) {
  return [
    {
      label: "State",
      value: prototypeMovementStateLabel(record.movementRequest.state),
    },
    {
      label: "Target Home",
      value: record.movementRequest.targetHome,
    },
    {
      label: "Movement Type",
      value: record.movementRequest.movementType,
    },
    {
      label: "Target Lane",
      value: record.movementRequest.targetLane,
    },
    {
      label: "Target Owner",
      value: record.movementRequest.targetOwner,
    },
    {
      label: "Last Receipt",
      value: record.movementRequest.lastMovementReceiptRef ?? "None",
    },
  ];
}

export function prototypeDashboardAreas(
  record: PrototypeRecord,
  receipts: PrototypeProjectedReceipt[],
): PrototypeDashboardStatusArea[] {
  return [
    {
      badge: `${record.linkedRecords.length} links`,
      detail: "Source reference, linked records, and refresh status.",
      id: "source",
      kicker: "Source",
      title: "Source Context",
      tone: "info",
    },
    {
      badge: prototypeCompactSupportBundleLabel(record),
      detail: `${prototypeBasePlatformLabel(record.landing.basePlatform)} base / ${record.landing.supportRows.length} support rows.`,
      id: "landing",
      kicker: "Landing",
      title: "Support Profile",
      tone: prototypeLandingStatus(record).tone,
    },
    {
      badge: `${record.evidence.length} records`,
      detail: "Attached proof references and baseline evidence snapshot.",
      id: "evidence",
      kicker: "Evidence",
      title: "Evidence Snapshot",
      tone: record.evidence.length > 0 ? "info" : "muted",
    },
    {
      badge: `${receipts.length} receipts`,
      detail:
        "Local receipts and imported receipt references for this prototype.",
      id: "receipts",
      kicker: "Receipts",
      title: "Receipt Trail",
      tone: receipts.length > 0 ? "info" : "muted",
    },
    {
      badge: prototypeMovementStateLabel(record.movementRequest.state),
      detail: "Movement target, reason, and current gate snapshot.",
      id: "movement",
      kicker: "Movement",
      title: "Movement Request",
      tone: prototypeMovementRequestStateTone(record.movementRequest.state),
    },
  ];
}

export function prototypeOpenIssueTone(record: PrototypeRecord): TerasTone {
  return record.openIssues.length > 0 ? "warn" : "ok";
}

export function prototypeDashboardAreaDialogShell(
  area: PrototypeDashboardStatusArea | undefined,
) {
  return {
    closeLabel: `Close ${area?.title ?? "prototype dashboard"} detail`,
    description: area?.detail,
    title: area?.title ?? "Dashboard Detail",
  };
}
