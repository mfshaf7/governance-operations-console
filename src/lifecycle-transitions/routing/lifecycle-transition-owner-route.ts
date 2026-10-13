import {
  operationWorkbenchPathLabels,
  type OperationWorkbenchPathLabel,
} from "../../operation-workbench/operation-workbench-domain-registry.ts";
import type {
  ConsoleSurfaceEntryIntent,
} from "../../console-architecture.ts";
import type {
  LifecycleTransitionDomain,
  LifecycleTransitionNextAction,
  LifecycleTransitionState,
} from "../model/lifecycle-transition-types.ts";

export type LifecycleTransitionWorkbenchRoute =
  | Readonly<{
      kind: "unavailable";
      message: string;
      ownerRef: string;
    }>
  | Readonly<{
      kind: "workbench";
      buttonLabel: string;
      contextRef: string;
      entryIntent: ConsoleSurfaceEntryIntent;
      ownerRef: string;
      surfaceLabel: OperationWorkbenchPathLabel;
    }>;

export function resolveLifecycleTransitionWorkbenchRoute({
  applicationRunRef,
  nextAction,
  sourceDomain,
  sourceRecordId,
  state,
  targetDomain,
  targetRecordRef,
  transitionId,
}: {
  applicationRunRef: string | null;
  nextAction: LifecycleTransitionNextAction | null;
  sourceDomain: LifecycleTransitionDomain;
  sourceRecordId: string;
  state: LifecycleTransitionState;
  targetDomain: LifecycleTransitionDomain;
  targetRecordRef: string | null;
  transitionId: string;
}): LifecycleTransitionWorkbenchRoute {
  if (!nextAction) {
    if (state !== "applied" || !targetRecordRef) {
      return {
        kind: "unavailable",
        message: state === "applied"
          ? "The applied transition has no canonical target identity. Refresh owner truth before continuing."
          : `This transition is ${state}. No owner action is available.`,
        ownerRef: targetDomain,
      };
    }
    const surfaceLabel = domainSurfaceLabel(targetDomain);
    const targetContext = appliedTargetContext({
      sourceRecordId,
      targetDomain,
      targetRecordRef,
    });
    return {
      buttonLabel: `Open ${workbenchDisplayName(surfaceLabel)}`,
      contextRef: targetContext.subjectRef,
      entryIntent: {
        mode: "inspect",
        requiredMoveRef: targetContext.requiredMoveRef,
        subjectRef: targetContext.subjectRef,
      },
      kind: "workbench",
      ownerRef: targetDomain,
      surfaceLabel,
    };
  }

  const nextOwnerRef = nextAction.ownerRef;
  const surfaceLabel = ownerSurfaceLabel(nextOwnerRef);

  if (!surfaceLabel) {
    return {
      kind: "unavailable",
      message: unavailableOwnerMessage(nextOwnerRef),
      ownerRef: nextOwnerRef,
    };
  }

  const ownerContext = nextOwnerContext({
    applicationRunRef,
    nextOwnerRef,
    sourceDomain,
    sourceRecordId,
    targetDomain,
    targetRecordRef,
    transitionId,
  });
  return {
    buttonLabel: `Open ${workbenchDisplayName(surfaceLabel)}`,
    contextRef: ownerContext.subjectRef,
    entryIntent: {
      mode: lifecycleTransitionEntryMode(nextAction.action),
      requiredMoveRef: ownerContext.requiredMoveRef,
      subjectRef: ownerContext.subjectRef,
    },
    kind: "workbench",
    ownerRef: nextOwnerRef,
    surfaceLabel,
  };
}

function ownerSurfaceLabel(
  ownerRef: string,
): OperationWorkbenchPathLabel | null {
  if (ownerRef === "proposal") {
    return operationWorkbenchPathLabels.proposal;
  }
  if (
    ownerRef === "prototype" ||
    ownerRef === "prototype-ingress-adapter" ||
    ownerRef === "prototype-ingress-policy"
  ) {
    return operationWorkbenchPathLabels.prototype;
  }
  if (
    ownerRef === "delivery-ingress-adapter" ||
    ownerRef === "delivery-ingress-policy"
  ) {
    return operationWorkbenchPathLabels.delivery;
  }
  if (ownerRef === "operator-orchestration-service") {
    return operationWorkbenchPathLabels.orchestration;
  }
  return null;
}

function domainSurfaceLabel(
  domain: LifecycleTransitionDomain,
): OperationWorkbenchPathLabel {
  switch (domain) {
    case "delivery":
      return operationWorkbenchPathLabels.delivery;
    case "proposal":
      return operationWorkbenchPathLabels.proposal;
    case "prototype":
      return operationWorkbenchPathLabels.prototype;
  }
}

