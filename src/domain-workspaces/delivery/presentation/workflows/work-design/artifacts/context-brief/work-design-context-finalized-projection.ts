import type { DeliveryPackageSummary } from "../../../../../read-model/index.ts";
import {workDesignRetainedBrief} from "../../../../../local-runtime/index.ts";
import type {
  WorkDesignBriefVersion,
  WorkDesignContextDecision,
  WorkDesignContextSavedSession,
} from "../../model/work-design-model.ts";

import { workDesignFinalizedBriefView } from "./work-design-context-brief-model.ts";
import type { WorkDesignInitialContextSession } from "./work-design-context-artifact-types.ts";

export function workDesignContextFinalizedBriefProjection({
  readOnly = false,
  activeBriefVersion,
  contextBriefReady,
  contextCurrentSavedSession,
  contextDecision,
  contextOperatorNote,
  deliveryPackage,
  initialContextSession,
}: {
  readOnly?: boolean;
  activeBriefVersion: WorkDesignBriefVersion | null;
  contextBriefReady: boolean;
  contextCurrentSavedSession: WorkDesignContextSavedSession | null;
  contextDecision: WorkDesignContextDecision;
  contextOperatorNote: string;
  deliveryPackage: DeliveryPackageSummary;
  initialContextSession: WorkDesignInitialContextSession;
}) {
  const contextFinalizedBriefBase = workDesignFinalizedBriefView({
    decision: contextDecision,
    deliveryPackage,
    note:
      initialContextSession?.note ??
      contextCurrentSavedSession?.note ??
      contextOperatorNote,
    savedSession: contextCurrentSavedSession,
    session: initialContextSession,
  });
  const legacyRetainedBrief = readOnly && activeBriefVersion ? workDesignRetainedBrief(activeBriefVersion,contextCurrentSavedSession) : null;
  const contextFinalizedBrief = activeBriefVersion?.finalizedBrief ?? legacyRetainedBrief ?? (activeBriefVersion
    ? {
        ...contextFinalizedBriefBase,
        boardSnapshotRef: activeBriefVersion.boardSnapshotRef,
        decision: activeBriefVersion.decision,
        finalizedAt: activeBriefVersion.finalizedAt,
        metadataPacketRef: activeBriefVersion.metadataPacketRef,
        name: activeBriefVersion.name,
        version: activeBriefVersion.versionLabel,
      }
    : contextFinalizedBriefBase);

  return {
    contextFinalizedBrief,
    contextFinalizedBriefAvailable:
      Boolean(activeBriefVersion) || contextBriefReady || Boolean(initialContextSession?.accepted),
  };
}
