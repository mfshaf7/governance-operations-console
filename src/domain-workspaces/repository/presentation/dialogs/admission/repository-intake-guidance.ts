import { graphRoles, validationApproaches } from "../../../../../console-integration/workspace-intake/workspace-intake-display-options.ts";
import type { RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";
import type { WorkspaceIntakeRequestedRecord } from "../../../../../console-integration/workspace-intake/workspace-intake-live-types.ts";

export type RepositoryIntakeDraft = {
  repoClass: string; securityBinding: string; securityOwner: string; notes: string;
  validationPosture: string; graphRole: string; catalogRefs: string; validationNotes: string;
};

// Readable presets for existing owner classes and intake-policy roles. Selecting
// one fills metadata for review; it never establishes admission or readiness.
export const repositoryIntakeTypes = [
  { value: "application", label: "Project source, notes or documentation", repoClass: "product-source", role: "product-runtime-source" },
  { value: "product", label: "Main product repository", repoClass: "product-owner", role: "product-runtime-source" },
  { value: "prototype", label: "Prototypes and experiments", repoClass: "product-incubation", role: "product-runtime-source" },
  { value: "runtime", label: "Product runtime or backend", repoClass: "product-runtime", role: "product-runtime-source" },
  { value: "channel", label: "Communication channel integration", repoClass: "product-channel", role: "product-channel-source" },
  { value: "workflow", label: "Shared operator workflows", repoClass: "shared-operator-service", role: "operator-workflow-source" },
  { value: "platform", label: "Platform infrastructure and deployment", repoClass: "platform", role: "platform-authority-source" },
  { value: "governance", label: "Workspace governance and check catalog", repoClass: "governance", role: "catalog-authority-source" },
  { value: "validation", label: "Governance validation service", repoClass: "governance-runtime", role: "wgcf-runtime-source" },
  { value: "context", label: "Context handling service", repoClass: "governance-runtime", role: "context-packet-provider" },
  { value: "security", label: "Security policies and review", repoClass: "security-governance", role: "security-authority-source" },
  { value: "enforcement", label: "Host or runtime enforcement", repoClass: "runtime-enforcement", role: "runtime-enforcement-source" },
] as const;

export function repositoryIntakeDraftFromCustody(result: RepositoryCustodyWorkflowResult): RepositoryIntakeDraft {
  return { repoClass: "", securityBinding: "", securityOwner: "",
    notes: result.request.action === "provision-new" ? result.request.provisioning.description ?? "" : "",
    validationPosture: "", graphRole: "", catalogRefs: "", validationNotes: "" };
}

// Reuse recorded answers only; never infer approval or security requirements.
export function repositoryIntakeRecordedDraft(record: WorkspaceIntakeRequestedRecord) {
  if (record.kind !== "repo" || !record.repo_class || !record.validation_behavior || record.requires_security_bindings === null) return null;
  const draft: RepositoryIntakeDraft = {
    repoClass: record.repo_class, notes: record.notes,
    securityBinding: String(record.requires_security_bindings), securityOwner: record.security_owner ?? "",
    validationPosture: record.validation_behavior.posture, graphRole: record.validation_behavior.wgcf_graph_role,
    catalogRefs: record.validation_behavior.catalog_refs.join(","), validationNotes: record.validation_behavior.notes,
  };
  const type = repositoryIntakeTypes.find(item => item.repoClass === draft.repoClass && item.role === draft.graphRole)?.value ?? "custom";
  return {draft, type};
}

export const repositoryCheckApproaches = validationApproaches.map(item => ({...item, label: ({
  "covered-by-owner-repo": "This repository maintains its own checks",
  "profile-gated-external-owner": "Reuse an existing shared check plan",
  "runtime-consumer": "Use results from another validation service",
  "interface-contract-backed": "Check an agreed service interface",
  "catalog-owner": "Maintain shared governance checks",
  "proposed-profile-gated": "Plan a new validation runtime",
  "build-admitted-profile-gated": "Use a runtime approved for implementation",
})[item.value]}));

export function repositoryIntakeTypeDraft(draft: RepositoryIntakeDraft, type: string): RepositoryIntakeDraft {
  const preset = repositoryIntakeTypes.find(item => item.value === type);
  return preset ? { ...draft, repoClass: preset.repoClass, graphRole: preset.role,
    ...(["application", "product", "prototype"].includes(type) && !draft.validationPosture ? { validationPosture: "covered-by-owner-repo" } : {}) } : draft;
}

export function repositoryIntakeRequiresCatalog(posture: string) {
  return ["catalog-owner", "profile-gated-external-owner", "interface-contract-backed"].includes(posture);
}

export function repositoryIntakeRoles(posture: string) {
  const allowed = posture === "proposed-profile-gated" ? ["proposed-shared-platform-component", "context-packet-provider"]
    : posture === "build-admitted-profile-gated" ? ["shared-platform-component", "context-packet-provider"] : null;
  return allowed ? graphRoles.filter(item => allowed.includes(item.value)) : graphRoles;
}

export function repositoryIntakeMissingFields(draft: RepositoryIntakeDraft): string[] {
  const missing: string[] = [];
  if (!/^[a-z0-9][a-z0-9-]*$/.test(draft.repoClass.trim())) missing.push("Choose a repository type, or enter a category using lowercase letters, numbers and hyphens.");
  if (!draft.notes.trim()) missing.push("Describe what this repository owns.");
  if (!validationApproaches.some(item => item.value === draft.validationPosture)) missing.push("Choose how this repository will be checked.");
  if (!repositoryIntakeRoles(draft.validationPosture).some(item => item.value === draft.graphRole)) missing.push("Choose a compatible validation role in Advanced settings.");
  if (!draft.validationNotes.trim() && draft.validationPosture !== "covered-by-owner-repo") missing.push("Describe the governance checks, or load an existing owner’s check plan.");
  if (repositoryIntakeRequiresCatalog(draft.validationPosture) && !draft.catalogRefs.split(",").some(ref => ref.trim())) missing.push("Load registered checks from their owner, or enter reviewed check IDs in Advanced settings.");
  if (!["true", "false"].includes(draft.securityBinding)) missing.push("Choose whether a separate security repository is required by the project design.");
  if (draft.securityBinding === "true" && !/^[a-z0-9][a-z0-9._-]*$/.test(draft.securityOwner.trim())) missing.push("Choose the repository that maintains the required security policies and reviews.");
  return missing;
}
