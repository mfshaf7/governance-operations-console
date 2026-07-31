import type {
  LifecycleTransitionArtifact,
} from "../model/lifecycle-transition-artifacts.ts";
import {
  LIFECYCLE_TRANSITION_ROUTES,
} from "../model/lifecycle-transition-routes.ts";
import type {
  LifecycleTransitionDomain,
  LifecycleTransitionNextActionCode,
  LifecycleTransitionRouteId,
  LifecycleTransitionState,
} from "../model/lifecycle-transition-types.ts";
import type {
  LifecycleTransitionProjection,
} from "../read-model/lifecycle-transition-projection-types.ts";

export type LifecycleTransitionOverviewTone =
  | "danger"
  | "info"
  | "muted"
  | "ok"
  | "warn";

export type LifecycleTransitionPostureItem = Readonly<{
  label: string;
  stateLabel: string;
  tone: LifecycleTransitionOverviewTone;
}>;

export type LifecycleTransitionHistoryItem = Readonly<{
  artifactId: string;
  evidenceRef: string | null;
  label: string;
  ownerLabel: string;
  recordedAt: string;
  tone: LifecycleTransitionOverviewTone;
}>;

export type LifecycleTransitionOverviewItem = Readonly<{
  admissionTargetRecordRef: string | null;
  applicationRunRef: string | null;
  attentionDetail: string | null;
  history: readonly LifecycleTransitionHistoryItem[];
  nextAction: Readonly<{
    action: LifecycleTransitionNextActionCode;
    actionLabel: string;
    ownerLabel: string;
    ownerRef: string;
    reviewAt: string | null;
  }> | null;
  posture: readonly LifecycleTransitionPostureItem[];
  reasonDetail: string;
  routeId: LifecycleTransitionRouteId;
  sourceDomain: LifecycleTransitionDomain;
  sourceRecordId: string;
  sourceVersion: string;
  state: LifecycleTransitionState;
  stateLabel: string;
  targetDomain: LifecycleTransitionDomain;
  targetHomeRef: string;
  targetRecordRef: string | null;
  tone: LifecycleTransitionOverviewTone;
  transitionId: string;
  updatedAt: string;
}>;

export type LifecycleTransitionRouteOverview = Readonly<{
  activeCount: number;
  appliedCount: number;
  attentionCount: number;
  closedCount: number;
  description: string;
  items: readonly LifecycleTransitionOverviewItem[];
  nextOwnerCount: number;
  routeId: LifecycleTransitionRouteId;
  sourceLabel: string;
  statusLabel: string;
  summaryLabel: string;
  targetLabel: string;
  tone: LifecycleTransitionOverviewTone;
  totalCount: number;
}>;

const routeOrder = [
  "proposal-to-prototype",
  "proposal-to-delivery",
  "prototype-to-delivery",
] as const satisfies readonly LifecycleTransitionRouteId[];

const routeDescriptions = {
  "proposal-to-delivery":
    "Accepted proposal becomes a Delivery Intake source after validation and target admission.",
  "proposal-to-prototype":
    "Accepted proposal enters Prototype Landing after validation and target application.",
  "prototype-to-delivery":
    "Baseline-approved prototype enters Delivery Intake before Consume applies the continuation.",
} as const satisfies Record<LifecycleTransitionRouteId, string>;

const stateLabels = {
  applied: "Applied",
  applying: "Applying",
  authorized: "Authorized",
  "awaiting-admission": "Awaiting admission",
  "awaiting-authority": "Awaiting authority",
  blocked: "Blocked",
  cancelled: "Cancelled",
  deferred: "Deferred",
  failed: "Failed",
  prepared: "Prepared",
  rejected: "Rejected",
  returned: "Returned",
  superseded: "Superseded",
  validating: "Validating",
} as const satisfies Record<LifecycleTransitionState, string>;

