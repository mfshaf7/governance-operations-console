import type { TerasMetadataItem } from "@/teras";
import type {
  DeliveryPackageSummary,
  DeliveryTone,
} from "../../../../../read-model/index.ts";

import { workDesignBoardInventory } from "../../../../../product-adapters/context-board/index.ts";
import { workDesignFileSlug } from "../../../../../work-model/work-design/work-design-artifact-types.ts";
import type {
  WorkDesignFinalizedBrief,
  WorkDesignSnapshotAttachment,
} from "../../../../../work-model/work-design/work-design-artifact-types.ts";
import type {
  WorkDesignBriefVersion,
  WorkDesignContextDecision,
  WorkDesignContextSavedSession,
} from "../../model/work-design-model.ts";
import { workDesignContextDecisionCopy } from "../../view-model/work-design-context-decision-model.ts";
import { formatWorkDesignDateTime } from "../../view-model/work-design-display-formatters.ts";

export function workDesignFinalizedSystemChecks({
  decision,
  deliveryPackage,
  metadataPacketRef,
  savedSession,
  session,
  snapshotArtifact,
}: {
  decision: WorkDesignContextDecision;
  deliveryPackage: DeliveryPackageSummary;
  metadataPacketRef: string;
  savedSession: WorkDesignContextSavedSession | null;
  session: DeliveryPackageSummary["work_design_context_session"] | null;
  snapshotArtifact: WorkDesignFinalizedBrief["snapshotArtifact"];
}): WorkDesignFinalizedBrief["systemChecks"] {
  const decisionCopy = workDesignContextDecisionCopy(decision);
  const sourceReady = Boolean(
    deliveryPackage.delivery_package_id &&
    deliveryPackage.source_ref &&
    deliveryPackage.legacy_epic_id,
  );
  const sessionRef = session?.session_ref ?? savedSession?.id ?? null;
  const snapshotRef =
    snapshotArtifact?.board_snapshot_ref ??
    session?.workspace_snapshot_ref ??
    (savedSession ? `${savedSession.id}/snapshot-current` : null);
  const snapshotReady = Boolean(snapshotRef);
  const metadataReady = Boolean(metadataPacketRef);

  return [
    {
      detail: sourceReady
        ? "Package id, source ref, and Epic id are present."
        : "Package id, source ref, or Epic id is missing.",
      label: "Source Identity",
      status: sourceReady ? "ready" : "missing",
      tone: sourceReady ? "ok" : "danger",
    },
    {
      detail: sessionRef
        ? "Finalized session ref is present."
        : "Finalized session ref is missing.",
      label: "Session Record",
      status: sessionRef ? "locked" : "missing",
      tone: sessionRef ? "ok" : "danger",
    },
    {
      detail: snapshotReady
        ? "Board state ref is present."
        : "Board state ref is missing.",
      label: "Board State Ref",
      status: snapshotReady ? "ready" : "missing",
      tone: snapshotReady ? "ok" : "danger",
    },
    {
      detail: metadataReady
        ? "Metadata packet ref is present."
        : "Metadata packet ref is missing.",
      label: "Metadata Packet",
      status: metadataReady ? "ready" : "missing",
      tone: metadataReady ? "ok" : "danger",
    },
    {
      detail: `Recorded context decision is ${decisionCopy.label}.`,
      label: "Decision Record",
      status: decision,
      tone: decisionCopy.tone,
    },
  ];
}

export function workDesignFinalizeActionTone(canRun: boolean): DeliveryTone {
  return canRun ? "ok" : "warn";
}

export function workDesignFinalizeRequirementTone(
  ready: boolean,
): DeliveryTone {
  return ready ? "ok" : "warn";
}

export function workDesignSavedSessionSummary(
  session: WorkDesignContextSavedSession,
) {
  return workDesignBoardInventory(session.snapshot).summary;
}

