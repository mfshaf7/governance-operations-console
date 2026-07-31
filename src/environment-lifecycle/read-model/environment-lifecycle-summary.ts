import type { DevIntegrationProfile } from "../model/dev-integration-profile.ts";
import type { ProductReleaseCapability } from "../model/product-release-capability.ts";
import { summarizeDevIntegrationProfileLifecycles } from "./dev-integration-profile-selectors.ts";
import { summarizeProductReleaseCapabilities } from "./product-release-selectors.ts";

export type EnvironmentLifecycleSummary = Readonly<{
  devIntegration: Readonly<{
    activeProfiles: number;
    profiles: number;
    runningProfiles: number;
  }>;
  governedReleases: Readonly<{
    productionSupported: number;
    products: number;
    stageSupported: number;
  }>;
}>;

export function buildEnvironmentLifecycleSummary(
  profiles: readonly DevIntegrationProfile[],
  products: readonly ProductReleaseCapability[],
): EnvironmentLifecycleSummary {
  const profileLifecycles =
    summarizeDevIntegrationProfileLifecycles(profiles);
  const productCapabilities =
    summarizeProductReleaseCapabilities(products);

  return {
    devIntegration: {
      activeProfiles: profileLifecycles.active,
      profiles: profiles.length,
      runningProfiles: profiles.filter(
        (profile) => profile.runtime.observation.state === "running",
      ).length,
    },
    governedReleases: {
      productionSupported: productCapabilities.productionSupported,
      products: productCapabilities.products,
      stageSupported: productCapabilities.stageSupported,
    },
  };
}
