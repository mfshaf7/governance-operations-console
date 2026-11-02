// Human labels for the existing owner contract; these choices do not grant authority.
export const validationApproaches = [
  { value: "covered-by-owner-repo", label: "The owner repository runs its own tests", detail: "The repository maintains the checks. No new governance check is invoked by this registration." },
  { value: "profile-gated-external-owner", label: "An existing runtime profile runs registered checks", detail: "Reuse the selected repository's registered checks through its approved runtime profile." },
  { value: "runtime-consumer", label: "This item uses another service's validation", detail: "The validation service owns execution; this item consumes its results." },
  { value: "interface-contract-backed", label: "An interface contract defines the checks", detail: "Use the repository's existing contract checks to validate this interface." },
  { value: "catalog-owner", label: "This item owns governance checks", detail: "Specialist setup for a repository or service responsible for registered governance checks." },
  { value: "proposed-profile-gated", label: "Checks need a proposed runtime profile", detail: "The profile is proposed. This records the plan and does not activate it." },
  { value: "build-admitted-profile-gated", label: "A profile is approved for implementation", detail: "Implementation is admitted; normal runtime activation remains a separate decision." },
] as const;
export const graphRoles = [
  ["product-readiness-aggregate", "Product readiness"], ["shared-platform-component", "Shared infrastructure component"],
  ["shared-governance-runtime-component", "Shared governance runtime"], ["product-runtime-component", "Product runtime component"],
  ["product-channel-component", "Product communication component"], ["product-plugin-component", "Product plugin"],
  ["operator-workflow-component", "Operator workflow component"], ["context-packet-provider", "Context provider"],
  ["proposed-shared-platform-component", "Proposed shared infrastructure"], ["catalog-authority-source", "Catalog authority source"],
  ["wgcf-runtime-source", "Governance validation runtime source"], ["platform-authority-source", "Platform authority source"],
  ["security-authority-source", "Security authority source"], ["product-runtime-source", "Product runtime source"],
  ["runtime-enforcement-source", "Runtime enforcement source"], ["product-channel-source", "Communication channel source"],
  ["operator-workflow-source", "Operator workflow source"], ["dev-integration-profile", "Integration profile"],
].map(([value, label]) => ({ value, label }));
export const deliveryTargets = [
  { value: "owner-managed-source", label: "Source code maintained by its owner" },
  { value: "owner-repository-local-preview", label: "A local preview" },
  { value: "platform-integrated-runtime", label: "A platform-managed running application" },
  { value: "governed-prod", label: "A product with governed production releases" },
];

export function validationApproachLabel(value: string | undefined) { return validationApproaches.find(item => item.value === value)?.label ?? value ?? "Not in scope"; }
export function validationRoleLabel(value: string | undefined) { return graphRoles.find(item => item.value === value)?.label ?? value ?? "Not in scope"; }
export function deliveryTargetLabel(value: string | null) { return deliveryTargets.find(item => item.value === value)?.label ?? value ?? "Not in scope"; }
