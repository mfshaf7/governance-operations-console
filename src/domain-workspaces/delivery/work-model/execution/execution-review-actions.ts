import type { DeliveryAvailableAction, DeliveryPackageSummary } from "../../domain/delivery-package.ts";
import type { DeliveryChangeProjection } from "../../live-runtime/delivery-change-live-types.ts";

// These controls open reviews, not eligibility decisions. OOS validates the
// exact revision and all operation prerequisites on the existing command path.
export function executionReviewActions(projection: DeliveryChangeProjection | null, item: DeliveryPackageSummary): DeliveryAvailableAction[] {
  if (!projection || projection.delivery_id !== `delivery-${item.legacy_epic_id}`) return [];
  const status = projection.package.execution_tree.status;
  if (["done", "retired"].includes(status)) return [];
  const route = `/v1/delivery-initiatives/${projection.delivery_id}/change-control/commands`;
  return status === "parked" ? [{ action_type: "resume", label: "Resume Work", enabled: true,
    expected_backend_route: route, scope: "package_with_children", tone: "info",
    reason: "Review the return status and reason. The service checks the current package before applying the change." }]
    : [...(status === "blocked" ? [{ action_type: "clear-blocker" as const, label: "Review Blocker", enabled: true, expected_backend_route: route,
      scope: "package" as const, tone: "warn" as const, reason: "Review the return status after the blocking condition is resolved. The service verifies the unblock prerequisites." }] : []),
    { action_type: "defer", label: "Defer", enabled: true, expected_backend_route: route,
      scope: "package_with_children", tone: "warn", reason: "Review why this package should leave active focus and when to revisit it." },
    { action_type: "retire", label: "Retire", enabled: true, expected_backend_route: route,
      scope: "package_with_children", tone: "danger", reason: "Review retirement and its effect on remaining work. Nothing changes until you confirm." }];
}
