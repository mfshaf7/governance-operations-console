import type { WorkDesignContextSavedSession } from "../../model/work-design-model.ts";
import { formatWorkDesignDateTime } from "../../view-model/work-design-display-formatters.ts";

export function workDesignContextFinalizeRequirementProjection({
  contextBriefLocked,
  contextBriefMetadataReady,
  contextBriefSnapshotReady,
  contextCurrentSavedSession,
  contextFinalizeRunning,
}: {
  contextBriefLocked: boolean;
  contextBriefMetadataReady: boolean;
  contextBriefSnapshotReady: boolean;
  contextCurrentSavedSession: WorkDesignContextSavedSession | null;
  contextFinalizeRunning: boolean;
}) {
  const contextFinalizeRequirements = [
    {
      detail: contextCurrentSavedSession
        ? `${contextCurrentSavedSession.name} / ${formatWorkDesignDateTime(contextCurrentSavedSession.savedAt)}`
        : "Save or load a named session before finalizing the brief.",
      label: "Loaded Session",
      ready: Boolean(contextCurrentSavedSession),
      status: contextCurrentSavedSession ? "completed" : "required",
    },
    {
      detail: contextBriefLocked
        ? "Consumable version is locked for the next step."
        : "Finalize will lock the loaded session as the consumable version.",
      label: "Brief Version",
      ready: contextBriefLocked,
      status: contextBriefLocked ? "completed" : "pending",
    },
    {
      detail: contextBriefMetadataReady
        ? "Machine-readable handoff packet is ready."
        : "Finalize will generate the handoff packet for the next step.",
      label: "Metadata Packet",
      ready: contextBriefMetadataReady,
      status: contextBriefMetadataReady ? "completed" : "pending",
    },
    {
      detail: contextBriefSnapshotReady
        ? "Board visual state and inventory are captured."
        : "Finalize captures the board state and inventory as evidence; empty or freeform work is not treated as a failed structure check.",
      label: "Board Snapshot",
      ready: contextBriefSnapshotReady,
      status: contextBriefSnapshotReady ? "completed" : "pending",
    },
  ];
  const contextFinalizeRequirementRows = contextFinalizeRequirements.map(
    (item) =>
      contextFinalizeRunning && !item.ready
        ? {
            ...item,
            detail:
              item.label === "Brief Version"
                ? "Locking the loaded session as the consumable version."
                : item.label === "Metadata Packet"
                  ? "Generating the machine-readable handoff packet."
                  : item.label === "Board Snapshot"
                    ? "Capturing the board visual state for handoff context."
                    : item.detail,
            status: "finalizing",
          }
        : item,
  );

  return {
    contextFinalizeCanRun: Boolean(contextCurrentSavedSession),
    contextFinalizeRequirementRows,
  };
}
