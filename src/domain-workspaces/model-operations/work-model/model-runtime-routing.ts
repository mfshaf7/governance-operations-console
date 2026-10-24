import type { ModelChoice, ModelConfiguration, ModelRegistry, ModelRoute } from "./model-runtime-contract.ts";
import { modelEffortLabel } from "../../../console-integration/governed-ai/model-selection.ts";

export const defaultModelScope = "__system_default__";
export type RoutingMode = "configured" | "source" | "inherit";
export function readRoutingDraft(config: ModelConfiguration, scope: string) {
  const present = scope === defaultModelScope || Object.hasOwn(config.overrides, scope);
  const route = scope === defaultModelScope ? config.default : config.overrides[scope];
  return {
    mode: !present ? "inherit" as const : route === null ? "source" as const : "configured" as const,
    route: route ? structuredClone(route) : { primary: { model_id: "", effort: null }, fallbacks: [], on_exhausted: "fail-closed" as const },
  };
}
export function routingInput(config: ModelConfiguration, scope: string, mode: RoutingMode, draft: ModelRoute) {
  const result = { default: structuredClone(config.default), overrides: structuredClone(config.overrides) };
  const route = mode === "configured" ? structuredClone(draft) : null;
  if (scope === defaultModelScope) result.default = route;
  else if (mode === "inherit") delete result.overrides[scope];
  else result.overrides[scope] = route;
  return result;
}
export function eligibleModelIds(registry: ModelRegistry, scope: string): string[] {
  const config = registry.configuration.configuration;
  const tasks = scope === defaultModelScope ? registry.tasks.filter(task => !Object.hasOwn(config.overrides, task)) : [scope];
  return Object.entries(config.models).filter(([, model]) => {
    const backend = registry.backends.find(item => item.backend_id === model.backend_id);
    return backend && tasks.every(task => backend.allowed_tasks.includes(task));
  }).map(([id]) => id);
}
export function routingDraftIssue(registry: ModelRegistry, scope: string, mode: RoutingMode, route: ModelRoute): string | null {
  if (mode !== "configured") return null;
  const eligible = eligibleModelIds(registry, scope), seen = new Set<string>();
  if (route.fallbacks.length > 4) return "Use at most four ordered fallbacks.";
  for (const choice of [route.primary, ...route.fallbacks]) {
    const model = registry.configuration.configuration.models[choice.model_id];
    if (!model || !eligible.includes(choice.model_id)) return "Choose registered models admitted for this workflow.";
    if (!model.supported_efforts.some(effort => Object.is(effort, choice.effort))) return "Choose an advertised native effort.";
    const key = JSON.stringify(choice);
    if (seen.has(key)) return "Remove duplicate model and effort selections.";
    seen.add(key);
  }
  return null;
}
export function choiceLabel(config: ModelConfiguration, choice: ModelChoice) {
  const model = config.models[choice.model_id];
  return model ? model.model + " · " + modelEffortLabel(choice.effort) : "Unavailable registered model";
}
export function effectiveRouteLabel(config: ModelConfiguration, scope: string) {
  const override = scope !== defaultModelScope && Object.hasOwn(config.overrides, scope);
  const route = override ? config.overrides[scope] : config.default;
  if (route === null) return "Existing profile binding";
  return choiceLabel(config, route.primary) + (route.fallbacks.length ? " · " + route.fallbacks.length + " fallback(s)" : "");
}
export function workflowTaskLabel(task: string) {
  const [profile, kind] = task.split("/");
  return (profile.replace(/-v[0-9]+$/, "").replace(/-/g, " ") + (kind ? " · " + kind.replace(/_/g, " ") : ""))
    .replace(/^[a-z]/, value => value.toUpperCase());
}
