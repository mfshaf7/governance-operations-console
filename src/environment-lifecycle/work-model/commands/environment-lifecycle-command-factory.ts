import {
  devIntegrationProfileAllowsAction,
  type DevIntegrationProfile,
  type DevIntegrationProfileAction,
} from "../../model/dev-integration-profile.ts";
import {
  devIntegrationProfileRequestRoute,
  type DevIntegrationProfileRequest,
} from "../../model/dev-integration-profile-request.ts";
import type {
  EnvironmentLifecycleCommandIdentity,
  EnvironmentLifecycleCommandRequest,
} from "../../model/environment-lifecycle-command.ts";
import type {
  ProductReleaseCapability,
} from "../../model/product-release-capability.ts";
import {
  productReleaseStepActionAvailability,
  selectProductRuntimeLifecycleTransition,
} from "../../model/product-release-capability.ts";

export type EnvironmentLifecycleRetryContext = Readonly<{
  attempt: number;
  causationId: string;
  correlationId: string;
}>;

type CommandIdentityInput = Readonly<{
  action: EnvironmentLifecycleCommandRequest["action"];
  actorRef: string;
  adapterRef: string;
  expectedSourceVersion: string;
  payload: unknown;
  requestedAt: string;
  requiredCapability: string;
  retry?: EnvironmentLifecycleRetryContext;
  subjectRef: string;
  workflowOwner: string;
}>;

export function createDevIntegrationProfileCommand({
  action,
  actorRef,
  expectedSourceVersion,
  profile,
  requestedAt,
  retry,
}: {
  action: DevIntegrationProfileAction;
  actorRef: string;
  expectedSourceVersion: string;
  profile: DevIntegrationProfile;
  requestedAt: string;
  retry?: EnvironmentLifecycleRetryContext;
}): EnvironmentLifecycleCommandRequest {
  if (!devIntegrationProfileAllowsAction(profile, action)) {
    throw new Error(
      `${profile.profileId} does not allow the ${action} action.`,
    );
  }

  const subjectRef = environmentProfileSubjectRef(profile.profileId);

  return {
    ...createCommandIdentity({
      action,
      actorRef,
      adapterRef: `profile://${profile.ownerRepo}/${profile.profileId}/commands`,
      expectedSourceVersion,
      payload: { action },
      requestedAt,
      requiredCapability: `profile:${profile.profileId}:${action}`,
      retry,
      subjectRef,
      workflowOwner: profile.ownerRepo,
    }),
    action,
    profileId: profile.profileId,
    subjectKind: "dev-integration-profile",
  };
}

export function createDevIntegrationProfileRequestCommand({
  actorRef,
  expectedSourceVersion,
  request,
  retry,
}: {
  actorRef: string;
  expectedSourceVersion: string;
  request: DevIntegrationProfileRequest;
  retry?: EnvironmentLifecycleRetryContext;
}): EnvironmentLifecycleCommandRequest {
  if (request.requestedBy !== actorRef) {
    throw new Error(
      "Profile request actor must match the command actor.",
    );
  }

  const subjectRef = environmentProfileSubjectRef(request.profileId);

  return {
    ...createCommandIdentity({
      action: "submit-profile-request",
      actorRef,
      adapterRef: devIntegrationProfileRequestRoute.adapterRef,
      expectedSourceVersion,
      payload: profileRequestIdentityPayload(request),
      requestedAt: request.requestedAt,
      requiredCapability:
        devIntegrationProfileRequestRoute.requiredCapability,
      retry,
      subjectRef,
      workflowOwner: devIntegrationProfileRequestRoute.workflowOwner,
    }),
    action: "submit-profile-request",
    request,
    subjectKind: "profile-request",
  };
}

