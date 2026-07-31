import { modelOperationsWorkspaceFixture } from "./fixtures/model-operations-workspace.fixture.ts";
import type { ModelOperationsReadModel } from "./types/model-operations-types.ts";

export type {
  LocalExceptionRuntimeProjection,
  ModelAccessPlaneProjection,
  ModelConsumerBlocker,
  ModelConsumerEligibilityState,
  ModelLatestAuditProjection,
  ModelOperationsReadModel,
  ModelOperationsSummaryMetric,
  ModelProfileAvailability,
  ModelProfileCheckId,
  ModelProfileCheckProjection,
  ModelProfileConsumerProjection,
  ModelProfileLifecycle,
  ModelProfilePolicyProjection,
  ModelProfileRecord,
  ModelProjectionFreshness,
  ModelProjectionSource,
  ModelReadinessState,
  ModelRequiredMoveProjection,
  ModelRuntimeGateProjection,
  ModelRuntimeProjection,
  ModelSecurityProjection,
} from "./types/model-operations-types.ts";

export const modelOperationsReadModel: ModelOperationsReadModel =
  modelOperationsWorkspaceFixture;
