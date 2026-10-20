import type { WorkspaceIntakeCustodyPreparation } from "@/console-integration/workspace-intake/workspace-intake-live-types.ts";
import type { RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";
import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";

export function repositoryIntakeCustody(
  repository: RepositoryWorkspaceRecord | null,
  result?: RepositoryCustodyWorkflowResult,
) {
  const name = /^repo:([a-z0-9][a-z0-9._-]*)$/.exec(result?.request.requested_custody.workspace_owner_ref ?? "")?.[1];
  const provider = result?.provider_readback;
  if (!repository?.providerIdentity || !name || result?.status !== "succeeded" ||
      result.receipt?.outcome !== "succeeded" || !provider || provider.provider_lifecycle_state !== "active" ||
      provider.repository_identity.provider_repository_id !== repository.providerIdentity.repositoryId ||
      provider.repository_identity.provider !== repository.providerIdentity.provider ||
      result.receipt.repository_identity?.provider_repository_id !== provider.repository_identity.provider_repository_id) return null;
  return { target: { kind: "repo" as const, name }, requestId: result.request.request_id };
}

export type RepositoryIntakeDraft = {
  repoClass: string; securityBinding: string; securityOwner: string; notes: string;
  validationPosture: string; graphRole: string; catalogRefs: string; validationNotes: string;
};

export const emptyRepositoryIntakeDraft: RepositoryIntakeDraft = {
  repoClass: "", securityBinding: "", securityOwner: "", notes: "",
  validationPosture: "", graphRole: "", catalogRefs: "", validationNotes: "",
};

export function repositoryIntakeRecord(draft: RepositoryIntakeDraft): WorkspaceIntakeCustodyPreparation["requested_record"] | null {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(draft.repoClass.trim()) ||
      !["true", "false"].includes(draft.securityBinding) ||
      (draft.securityBinding === "true" && !/^[a-z0-9][a-z0-9._-]*$/.test(draft.securityOwner.trim())) ||
      !draft.notes.trim() || !draft.validationPosture || !draft.graphRole.trim() || !draft.validationNotes.trim()) return null;
  return {
    kind: "repo", repo_class: draft.repoClass.trim(), requires_security_bindings: draft.securityBinding === "true",
    security_owner: draft.securityBinding === "true" ? draft.securityOwner.trim() : null,
    notes: draft.notes.trim(),
    validation_behavior: {
      posture: draft.validationPosture, wgcf_graph_role: draft.graphRole.trim(),
      catalog_refs: draft.catalogRefs.split(",").map((ref) => ref.trim()).filter(Boolean),
      notes: draft.validationNotes.trim(),
    },
  };
}
