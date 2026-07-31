import type { DeliveryAuditEvent } from "../../../domain/delivery-types.ts";

export const deliveryAuditEventFixtures: DeliveryAuditEvent[] = [
  {
    actor: "operator",
    category: "readiness",
    delivery_package_id: "pkg-698",
    detail: "Readiness state updated for pkg-698 from receipt WGCF-READY-698.",
    event_id: "audit-698-readiness",
    occurred_at: "2026-05-27T05:18:00.000Z",
    receipt_id: "WGCF-READY-698",
    title: "Readiness state updated",
    tone: "ok",
  },
  {
    actor: "advisor",
    category: "action",
    delivery_package_id: "pkg-698",
    detail:
      "Action event recorded for pkg-698 with next execution target candidate User story #714.",
    event_id: "audit-698-suggestion",
    occurred_at: "2026-05-27T05:22:00.000Z",
    receipt_id: null,
    title: "Action event recorded",
    tone: "info",
  },
  {
    actor: "system",
    category: "projection",
    delivery_package_id: "pkg-900",
    detail:
      "Projection state marked stale for pkg-900 after read-model generation.",
    event_id: "audit-900-stale",
    occurred_at: "2026-05-27T05:30:00.000Z",
    receipt_id: null,
    title: "Projection state marked stale",
    tone: "stale",
  },
];
