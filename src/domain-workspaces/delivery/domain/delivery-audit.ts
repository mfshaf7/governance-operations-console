import type { DeliveryTone } from "./delivery-common.ts";

export type DeliveryAuditEvent = {
  actor: string;
  category:
    "action" | "apply" | "milestone" | "projection" | "readiness" | "receipt";
  delivery_package_id: string;
  detail: string;
  event_id: string;
  occurred_at: string;
  receipt_id: string | null;
  title: string;
  tone: DeliveryTone;
};
