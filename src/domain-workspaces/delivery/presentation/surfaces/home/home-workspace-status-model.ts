import type { DeliveryReadModel } from "../../../read-model/index.ts";
import { resolveOperationSurfaceStatusTone } from "@/domain-workspaces/operation-projections";

import { deliveryWorkspaceComponentStatuses } from "../../workspace/workspace-view-model.ts";
import type { DeliveryHomeWorkspaceStatus } from "./home-types.ts";

export function getDeliveryHomeWorkspaceStatus(
  model: DeliveryReadModel,
): DeliveryHomeWorkspaceStatus {
  const items = deliveryWorkspaceComponentStatuses(model);
  const dangerItem = items.find(
    (item) => resolveOperationSurfaceStatusTone(item) === "danger",
  );
  const staleItem = items.find(
    (item) => resolveOperationSurfaceStatusTone(item) === "stale",
  );
  const reviewItem = dangerItem ?? staleItem;
  const localItem = items.find((item) => item.state === "local");

  return {
    ariaLabel: "Delivery workspace status details",
    detailDataAttribute: "data-delivery-home-status-modal",
    items,
    kicker: "Workspace Status",
    statusLabel: reviewItem
      ? "review"
      : localItem
        ? "prototype-local"
        : "online",
    summary:
      reviewItem?.detail ??
      (localItem
        ? "Delivery is using a current prototype read model with prototype-local write and receipt paths. Open a signal for scoped authority facts."
        : "Backend, Projection, Write Path, and OOS signals match the persistent workspace status. Open a signal for scoped facts only."),
    title: reviewItem
      ? `${reviewItem.label} status needs review`
      : localItem
        ? "Delivery workspace is prototype-local"
        : "Workspace status is online",
    tone: reviewItem
      ? resolveOperationSurfaceStatusTone(reviewItem)
      : localItem
        ? "warn"
        : "ok",
  };
}