export function createProductReleaseCommand({
  actorRef,
  expectedSourceVersion,
  input,
  product,
  requestedAt,
  retry,
  stepId,
}: {
  actorRef: string;
  expectedSourceVersion: string;
  input: Readonly<Record<string, string>>;
  product: ProductReleaseCapability;
  requestedAt: string;
  retry?: EnvironmentLifecycleRetryContext;
  stepId: string;
}): EnvironmentLifecycleCommandRequest {
  const step = product.releasePath.find(
    (candidate) => candidate.id === stepId,
  );
  const operation = step?.action
    ? product.releaseOperations.find(
        (candidate) => candidate.action === step.action,
      )
    : null;

  if (
    !step ||
    !operation ||
    step.action === null ||
    !operation.adapter.available ||
    !operation.adapter.ref ||
    !productReleaseStepActionAvailability(product, step).allowed
  ) {
    throw new Error(
      `${product.productId} does not expose an actionable operation for ${stepId}.`,
    );
  }

  const subjectRef = environmentProductSubjectRef(product.productId);

  return {
    ...createCommandIdentity({
      action: operation.action,
      actorRef,
      adapterRef: operation.adapter.ref,
      expectedSourceVersion,
      payload: { input, stepId },
      requestedAt,
      requiredCapability: operation.requiredCapability,
      retry,
      subjectRef,
      workflowOwner: operation.workflowOwner,
    }),
    action: operation.action,
    input,
    productId: product.productId,
    stepId,
    subjectKind: "product-release",
  };
}

export function createProductRuntimeLifecycleCommand({
  actorRef,
  expectedSourceVersion,
  incidentRef,
  product,
  reason,
  requestedAt,
  retry,
  targetRuntimeLifecycleState,
}: {
  actorRef: string;
  expectedSourceVersion: string;
  incidentRef: string | null;
  product: ProductReleaseCapability;
  reason: string;
  requestedAt: string;
  retry?: EnvironmentLifecycleRetryContext;
  targetRuntimeLifecycleState: string;
}): EnvironmentLifecycleCommandRequest {
  const lifecycle = product.runtimeLifecycle;
  const transition = lifecycle
    ? selectProductRuntimeLifecycleTransition(
        lifecycle,
        targetRuntimeLifecycleState,
      )
    : null;

  if (
    !lifecycle ||
    !transition ||
    !lifecycle.adapter.available ||
    !lifecycle.adapter.ref ||
    !reason.trim() ||
    (transition.incidentRequirement !== "none" &&
      !incidentRef?.trim())
  ) {
    throw new Error(
      `${product.productId} runtime lifecycle request is incomplete or unsupported.`,
    );
  }

  const subjectRef = environmentProductSubjectRef(product.productId);

  return {
    ...createCommandIdentity({
      action: "change-runtime-lifecycle",
      actorRef,
      adapterRef: lifecycle.adapter.ref,
      expectedSourceVersion,
      payload: {
        incidentRef,
        reason,
        sourceRuntimeLifecycleState: lifecycle.currentState,
        targetRuntimeLifecycleState,
      },
      requestedAt,
      requiredCapability: lifecycle.requiredCapability,
      retry,
      subjectRef,
      workflowOwner: lifecycle.workflowOwner,
    }),
    action: "change-runtime-lifecycle",
    incidentRef,
    productId: product.productId,
    reason,
    sourceRuntimeLifecycleState: lifecycle.currentState,
    subjectKind: "product-runtime-lifecycle",
    targetRuntimeLifecycleState,
  };
}

