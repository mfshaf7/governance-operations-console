import type { ConsoleBoundary } from "../console-architecture.ts";

export {
  devIntegrationProfileHistoryFixtures,
} from "./fixtures/dev-integration-profile-history.fixture.ts";
export {
  devIntegrationProfileFixtures,
  devIntegrationProfileScenarioFixtures,
} from "./fixtures/dev-integration-profiles.fixture.ts";
export {
  productReleaseCapabilityFixtures,
  productReleaseScenarioFixtures,
} from "./fixtures/product-release-capabilities.fixture.ts";
export {
  EnvironmentLifecycleWorkspace,
} from "./presentation/workspace/environment-lifecycle-workspace.tsx";
export {
  devIntegrationAttentionSource,
  governedReleaseAttentionSource,
} from "./read-model/attention-source.ts";
export type {
  DevIntegrationProfileHistoryEvent,
} from "./model/dev-integration-profile-history.ts";

export const environmentLifecycleBoundary: ConsoleBoundary = {
  id: "environment-lifecycle",
  mustNotOwn: [
    "profile admission",
    "platform execution",
    "security acceptance",
    "stage or production authority",
    "product release truth",
    "runtime readiness telemetry",
  ],
  owns: [
    "profile and product environment projections",
    "expanded profile and product environment presentation",
    "prototype-local environment command simulation",
    "capability-gated operator routing",
    "correlated environment operation receipts",
  ],
  status: "active-contract",
};
