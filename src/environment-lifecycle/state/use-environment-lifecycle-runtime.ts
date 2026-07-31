"use client";

import {
  useCallback,
  useSyncExternalStore,
} from "react";

import {
  type EnvironmentLifecycleRuntimeSnapshot,
} from "../local-runtime/environment-lifecycle-runtime-store.ts";
import { getEnvironmentLifecycleLocalRuntime } from "../local-runtime/environment-lifecycle-runtime-provider.ts";
import type {
  DevIntegrationProfile,
  DevIntegrationProfileAction,
} from "../model/dev-integration-profile.ts";
import type {
  DevIntegrationProfileRequest,
} from "../model/dev-integration-profile-request.ts";
import type {
  EnvironmentLifecycleOperation,
} from "../model/environment-lifecycle-command.ts";
import type {
  ProductReleaseCapability,
} from "../model/product-release-capability.ts";
import {
  createDevIntegrationProfileCommand,
  createDevIntegrationProfileRequestCommand,
  createProductReleaseCommand,
  createProductRuntimeLifecycleCommand,
  environmentProductSubjectRef,
  environmentProfileSubjectRef,
} from "../work-model/commands/environment-lifecycle-command-factory.ts";

const PROTOTYPE_ACTOR_REF = "operator:local-console";

export type EnvironmentLifecycleRuntimeController = Readonly<{
  retryOperation: (
    operationId: string,
  ) => Promise<EnvironmentLifecycleOperation>;
  snapshot: EnvironmentLifecycleRuntimeSnapshot;
  submitProductRelease: (
    productId: string,
    stepId: string,
    input: Readonly<Record<string, string>>,
  ) => Promise<EnvironmentLifecycleOperation>;
  submitProductRuntimeLifecycle: (
    productId: string,
    request: Readonly<{
      incidentRef: string | null;
      reason: string;
      targetState: string;
    }>,
  ) => Promise<EnvironmentLifecycleOperation>;
  submitProfileAction: (
    profileId: string,
    action: DevIntegrationProfileAction,
  ) => Promise<EnvironmentLifecycleOperation>;
  submitProfileRequest: (
    request: DevIntegrationProfileRequest,
  ) => Promise<EnvironmentLifecycleOperation>;
}>;

export function useEnvironmentLifecycleRuntime({
  products,
  profiles,
}: {
  products: readonly ProductReleaseCapability[];
  profiles: readonly DevIntegrationProfile[];
}): EnvironmentLifecycleRuntimeController {
  const runtime = getEnvironmentLifecycleLocalRuntime({ products, profiles });
  const snapshot = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getSnapshot,
  );
  const retryOperation = useCallback(
    (operationId: string) =>
      runtime.retry(operationId, new Date().toISOString()),
    [runtime],
  );
  const submitProfileAction = useCallback(
    (
      profileId: string,
      action: DevIntegrationProfileAction,
    ) => {
      const profile = runtime
        .getSnapshot()
        .effective.profiles.find(
          (candidate) => candidate.profileId === profileId,
        );
      if (!profile) {
        throw new Error(`Profile ${profileId} is unavailable.`);
      }
      const subjectRef = environmentProfileSubjectRef(profileId);
      const expectedSourceVersion =
        runtime.getSnapshot().effective.subjectVersions[subjectRef] ??
        profile.source.version;

      return runtime.submit(
        createDevIntegrationProfileCommand({
          action,
          actorRef: PROTOTYPE_ACTOR_REF,
          expectedSourceVersion,
          profile,
          requestedAt: new Date().toISOString(),
        }),
      );
    },
    [runtime],
  );
  const submitProfileRequest = useCallback(
    (request: DevIntegrationProfileRequest) => {
      const subjectRef = environmentProfileSubjectRef(
        request.profileId,
      );
      const expectedSourceVersion =
        runtime.getSnapshot().effective.subjectVersions[subjectRef] ??
        "unregistered";

      return runtime.submit(
        createDevIntegrationProfileRequestCommand({
          actorRef: PROTOTYPE_ACTOR_REF,
          expectedSourceVersion,
          request,
        }),
      );
    },
    [runtime],
  );
  const submitProductRelease = useCallback(
    (
      productId: string,
      stepId: string,
      input: Readonly<Record<string, string>>,
    ) => {
      const product = runtime
        .getSnapshot()
        .effective.products.find(
          (candidate) => candidate.productId === productId,
        );
      if (!product) {
        throw new Error(`Product ${productId} is unavailable.`);
      }
      const subjectRef = environmentProductSubjectRef(productId);
      const expectedSourceVersion =
        runtime.getSnapshot().effective.subjectVersions[subjectRef] ??
        product.source.version;

      return runtime.submit(
        createProductReleaseCommand({
          actorRef: PROTOTYPE_ACTOR_REF,
          expectedSourceVersion,
          input,
          product,
          requestedAt: new Date().toISOString(),
          stepId,
        }),
      );
    },
    [runtime],
  );
  const submitProductRuntimeLifecycle = useCallback(
    (
      productId: string,
      request: Readonly<{
        incidentRef: string | null;
        reason: string;
        targetState: string;
      }>,
    ) => {
      const product = runtime
        .getSnapshot()
        .effective.products.find(
          (candidate) => candidate.productId === productId,
        );
      if (!product) {
        throw new Error(`Product ${productId} is unavailable.`);
      }
      const subjectRef = environmentProductSubjectRef(productId);
      const expectedSourceVersion =
        runtime.getSnapshot().effective.subjectVersions[subjectRef] ??
        product.source.version;

      return runtime.submit(
        createProductRuntimeLifecycleCommand({
          actorRef: PROTOTYPE_ACTOR_REF,
          expectedSourceVersion,
          incidentRef: request.incidentRef,
          product,
          reason: request.reason,
          requestedAt: new Date().toISOString(),
          targetRuntimeLifecycleState: request.targetState,
        }),
      );
    },
    [runtime],
  );

  return {
    retryOperation,
    snapshot,
    submitProductRelease,
    submitProductRuntimeLifecycle,
    submitProfileAction,
    submitProfileRequest,
  };
}