const nextActionLabels = {
  "complete-application": "Complete target application",
  "complete-validation": "Complete validation",
  "correct-source": "Correct source record",
  "record-admission": "Record target admission",
  "record-authority-decision": "Record authority decision",
  "resolve-gate": "Resolve blocking gate",
  "retry-application": "Retry target application",
  "review-deferred-transition": "Review deferred transition",
  "review-rejection": "Review target rejection",
  "start-application": "Start target application",
  "start-validation": "Start validation",
} as const satisfies Record<LifecycleTransitionNextActionCode, string>;

const ownerLabels: Record<string, string> = {
  "delivery-ingress-adapter": "Delivery ingress",
  "delivery-ingress-policy": "Delivery ingress",
  "delivery-intake-consume": "Delivery Intake",
  "operator-orchestration-service": "Orchestration",
  proposal: "Proposal",
  "prototype-ingress-adapter": "Prototype ingress",
  "prototype-ingress-policy": "Prototype ingress",
  prototype: "Prototype",
  "security-architecture": "Security Architecture",
  "workspace-governance-control-fabric": "Validation authority",
};

const artifactLabels: Record<
  LifecycleTransitionArtifact["artifactKind"],
  string
> = {
  "application-failed": "Application failed",
  "application-started": "Application started",
  "authority-decision-recorded": "Authority decision recorded",
  "gate-blocked": "Gate blocked",
  "source-correction-returned": "Source correction returned",
  "source-packet-prepared": "Source packet prepared",
  "target-admission-recorded": "Target admission recorded",
  "target-application-recorded": "Target application recorded",
  "transition-cancelled": "Transition cancelled",
  "transition-deferred": "Transition deferred",
  "transition-superseded": "Transition superseded",
  "validation-completed": "Validation completed",
  "validation-started": "Validation started",
};

const activeStates = new Set<LifecycleTransitionState>([
  "applying",
  "authorized",
  "awaiting-admission",
  "prepared",
  "validating",
]);

const attentionStates = new Set<LifecycleTransitionState>([
  "awaiting-authority",
  "blocked",
  "deferred",
  "failed",
  "rejected",
  "returned",
]);

const closedStates = new Set<LifecycleTransitionState>([
  "cancelled",
  "superseded",
]);

export function buildLifecycleTransitionRouteOverviews(
  transitions: readonly LifecycleTransitionProjection[],
): LifecycleTransitionRouteOverview[] {
  return routeOrder.map((routeId) => {
    const route = LIFECYCLE_TRANSITION_ROUTES[routeId];
    const items = transitions
      .filter((transition) => transition.route.routeId === routeId)
      .map(buildLifecycleTransitionOverviewItem)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    const appliedCount = countStates(items, new Set(["applied"]));
    const activeCount = countStates(items, activeStates);
    const attentionCount = countStates(items, attentionStates);
    const closedCount = countStates(items, closedStates);
    const nextOwnerCount = items.filter(
      (item) => item.nextAction !== null,
    ).length;
    const tone = routeOverviewTone(items);

    return {
      activeCount,
      appliedCount,
      attentionCount,
      closedCount,
      description: routeDescriptions[routeId],
      items,
      nextOwnerCount,
      routeId,
      sourceLabel: domainLabel(route.sourceDomain),
      statusLabel: routeStatusLabel({
        appliedCount,
        closedCount,
        tone,
        totalCount: items.length,
      }),
      summaryLabel: routeSummaryLabel({
        activeCount,
        appliedCount,
        attentionCount,
        closedCount,
        totalCount: items.length,
      }),
      targetLabel: domainLabel(route.target.domain),
      tone,
      totalCount: items.length,
    };
  });
}

