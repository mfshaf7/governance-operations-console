import { choiceLabel, defaultModelScope } from "../../work-model/model-runtime-routing.ts";
import { currentProviderHealth, providerHealthLabel } from "../../work-model/model-provider-health.ts";
import type { TerasMetadataItem, TerasSurfaceStatusModel } from "@/teras";
import type { ModelRegistry, ModelRuntimeOperation } from "../../work-model/model-runtime-contract.ts";

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

export function modelRouteHealthLabel(registry: ModelRegistry, task: string) {
  const config = registry.configuration.configuration;
  const route = task === defaultModelScope ? config.default : Object.hasOwn(config.overrides, task) ? config.overrides[task] : config.default;
  if (!route) return "Existing profile; checked on use";
  return providerHealthLabel(currentProviderHealth(registry)?.models.find(row => row.model_id === route.primary.model_id));
}

export function modelRuntimeSummaryStatus(fresh: boolean, preview: boolean, error: string | null, revision: number): TerasSurfaceStatusModel {
  const detail = preview ? "Read-only design samples. No provider, account, request or receipt is simulated as current owner state."
    : error ?? "Configuration was read from the model owner. Model and account health remain separate checks.";
  const stateLabel = preview ? "Sample" : fresh ? "Current" : "Unavailable";
  const tone = preview || fresh ? "info" as const : "warn" as const;
  return { ariaLabel: "Model configuration status", kicker: "Model configuration", title: "Configuration source", summary: detail, statusLabel: stateLabel, tone,
    items: [{ id: "configuration", label: "Configuration", stateLabel, detail, tone,
      facts: [{ label: preview ? "Sample revision" : "Last read revision", value: revision }] }] };
}

export function modelSelectedRouteMetadata(registry: ModelRegistry, scope: string): TerasMetadataItem[] {
  const config = registry.configuration.configuration;
  const override = scope !== defaultModelScope && Object.hasOwn(config.overrides, scope);
  const route = override ? config.overrides[scope] : config.default;
  return [
    { label: "Setting", value: scope === defaultModelScope ? "System default" : override ? "Workflow override" : "Inherits system default" },
    { label: "Primary health", value: modelRouteHealthLabel(registry, scope) },
    { label: "Fallbacks", value: route?.fallbacks.length ?? "Profile-controlled" },
  ];
}

export function modelSavedRouteMetadata(registry: ModelRegistry, scope: string, labels: Record<string, string>): TerasMetadataItem[] {
  const config = registry.configuration.configuration;
  const route = scope !== defaultModelScope && Object.hasOwn(config.overrides, scope) ? config.overrides[scope] : config.default;
  return [
    { label: "Saved primary", value: route ? choiceLabel(config, route.primary, labels) : "Existing profile binding" },
    ...(route?.fallbacks.map((choice, index) => ({ label: "Saved fallback " + (index + 1), value: choiceLabel(config, choice, labels) })) ?? []),
    { label: "When all choices fail", value: "Stop and report the failure" },
  ];
}
