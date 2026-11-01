import type {
  DeliveryAuditEvent,
  DeliveryReadModel,
} from "../../../read-model/index.ts";

import type { DeliveryHomeRecentActivity } from "./home-types.ts";

export function getDeliveryHomeRecentActivity(
  model: DeliveryReadModel,
): DeliveryHomeRecentActivity[] {
  const packageLabels = new Map(
    model.packages.map((deliveryPackage) => [
      deliveryPackage.delivery_package_id,
      deliveryPackage.display_name,
    ]),
  );

  return [...model.audit_events]
    .sort(
      (left, right) =>
        Date.parse(right.occurred_at) - Date.parse(left.occurred_at) ||
        left.title.localeCompare(right.title),
    )
    .map((event) => {
      const category = categoryLabel(event.category);
      const packageLabel =
        packageLabels.get(event.delivery_package_id) ??
        event.delivery_package_id;
      const actor = actorLabel(event.actor);
      const receiptLabel = event.receipt_id ?? "No receipt";
      const timestampLabel = formatAuditTimestamp(event.occurred_at);

      return {
        actor: event.actor,
        actorLabel: actor,
        category: event.category,
        categoryLabel: category,
        detail: event.detail,
        eventRef: event.event_id,
        eventId: event.event_id,
        packageRef: event.delivery_package_id,
        packageLabel,
        receiptLabel,
        timestamp: event.occurred_at,
        timestampLabel,
        title: event.title || "Delivery event",
        tone: event.tone,
      };
    });
}

function actorLabel(actor: string) {
  if (!actor) {
    return "System";
  }

  return `${actor.slice(0, 1).toUpperCase()}${actor.slice(1)}`;
}

function categoryLabel(category: DeliveryAuditEvent["category"]) {
  switch (category) {
    case "action":
      return "Action";
    case "apply":
      return "Apply";
    case "milestone":
      return "Milestone";
    case "projection":
      return "Projection";
    case "readiness":
      return "Readiness";
    case "receipt":
      return "Receipt";
  }
}

function formatAuditTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}
