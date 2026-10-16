import { projectCanonicalDeliveryWorkspace } from "../live-runtime/delivery-workspace-live-projection.ts";
import { canonicalDigest, deliveryOosRequest, resolveDeliveryOosConfig } from "./delivery-oos-client.ts";

export async function readCanonicalDeliveryWorkspace({ env = process.env, fetchImpl = fetch }: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {}) {
  const value = await deliveryOosRequest(resolveDeliveryOosConfig(env), "/v1/delivery-initiatives?include_done=false", { method: "GET" }, fetchImpl, 75000, {
    authority: "operator-orchestration-service", sourceOwner: "workspace-delivery-art", recordRef: "openproject://projects/workspace-delivery-art/initiatives",
  });
  return projectCanonicalDeliveryWorkspace(value, canonicalDigest(value), new Date().toISOString());
}
