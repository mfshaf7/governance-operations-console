"use client";
import { useState } from "react";
import { TerasActionButton, TerasContentTray, TerasEmptyState, TerasFieldGrid, TerasFieldStack, TerasLoadingState, TerasNoteField, TerasSelectField, TerasTechnicalDetails, TerasTextField, TerasTextListField } from "@/teras";
import { useRepositoryCatalogChoices } from "../../../../../../../workspace-registry/live-runtime/use-repository-catalog-choices.ts";
import { workspaceRegistryFixture } from "../../../../../../../workspace-registry/fixtures/workspace-registry.fixture.ts";
import { validationApproaches, graphRoles, deliveryTargets, componentClasses } from "../../../../../../../console-integration/workspace-intake/workspace-intake-display-options.ts";
import { derivedIntakeRole } from "../../../../../../../workspace-registry/model/workspace-intake-guidance.ts";
import type { ExecutionCloseoutDraft } from "./execution-closeout-model.ts";

const keyFromName = (name: string) => name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function ExecutionCloseoutImpactEditor({ draft, onDraftChange, live }: {
  draft: ExecutionCloseoutDraft; onDraftChange: (draft: ExecutionCloseoutDraft) => void; live: boolean;
}) {
  const entrant = draft.workspaceEntrant, registry = useRepositoryCatalogChoices(live);
  const [customEndpoint, setCustomEndpoint] = useState(Boolean(entrant.intendedEndpoint && !deliveryTargets.some(item => item.value === entrant.intendedEndpoint)));
  const repos = live ? registry.result?.options.map(item => item.valueKey) ?? [] : workspaceRegistryFixture.records.filter(item => item.kind === "repo" && item.posture === "active").map(item => item.name);
  const role = entrant.entrantKind === "product" ? derivedIntakeRole("product", "", entrant.validationPosture)
    : entrant.entrantKind === "component" ? derivedIntakeRole("component", entrant.componentClass, entrant.validationPosture) || entrant.validationWgcfGraphRole : entrant.validationWgcfGraphRole;
  function update<K extends keyof typeof entrant>(field: K, value: (typeof entrant)[K]) {
    const next = { ...entrant, [field]: value };
    if (field === "name" && (!entrant.canonicalKey || entrant.canonicalKey === keyFromName(entrant.name))) next.canonicalKey = keyFromName(String(value));
    if (field === "sourceOwnerRef" && !entrant.ownerRepo) next.ownerRepo = String(value);
    onDraftChange({ ...draft, workspaceEntrant: next });
  }
  function repoField(label: string, field: "sourceOwnerRef" | "securityOwner" | "platformOwner" | "runtimeOwner" | "ownerRepo", helper: string) {
    const value = entrant[field];
    return <TerasSelectField label={label} helper={helper} value={value}
      options={[{ value: "", label: "Choose a registered repository" }, ...repos.map(value => ({ value, label: value })),
        ...(value && !repos.includes(value) ? [{ value, label: `${value} · retained selection` }] : [])]}
      onValueChange={value => update(field, value)} />;
  }
  return <TerasFieldStack spacing="normal">
    <TerasContentTray kicker="Registration" description="Describe what this Delivery outcome adds. Completing closeout prepares onboarding; it does not admit or activate the item.">
      <TerasFieldStack spacing="normal">
        <TerasSelectField label="What will be registered?" value={entrant.entrantKind} onValueChange={value => update("entrantKind", value as typeof entrant.entrantKind)}
          options={[{ label: "Product", value: "product" }, { label: "Shared component", value: "component" }, { label: "Shared repository (specialist)", value: "repository" }]} />
        <TerasFieldGrid columns={2}>
          <TerasTextField label="Display name" value={entrant.name} onValueChange={value => update("name", value)} placeholder="Name people will recognize" />
          <TerasTextField label="Registration name" value={entrant.canonicalKey} onValueChange={value => update("canonicalKey", value)} helper="Stable name used in the register; suggested from the display name." />
        </TerasFieldGrid>
        {entrant.entrantKind === "product" ? <>
          <TerasSelectField label="How will the product be used?" helper="This describes its delivery target. It does not activate hosting or release permission."
            value={customEndpoint ? "custom" : entrant.intendedEndpoint} options={[{ value: "", label: "Choose a delivery target" }, ...deliveryTargets, { value: "custom", label: "Another target or no runtime" }]}
            onValueChange={value => { setCustomEndpoint(value === "custom"); update("intendedEndpoint", value === "custom" ? "" : value); }} />
          {customEndpoint ? <TerasTextField label="Access or no-runtime explanation" value={entrant.intendedEndpoint}
            helper="Enter its address, or explain how it is used when there is no running application." onValueChange={value => update("intendedEndpoint", value)} /> : null}
        </> : entrant.entrantKind === "component" ? <TerasSelectField label="What kind of component is it?" value={entrant.componentClass}
          helper="This also supplies its normal validation role."
          options={[{ value: "", label: "Choose a component type" }, ...componentClasses]}
          onValueChange={value => update("componentClass", value)} /> : <>
          <TerasEmptyState>Regular project repositories are created or linked in Repo Control and onboarded in Workspace Registry. This option prepares shared-system repository classification.</TerasEmptyState>
          <TerasTextField label="Repository classification" value={entrant.repoClass} onValueChange={value => update("repoClass", value)} helper="Use the classification agreed for this shared repository." />
          <TerasSelectField label="Does it require security bindings?" value={entrant.requiresSecurityBindings}
            options={[{ value: "no", label: "No" }, { value: "yes", label: "Yes" }]} onValueChange={value => update("requiresSecurityBindings", value as "no" | "yes")} />
        </>}
      </TerasFieldStack>
    </TerasContentTray>
    <TerasContentTray kicker="Responsibility" description="Choose the repositories responsible for the work. These choices do not grant repository access.">
      <TerasFieldStack spacing="normal">
        {live ? <TerasTextField label="Find registered repositories" value={registry.query} placeholder="Search by repository name" onValueChange={registry.onQueryChange} /> : null}
        {registry.loading ? <TerasLoadingState inline label="Reading registered repositories…" /> : null}
        {registry.error ? <TerasEmptyState>{registry.error}<TerasActionButton emphasis="secondary" onClick={() => registry.refresh()}>Retry repository register</TerasActionButton></TerasEmptyState> : null}
        {repoField("Primary source repository", "sourceOwnerRef", "The source repository accountable for this Delivery outcome.")}
        {entrant.entrantKind === "product" ? <>
          {repoField("Platform repository", "platformOwner", "Owns hosting and environment decisions.")}
          {repoField("Runtime repository", "runtimeOwner", "Maintains and operates the product.")}
          {entrant.sourceOwners.map((value, index) => <TerasFieldStack key={index} spacing="compact">
            <TerasSelectField label={`Source repository ${index + 1}`} value={value} options={[{ value: "", label: "Choose a source repository" }, ...repos.map(value => ({ value, label: value })),
              ...(value && !repos.includes(value) ? [{ value, label: `${value} · retained selection` }] : [])]}
              onValueChange={next => update("sourceOwners", entrant.sourceOwners.map((current, at) => at === index ? next : current))} />
            <TerasActionButton emphasis="secondary" onClick={() => update("sourceOwners", entrant.sourceOwners.filter((_, at) => at !== index))}>Remove source repository {index + 1}</TerasActionButton>
          </TerasFieldStack>)}
          <TerasActionButton emphasis="secondary" onClick={() => update("sourceOwners", [...entrant.sourceOwners, ""])}>Add source repository</TerasActionButton>
        </> : entrant.entrantKind === "component" ? <>
          {repoField("Implementation repository", "ownerRepo", "Maintains this component's source.")}
          <TerasTextField label="Associated product (optional)" value={entrant.product} onValueChange={value => update("product", value)} />
        </> : null}
        {repoField("Security repository", "securityOwner", "Owns security review and security follow-up for this item.")}
      </TerasFieldStack>
    </TerasContentTray>
    <TerasContentTray kicker="Checks" description="Record how the new item will be checked. Closeout evidence supports the outcome; registration remains a separate decision.">
      <TerasFieldStack spacing="normal">
        <TerasSelectField label="How will this item be checked?" value={entrant.validationPosture}
          helper={validationApproaches.find(item => item.value === entrant.validationPosture)?.detail ?? "Choose the approach agreed with the responsible repository."}
          options={[{ value: "", label: "Choose a check approach" }, ...validationApproaches,
            ...(entrant.validationPosture && !validationApproaches.some(item => item.value === entrant.validationPosture) ? [{ value: entrant.validationPosture, label: `${entrant.validationPosture} · retained setting` }] : [])]}
          onValueChange={value => update("validationPosture", value)} />
        <TerasNoteField label="Checks and limitations" value={entrant.validationNotes}
          placeholder="Describe the evidence and any limits relevant to this new item."
          onValueChange={value => update("validationNotes", value)} />
        <TerasTechnicalDetails summary="Advanced validation settings" items={[{ label: "Registration reference", value: "Assigned when the closeout command is submitted" },
          { label: "Source version", value: "Bound to the reviewed Delivery revision" }, { label: "Derived validation role", value: role || "Choose a component type or specify its role below" }]}>
          <TerasFieldStack spacing="normal">
            {!role || entrant.entrantKind === "repository" ? <TerasSelectField label="Validation role" value={entrant.validationWgcfGraphRole} options={[{ value: "", label: "Choose a role agreed with the maintainer" }, ...graphRoles]}
              onValueChange={value => update("validationWgcfGraphRole", value)} /> : null}
            <TerasTextListField label="Registered governance checks" items={entrant.validationCatalogRefs} itemLabel={index => `Registered check ${index + 1}`}
              onItemsChange={items => update("validationCatalogRefs", items)} placeholder="Existing validation catalog entry" visibleItems={2} />
          </TerasFieldStack>
        </TerasTechnicalDetails>
      </TerasFieldStack>
    </TerasContentTray>
  </TerasFieldStack>;
}
