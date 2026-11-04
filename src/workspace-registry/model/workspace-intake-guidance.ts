export { validationApproaches, graphRoles, deliveryTargets } from "../../console-integration/workspace-intake/workspace-intake-display-options.ts";
import type { DirectIntakeDraft, DirectIntakeKind } from "../../console-integration/workspace-intake/workspace-intake-direct-candidate.ts";
import type { WorkspaceInventoryLifecyclePreparation } from "../model/workspace-registry-types.ts";
import { inventoryPreparationPosture } from "./workspace-registry-lifecycle-state.ts";

// Presentation of the existing intake-policy contract; the owner still validates requests.
export const componentTypes = [
  { value: "shared-platform", label: "Shared infrastructure service", role: "shared-platform-component" },
  { value: "shared-governance-runtime", label: "Shared governance service", role: "shared-governance-runtime-component" },
  { value: "product-runtime", label: "Product runtime or backend", role: "product-runtime-component" },
  { value: "product-channel", label: "Product communication channel", role: "product-channel-component" },
  { value: "product-plugin", label: "Product plugin or extension", role: "product-plugin-component" },
  { value: "workflow", label: "Operator workflow service", role: "operator-workflow-component", componentClass: "shared-platform" },
  { value: "context", label: "Context handling service", role: "context-packet-provider", componentClass: "shared-governance-runtime" },
] as const;
export function derivedIntakeRole(kind: DirectIntakeKind, componentType: string, approach: string) {
  if (kind === "product") return "product-readiness-aggregate";
  const role = componentTypes.find(type => type.value === componentType)?.role ?? "";
  return approach === "proposed-profile-gated" && role === "shared-platform-component" ? "proposed-shared-platform-component" : role;
}
export const directCheckApproaches = new Set(["catalog-owner", "profile-gated-external-owner", "interface-contract-backed"]);
export type IntakeOwnerSetup = Readonly<{
  repository: string; revision: string; version: number; digest: string; evidenceRef: string;
  notes: string; catalogRefs: readonly string[];
}>;
export function intakeOwnerSetup(preparation: WorkspaceInventoryLifecyclePreparation, repository: string): IntakeOwnerSetup {
  if (preparation.authority_kind === "internal-instance-record") throw new Error("This is a source-only project registration. Shared validation responsibility requires an existing Workspace Governance repository record.");
  if (preparation.target.kind !== "repo" || preparation.target.name !== repository || preparation.target.record_id !== `repo:${repository}` || inventoryPreparationPosture(preparation) !== "active") {
    throw new Error("The selected repository is no longer active. Choose a current repository and refresh its setup.");
  }
  const behavior = preparation.current_record.validation_behavior;
  if (!behavior || typeof behavior !== "object" || Array.isArray(behavior)) throw new Error("This repository has no recorded validation plan. Its maintainers must complete that record before it can be reused.");
  const value = behavior as Record<string, unknown>;
  if (typeof value.notes !== "string" || !value.notes.trim() || !Array.isArray(value.catalog_refs) || value.catalog_refs.some(ref => typeof ref !== "string" || !ref.trim())) throw new Error("The repository’s validation plan is incomplete. Ask its maintainers to correct it, then refresh.");
  return { repository, revision: preparation.authority_revision, version: preparation.expected_state.record_version,
    digest: preparation.expected_state.record_digest,
    evidenceRef: `git://workspace-governance/${preparation.authority_revision}/contracts/repos.yaml#${repository}`,
    notes: value.notes, catalogRefs: value.catalog_refs as string[] };
}
export function guidedIntakeDraft(kind: DirectIntakeKind, draft: DirectIntakeDraft, setup: IntakeOwnerSetup): DirectIntakeDraft {
  if (!draft.notes.trim()) throw new Error(`Describe what this ${kind} does and what it is responsible for.`);
  if (!draft.validationPosture) throw new Error("Choose how this item will be checked.");
  if (!draft.graphRole) throw new Error("Choose a component type, or set its role under Advanced validation settings.");
  const allowed = draft.validationPosture === "proposed-profile-gated" ? ["proposed-shared-platform-component", "context-packet-provider"] : draft.validationPosture === "build-admitted-profile-gated" ? ["shared-platform-component", "context-packet-provider"] : null;
  if (allowed && !allowed.includes(draft.graphRole)) throw new Error("This profile approach needs a compatible validation role. Check Advanced validation settings before continuing.");
  const catalogRefs = draft.catalogRefs.trim() || (directCheckApproaches.has(draft.validationPosture) ? setup.catalogRefs.join(",") : "");
  if (directCheckApproaches.has(draft.validationPosture) && !catalogRefs) throw new Error("The selected repository has no registered checks for this approach. Choose the repository that owns those checks, or use repository-run tests.");
  return { ...draft, catalogRefs,
    validationNotes: `Validation responsibility is linked to ${setup.repository}. Recorded owner plan: ${setup.notes}\nThis is contextual repository metadata, not proof that this new item passed its checks.${draft.validationNotes.trim() ? `\nAdditional checks and limits: ${draft.validationNotes.trim()}` : ""}`,
    evidence: [...new Set([setup.evidenceRef, ...draft.evidence.split(/\n/).map(ref => ref.trim()).filter(Boolean)])].join("\n"),
  };
}