export function workDesignFinalizedBriefView({
  decision,
  deliveryPackage,
  note,
  savedSession,
  session,
}: {
  decision: WorkDesignContextDecision;
  deliveryPackage: DeliveryPackageSummary;
  note: string;
  savedSession: WorkDesignContextSavedSession | null;
  session: DeliveryPackageSummary["work_design_context_session"] | null;
}): WorkDesignFinalizedBrief {
  const resolvedDecision =
    session?.decision ?? savedSession?.decision ?? decision;
  const decisionCopy = workDesignContextDecisionCopy(resolvedDecision);
  const boardSnapshotRef =
    session?.workspace_snapshot_ref ??
    `${savedSession?.id ?? "local-context-session"}/snapshot-current`;
  const metadataPacketRef =
    session?.metadata_packet_ref ??
    `${savedSession?.id ?? "local-context-session"}/metadata-packet`;
  const snapshotArtifact = session?.snapshot_artifact ?? null;
  const systemChecks = workDesignFinalizedSystemChecks({
    decision: resolvedDecision,
    deliveryPackage,
    metadataPacketRef,
    savedSession,
    session,
    snapshotArtifact,
  });

  return {
    boardSnapshotRef,
    carriedMetadata: session?.carried_metadata ?? [
      {
        label: "Decision",
        tone: decisionCopy.tone,
        value: decisionCopy.label,
      },
      {
        label: "Source",
        tone: "info",
        value: deliveryPackage.source_ref,
      },
      {
        label: "Boundary",
        tone: "warn",
        value: "Draft tree stays in Work Design; apply is routed later.",
      },
      {
        label: "Next Surface",
        tone: "warn",
        value: "Build Tree",
      },
    ],
    decision: resolvedDecision,
    diagramNodes: session?.board_snapshot?.nodes ?? [
      {
        label: "SOURCE",
        summary: deliveryPackage.source_ref,
        title: deliveryPackage.display_name,
        tone: "info",
      },
      {
        label: "DECISION",
        summary: decisionCopy.description,
        title: decisionCopy.label,
        tone: decisionCopy.tone,
      },
      {
        label: "HANDOFF",
        summary: "Tree building consumes this finalized context.",
        title: "Build Tree",
        tone: "warn",
      },
    ],
    diagramSummary:
      session?.board_snapshot?.summary ??
      "Finalized context captures the selected source, operator decision, finalization checks, and next-step handoff for the tree builder.",
    diagramTitle:
      session?.board_snapshot?.title ??
      `${deliveryPackage.display_name} Context`,
    finalizedAt:
      session?.finalized_at ??
      savedSession?.savedAt ??
      session?.saved_at ??
      null,
    finalizedBy: session?.finalized_by ?? "local operator",
    metadataPacketRef,
    name: session?.name ?? savedSession?.name ?? "Finalized Context Brief",
    note,
    snapshotArtifact,
    systemChecks,
    version:
      session?.version ?? (session?.locked ? "v1 locked" : "local locked"),
  };
}

export function workDesignBriefVersionIdFromSession(
  packageId: string,
  session: NonNullable<DeliveryPackageSummary["work_design_context_session"]>,
) {
  return `${packageId}:${workDesignFileSlug(
    session.session_ref || session.version || session.finalized_at || "brief",
  )}`;
}

export function workDesignBriefVersionFromContextSession({
  deliveryPackage,
  fingerprint,
  savedSession,
  session,
}: {
  deliveryPackage: DeliveryPackageSummary;
  fingerprint: string;
  savedSession: WorkDesignContextSavedSession;
  session: DeliveryPackageSummary["work_design_context_session"] | null;
}): WorkDesignBriefVersion {
  const brief = workDesignFinalizedBriefView({
    decision: savedSession.decision,
    deliveryPackage,
    note: savedSession.note,
    savedSession,
    session,
  });

  return {
    boardSnapshotRef: brief.boardSnapshotRef,
    briefVersionId: session
      ? workDesignBriefVersionIdFromSession(
          deliveryPackage.delivery_package_id,
          session,
        )
      : `${deliveryPackage.delivery_package_id}:${workDesignFileSlug(savedSession.id)}`,
    decision: brief.decision,
    finalizedAt: brief.finalizedAt ?? savedSession.savedAt,
    finalizedFingerprint: fingerprint,
    metadataPacketRef: brief.metadataPacketRef,
    name: brief.name,
    savedSessionId: savedSession.id,
    snapshot: savedSession.snapshot,
    versionLabel: brief.version,
  };
}

