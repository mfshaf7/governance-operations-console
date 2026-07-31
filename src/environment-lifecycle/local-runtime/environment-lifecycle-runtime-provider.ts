import type { DevIntegrationProfile } from "../model/dev-integration-profile.ts";
import type { ProductReleaseCapability } from "../model/product-release-capability.ts";
import {
  createEnvironmentLifecycleLocalRuntime,
  type EnvironmentLifecycleLocalRuntime,
} from "./environment-lifecycle-runtime-store.ts";

let retainedRuntime: EnvironmentLifecycleLocalRuntime | null = null;
let retainedSourceIdentity: string | null = null;

export function getEnvironmentLifecycleLocalRuntime({
  products,
  profiles,
}: {
  products: readonly ProductReleaseCapability[];
  profiles: readonly DevIntegrationProfile[];
}) {
  const sourceIdentity = environmentLifecycleSourceIdentity({
    products,
    profiles,
  });

  if (!retainedRuntime) {
    retainedRuntime = createEnvironmentLifecycleLocalRuntime({
      products,
      profiles,
    });
    retainedSourceIdentity = sourceIdentity;
    return retainedRuntime;
  }

  if (retainedSourceIdentity !== sourceIdentity) {
    throw new Error(
      "Environment Lifecycle source truth changed while the retained local runtime was active.",
    );
  }

  return retainedRuntime;
}

function environmentLifecycleSourceIdentity({
  products,
  profiles,
}: {
  products: readonly ProductReleaseCapability[];
  profiles: readonly DevIntegrationProfile[];
}) {
  return JSON.stringify({
    products: products.map((product) => [
      product.productId,
      product.source.version,
    ]),
    profiles: profiles.map((profile) => [
      profile.profileId,
      profile.source.version,
    ]),
  });
}
