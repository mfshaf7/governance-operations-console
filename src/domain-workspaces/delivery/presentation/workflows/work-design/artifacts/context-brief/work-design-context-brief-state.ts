import type { DeliveryTone } from "../../../../../read-model/index.ts";
import type {
  WorkDesignBriefVersion,
  WorkDesignContextDecision,
  WorkDesignContextSavedSession,
} from "../../model/work-design-model.ts";
import { workDesignContextDecisionCopy } from "../../view-model/work-design-context-decision-model.ts";
import { formatWorkDesignDateTime } from "../../view-model/work-design-display-formatters.ts";

import type {
  WorkDesignContextBriefState,
  WorkDesignInitialContextSession,
} from "./work-design-context-artifact-types.ts";

export function workDesignContextFinalizedFingerprint({
  contextBriefLockedFingerprint,
  contextBriefMetadataFingerprint,
  contextBriefSavedFingerprint,
  contextBriefSnapshotFingerprint,
}: {
  contextBriefLockedFingerprint: string | null;
  contextBriefMetadataFingerprint: string | null;
  contextBriefSavedFingerprint: string | null;
  contextBriefSnapshotFingerprint: string | null;
}) {
  return contextBriefSavedFingerprint &&
    contextBriefSavedFingerprint === contextBriefLockedFingerprint &&
    contextBriefSavedFingerprint === contextBriefMetadataFingerprint &&
    contextBriefSavedFingerprint === contextBriefSnapshotFingerprint
    ? contextBriefSavedFingerprint
    : null;
}

export function workDesignContextBriefStateProjection({
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
}: {
  activeBriefVersionId: string | null;
  briefVersions: WorkDesignBriefVersion[];
  contextBriefFingerprint: string;
  contextBriefLockedFingerprint: string | null;
  contextBriefMetadataFingerprint: string | null;
  contextBriefReady: boolean;
  contextBriefSavedFingerprint: string | null;
  contextBriefSnapshotFingerprint: string | null;
  contextDecision: WorkDesignContextDecision;
  contextLoadedSessionId: string | null;
  contextSavedSessions: WorkDesignContextSavedSession[];
}) {
  const contextDecisionCopy = workDesignContextDecisionCopy(contextDecision);
  const contextFinalizedFingerprint = workDesignContextFinalizedFingerprint({
    contextBriefLockedFingerprint,
    contextBriefMetadataFingerprint,
    contextBriefSavedFingerprint,
    contextBriefSnapshotFingerprint,
  });
  const contextLoadedSavedSession =
    contextSavedSessions.find(
      (session) => session.id === contextLoadedSessionId,
    ) ?? null;
  const contextCurrentSavedSession =
    contextLoadedSavedSession?.fingerprint === contextBriefFingerprint
      ? contextLoadedSavedSession
      : (contextSavedSessions.find(
          (session) => session.fingerprint === contextBriefFingerprint,
        ) ?? null);
  const contextBriefPrepared =
    Boolean(contextBriefSavedFingerprint) &&
    Boolean(contextBriefLockedFingerprint) &&
    Boolean(contextBriefMetadataFingerprint) &&
    Boolean(contextBriefSnapshotFingerprint);
  const contextBriefState: WorkDesignContextBriefState = contextBriefReady
    ? "finalized"
    : contextBriefPrepared
      ? "stale"
      : contextCurrentSavedSession
        ? "loaded"
        : "unsaved";
  const contextBriefStatusTone: DeliveryTone =
    contextBriefState === "finalized"
      ? "ok"
      : contextBriefState === "stale"
        ? "stale"
        : contextBriefState === "loaded"
          ? "info"
          : "warn";
  const contextBriefPanelTone: DeliveryTone =
    contextBriefState === "finalized" ? "ok" : "warn";
  const contextBriefStateLabel =
    contextBriefState === "finalized"
      ? "Finalized"
      : contextBriefState === "stale"
        ? "Stale"
        : contextBriefState === "loaded"
          ? "Loaded"
          : "Unsaved";
  const contextBriefDisplayTitle =
    contextCurrentSavedSession?.name ??
    (contextLoadedSavedSession ? "Unsaved Changes" : "No Loaded Session");
  const contextBriefSavedAt =
    contextCurrentSavedSession?.savedAt ??
    contextLoadedSavedSession?.savedAt ??
    null;
  const contextBriefFacts = [
    {
      label: "Status",
      value: contextBriefStateLabel,
    },
    {
      label: "Saved",
      value: contextBriefSavedAt
        ? formatWorkDesignDateTime(contextBriefSavedAt)
        : "Not saved",
    },
    {
      label: "Decision",
      value: contextDecisionCopy.label,
    },
  ];
  const activeBriefVersion =
    briefVersions.find(
      (version) => version.briefVersionId === activeBriefVersionId,
    ) ?? null;

  return {
    activeBriefVersion,
    contextBriefDisplayTitle,
    contextBriefFacts,
    contextBriefPanelTone,
    contextBriefState,
    contextBriefStatusTone,
    contextCurrentSavedSession,
    contextDecisionCopy,
    contextFinalizedFingerprint,
  };
}

export function workDesignContextBriefRecordProjection({
  contextCurrentSavedSession,
  contextDecision,
  initialContextSession,
}: {
  contextCurrentSavedSession: WorkDesignContextSavedSession | null;
  contextDecision: WorkDesignContextDecision;
  initialContextSession: WorkDesignInitialContextSession;
}) {
  const contextDecisionCopy = workDesignContextDecisionCopy(contextDecision);
  const contextBriefRecordName =
    initialContextSession?.name ??
    contextCurrentSavedSession?.name ??
    "Context Brief Accepted";
  const contextBriefRecordNote =
    initialContextSession?.note ??
    contextCurrentSavedSession?.note ??
    contextDecisionCopy.historyDescription;
  const contextBriefRecordSavedAt =
    initialContextSession?.saved_at ??
    contextCurrentSavedSession?.savedAt ??
    null;
  const contextBriefRecordSavedAtLabel = contextBriefRecordSavedAt
    ? formatWorkDesignDateTime(contextBriefRecordSavedAt)
    : "stored session";
  const contextBriefRecordRef =
    initialContextSession?.session_ref ??
    contextCurrentSavedSession?.id ??
    "local session";

  return {
    contextBriefRecordName,
    contextBriefRecordNote,
    contextBriefRecordRef,
    contextBriefRecordSavedAtLabel,
  };
}
