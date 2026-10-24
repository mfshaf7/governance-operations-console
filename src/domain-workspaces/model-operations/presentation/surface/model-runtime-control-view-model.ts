import type { TerasMetadataItem } from "@/teras";
import type { ModelBackend, ModelRegistry, ModelRuntimeOperation } from "../../work-model/model-runtime-contract.ts";

export function modelBackendMetadata(registry: ModelRegistry, backend: ModelBackend | null): TerasMetadataItem[] {
  return [
    { label: "Registered models", value: Object.keys(registry.configuration.configuration.models).length },
    { label: "Backend", value: backend?.registered ? "Registered · health not probed" : "Not registered" },
  ];
}
export function modelRoutingMetadata(issue: string | null): TerasMetadataItem[] {
  return [{ label: "When all choices fail", value: "Stop and report the failure" }, ...(issue ? [{ label: "Before saving", value: issue }] : [])];
}
export function modelRoutingConflictMetadata(): TerasMetadataItem[] {
  return [{ label: "Configuration changed", value: "Reload and review the current settings before saving.", tone: "warn" }];
}
export function modelOwnerErrorMetadata(error: string): TerasMetadataItem[] {
  return [{ label: "Owner response", value: error, tone: "warn" }];
}
export function modelOperationMetadata(operation: ModelRuntimeOperation): TerasMetadataItem[] {
  const login = operation.account_login;
  return [
    { label: "Request", value: operation.request_id }, { label: "Attempt", value: operation.attempt },
    ...(typeof operation.request.input.backend_id === "string" ? [{ label: "Backend", value: operation.request.input.backend_id }] : []),
    ...(typeof operation.request.input.model === "string" ? [{ label: "Model", value: operation.request.input.model }] : []),
    ...(operation.owner_receipt ? [{ label: "Accepted revision", value: operation.owner_receipt.revision }] : []),
    ...(operation.failure ? [{ label: "Failure", value: operation.failure.code }] : []),
    ...(login ? [{ label: "Account state", value: login.state }, { label: "Device code", value: login.user_code ?? "No active challenge" }] : []),
  ];
}
