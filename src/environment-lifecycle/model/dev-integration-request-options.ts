import type { DevIntegrationExpectedWriteClass, DevIntegrationLaneClass, DevIntegrationRuntimeStateModel, DevIntegrationSecurityTrigger } from "./dev-integration-profile.ts";
type Option<T extends string> = Readonly<{ label: string; value: T }>;
export type DevIntegrationRequestOptions = Readonly<{
  dependencyRefs: readonly string[];
  expectedWriteClasses: readonly Option<Exclude<DevIntegrationExpectedWriteClass, "unknown">>[];
  laneClasses: readonly Option<DevIntegrationLaneClass>[];
  ownerRepos: readonly string[];
  participatingRepos: readonly string[];
  runtimePlatforms: readonly string[];
  runtimeStateModels: readonly Option<Exclude<DevIntegrationRuntimeStateModel, "unknown">>[];
  securityTriggers: readonly Option<DevIntegrationSecurityTrigger>[];
}>;
