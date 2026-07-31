import type { DeliveryPackageSummary } from "../../domain/delivery-package.ts";
import { workspaceEntrantCandidateBlockers } from "../../../operation-contracts/workspace-governance/contract-model.ts";
import type { WorkspaceEntrantCandidate } from "../../../operation-contracts/workspace-governance/entrant.ts";
import type {
  DeliveryCloseoutCommand,
  DeliveryCloseoutImpactIntent,
  DeliveryCloseoutReceipt,
  DeliveryOutcomeImpact,
} from "./delivery-closeout-contracts.ts";

const closeoutEvidenceFields = [
  "changedSurfaces",
  "completionSummary",
  "demoEvidence",
  "demoOutcome",
  "demoSummary",
  "inspectActionItems",
  "inspectSummary",
  "testResultEvidence",
  "validationEvidence",
] as const;

export function deliveryCloseoutBlockers({
  closeout,
  deliveryPackage,
}: {
  closeout: DeliveryCloseoutCommand;
  deliveryPackage: DeliveryPackageSummary;
}): string[] {
  const blockers: string[] = [];
  const executionHandoff = deliveryPackage.execution_handoff;

  if (deliveryPackage.workflow_phase !== "execution") {
    blockers.push("Delivery closeout requires an execution-phase package.");
  }
  if (!executionHandoff) {
    blockers.push(
      "Delivery closeout requires an accepted Refinement-to-Execution handoff.",
    );
  }
  if (closeout.readiness.deliveryPackageId !== deliveryPackage.delivery_package_id) {
    blockers.push("Closeout readiness targets a different Delivery package.");
  }
  if (!closeout.readiness.readyForClosing) {
    blockers.push("The initiative is not ready to enter Closing.");
  }
  if (!closeout.readiness.readyForCloseout) {
    blockers.push("The initiative is not ready for final closeout.");
  }
  if (closeout.readiness.openDescendantCount !== 0) {
    blockers.push("Delivery closeout requires zero open descendants.");
  }
  if (closeout.readiness.blockedItemRefs.length > 0) {
    blockers.push("Delivery closeout cannot proceed with blocked work items.");
  }
  if (closeout.readiness.reasons.length > 0) {
    blockers.push(...closeout.readiness.reasons);
  }
  if (
    !present(closeout.actorRef) ||
    !present(closeout.correlationId) ||
    !present(closeout.readiness.readinessRef) ||
    !present(closeout.readiness.sourceVersion)
  ) {
    blockers.push(
      "Delivery closeout requires actor, correlation, readiness, and source-version truth.",
    );
  }
  if (
    closeout.readiness.evidenceRefs.length === 0 ||
    closeout.readiness.evidenceRefs.some((ref) => !present(ref))
  ) {
    blockers.push("Delivery closeout requires bounded readiness evidence.");
  }
  if (
    closeoutEvidenceFields.some(
      (field) => !present(closeout.evidence[field]),
    )
  ) {
    blockers.push("Delivery closeout evidence is incomplete.");
  }

  blockers.push(...deliveryCloseoutImpactBlockers(closeout.impact, closeout.correlationId));

  return [...new Set(blockers)];
}

export function createDeliveryCloseoutReceipt({
  closeout,
  closeoutReceiptRef,
  closedAt,
  deliveryPackage,
  sourcePackageVersion,
}: {
  closeout: DeliveryCloseoutCommand;
  closeoutReceiptRef: string;
  closedAt: string;
  deliveryPackage: DeliveryPackageSummary;
  sourcePackageVersion: string;
}): DeliveryCloseoutReceipt {
  const executionHandoff = deliveryPackage.execution_handoff;

  if (!executionHandoff) {
    throw new Error(
      "Delivery closeout receipt requires an Execution handoff projection.",
    );
  }

  const outcomeRef = `${closeoutReceiptRef}/outcome`;
  const historyRef =
    `prototype-local://delivery/history/${deliveryPackage.delivery_package_id}` +
    `/${receiptSlug(closeoutReceiptRef)}`;
  const evidenceRefs = uniqueRefs([
    ...executionHandoff.evidence_refs,
    ...closeout.readiness.evidenceRefs,
    closeout.readiness.readinessRef,
    closeoutReceiptRef,
  ]);

  return {
    commandName: "delivery.closeout.apply",
    outcome: {
      actorRef: closeout.actorRef,
      closedAt,
      closeoutReceiptRef,
      correlationId: closeout.correlationId,
      deliveryPackageId: deliveryPackage.delivery_package_id,
      deliveryRecordRef: deliveryPackage.source_ref,
      evidenceRefs,
      historyRef,
      impact: deliveryOutcomeImpact({
        closeoutReceiptRef,
        impact: closeout.impact,
        outcomeRef,
      }),
      outcomeRef,
      schemaVersion: 1,
      sourcePackageVersion,
      sourceRefinementReceiptRef:
        executionHandoff.source_refinement_receipt_id,
    },
    resultState: "recorded",
    schemaVersion: 1,
    status: "done",
  };
}

function deliveryCloseoutImpactBlockers(
  impact: DeliveryCloseoutImpactIntent,
  correlationId: string,
) {
  switch (impact.kind) {
    case "none":
      return [];
    case "workspace-entrant":
      return workspaceEntrantBlockers(impact.candidate, correlationId);
    case "existing-product-change": {
      const values = [
        impact.activeProduct.productId,
        impact.activeProduct.registryRef,
        impact.activeProduct.registryVersion,
        impact.changeSummary,
        impact.productOwnerRef,
      ];
      const expectedRegistryRef =
        `workspace-governance://products/${impact.activeProduct.productId}`;

      return values.some((value) => !present(value)) ||
        impact.activeProduct.registryRef !== expectedRegistryRef
        ? [
            "Existing-product change requires an active product id, matching registry ref and version, product owner, and change summary.",
          ]
        : [];
    }
    default:
      return ["Delivery closeout impact kind is unsupported."];
  }
}

function workspaceEntrantBlockers(
  candidate: WorkspaceEntrantCandidate,
  correlationId: string,
) {
  const blockers = workspaceEntrantCandidateBlockers(candidate);

  if (candidate.correlationRef !== correlationId) {
    blockers.push(
      "Workspace entrant impact correlation must match Delivery closeout.",
    );
  }

  return blockers;
}

function deliveryOutcomeImpact({
  closeoutReceiptRef,
  impact,
  outcomeRef,
}: {
  closeoutReceiptRef: string;
  impact: DeliveryCloseoutImpactIntent;
  outcomeRef: string;
}): DeliveryOutcomeImpact {
  switch (impact.kind) {
    case "none":
      return { kind: "none" };
    case "workspace-entrant":
      return {
        candidate: {
          ...structuredClone(impact.candidate),
          evidenceRefs: uniqueRefs([
            ...impact.candidate.evidenceRefs,
            closeoutReceiptRef,
            outcomeRef,
          ]),
        },
        kind: "workspace-entrant",
      };
    case "existing-product-change":
      return {
        activeProduct: { ...impact.activeProduct },
        changeSummary: impact.changeSummary,
        deliveryOutcomeRef: outcomeRef,
        kind: "existing-product-change",
        productOwnerRef: impact.productOwnerRef,
      };
  }
}

function uniqueRefs(refs: string[]) {
  return [...new Set(refs.filter(present))];
}

function present(value: string) {
  return value.trim().length > 0;
}

function receiptSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
