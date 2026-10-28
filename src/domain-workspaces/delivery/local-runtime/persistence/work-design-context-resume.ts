import type { WorkDesignContextSavedSession,WorkDesignBriefVersion } from "../../work-model/work-design/work-design-types.ts";
import type {WorkDesignFinalizedBrief} from "../../work-model/work-design/work-design-artifact-types.ts";

export function workDesignArchivedContextSession(version:WorkDesignBriefVersion,savedSessions:WorkDesignContextSavedSession[]):WorkDesignContextSavedSession {
  const original=savedSessions.find(session=>session.fingerprint===version.finalizedFingerprint);
  return {id:version.savedSessionId??version.briefVersionId,name:version.name,decision:version.decision,fingerprint:version.finalizedFingerprint,
    note:version.finalizedBrief?.note??original?.note??"",savedAt:version.finalizedAt,sequence:original?.sequence??1,snapshot:version.snapshot};
}

export function workDesignRetainedBrief(version:WorkDesignBriefVersion,session:WorkDesignContextSavedSession|null):WorkDesignFinalizedBrief {
  if(version.finalizedBrief)return version.finalizedBrief;
  return {boardSnapshotRef:version.boardSnapshotRef,carriedMetadata:[],decision:version.decision,
    diagramNodes:version.snapshot.customItems.map(item=>({label:"Retained board item",summary:item.detail??"",title:item.label,tone:"info"})),
    diagramSummary:"Rendered from the retained finalized board. The complete brief text and finalization checks were not retained by this older version.",
    diagramTitle:version.name,finalizedAt:version.finalizedAt,finalizedBy:"Not retained",metadataPacketRef:version.metadataPacketRef,name:version.name,
    note:session?.fingerprint===version.finalizedFingerprint?session.note:"",snapshotArtifact:null,systemChecks:[],version:version.versionLabel};
}

/** Restore validated local continuity without replacing an authoritative seed. */
export function workDesignResumeContextSession({
  seededSession, currentSession, loadedSessionId, savedSessions,
}: {
  seededSession: WorkDesignContextSavedSession | null;
  currentSession: WorkDesignContextSavedSession | null;
  loadedSessionId: string | null;
  savedSessions: WorkDesignContextSavedSession[];
}): WorkDesignContextSavedSession | null {
  if (seededSession) return seededSession;
  const loadedSession = savedSessions.find(session => session.id === loadedSessionId);
  // The selected named checkpoint is a baseline, not permission to discard
  // newer unapplied content already recorded in the current autosave.
  if (currentSession && currentSession.fingerprint !== loadedSession?.fingerprint) return currentSession;
  return loadedSession ?? currentSession ?? savedSessions[0] ?? null;
}
