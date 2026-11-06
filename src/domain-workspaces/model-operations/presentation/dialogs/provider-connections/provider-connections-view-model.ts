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
  fresh: boolean; error: string | null; readError?:string|null;registryError?:string|null; originalId: string | null; operation: ConnectionOperation | null; receipt: ConnectionReceipt | null;
}, preset: ProviderConnections["presets"][number] | undefined, item?:ProviderConnection, preview=false): TerasMetadataItem[] {
  return [
    { label: "Qualification", value: experimentalLabel, tone: "warn" },
    ...(preset ? [{ label: "Provider endpoint", value: preset.endpoint_origin },
      { label: "Model selection", value: preset.catalogue_supported ? "Discover models, then explicitly verify a selection" : "Enter an exact model ID manually, then explicitly verify it" }] : []),
    { label: "Next", value: !item ? "Create a connection, then add its API key." : item.state!=="active" ? "Reconnect this connection before using its models." : !item.credential_present ? "Store the provider API key to enable model verification." : "Continue to model registration, verify a model, then choose its workflow routing." },
    ...(!runtime.fresh && !preview ? [{ label: "Current state", value: "Unavailable or stale; refresh before changing connections", tone: "warn" as const }] : []),
    ...(runtime.readError?[{label:"Current-state read",value:runtime.readError,tone:"warn" as const}]:[]),
    ...(runtime.registryError?[{label:"Model register read",value:runtime.registryError,tone:"warn" as const}]:[]),
    ...(runtime.error ? [{ label: "Service response", value: runtime.error, tone: "warn" as const }] : []),
    ...(runtime.originalId ? [{ label: "Original operation", value: runtime.originalId },
      { label: "Operation result", value: runtime.receipt ? "Source confirmed · revision " + runtime.receipt.revision : runtime.operation?.state ?? "Unconfirmed" }] : []),
    ...(runtime.receipt ? [{ label: "Receipt", value: runtime.receipt.receipt_digest }] : []),
  ];
}
