import type {
  ConsoleAttentionCandidate,
  ConsoleAttentionClass,
  ConsoleAttentionSource,
  ConsoleAttentionUrgency,
} from "../../console-integration/attention-contract";
import { consoleAttentionSourceRegistrations } from "../../console-integration/attention-source-registry";
import { lifecycleTransitionProjectionFixtures } from "../fixtures/lifecycle-transition-projections.fixture";
import type { LifecycleTransitionNextActionCode } from "../model/lifecycle-transition-types";
import type { LifecycleTransitionProjection } from "./lifecycle-transition-projection-types";
import { selectLifecycleTransitionsRequiringAction } from "./lifecycle-transition-selectors";

const registration =
  consoleAttentionSourceRegistrations.lifecycleTransitions;
const actionableTransitions = selectLifecycleTransitionsRequiringAction(
  lifecycleTransitionProjectionFixtures,
);
const projectedAt =
  lifecycleTransitionProjectionFixtures
    .map((transition) => transition.updatedAt)
    .sort()
    .at(-1) ?? "2026-07-28T00:00:00.000Z";
const lifecycleTransitionAttentionSnapshot = {
  candidates: actionableTransitions.map((transition) =>
    lifecycleTransitionAttentionCandidate(transition),
  ),
  registration,
  schemaVersion: 1,
  source: {
    authority: "lifecycle-transition-projection",
    freshness: "current",
    mode: "synthetic",
    observedAt: projectedAt,
    projectedAt,
    ref: "lifecycle-transition://attention-projection",
    version: `lifecycle-transition-attention-v1:${lifecycleTransitionProjectionFixtures.length}`,
  },
} as const;

export const lifecycleTransitionAttentionSource: ConsoleAttentionSource = {
  getSnapshot: () => lifecycleTransitionAttentionSnapshot,
  registration,
  subscribe: () => () => undefined,
};

function lifecycleTransitionAttentionCandidate(
  transition: LifecycleTransitionProjection,
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
      authority: "lifecycle-transition-projection",
      freshness: "current",
      mode: "synthetic",
      observedAt: transition.updatedAt,
      projectedAt,
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
