import type { TerasMetadataItem } from "@/teras";

import type { RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";
import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";

export function repositoryCustodyProviderMetadata(
  repository: RepositoryWorkspaceRecord,
): TerasMetadataItem[] {
  const identity = repository.providerIdentity;
  return [
    { label: "Provider", value: identity?.provider ?? "Not resolved" },
    {
      label: "Repository",
      value: identity ? `${identity.owner}/${identity.name}` : repository.name,
    },
    {
      label: "Provider ID",
      value: identity?.repositoryId ?? "Not resolved",
    },
    {
      label: "Current custody",
      value: repository.custody?.state ?? "Not projected",
    },
  ];
}

export function repositoryCustodyResultMetadata(
  result: RepositoryCustodyWorkflowResult,
): TerasMetadataItem[] {
  return [
    { label: "Request", value: result.request.request_id },
    { label: "Decision", value: result.decision.outcome },
    {
      label: "Provider readback",
      value: result.provider_readback
        ? `${result.provider_readback.canonical_owner}/${result.provider_readback.canonical_name}`
        : "Not returned",
    },
    { label: "Receipt", value: result.receipt.receipt_id },
  ];
}

export function repositoryCustodyResultProjection(
  result?: RepositoryCustodyWorkflowResult,
  error?: { message: string; retryable: boolean },
) {
  if (result?.status === "succeeded") {
    return {
      description:
        "OOS linked the immutable provider repository identity to the reviewed workspace owner and retained a terminal receipt.",
      statusLabel: result.replayed ? "Replayed" : "Linked",
      title: "Repository custody linked",
      tone: "ok" as const,
    };
  }
  if (result) {
    return {
      description:
        result.failure?.message ??
        "OOS returned a terminal result without changing repository custody.",
      statusLabel: result.retryable ? "Retry available" : "Correction required",
      title: "Custody unchanged",
      tone: result.retryable ? ("warn" as const) : ("danger" as const),
    };
  }
  if (error) {
    return {
      description: error.message,
      statusLabel: error.retryable ? "Retry available" : "Unavailable",
      title: "Live workflow unavailable",
      tone: error.retryable ? ("warn" as const) : ("danger" as const),
    };
  }
  return {
    description:
      "Submit the reviewed identity to OOS. WGCF decides readiness, GitHub supplies provider truth, and OOS returns the terminal receipt.",
    statusLabel: "Not started",
    title: "Authoritative linkage result",
    tone: "info" as const,
  };
}

export function repositoryCustodyChecks(
  repository: RepositoryWorkspaceRecord,
  workspaceOwnerRef: string,
  approvalNote: string,
  result?: RepositoryCustodyWorkflowResult,
) {
  const identityReady = Boolean(repository.providerIdentity?.repositoryId);
  const ownerReady = Boolean(workspaceOwnerRef.trim());
  const approvalReady = approvalNote.trim().length >= 12;
  return [
    {
      detail: "A positive decimal GitHub repository ID is required.",
      label: "Immutable provider identity",
      status: identityReady ? "ready" : "required",
      tone: identityReady ? ("ok" as const) : ("warn" as const),
    },
    {
      detail: "Custody names the existing workspace owner record.",
      label: "Workspace owner",
      status: ownerReady ? "ready" : "required",
      tone: ownerReady ? ("ok" as const) : ("warn" as const),
    },
    {
      detail: "The operator records why the exact link is approved.",
      label: "Operator approval",
      status: approvalReady ? "ready" : "required",
      tone: approvalReady ? ("ok" as const) : ("warn" as const),
    },
    {
      detail: "Only OOS can return the terminal custody receipt.",
      label: "Workflow result",
      status: result?.status ?? "waiting",
      tone:
        result?.status === "succeeded"
          ? ("ok" as const)
          : result?.retryable
            ? ("warn" as const)
            : result
            ? ("danger" as const)
            : ("info" as const),
    },
  ];
}
