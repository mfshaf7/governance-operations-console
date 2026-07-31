import type {
  WorkspaceEntrantKind,
  WorkspaceValidationBehavior,
} from "./entrant.ts";

export type WorkspaceRepositoryActiveValue = {
  allowedAuthoritativeRefs: string[];
  lifecycle: "active";
  mustNotOwn: string[];
  owns: string[];
  repoClass: string;
  requiresSecurityBindings: boolean;
  securityReviewSubject?: boolean;
  validationBehavior: WorkspaceValidationBehavior;
};

export type WorkspaceProductActiveValue = {
  governedProdPromotion: boolean;
  highestRealEndpoint: string;
  lifecycle: "fully-governed" | "platform-integrated";
  platformOwner: string;
  runtimeOwner: string;
  securityOwner: string;
  sourceOwners: string[];
  stageSupported: boolean;
  validationBehavior: WorkspaceValidationBehavior;
};

export type WorkspaceComponentActiveValue = {
  componentClass: string;
  interfaceContract?: {
    path: string;
    validationCommand: string;
  };
  lifecycle: "active";
  ownerRepo: string;
  product: string | null;
  securityOwner: string;
  validationBehavior: WorkspaceValidationBehavior;
};

export type WorkspaceActiveInventoryRecord =
  | {
      id: string;
      kind: "component";
      value: WorkspaceComponentActiveValue;
    }
  | {
      id: string;
      kind: "product";
      value: WorkspaceProductActiveValue;
    }
  | {
      id: string;
      kind: "repository";
      value: WorkspaceRepositoryActiveValue;
    };

export type WorkspaceActiveInventoryDependencies = {
  activeComponentIds: string[];
  activeProductIds: string[];
  activeRepositoryIds: string[];
};

export type WorkspaceEntrantPromotionCommand = {
  activeRecord: WorkspaceActiveInventoryRecord;
  activeRecordDigest: string;
  approvalRefs: string[];
  correlationRef: string;
  decidedAt: string;
  expectedActiveInventoryVersion: string;
  expectedIntakeRegisterVersion: string;
  idempotencyKey: string;
  intakeEntryRef: string;
  intakeEntryVersion: string;
  operatorRef: string;
  requestId: string;
};

export type WorkspacePromotionReceipt = {
  activeInventoryVersion: string;
  activeRecordRef: string;
  correlationRef: string;
  definitionId: "workspace.entrant.promote";
  definitionVersion: 1;
  idempotencyKey: string;
  intakeEntryRef: string;
  intakeEntryVersion: string;
  intakeRegisterVersion: string;
  operatorRef: string;
  receiptRef: string;
  recordedAt: string;
  requestId: string;
  result: "promoted";
};

export function workspaceActiveInventoryContract(
  kind: WorkspaceEntrantKind,
): "components.yaml" | "products.yaml" | "repos.yaml" {
  switch (kind) {
    case "component":
      return "components.yaml";
    case "product":
      return "products.yaml";
    case "repository":
      return "repos.yaml";
  }
}
