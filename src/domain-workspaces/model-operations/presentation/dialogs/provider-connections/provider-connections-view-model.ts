import type { TerasMetadataItem } from "@/teras";
import { experimentalLabel, type ProviderConnection, type ProviderConnections, type ConnectionOperation, type ConnectionReceipt } from "../../../work-model/provider-connections-contract.ts";

export function connectionMetadata(item: ProviderConnection, modelCount: number): TerasMetadataItem[] {
  return [
    { label: "Connection", value: item.name, detail: item.connection_id },
    { label: "State", value: item.state },
    { label: "Stored key", value: item.credential_present ? "Present in Platform custody" : "No stored key" },
    ...(modelCount ? [{ label: "Registered models", value: modelCount, detail: "Reassign routes and remove these registrations in Models & routing before removing this connection." }] : []),
  ];
}
export function connectionOperationMetadata(runtime: {
  fresh: boolean; error: string | null; originalId: string | null; operation: ConnectionOperation | null; receipt: ConnectionReceipt | null;
}, preset: ProviderConnections["presets"][number] | undefined): TerasMetadataItem[] {
  return [
    { label: "Qualification", value: experimentalLabel, tone: "warn" },
    ...(preset ? [{ label: "Provider endpoint", value: preset.endpoint_origin },
      { label: "Model selection", value: preset.catalogue_supported ? "Discover models, then explicitly verify a selection" : "Enter an exact model ID manually, then explicitly verify it" }] : []),
    { label: "Next", value: "Close this dialog to register the connection backend, verify a model and review routing." },
    ...(!runtime.fresh ? [{ label: "Current state", value: "Unavailable or stale; refresh before changing connections", tone: "warn" as const }] : []),
    ...(runtime.error ? [{ label: "Owner response", value: runtime.error, tone: "warn" as const }] : []),
    ...(runtime.originalId ? [{ label: "Original operation", value: runtime.originalId },
      { label: "Operation result", value: runtime.receipt ? "Owner confirmed · revision " + runtime.receipt.revision : runtime.operation?.state ?? "Unconfirmed" }] : []),
    ...(runtime.receipt ? [{ label: "Receipt", value: runtime.receipt.receipt_digest }] : []),
  ];
}
