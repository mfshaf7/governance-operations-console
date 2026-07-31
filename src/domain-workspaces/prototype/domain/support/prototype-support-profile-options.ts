import type { OperationTone } from "../../../operation-contracts/operation-state.ts";

import type {
  PrototypeSupportProfile,
  PrototypeSupportState,
} from "../prototype-types.ts";

export const prototypeSupportProfileOptions: Array<{
  label: string;
  value: PrototypeSupportProfile;
}> = [
  { label: "Simple prototype", value: "simple-prototype" },
  { label: "Interactive prototype", value: "interactive-prototype" },
  { label: "Prototype with local runtime", value: "local-runtime" },
  { label: "Prototype with external dependency", value: "external-dependency" },
  { label: "Existing source review", value: "existing-source-review" },
  { label: "Custom support profile", value: "custom-support" },
];

export const prototypeSupportProfileGuidance: Array<{
  detail: string;
  label: string;
  value: PrototypeSupportProfile;
}> = [
  {
    detail:
      "Use when the request can start with a light record, basic docs, and no confirmed runtime or integration need.",
    label: "Simple prototype",
    value: "simple-prototype",
  },
  {
    detail:
      "Use when the work needs an operator-visible or user-facing surface, scenario data, and visual review.",
    label: "Interactive prototype",
    value: "interactive-prototype",
  },
  {
    detail:
      "Use when someone must run a local dev server, local service, or preview command to inspect the work.",
    label: "Prototype with local runtime",
    value: "local-runtime",
  },
  {
    detail:
      "Use when the prototype needs a mock, read-only, sandbox, or future external system boundary.",
    label: "Prototype with external dependency",
    value: "external-dependency",
  },
  {
    detail:
      "Use when the starting point is existing code, an imported folder, or a source path that needs custody review.",
    label: "Existing source review",
    value: "existing-source-review",
  },
  {
    detail:
      "Use when the operator must manually tune support row states instead of accepting a generated profile.",
    label: "Custom support profile",
    value: "custom-support",
  },
];

export const prototypeSupportStateOptions: Array<{
  label: string;
  value: PrototypeSupportState;
}> = [
  { label: "Unknown", value: "unknown" },
  { label: "Needed", value: "needed" },
  { label: "Ready", value: "ready" },
  { label: "Not needed", value: "not-needed" },
  { label: "Blocked", value: "blocked" },
];

export function prototypeSupportProfileLabel(value: PrototypeSupportProfile) {
  return (
    prototypeSupportProfileOptions.find((option) => option.value === value)
      ?.label ?? "Simple prototype"
  );
}

export function prototypeSupportProfileIsCustom(
  value: PrototypeSupportProfile,
) {
  return value === "custom-support";
}

export function prototypeSupportStateLabel(value: PrototypeSupportState) {
  switch (value) {
    case "blocked":
      return "Blocked";
    case "needed":
      return "Needed";
    case "not-needed":
      return "Not needed";
    case "ready":
      return "Ready";
    case "unknown":
      return "Unknown";
  }
}

export function prototypeSupportStateTone(
  value: PrototypeSupportState,
): OperationTone {
  switch (value) {
    case "blocked":
      return "danger";
    case "needed":
    case "unknown":
      return "warn";
    case "not-needed":
      return "muted";
    case "ready":
      return "ok";
  }
}
