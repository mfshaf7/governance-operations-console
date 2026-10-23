"use client";

import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";

import { WorkDesignFinalizedBriefEvidenceDialog } from "../../work-design/artifacts/context-brief/index.ts";
import { useConsoleRuntimeCapabilities } from "@/console-integration/configuration/use-console-runtime-capabilities.ts";
import { TerasContentTray, TerasDialog } from "@/teras";
import { CanonicalWorkDesignReceiptDialog } from "./package-work-design-receipt-dialog.tsx";

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
  const runtime = useConsoleRuntimeCapabilities();
  if (!open) return null;
  if (runtime.status !== "current" || !runtime.projection ||
      runtime.projection.mode === "invalid" ||
      runtime.projection.mode === "live" && !deliveryPackage) {
    return (
      <TerasDialog contentOverflow="auto" height="content" width="standard" open
        kicker="Work Design Handoff" title="Canonical Evidence Unavailable" onClose={onClose}>
        <TerasContentTray title="Owner evidence is not loaded">
          Wait for the configured runtime and canonical package identity. No local evidence is substituted.
        </TerasContentTray>
      </TerasDialog>
    );
  }
  if (runtime.projection.mode === "live" && deliveryPackage) {
    return <CanonicalWorkDesignReceiptDialog deliveryPackage={deliveryPackage}
      handoffReceiptId={handoffReceiptId} onClose={onClose} />;
  }
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