export function buildLifecycleTransitionOverviewItem(
  transition: LifecycleTransitionProjection,
): LifecycleTransitionOverviewItem {
  const targetRecordRef =
    transition.application.targetRecordRef ??
    transition.admission.targetRecordRef;

  return {
    admissionTargetRecordRef: transition.admission.targetRecordRef,
    applicationRunRef: transition.application.runRef,
    attentionDetail: transitionAttentionDetail(transition),
    history: transition.history
      .map(buildLifecycleTransitionHistoryItem)
      .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt)),
    nextAction: transition.nextAction
      ? {
          action: transition.nextAction.action,
          actionLabel: nextActionLabels[transition.nextAction.action],
          ownerLabel: ownerLabel(transition.nextAction.ownerRef),
          ownerRef: transition.nextAction.ownerRef,
          reviewAt: transition.nextAction.reviewAt,
        }
      : null,
    posture: [
      {
        label: "Validation",
        stateLabel: projectionStateLabel(transition.validation.state),
        tone: validationTone(transition.validation.state),
      },
      {
        label: "Admission",
        stateLabel: projectionStateLabel(transition.admission.state),
        tone: admissionTone(transition.admission.state),
      },
      {
        label: "Application",
        stateLabel: projectionStateLabel(transition.application.state),
        tone: applicationTone(transition.application.state),
      },
    ],
    reasonDetail: transition.reason.detail,
    routeId: transition.route.routeId,
    sourceDomain: transition.source.domain,
    sourceRecordId: transition.source.recordId,
    sourceVersion: transition.source.sourceVersion,
    state: transition.state,
    stateLabel: stateLabels[transition.state],
    targetDomain: transition.target.domain,
    targetHomeRef: transition.target.homeRef,
    targetRecordRef,
    tone: transitionStateTone(transition.state),
    transitionId: transition.transitionId,
    updatedAt: transition.updatedAt,
  };
}

export function lifecycleTransitionOwnerLabel(ownerRef: string): string {
  return ownerLabel(ownerRef);
}

function buildLifecycleTransitionHistoryItem(
  artifact: LifecycleTransitionArtifact,
): LifecycleTransitionHistoryItem {
  return {
    artifactId: artifact.artifactId,
    evidenceRef: artifactEvidenceRef(artifact),
    label: artifactLabels[artifact.artifactKind],
    ownerLabel: ownerLabel(artifact.authority.ownerRef),
    recordedAt: artifact.recordedAt,
    tone: artifactTone(artifact),
  };
}

function artifactEvidenceRef(
  artifact: LifecycleTransitionArtifact,
): string | null {
  switch (artifact.artifactKind) {
    case "application-failed":
    case "application-started":
      return artifact.runRef;
    case "authority-decision-recorded":
    case "source-correction-returned":
    case "target-admission-recorded":
    case "target-application-recorded":
    case "transition-cancelled":
    case "transition-superseded":
      return artifact.receiptRef;
    case "gate-blocked":
      return artifact.gate.evidenceRef;
    case "source-packet-prepared":
      return artifact.packet.packetRef;
    case "transition-deferred":
      return null;
    case "validation-completed":
      return artifact.receiptRef;
    case "validation-started":
      return artifact.validationRunRef;
  }
}

function artifactTone(
  artifact: LifecycleTransitionArtifact,
): LifecycleTransitionOverviewTone {
  switch (artifact.artifactKind) {
    case "application-failed":
      return "danger";
    case "gate-blocked":
    case "source-correction-returned":
    case "transition-deferred":
      return "warn";
    case "target-application-recorded":
      return "ok";
    case "transition-cancelled":
    case "transition-superseded":
      return "muted";
    case "target-admission-recorded":
      return artifact.result === "admitted" ? "ok" : "danger";
    case "validation-completed":
      return artifact.outcome === "passed"
        ? "ok"
        : artifact.outcome === "blocked"
          ? "danger"
          : "warn";
    case "application-started":
    case "authority-decision-recorded":
    case "source-packet-prepared":
    case "validation-started":
      return "info";
  }
}

function transitionAttentionDetail(
  transition: LifecycleTransitionProjection,
): string | null {
  return (
    transition.correction?.requiredFix ??
    transition.blockedGate?.requiredFix ??
    transition.application.failureDetail ??
    transition.rejection?.reasonDetail ??
    transition.deferred?.justification ??
    null
  );
}

