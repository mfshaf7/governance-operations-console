import {
  operationWorkbenchPathLabels,
  type OperationWorkbenchPathLabel,
} from "../../operation-workbench/operation-workbench-domain-registry.ts";
import type {
  LifecycleTransitionDomain,
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
      ownerRef: string;
      surfaceLabel: OperationWorkbenchPathLabel;
    }>;

export function resolveLifecycleTransitionWorkbenchRoute({
  applicationRunRef,
  nextOwnerRef,
  sourceDomain,
  sourceRecordId,
  targetDomain,
  targetRecordRef,
  transitionId,
}: {
  applicationRunRef: string | null;
  nextOwnerRef: string | null;
  sourceDomain: LifecycleTransitionDomain;
  sourceRecordId: string;
  targetDomain: LifecycleTransitionDomain;
  targetRecordRef: string | null;
  transitionId: string;
}): LifecycleTransitionWorkbenchRoute {
  if (!nextOwnerRef) {
    const surfaceLabel = domainSurfaceLabel(targetDomain);
    return {
      buttonLabel: `Open ${workbenchDisplayName(surfaceLabel)}`,
      contextRef: targetRecordRef ?? transitionId,
      kind: "workbench",
      ownerRef: targetDomain,
      surfaceLabel,
    };
  }

  const surfaceLabel = ownerSurfaceLabel(nextOwnerRef);

  if (!surfaceLabel) {
    return {
      kind: "unavailable",
      message: unavailableOwnerMessage(nextOwnerRef),
      ownerRef: nextOwnerRef,
    };
  }

  return {
    buttonLabel: `Open ${workbenchDisplayName(surfaceLabel)}`,
    contextRef: ownerContextRef({
      applicationRunRef,
      nextOwnerRef,
      sourceDomain,
      sourceRecordId,
      targetRecordRef,
      transitionId,
    }),
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

function ownerContextRef({
  applicationRunRef,
  nextOwnerRef,
  sourceDomain,
  sourceRecordId,
  targetRecordRef,
  transitionId,
}: {
  applicationRunRef: string | null;
  nextOwnerRef: string;
  sourceDomain: LifecycleTransitionDomain;
  sourceRecordId: string;
  targetRecordRef: string | null;
  transitionId: string;
}): string {
  if (nextOwnerRef === sourceDomain) {
    return sourceRecordId;
  }
  if (nextOwnerRef === "operator-orchestration-service") {
    return applicationRunRef ?? transitionId;
  }
  return targetRecordRef ?? transitionId;
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
