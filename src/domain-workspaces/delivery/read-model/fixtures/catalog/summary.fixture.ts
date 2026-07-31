import type {
  DeliveryCatalogReadModel,
  DeliveryProjectionStatus,
} from "../../../domain/delivery-types.ts";

export const deliveryCatalogGeneratedAt = "2026-06-20T09:15:00.000Z";

export const deliveryCatalogProjectionStatus: DeliveryProjectionStatus =
  "projection_sync_required";

export const deliveryCatalogSummary: DeliveryCatalogReadModel["summary"] = {
  total_items: 14,
  requestable_count: 4,
  owner_routed_count: 3,
  drift_count: 2,
  missing_route_count: 4,
};
