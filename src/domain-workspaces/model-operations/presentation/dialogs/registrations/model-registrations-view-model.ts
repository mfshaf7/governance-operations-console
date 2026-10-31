import type { TerasMetadataItem, TerasTone } from "@/teras";
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

export type ModelInspectionRow = {
  id: string; label: string; value: string; detail: string; tone: TerasTone;
};

export function modelRegistrationInspection(registry: ModelRegistry, modelId: string) {
  const model = registry.configuration.configuration.models[modelId];
  const observation = currentProviderHealth(registry)?.models.find(row => row.model_id === modelId);
  const success = observation?.last_success;
  const recent = success && Date.now() - Date.parse(success.at) <= 900_000;
  const experimental = registry.backends.find(row => row.backend_id === model.backend_id)?.experimental;
  const observedDigest = observation?.observed_model_digest;
  const runtimeChanged = Boolean(observation?.observed_runtime_version && model.runtime_version
    && observation.observed_runtime_version !== model.runtime_version);
  const contentChanged = Boolean(observedDigest && model.model_digest && observedDigest !== model.model_digest);
  const healthLabel = providerHealthLabel(observation);
  const healthTone: TerasTone = !observation ? "muted"
    : observation.state === "unavailable" || observation.state === "verification-needed" ? "warn"
    : observation.code === "recent-model-success" && recent ? "ok" : "info";
  const summary: ModelInspectionRow[] = [
    { id: "success", label: "Last successful check",
      value: success ? (success.kind === "verification" ? "Verification" : "Request") + (recent ? " · recent" : " · stale") : observation ? "No result recorded" : "Not available",
      detail: success ? new Date(success.at).toLocaleString() : observation ? "No timestamped success for this registration and account." : "No current owner observation.",
      tone: success && recent ? "info" : "muted" },
    { id: "content", label: "Model content", value: observedDigest
        ? model.model_digest ? contentChanged ? "Changed" : "Unchanged" : "No registered digest"
        : model.model_digest === null && experimental ? "Not supplied" : "Not observed",
      detail: contentChanged ? "The observed content differs from this registration. Verify before using it."
        : observedDigest && model.model_digest ? "Matches the registered model content."
        : "A current comparison is unavailable.", tone: contentChanged ? "warn" : "muted" },
    ...(runtimeChanged ? [{ id: "runtime-change", label: "Runtime version changed", value: "Verify again",
      detail: "The observed runtime differs from the registered version.", tone: "warn" as const }] : []),
    ...(observation?.code === "registration-changed" && !runtimeChanged && !contentChanged
      ? [{ id: "registration-change", label: "Registration changed", value: "Review needed",
        detail: "The owner reports changed registration metadata.", tone: "warn" as const }] : []),
  ];
  const technical: TerasMetadataItem[] = [
    { label: "Registered runtime", value: model.runtime_version ?? "Not supplied by provider" },
    { label: "Observed runtime", value: observation?.observed_runtime_version ?? (experimental ? "Not supplied by provider" : "Not observed") },
    { label: "Registered digest", value: model.model_digest ?? "Not supplied by provider" },
    { label: "Observed digest", value: observedDigest ?? "Not observed" },
    { label: "Registration evidence", value: model.verification_ref },
    ...(success ? [{ label: "Last success evidence", value: success.reference }] : []),
  ];
  return { healthLabel, healthTone, summary, technical };
}
