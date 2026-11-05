import type { WorkspaceIntakeCustodyPreparation } from "@/console-integration/workspace-intake/workspace-intake-live-types.ts";
import { repositoryWorkspaceName } from "../../../domain/repository-workspace-reference.ts";
import type { RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";
import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import { repositoryIntakeMissingFields, type RepositoryIntakeDraft } from "./repository-intake-guidance.ts";
export type { RepositoryIntakeDraft } from "./repository-intake-guidance.ts";

export function repositoryIntakeCustody(
  repository: RepositoryWorkspaceRecord | null,
  result?: RepositoryCustodyWorkflowResult,
) {
  const name = repositoryWorkspaceName(result?.request.requested_custody.workspace_owner_ref);
  const provider = result?.provider_readback;
  if (!repository?.providerIdentity || !name || result?.status !== "succeeded" ||
      result.receipt?.outcome !== "succeeded" || !provider || provider.provider_lifecycle_state !== "active" ||
      provider.repository_identity.provider_repository_id !== repository.providerIdentity.repositoryId ||
      provider.repository_identity.provider !== repository.providerIdentity.provider ||
      result.receipt.repository_identity?.provider_repository_id !== provider.repository_identity.provider_repository_id) return null;
  return { target: { kind: "repo" as const, name }, requestId: result.request.request_id };
}

export const emptyRepositoryIntakeDraft: RepositoryIntakeDraft = {
  repoClass: "", securityBinding: "", securityOwner: "", notes: "",
  validationPosture: "", graphRole: "", catalogRefs: "", validationNotes: "",
};

export function repositoryIntakeRecord(draft: RepositoryIntakeDraft): WorkspaceIntakeCustodyPreparation["requested_record"] | null {
  if (repositoryIntakeMissingFields(draft).length) return null;
  return {
    kind: "repo", repo_class: draft.repoClass.trim(), requires_security_bindings: draft.securityBinding === "true",
    security_owner: draft.securityBinding === "true" ? draft.securityOwner.trim() : null,
    notes: draft.notes.trim(),
    validation_behavior: {
      posture: draft.validationPosture, wgcf_graph_role: draft.graphRole.trim(),
      catalog_refs: draft.catalogRefs.split(",").map((ref) => ref.trim()).filter(Boolean),
      notes: draft.validationNotes.trim() || "Source-owner controls and source review are maintained by this repository. Application verification may be configured later; registration is not application acceptance.",
    },
  };
}
