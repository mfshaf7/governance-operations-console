import type { TerasTone } from "@/teras";
import type {
  ProductReleaseMaturity,
  ProductReleaseStepPosture,
  ProductRuntimeLifecycleStateCapability,
} from "../../model/product-release-capability.ts";

export const productReleaseMaturityLabels: Record<
  ProductReleaseMaturity,
  string
> = {
  "fully-governed": "Fully governed",
  "platform-integrated": "Platform integrated",
};

export const productReleaseStepPostureLabels: Record<
  ProductReleaseStepPosture,
  string
> = {
  complete: "Complete",
  current: "Current",
  failed: "Failed",
  pending: "Pending",
};

export const productReleaseStepPostureTones: Record<
  ProductReleaseStepPosture,
  TerasTone
> = {
  complete: "ok",
  current: "info",
  failed: "danger",
  pending: "muted",
};

export function formatProductReleaseStatus(status: string): string {
  return status
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function productRuntimeLifecycleTone(
  state: ProductRuntimeLifecycleStateCapability | null,
): TerasTone {
  if (!state) {
    return "muted";
  }

  switch (state.id) {
    case "live":
      return "ok";
    case "traffic-stopped":
      return "warn";
    case "quarantined":
      return "danger";
    case "suspended":
      return "muted";
    default:
      return "info";
  }
}
