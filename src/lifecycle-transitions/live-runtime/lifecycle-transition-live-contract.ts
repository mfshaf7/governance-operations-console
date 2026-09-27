import {
  lifecycleTransitionRoute,
} from "../model/lifecycle-transition-routes.ts";
import type {
  LifecycleTransitionAuthorityRole,
  LifecycleTransitionGateSnapshot,
  LifecycleTransitionNextActionCode,
  LifecycleTransitionRouteId,
  LifecycleTransitionState,
} from "../model/lifecycle-transition-types.ts";
import type {
  LifecycleTransitionHistoryProjection,
  LifecycleTransitionProjection,
} from "../read-model/lifecycle-transition-projection-types.ts";
import type {
  LifecycleTransitionLiveApiError,
  LifecycleTransitionLiveSnapshot,
} from "./lifecycle-transition-live-types.ts";

const routeIds = new Set<LifecycleTransitionRouteId>([
  "proposal-to-delivery",
  "proposal-to-prototype",
  "prototype-to-delivery",
]);
const states = new Set<LifecycleTransitionState>([
  "applied",
  "applying",
  "authorized",
  "awaiting-admission",
  "awaiting-authority",
  "blocked",
  "cancelled",
  "deferred",
  "failed",
  "prepared",
  "rejected",
  "returned",
  "superseded",
  "validating",
]);
const nextActions = new Set<LifecycleTransitionNextActionCode>([
  "complete-application",
  "complete-validation",
  "correct-source",
  "record-admission",
  "record-authority-decision",
  "resolve-gate",
  "retry-application",
  "review-deferred-transition",
  "review-rejection",
  "start-application",
  "start-validation",
]);
const authorityRoles = new Set<LifecycleTransitionAuthorityRole>([
  "decision-authority",
  "orchestration",
  "source-domain",
  "target-adapter",
  "target-domain",
  "validation-authority",
]);
const artifactKinds = new Set<LifecycleTransitionHistoryProjection["artifactKind"]>([
  "application-failed",
  "application-started",
  "authority-decision-recorded",
  "gate-blocked",
  "source-correction-returned",
  "source-packet-prepared",
  "target-admission-recorded",
  "target-application-recorded",
  "transition-cancelled",
  "transition-deferred",
  "transition-superseded",
  "validation-completed",
  "validation-started",
]);

