import type { WorkDesignContextSavedSession } from "../../work-model/work-design/work-design-types.ts";

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
