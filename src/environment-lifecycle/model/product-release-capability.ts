import {
  assertEnvironmentLifecycleNextMove,
  assertEnvironmentLifecycleSource,
  type EnvironmentLifecycleNextMove,
  type EnvironmentLifecycleSource,
} from "./environment-lifecycle-types.ts";

export type ProductReleaseMaturity =
  | "fully-governed"
  | "platform-integrated";

export type ProductReleaseStepPosture =
  | "complete"
  | "current"
  | "failed"
  | "pending";

export type ProductReleaseAction =
  | "change-runtime-lifecycle"
  | "record-prod-verification"
  | "record-readiness"
  | "record-release-candidate"
  | "record-stage-verification"
  | "request-prod-promotion";

export type ProductReleaseOperationField = Readonly<{
  description: string;
  id: string;
  kind: "select" | "text" | "textarea";
  label: string;
  options: readonly Readonly<{
    label: string;
    value: string;
  }>[];
  required: boolean;
}>;

export type ProductExecutionAdapter = Readonly<{
  available: boolean;
  ref: string | null;
  unavailableReason: string | null;
}>;

export type ProductReleaseOperationCapability = Readonly<{
  action: Exclude<ProductReleaseAction, "change-runtime-lifecycle">;
  adapter: ProductExecutionAdapter;
  description: string;
  fields: readonly ProductReleaseOperationField[];
  requiredCapability: string;
  workflowOwner: string;
}>;

export type ProductReleaseActionRequirement = Readonly<{
  allowedStateIds: readonly string[];
  blockedMove: EnvironmentLifecycleNextMove;
  kind: "runtime-lifecycle-state";
}>;

export type ProductReleaseStep = Readonly<{
  action: ProductReleaseAction | null;
  actionRequirement: ProductReleaseActionRequirement | null;
  canonicalStatus: string;
  id: string;
  label: string;
  posture: ProductReleaseStepPosture;
  sourceRef: string;
}>;

export type ProductReleaseStepActionAvailability = Readonly<{
  allowed: boolean;
  reason: string | null;
}>;

export type ProductRuntimeLifecycleStateCapability = Readonly<{
  description: string;
  id: string;
  label: string;
}>;

export type ProductRuntimeLifecycleIncidentRequirement =
  | "incident"
  | "incident-follow-up"
  | "none";

export type ProductRuntimeLifecycleVerificationEffect =
  | "inactive"
  | "pending"
  | "preserve";

export type ProductRuntimeLifecycleTransitionCapability = Readonly<{
  description: string;
  fromStateId: string;
  incidentRequirement: ProductRuntimeLifecycleIncidentRequirement;
  toStateId: string;
  verificationEffect: ProductRuntimeLifecycleVerificationEffect;
}>;

export type ProductRuntimeLifecycleCapability = Readonly<{
  adapter: ProductExecutionAdapter;
  currentState: string;
  requiredCapability: string;
  sourceRef: string;
  states: readonly ProductRuntimeLifecycleStateCapability[];
  transitions: readonly ProductRuntimeLifecycleTransitionCapability[];
  workflowOwner: string;
}>;

export type ProductReleaseCapability = Readonly<{
  highestRealEndpoint: string;
  maturity: ProductReleaseMaturity;
  nextMove: EnvironmentLifecycleNextMove | null;
  platformOwner: string;
  productId: string;
  productLabel: string;
  productionPromotionSupported: boolean;
  releaseOperations: readonly ProductReleaseOperationCapability[];
  releasePath: readonly ProductReleaseStep[];
  rollback: Readonly<{
    contractRef: string | null;
    supported: boolean;
  }>;
  runtimeLifecycle: ProductRuntimeLifecycleCapability | null;
  securityOwner: string;
  source: EnvironmentLifecycleSource;
  stageSupported: boolean;
  supportingEvidenceRefs: readonly string[];
  unavailableReason: string | null;
  operatorRoute: Readonly<{
    label: string;
    ownerRef: string;
    ref: string;
  }>;
}>;

export function productReleaseStepActionAvailability(
  product: ProductReleaseCapability,
  step: ProductReleaseStep,
): ProductReleaseStepActionAvailability {
  if (!step.action) {
    return {
      allowed: false,
      reason: "This release step does not declare an operator action.",
    };
  }

  if (step.posture !== "current" && step.posture !== "failed") {
    return {
      allowed: false,
      reason: "Only the current or failed release step is actionable.",
    };
  }

  const operation = product.releaseOperations.find(
    (candidate) => candidate.action === step.action,
  );
  if (!operation) {
    return {
      allowed: false,
      reason: "This release step has no declared execution operation.",
    };
  }

  if (!operation.adapter.available) {
    return {
      allowed: false,
      reason:
        operation.adapter.unavailableReason ??
        "The declared execution adapter is unavailable.",
    };
  }

  if (!step.actionRequirement) {
    return { allowed: true, reason: null };
  }

  const currentState = product.runtimeLifecycle?.currentState;
  if (
    currentState &&
    step.actionRequirement.allowedStateIds.includes(currentState)
  ) {
    return { allowed: true, reason: null };
  }

  return {
    allowed: false,
    reason: step.actionRequirement.blockedMove.reason,
  };
}