export function projectLifecycleTransitionOwnerProjection(
  value: unknown,
): LifecycleTransitionProjection {
  const source = record(value, "Lifecycle Transition projection");
  const routeId = member(source.route_id, routeIds, "route identity");
  const route = lifecycleTransitionRoute(routeId);
  const sourceRecord = record(source.source, "transition source");
  const target = record(source.target, "transition target");

  exact(sourceRecord.domain, route.sourceDomain, "source domain");
  exact(sourceRecord.owner_ref, route.intentOwnerRef, "source owner");
  exact(target.domain, route.target.domain, "target domain");
  exact(target.admission_owner_ref, route.target.admissionOwnerRef, "target admission owner");
  exact(target.application_owner_ref, route.target.applicationOwnerRef, "target application owner");
  exact(target.home_ref, route.target.homeRef, "target home");
  exact(target.ingress_ref, route.target.ingressRef, "target ingress");
  exact(target.lane_ref, route.target.laneRef, "target lane");

  const reason = record(source.reason, "transition reason");
  const validation = record(source.validation, "transition validation");
  const admission = record(source.admission, "transition admission");
  const application = record(source.application, "transition application");
  const history = record(source.history, "transition history");
  const state = member(source.state, states, "transition state");
  const transitionId = text(source.transition_id, "transition identity");
  const updatedAt = timestamp(source.updated_at, "transition update time");

  const historyEntries = array(history.entries, "transition history entries").map(
    projectHistoryEntry,
  );
  if (historyEntries.length < 1 || historyEntries.length > 100) {
    invalid("Transition history must contain 1 through 100 entries.");
  }
  for (let index = 1; index < historyEntries.length; index += 1) {
    if (historyEntries[index - 1].sequence >= historyEntries[index].sequence) {
      invalid("Transition history sequence is not monotonic.");
    }
  }

  return {
    admission: {
      reasonCode: nullableText(admission.reason_code, "admission reason"),
      receiptRef: nullableText(admission.receipt_ref, "admission receipt"),
      recordedAt: nullableTimestamp(admission.recorded_at, "admission time"),
      state: oneOf(admission.state, ["admitted", "not-started", "rejected"] as const, "admission state"),
      targetRecordRef: nullableText(admission.target_record_ref, "admission target record"),
    },
    application: {
      adapterRef: text(application.adapter_ref, "application adapter"),
      evidenceKind: nullableOneOf(
        application.evidence_kind,
        ["target-admission-receipt", "target-application-receipt"] as const,
        "application evidence kind",
      ),
      failureCode: nullableText(application.failure_code, "application failure code"),
      failureDetail: nullableText(application.failure_detail, "application failure detail"),
      receiptRef: nullableText(application.receipt_ref, "application receipt"),
      recordedAt: nullableTimestamp(application.recorded_at, "application time"),
      resultingRefs: stringArray(application.resulting_refs, "application resulting references"),
      retryable: nullableBoolean(application.retryable, "application retry posture"),
      runRef: nullableText(application.run_ref, "application run"),
      state: oneOf(application.state, ["applied", "failed", "not-started", "running"] as const, "application state"),
      targetRecordRef: nullableText(application.target_record_ref, "application target record"),
    },
    authorityDecisions: array(source.authority_decisions, "authority decisions").map(
      (entry) => {
        const decision = record(entry, "authority decision");
        return {
          authorityOwnerRef: text(decision.authority_owner_ref, "decision owner"),
          controlId: text(decision.control_id, "decision control"),
          decision: oneOf(decision.decision, ["approved", "deferred", "pending"] as const, "authority decision"),
          evidenceType: text(decision.evidence_type, "decision evidence type"),
          justification: nullableText(decision.justification, "decision justification"),
          receiptRef: nullableText(decision.receipt_ref, "decision receipt"),
          recordedAt: nullableTimestamp(decision.recorded_at, "decision time"),
          reviewAt: nullableTimestamp(decision.review_at, "decision review time"),
        };
      },
    ),
    blockedGate: source.blocked_gate === null
      ? null
      : projectGate(source.blocked_gate),
    cancelledReasonCode: nullableText(source.cancelled_reason_code, "cancellation reason"),
    correlationId: text(source.correlation_id, "transition correlation"),
    correction: source.correction === null
      ? null
      : projectCorrection(source.correction),
    deferred: source.deferred === null ? null : projectDeferred(source.deferred),
    history: historyEntries,
    idempotencyKey: text(source.idempotency_key, "transition idempotency key"),
    nextAction: source.next_action === null
      ? null
      : projectNextAction(source.next_action),
    reason: {
      code: text(reason.code, "reason code"),
      detail: text(reason.detail, "reason detail"),
    },
    rejection: source.rejection === null
      ? null
      : projectRejection(source.rejection),
    route,
    source: {
      domain: route.sourceDomain,
      ownerRef: route.intentOwnerRef,
      projectionVersion: text(sourceRecord.projection_version, "source projection version"),
      recordId: text(sourceRecord.record_id, "source record identity"),
      sourceVersion: text(sourceRecord.source_version, "source version"),
    },
    state,
    supersededByTransitionId: nullableText(source.superseded_by_transition_id, "superseding transition"),
    supersedesTransitionId: nullableText(source.supersedes_transition_id, "superseded transition"),
    target: route.target,
    transitionId,
    updatedAt,
    validation: {
      gates: array(validation.gates, "validation gates").map(projectGate),
      receiptRef: nullableText(validation.receipt_ref, "validation receipt"),
      runRef: nullableText(validation.run_ref, "validation run"),
      state: oneOf(validation.state, ["blocked", "not-started", "passed", "returned", "running"] as const, "validation state"),
    },
  };
}

export function assertLifecycleTransitionLiveSnapshot(
  value: unknown,
): LifecycleTransitionLiveSnapshot {
  const snapshot = record(value, "Lifecycle Transition snapshot");
  const mode = oneOf(snapshot.mode, ["disconnected-preview", "live"] as const, "snapshot mode");
  const status = oneOf(snapshot.status, ["current", "offline"] as const, "snapshot status");
  const transitions = array(snapshot.transitions, "snapshot transitions");
  if (!transitions.every(isProjectedLifecycleTransition)) {
    invalid("Lifecycle Transition snapshot contains an invalid projection.");
  }
  if (mode === "disconnected-preview" && transitions.length > 0) {
    invalid("Disconnected Lifecycle Transition state cannot claim live projections.");
  }
  return {
    error: nullableText(snapshot.error, "snapshot error"),
    mode,
    observedAt: timestamp(snapshot.observedAt, "snapshot observation time"),
    status,
    transitions: transitions as LifecycleTransitionProjection[],
    truncated: boolean(snapshot.truncated, "snapshot truncation posture"),
  };
}

export function isLifecycleTransitionLiveApiError(
  value: unknown,
): value is LifecycleTransitionLiveApiError {
  return isRecord(value) && value.mode === "live" && value.status === "offline" &&
    typeof value.code === "string" && typeof value.error === "string";
}

function projectHistoryEntry(value: unknown): LifecycleTransitionHistoryProjection {
  const entry = record(value, "transition history entry");
  const authority = record(entry.authority, "history authority");
  const artifactKind = member(
    entry.artifact_kind,
    artifactKinds,
    "history artifact kind",
  );
  return {
    artifactId: text(entry.artifact_id, "history artifact identity"),
    artifactKind,
    authority: {
      ownerRef: text(authority.owner_ref, "history owner"),
      role: member(authority.role, authorityRoles, "history authority role"),
    },
    evidenceRefs: stringArray(entry.evidence_refs, "history evidence references"),
    outcome: ownerHistoryOutcome(artifactKind),
    recordedAt: timestamp(entry.recorded_at, "history time"),
    sequence: nonNegativeInteger(entry.sequence, "history sequence"),
  };
}

