"use client";

import { useMemo } from "react";

import type { DeliveryPackageSummary } from "../../../../../read-model/index.ts";
import type {
  WorkDesignBriefVersion,
  WorkDesignContextDecision,
  WorkDesignContextSavedSession,
} from "../../model/work-design-model.ts";

import type { WorkDesignSnapshotAttachment } from "./work-design-context-brief-model.ts";
import type { WorkDesignInitialContextSession } from "./work-design-context-artifact-types.ts";
import {
  workDesignContextBriefRecordProjection,
  workDesignContextBriefStateProjection,
} from "./work-design-context-brief-state.ts";
import { workDesignContextFinalizeRequirementProjection } from "./work-design-context-finalize-requirements.ts";
import { workDesignContextFinalizedBriefProjection } from "./work-design-context-finalized-projection.ts";
import { workDesignContextHandoffProjection } from "./work-design-context-handoff-projection.ts";
import { workDesignContextSnapshotEvidenceProjection } from "./work-design-context-snapshot-evidence.ts";

export function useWorkDesignContextArtifacts({
  activeBriefVersionId,
  briefVersions,
  contextCanvasScreenshotAttachment,
  contextBriefFingerprint,
  contextBriefLocked,
  contextBriefLockedFingerprint,
  contextBriefMetadataFingerprint,
  contextBriefMetadataReady,
  contextBriefReady,
  contextBriefSavedFingerprint,
  contextBriefSnapshotFingerprint,
  contextBriefSnapshotReady,
  contextDecision,
  contextFinalizeDialogOpen,
  contextFinalizeRunning,
  contextLoadedSessionId,
  contextOperatorNote,
  contextSavedSessions,
  deliveryPackage,
  initialContextSession,
}: {
  activeBriefVersionId: string | null;
  briefVersions: WorkDesignBriefVersion[];
  contextCanvasScreenshotAttachment: WorkDesignSnapshotAttachment | null;
  contextBriefFingerprint: string;
  contextBriefLocked: boolean;
  contextBriefLockedFingerprint: string | null;
  contextBriefMetadataFingerprint: string | null;
  contextBriefMetadataReady: boolean;
  contextBriefReady: boolean;
  contextBriefSavedFingerprint: string | null;
  contextBriefSnapshotFingerprint: string | null;
  contextBriefSnapshotReady: boolean;
  contextDecision: WorkDesignContextDecision;
  contextFinalizeDialogOpen: boolean;
  contextFinalizeRunning: boolean;
  contextLoadedSessionId: string | null;
  contextOperatorNote: string;
  contextSavedSessions: WorkDesignContextSavedSession[];
  deliveryPackage: DeliveryPackageSummary;
  initialContextSession: WorkDesignInitialContextSession;
}) {
  const contextBriefState = workDesignContextBriefStateProjection({
    activeBriefVersionId,
    briefVersions,
    contextBriefFingerprint,
    contextBriefLockedFingerprint,
    contextBriefMetadataFingerprint,
    contextBriefReady,
    contextBriefSavedFingerprint,
    contextBriefSnapshotFingerprint,
    contextDecision,
    contextLoadedSessionId,
    contextSavedSessions,
  });
  const finalizedBrief = workDesignContextFinalizedBriefProjection({
    activeBriefVersion: contextBriefState.activeBriefVersion,
    contextBriefReady,
    contextCurrentSavedSession: contextBriefState.contextCurrentSavedSession,
    contextDecision,
    contextOperatorNote,
    deliveryPackage,
    initialContextSession,
  });
  const snapshotEvidence = useMemo(
    () =>
      workDesignContextSnapshotEvidenceProjection({
        contextBriefReady,
        contextCanvasScreenshotAttachment,
        contextCurrentSavedSession:
          contextBriefState.contextCurrentSavedSession,
        contextFinalizeDialogOpen,
        contextFinalizeRunning,
        contextFinalizedBrief: finalizedBrief.contextFinalizedBrief,
        contextFinalizedFingerprint:
          contextBriefState.contextFinalizedFingerprint,
        deliveryPackage,
        initialContextSession,
      }),
    [
      contextBriefReady,
      contextBriefState.contextCurrentSavedSession,
      contextBriefState.contextFinalizedFingerprint,
      contextCanvasScreenshotAttachment,
      contextFinalizeDialogOpen,
      contextFinalizeRunning,
      deliveryPackage,
      finalizedBrief.contextFinalizedBrief.boardSnapshotRef,
      finalizedBrief.contextFinalizedBrief.decision,
      finalizedBrief.contextFinalizedBrief.diagramSummary,
      finalizedBrief.contextFinalizedBrief.diagramTitle,
      finalizedBrief.contextFinalizedBrief.snapshotArtifact,
      initialContextSession,
    ],
  );
  const handoff = workDesignContextHandoffProjection({
    contextBoardInventory: snapshotEvidence.contextBoardInventory,
    contextBuildSeedMetrics: snapshotEvidence.contextBuildSeedMetrics,
    contextBuildSeedSummary: snapshotEvidence.contextBuildSeedSummary,
    contextFinalizedBrief: finalizedBrief.contextFinalizedBrief,
  });
  const requirements = workDesignContextFinalizeRequirementProjection({
    contextBriefLocked,
    contextBriefMetadataReady,
    contextBriefSnapshotReady,
    contextCurrentSavedSession: contextBriefState.contextCurrentSavedSession,
    contextFinalizeRunning,
  });
  const record = workDesignContextBriefRecordProjection({
    contextCurrentSavedSession: contextBriefState.contextCurrentSavedSession,
    contextDecision,
    initialContextSession,
  });

  return {
    activeBriefVersion: contextBriefState.activeBriefVersion,
    contextBoardInventory: snapshotEvidence.contextBoardInventory,
    contextBriefDisplayTitle: contextBriefState.contextBriefDisplayTitle,
    contextBriefFacts: contextBriefState.contextBriefFacts,
    contextBriefPanelTone: contextBriefState.contextBriefPanelTone,
    contextBriefRecordName: record.contextBriefRecordName,
    contextBriefRecordNote: record.contextBriefRecordNote,
    contextBriefRecordRef: record.contextBriefRecordRef,
    contextBriefRecordSavedAtLabel: record.contextBriefRecordSavedAtLabel,
    contextBriefState: contextBriefState.contextBriefState,
    contextBriefStatusTone: contextBriefState.contextBriefStatusTone,
    contextCanCaptureLiveCanvas: snapshotEvidence.contextCanCaptureLiveCanvas,
    contextCurrentSavedSession: contextBriefState.contextCurrentSavedSession,
    contextDecisionCopy: contextBriefState.contextDecisionCopy,
    contextFinalizeCanRun: requirements.contextFinalizeCanRun,
    contextFinalizeRequirementRows: requirements.contextFinalizeRequirementRows,
    contextFinalizedBoardSnapshot:
      snapshotEvidence.contextFinalizedBoardSnapshot,
    contextFinalizedBrief: finalizedBrief.contextFinalizedBrief,
    contextFinalizedBriefAvailable:
      finalizedBrief.contextFinalizedBriefAvailable,
    contextFinalizedBriefDescription: handoff.contextFinalizedBriefDescription,
    contextFinalizedBriefHandoffLabel:
      handoff.contextFinalizedBriefHandoffLabel,
    contextFinalizedBriefReceiptRows: handoff.contextFinalizedBriefReceiptRows,
    contextFinalizedBriefTargetTitle: handoff.contextFinalizedBriefTargetTitle,
    contextFinalizedFingerprint: contextBriefState.contextFinalizedFingerprint,
    contextGeneratedSnapshotAttachment:
      snapshotEvidence.contextGeneratedSnapshotAttachment,
    contextNeedsSnapshotCapture: snapshotEvidence.contextNeedsSnapshotCapture,
    contextSnapshotAttachment: snapshotEvidence.contextSnapshotAttachment,
    contextSnapshotAttachmentExportLabel:
      snapshotEvidence.contextSnapshotAttachmentExportLabel,
    contextSnapshotAttachmentSourceLabel:
      snapshotEvidence.contextSnapshotAttachmentSourceLabel,
    contextSnapshotAttachmentStatusLabel:
      snapshotEvidence.contextSnapshotAttachmentStatusLabel,
    contextSnapshotCoreNodes: snapshotEvidence.contextSnapshotCoreNodes,
  };
}