export function createEnvironmentLifecycleRetryCommand({
  command,
  expectedSourceVersion,
  operationId,
  requestedAt,
}: {
  command: EnvironmentLifecycleCommandRequest;
  expectedSourceVersion: string;
  operationId: string;
  requestedAt: string;
}): EnvironmentLifecycleCommandRequest {
  const retry = {
    attempt: command.attempt + 1,
    causationId: operationId,
    correlationId: command.correlationId,
  };

  switch (command.subjectKind) {
    case "dev-integration-profile":
      return {
        ...command,
        ...createCommandIdentity({
          action: command.action,
          actorRef: command.actorRef,
          adapterRef: command.adapterRef,
          expectedSourceVersion,
          payload: { action: command.action },
          requestedAt,
          requiredCapability: command.requiredCapability,
          retry,
          subjectRef: environmentCommandSubjectRef(command),
          workflowOwner: command.workflowOwner,
        }),
      };
    case "profile-request":
      return {
        ...command,
        ...createCommandIdentity({
          action: command.action,
          actorRef: command.actorRef,
          adapterRef: command.adapterRef,
          expectedSourceVersion,
          payload: profileRequestIdentityPayload(command.request),
          requestedAt,
          requiredCapability: command.requiredCapability,
          retry,
          subjectRef: environmentCommandSubjectRef(command),
          workflowOwner: command.workflowOwner,
        }),
      };
    case "product-release":
      return {
        ...command,
        ...createCommandIdentity({
          action: command.action,
          actorRef: command.actorRef,
          adapterRef: command.adapterRef,
          expectedSourceVersion,
          payload: {
            input: command.input,
            stepId: command.stepId,
          },
          requestedAt,
          requiredCapability: command.requiredCapability,
          retry,
          subjectRef: environmentCommandSubjectRef(command),
          workflowOwner: command.workflowOwner,
        }),
      };
    case "product-runtime-lifecycle":
      return {
        ...command,
        ...createCommandIdentity({
          action: command.action,
          actorRef: command.actorRef,
          adapterRef: command.adapterRef,
          expectedSourceVersion,
          payload: {
            incidentRef: command.incidentRef,
            reason: command.reason,
            sourceRuntimeLifecycleState:
              command.sourceRuntimeLifecycleState,
            targetRuntimeLifecycleState:
              command.targetRuntimeLifecycleState,
          },
          requestedAt,
          requiredCapability: command.requiredCapability,
          retry,
          subjectRef: environmentCommandSubjectRef(command),
          workflowOwner: command.workflowOwner,
        }),
      };
  }
}

export function environmentCommandSubjectRef(
  command: EnvironmentLifecycleCommandRequest,
): string {
  switch (command.subjectKind) {
    case "dev-integration-profile":
      return environmentProfileSubjectRef(command.profileId);
    case "profile-request":
      return environmentProfileSubjectRef(command.request.profileId);
    case "product-release":
    case "product-runtime-lifecycle":
      return environmentProductSubjectRef(command.productId);
  }
}

export function environmentProfileSubjectRef(profileId: string): string {
  return `dev-integration-profile:${profileId}`;
}

export function environmentProductSubjectRef(productId: string): string {
  return `product-release:${productId}`;
}

function createCommandIdentity({
  action,
  actorRef,
  adapterRef,
  expectedSourceVersion,
  payload,
  requestedAt,
  requiredCapability,
  retry,
  subjectRef,
  workflowOwner,
}: CommandIdentityInput): EnvironmentLifecycleCommandIdentity {
  const attempt = retry?.attempt ?? 1;
  const logicalIdentity = stableSerialize({
    action,
    attempt,
    expectedSourceVersion,
    payload,
    subjectRef,
  });
  const identityHash = environmentLifecycleHash(logicalIdentity);
  const idempotencyKey = `environment:${identityHash}`;

  return {
    actorRef,
    adapterRef,
    attempt,
    causationId: retry?.causationId ?? null,
    commandId: `environment-command-${identityHash}`,
    correlationId:
      retry?.correlationId ??
      `environment-correlation-${environmentLifecycleHash(
        stableSerialize({ action, payload, subjectRef }),
      )}`,
    expectedSourceVersion,
    idempotencyKey,
    requestedAt,
    requiredCapability,
    workflowOwner,
  };
}

function profileRequestIdentityPayload(
  request: DevIntegrationProfileRequest,
): Omit<DevIntegrationProfileRequest, "requestedAt"> {
  const identityPayload = {
    ...request,
  } as Omit<DevIntegrationProfileRequest, "requestedAt"> & {
    requestedAt?: string;
  };
  delete identityPayload.requestedAt;

  return identityPayload;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableSerialize(record[key])}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function environmentLifecycleHash(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}