export function selectProductRuntimeLifecycleTransition(
  lifecycle: ProductRuntimeLifecycleCapability,
  targetStateId: string,
): ProductRuntimeLifecycleTransitionCapability | null {
  return (
    lifecycle.transitions.find(
      (transition) =>
        transition.fromStateId === lifecycle.currentState &&
        transition.toStateId === targetStateId,
    ) ?? null
  );
}

export function assertProductReleaseCapability(
  product: ProductReleaseCapability,
): void {
  assertEnvironmentLifecycleSource(product.source);
  assertEnvironmentLifecycleNextMove(product.nextMove);

  if (!product.productId.trim()) {
    throw new Error("Product capability requires a product id.");
  }

  if (
    !product.stageSupported &&
    product.releasePath.some((step) =>
      step.id.startsWith("stage-"),
    )
  ) {
    throw new Error(
      `${product.productId} cannot expose stage steps without stage support.`,
    );
  }

  if (
    !product.productionPromotionSupported &&
    product.releasePath.some(
      (step) =>
        step.action === "request-prod-promotion" ||
        step.action === "record-prod-verification",
    )
  ) {
    throw new Error(
      `${product.productId} cannot expose production actions without governed production support.`,
    );
  }

  if (
    !product.stageSupported &&
    !product.productionPromotionSupported &&
    !product.unavailableReason
  ) {
    throw new Error(
      `${product.productId} must explain why governed release actions are unavailable.`,
    );
  }

  if (product.rollback.supported !== Boolean(product.rollback.contractRef)) {
    throw new Error(
      `${product.productId} rollback support requires one explicit contract ref.`,
    );
  }

  if (
    product.runtimeLifecycle &&
    !product.runtimeLifecycle.states.some(
      (state) => state.id === product.runtimeLifecycle?.currentState,
    )
  ) {
    throw new Error(
      `${product.productId} runtime lifecycle state is outside its product contract.`,
    );
  }

  if (
    product.runtimeLifecycle &&
    (!product.runtimeLifecycle.requiredCapability.trim() ||
      !product.runtimeLifecycle.workflowOwner.trim() ||
      !productExecutionAdapterIsValid(product.runtimeLifecycle.adapter))
  ) {
    throw new Error(
      `${product.productId} runtime lifecycle requires a capability, workflow owner, and coherent adapter.`,
    );
  }

  const operationActions = product.releaseOperations.map(
    (operation) => operation.action,
  );
  if (new Set(operationActions).size !== operationActions.length) {
    throw new Error(
      `${product.productId} release operation actions must be unique.`,
    );
  }

  for (const operation of product.releaseOperations) {
    const fieldIds = operation.fields.map((field) => field.id);

    if (
      !operation.description.trim() ||
      !operation.requiredCapability.trim() ||
      !operation.workflowOwner.trim() ||
      !productExecutionAdapterIsValid(operation.adapter) ||
      new Set(fieldIds).size !== fieldIds.length
    ) {
      throw new Error(
        `${product.productId} release operation ${operation.action} is incomplete or has duplicate fields.`,
      );
    }

    for (const field of operation.fields) {
      const optionValues = field.options.map((option) => option.value);
      const validSelectOptions =
        field.kind !== "select" ||
        (field.options.some((option) => option.value === "") &&
          field.options.some((option) => option.value !== "") &&
          new Set(optionValues).size === optionValues.length);

      if (
        !field.id.trim() ||
        !field.label.trim() ||
        !field.description.trim() ||
        !validSelectOptions ||
        (field.kind !== "select" && field.options.length > 0)
      ) {
        throw new Error(
          `${product.productId} release field ${field.id || "unknown"} has an invalid descriptor.`,
        );
      }
    }
  }

  const stepIds = product.releasePath.map((step) => step.id);
  if (new Set(stepIds).size !== stepIds.length) {
    throw new Error(
      `${product.productId} release step ids must be unique.`,
    );
  }

  let pathPhase: "active" | "complete" | "pending" = "complete";
  let activeSteps = 0;

  for (const step of product.releasePath) {
    if (
      !step.id.trim() ||
      !step.label.trim() ||
      !step.canonicalStatus.trim() ||
      !step.sourceRef.trim()
    ) {
      throw new Error(
        `${product.productId} release step descriptors must be complete.`,
      );
    }

    if (
      step.action &&
      !product.releaseOperations.some(
        (operation) => operation.action === step.action,
      )
    ) {
      throw new Error(
        `${product.productId} release step ${step.id} has no matching operation capability.`,
      );
    }

    if (step.posture === "complete") {
      if (pathPhase !== "complete") {
        throw new Error(
          `${product.productId} release path must keep completed steps before its active and pending steps.`,
        );
      }
    } else if (
      step.posture === "current" ||
      step.posture === "failed"
    ) {
      if (pathPhase !== "complete") {
        throw new Error(
          `${product.productId} release path can expose only one ordered active step.`,
        );
      }
      pathPhase = "active";
      activeSteps += 1;
    } else {
      pathPhase = "pending";
    }

    if (step.actionRequirement) {
      const lifecycleStateIds =
        product.runtimeLifecycle?.states.map((state) => state.id) ?? [];
      const blockedMove = step.actionRequirement.blockedMove;

      if (
        !step.action ||
        step.actionRequirement.allowedStateIds.length === 0 ||
        step.actionRequirement.allowedStateIds.some(
          (stateId) => !lifecycleStateIds.includes(stateId),
        ) ||
        !blockedMove.actionId.trim() ||
        !blockedMove.label.trim() ||
        !blockedMove.ownerRef.trim() ||
        !blockedMove.reason.trim()
      ) {
        throw new Error(
          `${product.productId} release step ${step.id} has an invalid runtime lifecycle action requirement.`,
        );
      }
    }
  }

  if (
    product.releasePath.some((step) => step.posture !== "complete") &&
    activeSteps !== 1
  ) {
    throw new Error(
      `${product.productId} incomplete release path requires exactly one current or failed step.`,
    );
  }

  if (
    product.releasePath.length === 0 &&
    product.releaseOperations.length > 0
  ) {
    throw new Error(
      `${product.productId} cannot expose release operations without a release path.`,
    );
  }

  if (
    product.runtimeLifecycle &&
    new Set(product.runtimeLifecycle.states.map((state) => state.id)).size !==
      product.runtimeLifecycle.states.length
  ) {
    throw new Error(
      `${product.productId} runtime lifecycle states must be unique.`,
    );
  }

  if (
    product.runtimeLifecycle?.states.some(
      (state) =>
        !state.id.trim() ||
        !state.label.trim() ||
        !state.description.trim(),
    )
  ) {
    throw new Error(
      `${product.productId} runtime lifecycle state descriptors must be complete.`,
    );
  }

  if (product.runtimeLifecycle) {
    const lifecycle = product.runtimeLifecycle;
    const stateIds = new Set(lifecycle.states.map((state) => state.id));
    const transitionKeys = lifecycle.transitions.map(
      (transition) =>
        `${transition.fromStateId}->${transition.toStateId}`,
    );

    if (new Set(transitionKeys).size !== transitionKeys.length) {
      throw new Error(
        `${product.productId} runtime lifecycle transitions must be unique.`,
      );
    }

    for (const transition of lifecycle.transitions) {
      if (
        !transition.description.trim() ||
        !stateIds.has(transition.fromStateId) ||
        !stateIds.has(transition.toStateId) ||
        transition.fromStateId === transition.toStateId ||
        !["incident", "incident-follow-up", "none"].includes(
          transition.incidentRequirement,
        ) ||
        !["inactive", "pending", "preserve"].includes(
          transition.verificationEffect,
        )
      ) {
        throw new Error(
          `${product.productId} runtime lifecycle transition is incomplete or references an unsupported state.`,
        );
      }
    }

    if (
      lifecycle.adapter.available &&
      !lifecycle.transitions.some(
        (transition) =>
          transition.fromStateId === lifecycle.currentState,
      )
    ) {
      throw new Error(
        `${product.productId} available runtime lifecycle adapter requires an outgoing transition from the current state.`,
      );
    }
  }

  if (
    new Set(product.supportingEvidenceRefs).size !==
      product.supportingEvidenceRefs.length ||
    product.supportingEvidenceRefs.some((reference) => !reference.trim())
  ) {
    throw new Error(
      `${product.productId} supporting evidence references must be complete and unique.`,
    );
  }

  if (
    !product.operatorRoute.label.trim() ||
    !product.operatorRoute.ownerRef.trim() ||
    !product.operatorRoute.ref.trim()
  ) {
    throw new Error(
      `${product.productId} requires one complete operator route.`,
    );
  }
}

function productExecutionAdapterIsValid(
  adapter: ProductExecutionAdapter,
): boolean {
  if (adapter.available) {
    return Boolean(adapter.ref?.trim()) && adapter.unavailableReason === null;
  }

  return (
    adapter.ref === null &&
    Boolean(adapter.unavailableReason?.trim())
  );
}