function ownerHistoryOutcome(
  kind: LifecycleTransitionHistoryProjection["artifactKind"],
): LifecycleTransitionHistoryProjection["outcome"] {
  switch (kind) {
    case "application-failed":
      return "failed";
    case "gate-blocked":
    case "source-correction-returned":
      return "blocked";
    case "transition-deferred":
      return "waiting";
    case "transition-cancelled":
    case "transition-superseded":
      return "informational";
    case "target-application-recorded":
      return "succeeded";
    case "application-started":
    case "source-packet-prepared":
    case "validation-started":
      return "started";
    case "authority-decision-recorded":
    case "target-admission-recorded":
    case "validation-completed":
      return "informational";
  }
}

function projectGate(value: unknown): LifecycleTransitionGateSnapshot {
  const gate = record(value, "transition gate");
  return {
    evidenceRef: nullableText(gate.evidence_ref, "gate evidence"),
    gateId: text(gate.gate_id, "gate identity"),
    ownerRef: text(gate.owner_ref, "gate owner"),
    requiredFix: nullableText(gate.required_fix, "gate required fix"),
    state: oneOf(gate.state, ["blocked", "not-required", "passed"] as const, "gate state"),
  };
}

function projectCorrection(value: unknown) {
  const correction = record(value, "transition correction");
  return {
    ownerRef: text(correction.owner_ref, "correction owner"),
    reasonCode: text(correction.reason_code, "correction reason"),
    requiredFix: text(correction.required_fix, "correction required fix"),
  };
}

function projectDeferred(value: unknown) {
  const deferred = record(value, "deferred transition");
  return {
    justification: text(deferred.justification, "deferral justification"),
    reasonCode: text(deferred.reason_code, "deferral reason"),
    reviewAt: timestamp(deferred.review_at, "deferral review time"),
  };
}

function projectRejection(value: unknown) {
  const rejection = record(value, "transition rejection");
  return {
    reasonCode: text(rejection.reason_code, "rejection reason"),
    reasonDetail: text(rejection.reason_detail, "rejection detail"),
  };
}

function projectNextAction(value: unknown) {
  const action = record(value, "transition next action");
  return {
    action: member(action.action, nextActions, "next action"),
    ownerRef: text(action.owner_ref, "next action owner"),
    reviewAt: nullableTimestamp(action.review_at, "next action review time"),
  };
}

function isProjectedLifecycleTransition(value: unknown): value is LifecycleTransitionProjection {
  if (!isRecord(value) || !isRecord(value.route) || !Array.isArray(value.history)) return false;
  return typeof value.transitionId === "string" && routeIds.has(value.route.routeId as LifecycleTransitionRouteId) &&
    states.has(value.state as LifecycleTransitionState) && typeof value.updatedAt === "string";
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) invalid(`${label} is invalid.`);
  return value;
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") invalid(`${label} is invalid.`);
  return value;
}

function exact(value: unknown, expected: unknown, label: string) {
  if (value !== expected) invalid(`${label} is invalid.`);
}

function invalid(message: string): never {
  throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function member<T extends string>(value: unknown, options: ReadonlySet<T>, label: string): T {
  if (typeof value !== "string" || !options.has(value as T)) invalid(`${label} is invalid.`);
  return value as T;
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) invalid(`${label} is invalid.`);
  return value as number;
}

function nullableBoolean(value: unknown, label: string): boolean | null {
  return value === null ? null : boolean(value, label);
}

function nullableOneOf<T extends string>(value: unknown, options: readonly T[], label: string): T | null {
  return value === null ? null : oneOf(value, options, label);
}

function nullableText(value: unknown, label: string): string | null {
  return value === null ? null : text(value, label);
}

function nullableTimestamp(value: unknown, label: string): string | null {
  return value === null ? null : timestamp(value, label);
}

function oneOf<T extends string>(value: unknown, options: readonly T[], label: string): T {
  if (typeof value !== "string" || !options.includes(value as T)) invalid(`${label} is invalid.`);
  return value as T;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) invalid(`${label} is invalid.`);
  return value;
}

function stringArray(value: unknown, label: string): string[] {
  const values = array(value, label).map((entry) => text(entry, label));
  if (new Set(values).size !== values.length) invalid(`${label} must be unique.`);
  return values;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) invalid(`${label} is invalid.`);
  return value;
}

function timestamp(value: unknown, label: string): string {
  const result = text(value, label);
  if (!Number.isFinite(Date.parse(result))) invalid(`${label} is invalid.`);
  return result;
}