function nextOwnerContext({
  applicationRunRef,
  nextOwnerRef,
  sourceDomain,
  sourceRecordId,
  targetDomain,
  targetRecordRef,
  transitionId,
}: {
  applicationRunRef: string | null;
  nextOwnerRef: string;
  sourceDomain: LifecycleTransitionDomain;
  sourceRecordId: string;
  targetDomain: LifecycleTransitionDomain;
  targetRecordRef: string | null;
  transitionId: string;
}): Readonly<{ requiredMoveRef: string; subjectRef: string }> {
  if (nextOwnerRef === sourceDomain) {
    return {
      requiredMoveRef: `${sourceDomain}.lifecycle-transition.resume`,
      subjectRef: domainRecordId(sourceDomain, sourceRecordId),
    };
  }
  if (nextOwnerRef === "operator-orchestration-service") {
    return {
      requiredMoveRef: "orchestration.runs.lifecycle-transition",
      subjectRef: applicationRunRef ?? transitionId,
    };
  }
  if (
    nextOwnerRef === "delivery-ingress-adapter" ||
    nextOwnerRef === "delivery-ingress-policy"
  ) {
    return {
      requiredMoveRef: "delivery.intake.lifecycle-transition",
      subjectRef: sourceRecordId,
    };
  }
  if (
    nextOwnerRef === "prototype-ingress-adapter" ||
    nextOwnerRef === "prototype-ingress-policy"
  ) {
    return {
      requiredMoveRef: "prototype.lifecycle-transition.ingress",
      subjectRef: targetRecordRef ?? sourceRecordId,
    };
  }
  return {
    requiredMoveRef: `${targetDomain}.lifecycle-transition.resume`,
    subjectRef: targetRecordRef ?? transitionId,
  };
}

function appliedTargetContext({
  sourceRecordId,
  targetDomain,
  targetRecordRef,
}: {
  sourceRecordId: string;
  targetDomain: LifecycleTransitionDomain;
  targetRecordRef: string;
}): Readonly<{ requiredMoveRef: string; subjectRef: string }> {
  if (targetDomain === "delivery") {
    const workPackageId = targetRecordRef?.match(
      /^openproject:\/\/work_packages\/([1-9][0-9]*)$/,
    )?.[1];
    return workPackageId
      ? {
          requiredMoveRef: "delivery.execution-board.lifecycle-transition",
          subjectRef: `delivery-${workPackageId}`,
        }
      : {
          requiredMoveRef: "delivery.intake.lifecycle-transition",
          subjectRef: sourceRecordId,
        };
  }

  return {
    requiredMoveRef: `${targetDomain}.lifecycle-transition.inspect`,
    subjectRef: domainRecordId(targetDomain, targetRecordRef),
  };
}

function domainRecordId(
  domain: LifecycleTransitionDomain,
  recordRef: string,
): string {
  const openProjectId = recordRef.match(
    /^openproject:\/\/work_packages\/([1-9][0-9]*)$/,
  )?.[1];
  if (domain === "proposal" && openProjectId) {
    return `idea-${openProjectId}`;
  }
  const prefix = `${domain}://`;
  return recordRef.startsWith(prefix) ? recordRef.slice(prefix.length) : recordRef;
}

function lifecycleTransitionEntryMode(
  action: LifecycleTransitionNextAction["action"],
): ConsoleSurfaceEntryIntent["mode"] {
  switch (action) {
    case "correct-source":
    case "resolve-gate":
    case "retry-application":
      return "resolve";
    case "review-deferred-transition":
    case "review-rejection":
      return "review";
    default:
      return "resume";
  }
}

function unavailableOwnerMessage(ownerRef: string): string {
  if (ownerRef === "security-architecture") {
    return "Security Architecture owns this decision. No console workspace is connected yet.";
  }
  if (ownerRef === "workspace-governance-control-fabric") {
    return "Validation owns this step. No operator action is available in this console.";
  }
  return `${ownerRef} owns the next step. No console workspace is connected yet.`;
}

function workbenchDisplayName(
  surfaceLabel: OperationWorkbenchPathLabel,
): string {
  switch (surfaceLabel) {
    case "DELIVERY":
      return "Delivery";
    case "MODEL":
      return "Model";
    case "ORCHESTRATION":
      return "Orchestration";
    case "PORTFOLIO":
      return "Portfolio";
    case "PROPOSAL":
      return "Proposal";
    case "PROTOTYPE":
      return "Prototype";
    case "REPOSITORY":
      return "Repository";
  }
}
