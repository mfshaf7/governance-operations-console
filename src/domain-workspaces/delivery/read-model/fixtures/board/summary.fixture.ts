import type { DeliveryBoardSummary } from "../../../domain/delivery-types.ts";

export const deliveryBoardSummaryFixture: DeliveryBoardSummary = {
  total_packages: 12,
  blocked_count: 4,
  closeout_pending_count: 1,
  stale_count: 1,
  by_posture: {
    Blocked: 4,
    "Closeout Pending": 1,
    Deferred: 1,
    Done: 1,
    "In Progress": 1,
    Ready: 3,
    Retired: 1,
  },
};
