import type {
  ConsoleAttentionCandidate,
  ConsoleAttentionClass,
  ConsoleAttentionSource,
  ConsoleAttentionUrgency,
} from "../../console-integration/attention-contract.ts";
import { consoleAttentionSourceRegistrations } from "../../console-integration/attention-source-registry.ts";
import { lifecycleTransitionProjectionFixtures } from "../fixtures/lifecycle-transition-projections.fixture.ts";
import type { LifecycleTransitionLiveSnapshot } from "../live-runtime/lifecycle-transition-live-types.ts";
import type { LifecycleTransitionNextActionCode } from "../model/lifecycle-transition-types.ts";
import type { LifecycleTransitionProjection } from "./lifecycle-transition-projection-types.ts";
import { selectLifecycleTransitionsRequiringAction } from "./lifecycle-transition-selectors.ts";

const registration =
  consoleAttentionSourceRegistrations.lifecycleTransitions;
const pendingProjectionTime = "1970-01-01T00:00:00.000Z";
const lifecycleTransitionAttentionSnapshot =
  projectLifecycleTransitionAttentionSnapshot(null, {
    allowSyntheticPreview: true,
  });

export const lifecycleTransitionAttentionSource: ConsoleAttentionSource = {
  getSnapshot: () => lifecycleTransitionAttentionSnapshot,
  registration,
  subscribe: () => () => undefined,
};

export function projectLifecycleTransitionAttentionSnapshot(
  snapshot: LifecycleTransitionLiveSnapshot | null,
  { allowSyntheticPreview = false }: { allowSyntheticPreview?: boolean } = {},
): ReturnType<ConsoleAttentionSource["getSnapshot"]> {
  if (
    allowSyntheticPreview ||
    snapshot?.mode === "disconnected-preview"
  ) {
    const projectedAt = latestTransitionUpdate(
      lifecycleTransitionProjectionFixtures,
    );
    const source = {
      authority: "workspace-prototype-studio",
      freshness: "current" as const,
      mode: "synthetic" as const,
      observedAt: null,
      projectedAt,
      ref: "fixture://lifecycle-transitions/attention",
      version: `lifecycle-transition-attention-preview-v1:${lifecycleTransitionProjectionFixtures.length}`,
    };
    return {
      candidates: selectLifecycleTransitionsRequiringAction(
        lifecycleTransitionProjectionFixtures,
      ).map((transition) =>
        lifecycleTransitionAttentionCandidate(transition, source),
      ),
      registration,
      schemaVersion: 1,
      source,
    };
  }

  if (!snapshot || snapshot.status === "offline") {
    const projectedAt = snapshot?.observedAt ?? pendingProjectionTime;
    return {
      candidates: [],
      registration,
      schemaVersion: 1,
      source: {
        authority: "operator-orchestration-service",
        freshness: snapshot ? "unavailable" : "unverified",
        mode: "source-projected",
        observedAt: snapshot?.observedAt ?? null,
        projectedAt,
        ref: "oos://lifecycle-transitions",
        version: snapshot
          ? `lifecycle-transition-attention-offline-v1:${snapshot.observedAt}`
          : "lifecycle-transition-attention-pending-v1",
      },
    };
  }

  const freshness = snapshot.truncated ? "unverified" : "current";
  const source = {
    authority: "operator-orchestration-service",
    freshness,
    mode: "source-projected" as const,
    observedAt: snapshot.observedAt,
    projectedAt: snapshot.observedAt,
    ref: "oos://lifecycle-transitions",
    version: lifecycleTransitionAttentionVersion(snapshot.transitions),
  } as const;

  return {
    candidates: selectLifecycleTransitionsRequiringAction(
      snapshot.transitions,
    ).map((transition) =>
      lifecycleTransitionAttentionCandidate(transition, source),
    ),
    registration,
    schemaVersion: 1,
    source,
  };
}

