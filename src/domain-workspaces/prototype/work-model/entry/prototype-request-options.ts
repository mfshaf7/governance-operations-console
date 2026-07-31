import type {
  PrototypeDataMode,
  PrototypeMutationBoundary,
  PrototypePreviewNeed,
  PrototypeSourceHome,
  PrototypeVisibilityTier,
} from "../../domain/prototype-types.ts";

export const prototypeRequestVisibilityOptions = [
  { label: "Private internal", value: "private-internal" },
  { label: "Operator review", value: "operator-review" },
  { label: "Client review", value: "client-review" },
  { label: "Public demo", value: "public-demo" },
];

export const prototypeRequestDataModeOptions = [
  { label: "Synthetic", value: "synthetic" },
  { label: "Mock", value: "mock" },
  { label: "Real read-only", value: "real-readonly" },
];

export const prototypeRequestMutationBoundaryOptions = [
  { label: "None", value: "none" },
  { label: "Prototype local", value: "prototype-local" },
  { label: "Read only", value: "read-only" },
  { label: "External sandbox", value: "external-sandbox" },
];

export const prototypeRequestSourceHomeOptions = [
  { label: "New prototype folder", value: "new-prototype-folder" },
  { label: "Console domain module", value: "console-domain-module" },
  { label: "App folder", value: "app-folder" },
  { label: "Docs only", value: "docs-only" },
  { label: "Existing source", value: "existing-source" },
  { label: "Future owner repo", value: "future-owner-repo" },
];

export const prototypeRequestPreviewNeedOptions = [
  { label: "Static review", value: "static-review" },
  { label: "Local dev server", value: "local-dev-server" },
  { label: "Local API", value: "local-backend-stub" },
  { label: "Prototype dev-integration", value: "prototype-devint" },
  { label: "Future dev-integration", value: "future-dev-integration" },
  { label: "No preview", value: "none" },
];

export function prototypeRequestVisibilityLabel(
  value: PrototypeVisibilityTier,
) {
  return optionLabel(prototypeRequestVisibilityOptions, value);
}

export function prototypeRequestDataModeLabel(value: PrototypeDataMode) {
  return optionLabel(prototypeRequestDataModeOptions, value);
}

export function prototypeRequestMutationBoundaryLabel(
  value: PrototypeMutationBoundary,
) {
  return optionLabel(prototypeRequestMutationBoundaryOptions, value);
}

export function prototypeRequestSourceHomeLabel(value: PrototypeSourceHome) {
  return optionLabel(prototypeRequestSourceHomeOptions, value);
}

export function prototypeRequestPreviewNeedLabel(value: PrototypePreviewNeed) {
  return optionLabel(prototypeRequestPreviewNeedOptions, value);
}

function optionLabel<Value extends string>(
  options: Array<{ label: string; value: Value }>,
  value: Value,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}
