import { defaultModelScope } from "../../work-model/model-runtime-routing.ts";
import { currentProviderHealth, providerHealthLabel } from "../../work-model/model-provider-health.ts";
import type { TerasMetadataItem } from "@/teras";
import type { ModelBackend, ModelRegistry, ModelRuntimeOperation } from "../../work-model/model-runtime-contract.ts";

export function modelBackendMetadata(registry: ModelRegistry, backend: ModelBackend | null): TerasMetadataItem[] {
  const health = currentProviderHealth(registry);
  const observation = health?.backends.find(row => row.backend_id === backend?.backend_id);
  return [
    { label: "Registered models", value: Object.keys(registry.configuration.configuration.models).length },
    { label: "Backend", value: backend?.registered ? providerHealthLabel(observation) : "Not registered",
      detail: health ? "Checked " + new Date(health.checked_at).toLocaleTimeString() : "Awaiting a post-start check" },
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

export function modelVerificationMetadata(registry: ModelRegistry, backendId: string | undefined, name: string): TerasMetadataItem[] {
  const selected = Object.entries(registry.configuration.configuration.models).find(([, row]) => row.backend_id === backendId && row.model === name);
  if (!selected) return [];
  const observation = currentProviderHealth(registry)?.models.find(row => row.model_id === selected[0]);
  const success = observation?.last_success;
  const recent = success && Date.now() - Date.parse(success.at) <= 900_000;
  return [
    { label: "Registration", value: providerHealthLabel(observation) },
    { label: "Registered runtime", value: selected[1].runtime_version },
    { label: "Observed runtime", value: observation?.observed_runtime_version ?? "Not observed" },
    { label: "Model content", value: observation?.observed_model_digest
      ? observation.observed_model_digest === selected[1].model_digest ? "Unchanged" : "Changed"
      : "Not observed",
      title: "Registered digest: " + (selected[1].model_digest ?? "Not advertised") + "\nObserved digest: " + (observation?.observed_model_digest ?? "Not observed") },
    { label: "Last model success", value: success ? (success.kind === "verification" ? "Verification" : "Request") + (recent ? " · recent" : " · stale") : "Verification needed",
      detail: success ? new Date(success.at).toLocaleString() : "No timestamped result for this registration and account",
      title: success?.reference },
  ];
}
export function modelRouteHealthLabel(registry: ModelRegistry, task: string) {
  const config = registry.configuration.configuration;
  const route = task === defaultModelScope ? config.default : Object.hasOwn(config.overrides, task) ? config.overrides[task] : config.default;
  if (!route) return "Existing profile; checked on use";
  return providerHealthLabel(currentProviderHealth(registry)?.models.find(row => row.model_id === route.primary.model_id));
}

export function modelProviderMetadata(registry: ModelRegistry, backend: ModelBackend | null, name: string): TerasMetadataItem[] {
  return [...modelBackendMetadata(registry, backend), ...modelVerificationMetadata(registry, backend?.backend_id, name)];
}
