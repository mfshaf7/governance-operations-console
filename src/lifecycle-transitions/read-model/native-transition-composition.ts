import { currentOwnerRead, type ConsoleOwnerReads } from "../../console-integration/live-attention.ts";
import type { NativeLifecycleOutcome } from "../../console-integration/native-lifecycle-outcome.ts";
import { lifecycleTransitionRoute } from "../model/lifecycle-transition-routes.ts";
import type { LifecycleTransitionProjection } from "./lifecycle-transition-projection-types.ts";
import type { LifecycleTransitionLiveSnapshot } from "../live-runtime/lifecycle-transition-live-types.ts";

export function projectNativeTransition(fact: NativeLifecycleOutcome): LifecycleTransitionProjection {
  const route = lifecycleTransitionRoute(fact.routeId);
  return {
    nativeEvidence: { kind: fact.observationKind, title: fact.title, authority: fact.owner, sourceRef: fact.sourceRef, evidenceRefs: fact.evidenceRefs },
    transitionId: fact.id, route, state: "applied", correlationId: fact.id, idempotencyKey: fact.id,
    source: { domain: route.sourceDomain, ownerRef: route.intentOwnerRef, recordId: fact.sourceId, sourceVersion: fact.sourceVersion, projectionVersion: fact.sourceVersion },
    target: route.target, reason: { code: "native-owner-history", detail: fact.detail },
    // Never retrofit approvals, target admission or validation phases to an
    // existing native outcome. These fields are display projection, not OOS events.
    validation: { state: "not-projected", gates: [], receiptRef: null, runRef: null },
    admission: { state: "not-projected", reasonCode: null, receiptRef: null, recordedAt: null, targetRecordRef: fact.targetRef },
    application: { adapterRef: route.target.applicationOwnerRef, state: "applied", evidenceKind: null, receiptRef: fact.receiptRef, recordedAt: null, resultingRefs: fact.targetRef ? [fact.targetRef] : [], retryable: null, runRef: null, targetRecordRef: fact.targetRef, failureCode: null, failureDetail: null },
    authorityDecisions: [], blockedGate: null, correction: null, deferred: null, rejection: null, cancelledReasonCode: null,
    nextAction: null, supersedesTransitionId: null, supersededByTransitionId: null, updatedAt: fact.recordedAt,
    history: [{ artifactId: fact.id, artifactKind: "source-packet-prepared", authority: { ownerRef: fact.owner, role: "source-domain" }, evidenceRefs: fact.evidenceRefs, recordedAt: fact.recordedAt, sequence: 0, outcome: "informational" }],
  };
}

export function composeLifecycleTransitionSnapshot(journal: LifecycleTransitionLiveSnapshot | null, reads: ConsoleOwnerReads, projectors: Readonly<Record<"proposals" | "prototypes", (payload: unknown) => NativeLifecycleOutcome[]>>): LifecycleTransitionLiveSnapshot | null {
  if (journal?.mode === "disconnected-preview") return journal;
  const native: LifecycleTransitionProjection[] = [], missing: string[] = [];
  for (const key of ["proposals", "prototypes"] as const) {
    const project = projectors[key];
    const read = reads[key];
    if (!currentOwnerRead(read)) { missing.push(key); continue; }
    try { native.push(...project(read!.payload).map(projectNativeTransition)); }
    catch { missing.push(key); }
  }
  if (!journal && native.length === 0) return null;
  const currentJournal = journal?.status === "current";
  const rows = currentJournal ? [...journal.transitions] : [];
  for (const transition of native) {
    const receipt = transition.application.receiptRef;
    if (receipt && rows.some(row => row.route.routeId === transition.route.routeId && row.application.receiptRef === receipt)) continue;
    rows.push(transition);
  }
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.transitionId.localeCompare(b.transitionId));
  return { mode: "live", sourceScope: "owner-readbacks-and-journal", status: currentJournal || native.length ? "current" : "offline", observedAt: new Date().toISOString(), transitions: rows,
    truncated: Boolean(journal?.truncated || !currentJournal || missing.length),
    error: missing.length || !currentJournal ? "Partial coordination coverage: one or more current journal/native owner reads are unavailable. Native readbacks are not a complete historical journal." : null,
  };
}