function lifecycleTransitionAttentionCandidate(
  transition: LifecycleTransitionProjection,
  source: ReturnType<ConsoleAttentionSource["getSnapshot"]>["source"],
): ConsoleAttentionCandidate {
  const nextAction = transition.nextAction;
  if (!nextAction) {
    throw new Error(
      `Lifecycle transition ${transition.transitionId} has no next action.`,
    );
  }

  const requiredMoveId = `lifecycle-transition.${nextAction.action}`;

  return {
    attentionClass: lifecycleTransitionAttentionClass(nextAction.action),
    candidateId: `lifecycle-transition:${transition.transitionId}:${nextAction.action}`,
    correlationRef: transition.correlationId,
    dedupeKey: `${transition.transitionId}:${requiredMoveId}`,
    dueAt: null,
    evidenceRefs: [
      transition.validation.receiptRef,
      transition.application.receiptRef,
      ...transition.authorityDecisions.map((decision) => decision.receiptRef),
    ].filter((reference): reference is string => Boolean(reference)),
    owner: {
      label: nextAction.ownerRef,
      ref: nextAction.ownerRef,
    },
    ownerRank: lifecycleTransitionOwnerRank(nextAction.action),
    reason: lifecycleTransitionReason(transition),
    receiptRefs: [
      transition.admission.receiptRef,
      transition.application.receiptRef,
      transition.validation.receiptRef,
    ].filter((reference): reference is string => Boolean(reference)),
    requiredMove: {
      id: requiredMoveId,
      label: lifecycleTransitionActionLabel(nextAction.action),
    },
    reviewAt: nextAction.reviewAt,
    route: {
      availability: "available",
      entryIntent: {
        mode: lifecycleTransitionEntryMode(nextAction.action),
        requiredMoveRef: requiredMoveId,
        subjectRef: transition.transitionId,
        target: {
          id: "lifecycle-transitions",
          kind: "workspace",
          workspaceId: "lifecycle-transitions",
        },
      },
      externalHref: null,
      label: "Open Transition",
      unavailableReason: null,
    },
    schemaVersion: 1,
    source: {
      authority: source.authority,
      freshness: source.freshness,
      mode: source.mode,
      observedAt: transition.updatedAt,
      projectedAt: source.projectedAt,
      ref: `lifecycle-transition://${transition.transitionId}`,
      version: `${transition.state}:${transition.updatedAt}`,
    },
    subject: {
      kind: "lifecycle-transition",
      ref: transition.transitionId,
      title: `${transition.source.recordId} to ${transition.target.domain}`,
    },
    urgency: lifecycleTransitionUrgency(transition),
  };
}

function latestTransitionUpdate(
  transitions: readonly LifecycleTransitionProjection[],
) {
  return (
    transitions.map((transition) => transition.updatedAt).sort().at(-1) ??
    pendingProjectionTime
  );
}

function lifecycleTransitionAttentionVersion(
  transitions: readonly LifecycleTransitionProjection[],
) {
  const identity = transitions
    .map(
      (transition) =>
        `${transition.transitionId}:${transition.state}:${transition.updatedAt}`,
    )
    .sort()
    .join("|");
  return `lifecycle-transition-attention-v1:${identity || "empty"}`;
}

function lifecycleTransitionAttentionClass(
  action: LifecycleTransitionNextActionCode,
): ConsoleAttentionClass {
  switch (action) {
    case "correct-source":
    case "resolve-gate":
    case "retry-application":
      return "recovery";
    case "record-admission":
    case "record-authority-decision":
      return "decision";
    case "review-deferred-transition":
    case "review-rejection":
      return "review";
    case "complete-application":
    case "complete-validation":
    case "start-application":
    case "start-validation":
      return "required-action";
  }
}

function lifecycleTransitionUrgency(
  transition: LifecycleTransitionProjection,
): ConsoleAttentionUrgency {
  switch (transition.state) {
    case "failed":
      return "critical";
    case "blocked":
    case "returned":
      return "high";
    case "awaiting-admission":
    case "awaiting-authority":
    case "deferred":
    case "rejected":
      return "normal";
    default:
      return "low";
  }
}

function lifecycleTransitionOwnerRank(
  action: LifecycleTransitionNextActionCode,
) {
  switch (action) {
    case "correct-source":
    case "resolve-gate":
    case "retry-application":
      return 10;
    case "record-authority-decision":
    case "record-admission":
      return 20;
    case "complete-application":
    case "complete-validation":
      return 30;
    case "start-application":
    case "start-validation":
      return 40;
    case "review-deferred-transition":
    case "review-rejection":
      return 50;
  }
}

function lifecycleTransitionReason(
  transition: LifecycleTransitionProjection,
) {
  return (
    transition.correction?.requiredFix ??
    transition.blockedGate?.requiredFix ??
    transition.application.failureDetail ??
    transition.deferred?.justification ??
    transition.rejection?.reasonDetail ??
    transition.reason.detail
  );
}

function lifecycleTransitionEntryMode(
  action: LifecycleTransitionNextActionCode,
) {
  switch (action) {
    case "correct-source":
    case "resolve-gate":
    case "retry-application":
      return "resolve" as const;
    case "review-deferred-transition":
    case "review-rejection":
      return "review" as const;
    default:
      return "resume" as const;
  }
}

function lifecycleTransitionActionLabel(
  action: LifecycleTransitionNextActionCode,
) {
  return action
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
