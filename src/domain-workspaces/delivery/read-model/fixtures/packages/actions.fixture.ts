import type { DeliveryAvailableAction } from "../../../domain/delivery-types.ts";

export const readOnlyActions: DeliveryAvailableAction[] = [
  {
    action_type: "open-details",
    enabled: true,
    expected_backend_route: null,
    label: "Open Details",
    reason: "Inspect package evidence, metadata, and tree context.",
    scope: "read_only",
    tone: "info",
  },
  {
    action_type: "open-audit-trail",
    enabled: true,
    expected_backend_route: null,
    label: "Audit Trail",
    reason: "Read package-scoped receipt and decision history.",
    scope: "read_only",
    tone: "muted",
  },
];

export function packageActions(
  actions: DeliveryAvailableAction[],
): DeliveryAvailableAction[] {
  return [...actions, ...readOnlyActions];
}
