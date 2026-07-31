import type {
  WorkspaceEntrantCandidate,
  WorkspaceValidationBehavior,
} from "./entrant.ts";

export type WorkspaceIntakeDecision =
  | "admitted"
  | "out-of-scope"
  | "proposed";

export type WorkspaceIntakeAiSuggestion = {
  acceptanceState: "accepted" | "overridden";
  acceptedAt: string;
  acceptedBy: string;
  auditRef: string;
  callerId: string;
  confidence: "high" | "low" | "medium";
  decisionId: string;
  generatedAt: string;
  invocationPath: string;
  operatorDecision: WorkspaceIntakeDecision;
  overrideReason?: string;
  policyStatus: string;
  profileId: string;
  suggestedDecision: WorkspaceIntakeDecision;
};

type WorkspaceClassificationCommandBase = {
  candidate: WorkspaceEntrantCandidate;
  decidedAt: string;
  decision: WorkspaceIntakeDecision;
  expectedIntakeRegisterVersion: string;
  idempotencyKey: string;
  operatorRef: string;
  rationale: string;
  requestId: string;
};

export type WorkspaceEntrantClassificationCommand =
  WorkspaceClassificationCommandBase &
    (
      | {
          aiSuggestion?: never;
          decisionSource: "operator";
        }
      | {
          aiSuggestion: WorkspaceIntakeAiSuggestion;
          decisionSource: "ai-suggested";
        }
    );

export type WorkspaceRepositoryIntakeValue = {
  aiSuggestion?: WorkspaceIntakeAiSuggestion;
  decisionSource: "ai-suggested" | "operator";
  notes: string;
  repoClass: string | null;
  requiresSecurityBindings: boolean | null;
  securityOwner: string | null;
  status: WorkspaceIntakeDecision;
  validationBehavior?: WorkspaceValidationBehavior;
};

export type WorkspaceProductIntakeValue = {
  aiSuggestion?: WorkspaceIntakeAiSuggestion;
  decisionSource: "ai-suggested" | "operator";
  intendedEndpoint: string | null;
  notes: string;
  platformOwner: string | null;
  runtimeOwner: string | null;
  securityOwner: string | null;
  sourceOwners: string[];
  status: WorkspaceIntakeDecision;
  validationBehavior?: WorkspaceValidationBehavior;
};

export type WorkspaceComponentIntakeValue = {
  aiSuggestion?: WorkspaceIntakeAiSuggestion;
  componentClass: string | null;
  decisionSource: "ai-suggested" | "operator";
  notes: string;
  ownerRepo: string | null;
  product: string | null;
  securityOwner: string | null;
  status: WorkspaceIntakeDecision;
  validationBehavior?: WorkspaceValidationBehavior;
};

export type WorkspaceIntakeContractRecord =
  | {
      id: string;
      kind: "component";
      value: WorkspaceComponentIntakeValue;
    }
  | {
      id: string;
      kind: "product";
      value: WorkspaceProductIntakeValue;
    }
  | {
      id: string;
      kind: "repository";
      value: WorkspaceRepositoryIntakeValue;
    };

export type WorkspaceIntakeEntry = {
  candidate: WorkspaceEntrantCandidate;
  contractRecord: WorkspaceIntakeContractRecord;
  entryRef: string;
  operatorRef: string;
  version: string;
};

export type WorkspaceClassificationReceipt = {
  candidateRef: string;
  canonicalIntakeEntryRef: string;
  correlationRef: string;
  decision: WorkspaceIntakeDecision;
  definitionId: "workspace.entrant.classify";
  definitionVersion: 1;
  idempotencyKey: string;
  intakeEntryVersion: string;
  intakeRegisterVersion: string;
  operatorRef: string;
  priorDecision: WorkspaceIntakeDecision | null;
  receiptRef: string;
  recordedAt: string;
  requestId: string;
};
