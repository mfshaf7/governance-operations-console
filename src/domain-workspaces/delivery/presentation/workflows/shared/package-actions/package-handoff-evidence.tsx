"use client";

import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";

import { WorkDesignFinalizedBriefEvidenceDialog } from "../../work-design/artifacts/context-brief/index.ts";

export function DeliveryWorkDesignHandoffEvidenceDialog({
  deliveryPackage,
  description,
  handoffReceiptId,
  kicker,
  onClose,
  open,
}: {
  deliveryPackage: DeliveryPackageSummary | null;
  description?: string;
  handoffReceiptId?: string;
  kicker?: string;
  onClose: () => void;
  open: boolean;
}) {
  return (
    <WorkDesignFinalizedBriefEvidenceDialog
      deliveryPackage={deliveryPackage}
      description={description}
      handoffReceiptId={handoffReceiptId}
      kicker={kicker}
      onClose={onClose}
      open={open}
    />
  );
}