export function workDesignContextSources(
  deliveryPackage: DeliveryPackageSummary,
): Array<{
  detail: string;
  label: string;
  status: string;
  tone: DeliveryTone;
}> {
  return [
    {
      detail:
        "Current delivery session, workflow health, and active operator lane.",
      label: "Session State",
      status: "ready",
      tone: "ok",
    },
    {
      detail:
        "Delivery-wide quality signals, open work posture, and guard state.",
      label: "Delivery Quality",
      status: "ready",
      tone: "ok",
    },
    {
      detail: `Existing planning packet for Epic #${deliveryPackage.legacy_epic_id} when the shell is already present.`,
      label: "Planning Packet",
      status: "bounded",
      tone: "info",
    },
    {
      detail: `Accepted source identity and possible reuse signal from ${deliveryPackage.source_ref}.`,
      label: "Source Identity",
      status: "identity",
      tone: "info",
    },
    {
      detail:
        "Node-scoped continuation context is available after child work exists.",
      label: "Continuation Context",
      status: "guarded",
      tone: "warn",
    },
  ];
}

type WorkDesignBoardInventorySummary = {
  summary: string;
};

export function workDesignFinalizedBriefSummaryMetadata(
  contextFinalizedBrief: WorkDesignFinalizedBrief,
): TerasMetadataItem[] {
  return [
    {
      label: "Version",
      value: contextFinalizedBrief.version,
    },
    {
      label: "Finalized",
      value: contextFinalizedBrief.finalizedAt
        ? formatWorkDesignDateTime(contextFinalizedBrief.finalizedAt)
        : "Local session",
    },
    {
      label: "Operator",
      value: contextFinalizedBrief.finalizedBy,
    },
  ];
}

export function workDesignFinalizedBriefPackageMetadata(
  deliveryPackage: DeliveryPackageSummary,
): TerasMetadataItem[] {
  return [
    { label: "Epic", value: `#${deliveryPackage.legacy_epic_id}` },
    { label: "Source", value: deliveryPackage.source_ref },
  ];
}

export function workDesignSnapshotAttachmentMetadata({
  contextBoardInventory,
  contextSnapshotAttachment,
  contextSnapshotAttachmentSourceLabel,
}: {
  contextBoardInventory: WorkDesignBoardInventorySummary;
  contextSnapshotAttachment: WorkDesignSnapshotAttachment;
  contextSnapshotAttachmentSourceLabel: string;
}): TerasMetadataItem[] {
  return [
    {
      label: "Visual Source",
      value: contextSnapshotAttachmentSourceLabel,
    },
    {
      label: "Attachment",
      value: contextSnapshotAttachment.fileName,
    },
    {
      label: "Captured Board",
      value: contextBoardInventory.summary,
    },
    {
      label: "Image Size",
      value: `${contextSnapshotAttachment.width} x ${contextSnapshotAttachment.height}`,
    },
  ];
}

export function workDesignFinalizedBriefReferenceMetadata({
  contextFinalizedBrief,
  contextSnapshotAttachment,
}: {
  contextFinalizedBrief: WorkDesignFinalizedBrief;
  contextSnapshotAttachment: WorkDesignSnapshotAttachment;
}): TerasMetadataItem[] {
  return [
    {
      label: "Board State Ref",
      value: contextFinalizedBrief.boardSnapshotRef,
    },
    {
      label: "Metadata Packet",
      value: contextFinalizedBrief.metadataPacketRef,
    },
    {
      label: "Snapshot Artifact Ref",
      value:
        contextSnapshotAttachment.artifactId ?? contextSnapshotAttachment.ref,
    },
    {
      label: "Rendered Content Ref",
      value:
        contextSnapshotAttachment.renderedContentBase64Ref ??
        "Not available until OOS stores rendered content",
    },
    {
      label: "Target Record",
      value: contextSnapshotAttachment.targetRecordRef ?? "Pending OOS attach",
    },
    {
      label: "Checksum",
      value: contextSnapshotAttachment.checksum ?? "Pending artifact checksum",
    },
  ];
}

export function workDesignTreeReconciliationMetadata({
  activeBriefVersion,
  metrics,
  treeDraftStale,
}: {
  activeBriefVersion: WorkDesignBriefVersion | null;
  metrics: {
    features: number;
    risks: number;
    stories: number;
  };
  treeDraftStale: boolean;
}): TerasMetadataItem[] {
  return [
    {
      label: "Brief Version",
      value: activeBriefVersion?.versionLabel ?? "Local locked brief",
    },
    {
      label: "Current Tree",
      value: `${metrics.features} Features / ${metrics.stories} Stories / ${metrics.risks} Risks`,
    },
    {
      label: "Tree State",
      value: treeDraftStale ? "Stale until reconciled" : "Current",
    },
  ];
}
