"use client";

import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";
import { useWorkDesignLiveRuntime } from "../../../../live-runtime/use-work-design-live-runtime.ts";
import { TerasContentTray, TerasDialog, TerasMetadataList } from "@/teras";
import { workDesignHandoffApplication } from "./package-work-design-receipt-model.ts";

export function CanonicalWorkDesignReceiptDialog({
  deliveryPackage, handoffReceiptId, onClose,
}: {
  deliveryPackage: DeliveryPackageSummary;
  handoffReceiptId?: string;
  onClose: () => void;
}) {
  const runtime = useWorkDesignLiveRuntime(deliveryPackage);
  let error = runtime.projectionError ?? (runtime.mode === "disconnected-preview"
    ? "The Work Design owner route reports disconnected preview; canonical handoff evidence is unavailable."
    : null);
  let application = null;
  if (runtime.mode === "live" && runtime.projectionStatus === "current" && runtime.projection) {
    try {
      application = workDesignHandoffApplication(runtime.projection, deliveryPackage.source_ref, handoffReceiptId);
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "Canonical handoff evidence is unavailable.";
    }
  }
  return (
    <TerasDialog
      contentOverflow="auto" height="content" width="standard" open
      kicker="Work Design Handoff" title="Canonical Work Design Evidence"
      description="Read-only OOS application and durable receipt. This view never repeats the Work Design apply."
      onClose={onClose}
    >
      {application ? (
        <>
          <TerasMetadataList items={[
            { label: "Target Record", value: application.target.delivery_ref },
            { label: "Application", value: application.application_id },
            { label: "Receipt", value: application.receipt.ref },
            { label: "Receipt Digest", value: application.receipt.digest },
            { label: "Accepted Draft Digest", value: application.accepted_draft_digest },
            { label: "Applied At", value: application.applied_at },
            { label: "Operator", value: application.applied_by },
            { label: "Canonical Readback", value: application.target.readback_complete ? "Complete" : "Incomplete" },
            { label: "Created Records", value: application.target.created_refs.join(", ") || "None" },
            { label: "Updated Records", value: application.target.updated_refs.join(", ") || "None" },
            { label: "Reused Records", value: application.target.reused_refs.join(", ") || "None" },
          ]} />
          <TerasContentTray kicker="Separate Local Artifacts" title="Brief and snapshot files are browser-local">
            The durable application remains available without a local finalized brief.
            This receipt does not prove snapshot upload or restore browser-local files.
            Canonical ART descriptions and hierarchy are read through their owner workflows.
          </TerasContentTray>
        </>
      ) : (
        <TerasContentTray kicker="Canonical Evidence" title={error ? "Evidence unavailable" : "Reading OOS evidence"}>
          {error ?? "Waiting for the current owner projection. Local or fixture evidence is not used as fallback."}
        </TerasContentTray>
      )}
    </TerasDialog>
  );
}
