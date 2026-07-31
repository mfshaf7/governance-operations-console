import type { WorkspaceEntrantCandidate } from "../../../operation-contracts/workspace-governance/entrant.ts";

export type DeliveryCloseoutReadinessSnapshot = {
  blockedItemRefs: string[];
  deliveryPackageId: string;
  evidenceRefs: string[];
  openDescendantCount: number;
  readinessRef: string;
  readyForClosing: boolean;
  readyForCloseout: boolean;
  reasons: string[];
  sourceVersion: string;
};

export type DeliveryCloseoutEvidence = {
  changedSurfaces: string;
  completionNote?: string;
  completionSummary: string;
  demoEvidence: string;
  demoOutcome: string;
  demoSummary: string;
  inspectActionItems: string;
  inspectSummary: string;
  residualFollowUp?: string;
  testResultEvidence: string;
  validationEvidence: string;
};

export type DeliveryExistingProductChangeIntent = {
  activeProduct: {
    productId: string;
    registryRef: string;
    registryVersion: string;
  };
  changeSummary: string;
  kind: "existing-product-change";
  productOwnerRef: string;
};

export type DeliveryCloseoutImpactIntent =
  | { kind: "none" }
  | {
      candidate: WorkspaceEntrantCandidate;
      kind: "workspace-entrant";
    }
  | DeliveryExistingProductChangeIntent;

export type DeliveryCloseoutCommand = {
  actorRef: string;
  correlationId: string;
  evidence: DeliveryCloseoutEvidence;
  impact: DeliveryCloseoutImpactIntent;
  readiness: DeliveryCloseoutReadinessSnapshot;
};

export type DeliveryExistingProductChange = {
  activeProduct: DeliveryExistingProductChangeIntent["activeProduct"];
  changeSummary: string;
  deliveryOutcomeRef: string;
  kind: "existing-product-change";
  productOwnerRef: string;
};

export type DeliveryOutcomeImpact =
  | { kind: "none" }
  | {
      candidate: WorkspaceEntrantCandidate;
      kind: "workspace-entrant";
    }
  | DeliveryExistingProductChange;

export type DeliveryOutcomeRecord = {
  actorRef: string;
  closedAt: string;
  closeoutReceiptRef: string;
  correlationId: string;
  deliveryPackageId: string;
  deliveryRecordRef: string;
  evidenceRefs: string[];
  historyRef: string;
  impact: DeliveryOutcomeImpact;
  outcomeRef: string;
  schemaVersion: 1;
  sourcePackageVersion: string;
  sourceRefinementReceiptRef: string;
};

export type DeliveryCloseoutReceipt = {
  commandName: "delivery.closeout.apply";
  outcome: DeliveryOutcomeRecord;
  resultState: "recorded";
  schemaVersion: 1;
  status: "done";
};
