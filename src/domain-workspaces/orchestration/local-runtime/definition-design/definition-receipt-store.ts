import { createLocalOperationProjectionStore } from "../../../operation-runtime/local-operation-projection-store.ts";
import { createOperationIdempotencyKey } from "../../../operation-runtime/operation-runtime-invariants.ts";
import { orchestrationDefinitionDesignReadiness } from "../../work-model/definition-design/definition-design-model.ts";
import type {
  OrchestrationDefinitionDesignDraft,
  OrchestrationDefinitionDesignReceipt,
  OrchestrationImplementationRequestReceipt,
  OrchestrationQualificationReceipt,
} from "../../work-model/definition-design/definition-design-types.ts";

type DefinitionReceiptState = {
  receipts: OrchestrationDefinitionDesignReceipt[];
};

const definitionReceiptStore = createLocalOperationProjectionStore<
  DefinitionReceiptState,
  DefinitionReceiptState
>({
  initialState: {
    receipts: [],
  } satisfies DefinitionReceiptState,
  projectSnapshot: (state) => ({
    receipts: [...state.receipts],
  }),
  runtimeSource: {
    authority: "prototype-local",
    mode: "local",
    sourceOwner: "orchestration.definition-design",
  },
});

export class OrchestrationDefinitionReceiptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrchestrationDefinitionReceiptError";
  }
}

export function recordOrchestrationQualification({
  draft,
  recordedAt,
}: {
  draft: OrchestrationDefinitionDesignDraft;
  recordedAt: string;
}): OrchestrationQualificationReceipt {
  const readiness = orchestrationDefinitionDesignReadiness(draft);
  const classification = draft.qualification.classification;

  if (!readiness.canRecordQualification || !classification) {
    throw new OrchestrationDefinitionReceiptError(
      readiness.findings.map((finding) => finding.detail).join(" "),
    );
  }

  const idempotencyKey = definitionReceiptIdempotencyKey(
    "orchestration.qualification.record",
    draft,
    {
      classification,
      rationale: draft.qualification.rationale,
      reevaluationCondition: draft.qualification.reevaluationCondition,
    },
  );
  const receipt: OrchestrationQualificationReceipt = {
    classification,
    draftId: draft.draftId,
    idempotencyKey,
    receiptId: receiptId(idempotencyKey),
    recordedAt,
    resultState: "recorded",
    schemaVersion: 1,
  };

  return recordDefinitionReceipt(receipt);
}

export function recordOrchestrationImplementationRequest({
  draft,
  recordedAt,
}: {
  draft: OrchestrationDefinitionDesignDraft;
  recordedAt: string;
}): OrchestrationImplementationRequestReceipt {
  const readiness = orchestrationDefinitionDesignReadiness(draft);
  const routeTarget = draft.requestRoute.target;

  if (!readiness.canRequestImplementation || routeTarget === null) {
    throw new OrchestrationDefinitionReceiptError(
      readiness.findings.map((finding) => finding.detail).join(" "),
    );
  }

  const idempotencyKey = definitionReceiptIdempotencyKey(
    "orchestration.definition.request-implementation",
    draft,
    {
      deliveryVersioning: draft.deliveryVersioning,
      evidenceSecurity: draft.evidenceSecurity,
      executionPlan: draft.executionPlan,
      failureControls: draft.failureControls,
      identityOwnership: draft.identityOwnership,
      requestRoute: draft.requestRoute,
      triggerResult: draft.triggerResult,
    },
  );
  const receipt: OrchestrationImplementationRequestReceipt = {
    definitionId: draft.identityOwnership.definitionId,
    definitionVersion: draft.identityOwnership.version,
    draftId: draft.draftId,
    idempotencyKey,
    receiptId: receiptId(idempotencyKey),
    recordedAt,
    resultState: "recorded",
    routeTarget,
    schemaVersion: 1,
    targetRef: draft.requestRoute.targetRef,
  };

  return recordDefinitionReceipt(receipt);
}

export function listOrchestrationDefinitionReceipts(draftId?: string) {
  const receipts = definitionReceiptStore.getSnapshot().receipts;
  return draftId
    ? receipts.filter((receipt) => receipt.draftId === draftId)
    : receipts;
}

export function getOrchestrationDefinitionReceiptSnapshot() {
  return definitionReceiptStore.getSnapshot();
}

function recordDefinitionReceipt<
  TReceipt extends OrchestrationDefinitionDesignReceipt,
>(receipt: TReceipt): TReceipt {
  const existing = definitionReceiptStore
    .getState()
    .receipts.find(
      (candidate) => candidate.idempotencyKey === receipt.idempotencyKey,
    );

  if (existing) {
    return existing as TReceipt;
  }

  definitionReceiptStore.updateState((state) => ({
    receipts: [...state.receipts, receipt],
  }));

  return receipt;
}

function definitionReceiptIdempotencyKey(
  commandName: string,
  draft: OrchestrationDefinitionDesignDraft,
  command: unknown,
) {
  return createOperationIdempotencyKey({
    command,
    commandName,
    preconditions: {
      dependencies: [],
      primary: {
        recordId: draft.draftId,
        sourceOwner: "orchestration.definition-design",
        version: draft.savedAt,
      },
    },
    recordId: draft.draftId,
  });
}

function receiptId(idempotencyKey: string) {
  return `orchestration-receipt-${idempotencyKey.replace("operation-", "")}`;
}
