import { choiceLabel, defaultModelScope } from "../../work-model/model-runtime-routing.ts";
import { modelEffortLabel } from "../../../../console-integration/governed-ai/model-selection.ts";
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
  return [{ label: "Service response", value: error, tone: "warn" }];
}
export function modelOperationMetadata(operation: ModelRuntimeOperation): TerasMetadataItem[] {
  return [
    { label: "Request", value: operation.request_id }, { label: "Attempt", value: operation.attempt },
    ...(typeof operation.request.input.backend_id === "string" ? [{ label: "Backend", value: operation.request.input.backend_id }] : []),
    ...(typeof operation.request.input.model === "string" ? [{ label: "Model", value: operation.request.input.model }] : []),
    ...(operation.owner_receipt ? [{ label: "Accepted revision", value: operation.owner_receipt.revision }] : []),
    ...(operation.failure ? [{ label: "Failure", value: operation.failure.code }] : []),
  ];
}

export function modelRouteHealthLabel(registry: ModelRegistry, task: string) {
  const config = registry.configuration.configuration;
  const route = task === defaultModelScope ? config.default : Object.hasOwn(config.overrides, task) ? config.overrides[task] : config.default;
  if (!route) return "Existing profile; checked on use";
  return providerHealthLabel(currentProviderHealth(registry)?.models.find(row => row.model_id === route.primary.model_id));
}

export function modelRuntimeSummaryStatus(fresh: boolean, preview: boolean, error: string | null, revision: number): TerasSurfaceStatusModel {
  const detail = preview ? "Read-only design samples. No provider, account, request or receipt is simulated as current source state."
    : error ?? "Configuration was read from the model service. Model and account health remain separate checks.";
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

export function modelRouteRegisterContent(registry: ModelRegistry, scope: string, labels: Record<string,string>) {
  const config=registry.configuration.configuration;
  const route=scope!==defaultModelScope && Object.hasOwn(config.overrides,scope) ? config.overrides[scope] : config.default;
  const model=route ? config.models[route.primary.model_id] : null;
  return {
    model: route ? model?.model ?? "Unavailable registered model" : "Existing profile binding",
    connection: model ? labels[model.backend_id] ?? model.backend_id : undefined,
    effort: route ? modelEffortLabel(route.primary.effort) : "Profile-controlled",
    fallbacks: route?.fallbacks.length ? `${route.fallbacks.length} fallback${route.fallbacks.length===1 ? "" : "s"}` : undefined,
  };
}

export function modelOperationGuidance(operation:ModelRuntimeOperation):string {
  if(operation.state==="awaiting-account")return "Open account sign-in, enter the displayed device code and return here. The service will check the same operation.";
  if(operation.state==="completed")return operation.request.action==="model.register" ? "The model registration was verified and recorded. Choose its workflows in Review routing." : operation.request.action==="backend.register" ? "The connection is registered. Select it in Manage registrations to verify a model." : operation.request.action==="account.login.start" ? "Account sign-in is complete. Return to Manage registrations to verify a model." : "The service confirmed this operation. Saved model settings and operation history are available for inspection.";
  if(operation.state==="retryable")return "The service allows another attempt of this same request. Use Retry original intent to keep its identity.";
  if(operation.state==="unknown"||operation.state==="blocked")return "Check the original request and its service evidence before starting another operation.";
  if(operation.state==="rejected")return "The service rejected this request. Inspect its failure details before correcting and submitting a new request.";
  if(operation.state==="cancelled")return "This operation is cancelled. Its recorded history is retained.";
  return "The service is processing the original request. Keep this operation selected while it completes.";
}
export function modelAccountChallengeMetadata(operation:ModelRuntimeOperation):TerasMetadataItem[]{
  return operation.account_login ? [{label:"Account state",value:operation.account_login.state.replace(/-/g," ")},{label:"Device code",value:operation.account_login.user_code??"No active challenge"}] : [];
}