function routeOverviewTone(
  items: readonly LifecycleTransitionOverviewItem[],
): LifecycleTransitionOverviewTone {
  if (items.some((item) => item.tone === "danger")) {
    return "danger";
  }
  if (items.some((item) => item.tone === "warn")) {
    return "warn";
  }
  if (items.some((item) => item.tone === "info")) {
    return "info";
  }
  if (
    items.length > 0 &&
    items.every(
      (item) =>
        item.state === "applied" ||
        item.state === "cancelled" ||
        item.state === "superseded",
    ) &&
    items.some((item) => item.state === "applied")
  ) {
    return "ok";
  }
  return "muted";
}

function routeStatusLabel(
  {
    appliedCount,
    closedCount,
    tone,
    totalCount,
  }: {
    appliedCount: number;
    closedCount: number;
    tone: LifecycleTransitionOverviewTone;
    totalCount: number;
  },
): string {
  if (totalCount === 0) {
    return "No records";
  }

  switch (tone) {
    case "danger":
      return "Failure";
    case "warn":
      return "Action needed";
    case "info":
      return "In progress";
    case "ok":
      return closedCount > 0 && appliedCount > 0 ? "Settled" : "Applied";
    case "muted":
      return "Closed";
  }
}

function routeSummaryLabel({
  activeCount,
  appliedCount,
  attentionCount,
  closedCount,
  totalCount,
}: {
  activeCount: number;
  appliedCount: number;
  attentionCount: number;
  closedCount: number;
  totalCount: number;
}): string {
  if (totalCount === 0) {
    return "No transition records";
  }

  const parts = [
    appliedCount > 0 ? `${appliedCount} applied` : null,
    activeCount > 0 ? `${activeCount} active` : null,
    attentionCount > 0 ? `${attentionCount} attention` : null,
    closedCount > 0 ? `${closedCount} closed` : null,
  ].filter((part): part is string => part !== null);

  return parts.join(" · ");
}

function countStates(
  items: readonly LifecycleTransitionOverviewItem[],
  states: ReadonlySet<LifecycleTransitionState>,
): number {
  return items.filter((item) => states.has(item.state)).length;
}

function transitionStateTone(
  state: LifecycleTransitionState,
): LifecycleTransitionOverviewTone {
  switch (state) {
    case "failed":
    case "rejected":
      return "danger";
    case "awaiting-authority":
    case "blocked":
    case "deferred":
    case "returned":
      return "warn";
    case "applied":
      return "ok";
    case "cancelled":
    case "superseded":
      return "muted";
    case "applying":
    case "authorized":
    case "awaiting-admission":
    case "prepared":
    case "validating":
      return "info";
  }
}

function projectionStateLabel(state: string): string {
  return state
    .split("-")
    .map((part, index) =>
      index === 0 ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part,
    )
    .join(" ");
}

function validationTone(
  state: LifecycleTransitionProjection["validation"]["state"],
): LifecycleTransitionOverviewTone {
  switch (state) {
    case "passed":
      return "ok";
    case "blocked":
      return "danger";
    case "returned":
      return "warn";
    case "running":
      return "info";
    case "not-started":
      return "muted";
  }
}

function admissionTone(
  state: LifecycleTransitionProjection["admission"]["state"],
): LifecycleTransitionOverviewTone {
  switch (state) {
    case "admitted":
      return "ok";
    case "rejected":
      return "danger";
    case "not-started":
      return "muted";
  }
}

function applicationTone(
  state: LifecycleTransitionProjection["application"]["state"],
): LifecycleTransitionOverviewTone {
  switch (state) {
    case "applied":
      return "ok";
    case "failed":
      return "danger";
    case "running":
      return "info";
    case "not-started":
      return "muted";
  }
}

function domainLabel(domain: LifecycleTransitionDomain): string {
  switch (domain) {
    case "delivery":
      return "Delivery";
    case "proposal":
      return "Proposal";
    case "prototype":
      return "Prototype";
  }
}

function ownerLabel(ownerRef: string): string {
  return ownerLabels[ownerRef] ?? ownerRef;
}
