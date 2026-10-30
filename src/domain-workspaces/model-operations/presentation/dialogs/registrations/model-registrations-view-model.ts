import type { TerasMetadataItem } from "@/teras";
import type { ModelBackend, ModelRegistry } from "../../../work-model/model-runtime-contract.ts";
import { currentProviderHealth, providerHealthLabel } from "../../../work-model/model-provider-health.ts";

export function registeredModelsForBackend(registry: ModelRegistry, backendId: string | undefined) {
  return Object.entries(registry.configuration.configuration.models)
    .filter(([, model]) => model.backend_id === backendId)
    .map(([id, model]) => ({ id, ...model }));
}

export function modelBackendStatusMetadata(registry: ModelRegistry, backend: ModelBackend | null): TerasMetadataItem[] {
  const health = currentProviderHealth(registry);
  const observation = health?.backends.find(row => row.backend_id === backend?.backend_id);
  return [
    { label: "Registration", value: backend?.registered ? "Registered" : "Not registered" },
    { label: "Backend health", value: backend?.registered ? providerHealthLabel(observation) : "Not checked",
      detail: health ? "Checked " + new Date(health.checked_at).toLocaleTimeString() : "No current owner health observation" },
  ];
}

export function modelBackendQualificationMetadata(backend: ModelBackend | null): TerasMetadataItem[] {
  return backend?.experimental ? [
    { label: "Qualification", value: "Experimental — real-account testing pending", tone: "warn" },
    { label: "Explicit verification", value: "May consume up to 4,096 output tokens and 60 seconds" },
  ] : [];
}

export function modelBackendMetadata(registry: ModelRegistry, backend: ModelBackend | null): TerasMetadataItem[] {
  return [...modelBackendStatusMetadata(registry, backend), ...modelBackendQualificationMetadata(backend)];
}

export function modelRegistrationHealthLabel(registry: ModelRegistry, modelId: string) {
  return providerHealthLabel(currentProviderHealth(registry)?.models.find(row => row.model_id === modelId));
}

export function modelVerificationMetadata(registry: ModelRegistry, backendId: string | undefined, name: string): TerasMetadataItem[] {
  const selected = Object.entries(registry.configuration.configuration.models).find(([, row]) => row.backend_id === backendId && row.model === name);
  if (!selected) return [];
  const observation = currentProviderHealth(registry)?.models.find(row => row.model_id === selected[0]);
  const success = observation?.last_success;
  const recent = success && Date.now() - Date.parse(success.at) <= 900_000;
  return [
    { label: "Model health", value: providerHealthLabel(observation) },
    { label: "Registered runtime", value: selected[1].runtime_version ?? "Not supplied by provider" },
    { label: "Observed runtime", value: observation?.observed_runtime_version ?? (registry.backends.find(row => row.backend_id === backendId)?.experimental ? "Not supplied by provider" : "Not observed") },
    { label: "Model content", value: observation?.observed_model_digest
      ? observation.observed_model_digest === selected[1].model_digest ? "Unchanged" : "Changed"
      : selected[1].model_digest === null && registry.backends.find(row => row.backend_id === backendId)?.experimental ? "Not supplied by provider" : "Not observed",
      title: "Registered digest: " + (selected[1].model_digest ?? "Not advertised") + "\nObserved digest: " + (observation?.observed_model_digest ?? "Not observed") },
    { label: "Last model success", value: success ? (success.kind === "verification" ? "Verification" : "Request") + (recent ? " · recent" : " · stale") : "Verification needed",
      detail: success ? new Date(success.at).toLocaleString() : "No timestamped result for this registration and account",
      title: success?.reference },
  ];
}
