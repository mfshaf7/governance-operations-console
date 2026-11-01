import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import { prototypeBasePlatformLabel } from "../../../domain/support/prototype-setup-profile-model.ts";
import { prototypeSupportProfileLabel } from "../../../domain/support/prototype-support-profile-model.ts";
import { prototypeSourceHomeLabel } from "../../../work-model/workflows/landing/prototype-landing-model.ts";
import { prototypePreviewLaunchAdapterLabel, prototypePreviewProfileLabel } from "../preview-runtime/prototype-preview-profile-model.ts";
import { prototypePreviewRuntimeLabel } from "../preview-runtime/prototype-preview-runtime-status-model.ts";
import { prototypeBaselineStatus, prototypeLandingStatus, prototypeMovementStatus, prototypePreviewStatus, prototypeDataModeLabel, prototypeMutationBoundaryLabel } from "../../shared/prototype-record-display-model.ts";

export type PrototypeDashboardPreviewMode = "disconnected" | "loading" | "live" | "error";

export function prototypeDashboardStageCards(record: PrototypeRecord, mode: PrototypeDashboardPreviewMode) {
  const historical = ["graduated", "graduating", "retired"].includes(record.lifecycle);
  return [
    {
      id: "landing", title: "Landing", category: "Setup", ...prototypeLandingStatus(record),
      facts: [
        { label: "Platform", value: prototypeBasePlatformLabel(record.landing.basePlatform) },
        { label: "Support", value: prototypeSupportProfileLabel(record.landing.supportProfile) },
      ],
    },
    {
      id: "preview", title: "Preview", category: "Runtime", ...prototypePreviewStatus(record, mode),
      facts: [
        { label: "Profile", value: mode === "loading" ? "Checking" : mode === "error" ? "Unavailable" : prototypePreviewProfileLabel(record) },
        { label: "Last check", value: mode === "loading" ? "Checking" : mode === "error" ? "Unavailable" : record.preview.lastCheckedAt ?? "Not recorded" },
      ],
    },
    {
      id: "baseline", title: "Baseline", category: historical ? "Historical approval" : "Approval", ...prototypeBaselineStatus(record),
      facts: [
        { label: "Evidence refs", value: String(record.baseline.evidenceRefs.length) },
        { label: "Missing items", value: String(record.baseline.missingItems.length) },
      ],
    },
    {
      id: "handoff", title: "Handoff", category: ["graduated", "retired"].includes(record.lifecycle) ? "Handoff history" : "Transition", ...prototypeMovementStatus(record),
      facts: [
        { label: "Target", value: record.movementRequest.targetHome },
        { label: "Owner", value: record.movementRequest.targetOwner },
      ],
    },
  ];
}

export function prototypeDashboardRuntimeFacts(record: PrototypeRecord, mode: PrototypeDashboardPreviewMode) {
  const unavailable = mode === "loading" ? "Checking" : mode === "error" ? "Unavailable" : null;
  return [
    { label: "Runtime", value: unavailable ?? prototypePreviewRuntimeLabel(record) },
    { label: "Adapter", value: unavailable ?? prototypePreviewLaunchAdapterLabel(record.preview.launchAdapter) },
    { label: "Endpoint", value: unavailable ?? record.preview.address },
    { label: "Source home", value: prototypeSourceHomeLabel(record.landing.sourceHome) },
    { label: "Data", value: prototypeDataModeLabel(record.dataMode) },
    { label: "Mutation boundary", value: prototypeMutationBoundaryLabel(record.mutationBoundary) },
  ];
}
