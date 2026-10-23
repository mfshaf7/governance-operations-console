import type {
  WorkDesignOosProjection,
} from "../../../../live-runtime/work-design-live-types.ts";

// Routing an already validated projection does not create or reconstruct evidence.
export function workDesignHandoffApplication(
  projection: WorkDesignOosProjection,
  sourceRef: string,
  expectedReceiptId?: string,
) {
  const applications = [
    ...(projection.latest_application ? [projection.latest_application] : []),
    ...projection.history,
  ];
  const application = expectedReceiptId
    ? applications.find((item) =>
        item.application_id === expectedReceiptId || item.receipt.ref === expectedReceiptId)
    : projection.latest_application;
  if (!application || application.target.delivery_ref !== sourceRef) {
    throw new Error("The canonical projection does not contain the Work Design application bound to this handoff.");
  }
  return application;
}
