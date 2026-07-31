import type {
  RepositoryWorkspaceRuntimeLaneStatus,
  RepositoryWorkspaceSecurityBindingStatus,
} from "../domain/repository-types.ts";

export function repositoryRuntimeLaneStatusLabel(
  status: RepositoryWorkspaceRuntimeLaneStatus,
) {
  switch (status) {
    case "blocked-by-proposal-gate":
      return "Blocked by proposal gate";
    case "decision-needed":
      return "Decision needed";
    case "not-required":
      return "Not required";
    case "platform-authority":
      return "Platform authority";
    case "platform-promotion-path":
      return "Platform promotion path";
    case "product-channel-path":
      return "Product channel path";
    case "profile-active":
      return "Profile active";
    case "profile-managed":
      return "Profile-managed";
    case "prototype-lane":
      return "Prototype lane";
    case "retired":
      return "Retired";
    case "runtime-enforcement-path":
      return "Runtime-enforcement path";
  }
}

export function repositorySecurityBindingStatusLabel(
  status: RepositoryWorkspaceSecurityBindingStatus,
) {
  switch (status) {
    case "authority-owner":
      return "Authority owner";
    case "baseline-linked":
      return "Baseline linked";
    case "binding-required":
      return "Binding required";
    case "not-applicable":
      return "Not applicable";
    case "not-evaluated":
      return "Not evaluated";
    case "review-coverage":
      return "Review coverage";
    case "review-trigger-check-needed":
      return "Review trigger check needed";
  }
}
