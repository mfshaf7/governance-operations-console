import type { TerasMetadataItem } from "@/teras";

import type {
  RepositoryCustodyWorkflowResult,
  RepositoryProvisionIntent,
} from "../../../live-runtime/repository-custody-live-types.ts";
import type { RepositoryRequestDraft } from "../../../work-model/request/repository-request-model.ts";
import { emptyRepositoryRequestDraft } from "../../../work-model/request/repository-request-model.ts";

export function repositoryRequestBoundaryMetadata(): TerasMetadataItem[] {
  return [
    { label: "README", value: "Initialize" },
    { label: "Features", value: "Issues only" },
    { label: "Merge", value: "Squash only" },
    { label: "Branches", value: "Delete after merge" },
  ];
}

export function repositoryRequestDraftDirty(draft: RepositoryRequestDraft) {
  return Object.entries(draft).some(
    ([key, value]) =>
      value !== emptyRepositoryRequestDraft[key as keyof RepositoryRequestDraft],
  );
}

export function repositoryRequestDraftComplete(draft: RepositoryRequestDraft) {
  return (
    draft.name.trim().length > 0 &&
    draft.ownerDomain.trim().length > 0 &&
    draft.purpose.trim().length > 0 &&
    draft.purpose.trim().length <= 350 &&
    draft.workspaceOwnerRef.trim().length > 0 &&
    draft.approvalNote.trim().length >= 12 &&
    draft.templateReviewed
  );
}

export function repositoryProvisionIntentFromDraft(
  draft: RepositoryRequestDraft,
  request: { requestedAt: string; requestId: string },
): RepositoryProvisionIntent {
  if (!repositoryRequestDraftComplete(draft)) {
    throw new Error("Repository provisioning draft is incomplete.");
  }
  return {
    approvalNote: draft.approvalNote,
    custodyKind: draft.custodyKind,
    repositoryDescription: draft.purpose,
    repositoryName: draft.name,
    repositoryOwner: draft.ownerDomain,
    requestedAt: request.requestedAt,
    requestId: request.requestId,
    templateReviewed: true,
    visibility: draft.visibility,
    workspaceOwnerRef: draft.workspaceOwnerRef,
  };
}

export function repositoryProvisioningResultMetadata(
  result: RepositoryCustodyWorkflowResult,
): TerasMetadataItem[] {
  return [
    { label: "Request", value: result.request.request_id },
    { label: "Decision", value: result.decision.outcome },
    {
      label: "Provider ID",
      value:
        result.provider_readback?.repository_identity.provider_repository_id ??
        result.provider_operation.provider_repository_id ??
        "Not returned",
    },
    { label: "Receipt", value: result.receipt?.receipt_id ?? "Pending" },
  ];
}

export function repositoryProvisioningResultProjection(
  result?: RepositoryCustodyWorkflowResult,
  error?: { message: string; retryable: boolean },
) {
  if (result?.status === "succeeded") {
    return {
      description:
        "Provider readback matches the approved repository baseline. Workspace admission remains a separate action.",
      statusLabel: result.replayed ? "Replayed" : "Provisioned",
      title: "Repository provisioned",
      tone: "ok" as const,
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
  if (result?.status === "applying") {
    return {
      description:
        "OOS retained the provider-operation checkpoint. Read the same request again before retrying or changing it.",
      statusLabel: "Applying",
      title: "Provider operation running",
      tone: "warn" as const,
    };
  }
  if (result) {
    return {
      description:
        result.failure?.message ??
        "OOS returned a terminal result without provisioning the repository.",
      statusLabel: result.retryable ? "Retry available" : "Correction required",
      title: "Repository unchanged",
      tone: result.retryable ? ("warn" as const) : ("danger" as const),
    };
  }
  return {
    description:
      "OOS obtains the exact WGCF decision, creates at most once, and returns provider readback plus a terminal receipt.",
    statusLabel: "Not started",
    title: "Authoritative provisioning result",
    tone: "info" as const,
  };
}

export function repositoryProvisioningChecks(
  draft: RepositoryRequestDraft,
  result?: RepositoryCustodyWorkflowResult,
) {
  const coordinatesReady = Boolean(
    draft.ownerDomain.trim() && draft.name.trim() && draft.purpose.trim(),
  );
  const custodyReady = Boolean(draft.workspaceOwnerRef.trim());
  const approvalReady = draft.approvalNote.trim().length >= 12;
  return [
    {
      detail: "Organization, repository name, and purpose are required.",
      label: "Repository coordinates",
      status: coordinatesReady ? "ready" : "required",
      tone: coordinatesReady ? ("ok" as const) : ("warn" as const),
    },
    {
      detail: "Custody names the workspace owner for the new repository.",
      label: "Workspace custody",
      status: custodyReady ? "ready" : "required",
      tone: custodyReady ? ("ok" as const) : ("warn" as const),
    },
    {
      detail: "The fixed README, feature, and merge controls were reviewed.",
      label: "Provider baseline",
      status: draft.templateReviewed ? "reviewed" : "required",
      tone: draft.templateReviewed ? ("ok" as const) : ("warn" as const),
    },
    {
      detail: "The accountable operator records why creation is approved.",
      label: "Operator approval",
      status: approvalReady ? "ready" : "required",
      tone: approvalReady ? ("ok" as const) : ("warn" as const),
    },
    {
      detail: "Only OOS can return the terminal provisioning receipt.",
      label: "Workflow result",
      status: result?.status ?? "waiting",
      tone:
        result?.status === "succeeded"
          ? ("ok" as const)
          : result?.retryable || result?.status === "applying"
            ? ("warn" as const)
            : result
              ? ("danger" as const)
              : ("info" as const),
    },
  ];
}
