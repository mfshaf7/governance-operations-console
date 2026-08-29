import {
  TerasActionButton,
  TerasDialog,
  TerasFieldGrid,
  TerasFieldStack,
  TerasNoteField,
  TerasSelectField,
  TerasTextField,
  TerasTextListField,
} from "@/teras";

import type { ExecutionCloseoutDraft } from "./execution-closeout-model.ts";

export function ExecutionCloseoutEvidenceDialog({
  draft,
  onClose,
  onDraftChange,
  open,
}: {
  draft: ExecutionCloseoutDraft;
  onClose: () => void;
  onDraftChange: (draft: ExecutionCloseoutDraft) => void;
  open: boolean;
}) {
  function update(field: keyof ExecutionCloseoutDraft, value: string) {
    onDraftChange({ ...draft, [field]: value });
  }

  return (
    <TerasDialog
      actions={
        <TerasActionButton onClick={onClose} emphasis="primary">
          Done
        </TerasActionButton>
      }
      closeLabel="Close supporting evidence"
      contentOverflow="auto"
      description="Record the demonstration and inspection evidence required by the closeout contract."
      height="fill"
      kicker="Delivery Closeout"
      onClose={onClose}
      open={open}
      title="Supporting Evidence"
      width="large"
    >
      <TerasFieldGrid columns={2} align="stretch">
        <TerasNoteField
          label="Demo summary"
          minimumHeight="short"
          onValueChange={(value) => update("demoSummary", value)}
          placeholder="Summarize what was demonstrated."
          value={draft.demoSummary}
        />
        <TerasNoteField
          label="Demo outcome"
          minimumHeight="short"
          onValueChange={(value) => update("demoOutcome", value)}
          placeholder="Record the reviewed outcome."
          value={draft.demoOutcome}
        />
        <TerasNoteField
          label="Demo evidence"
          minimumHeight="short"
          onValueChange={(value) => update("demoEvidence", value)}
          placeholder="Reference the bounded demonstration proof."
          value={draft.demoEvidence}
        />
        <TerasNoteField
          label="Inspection summary"
          minimumHeight="short"
          onValueChange={(value) => update("inspectSummary", value)}
          placeholder="Summarize the closeout inspection."
          value={draft.inspectSummary}
        />
        <TerasNoteField
          label="Inspection actions"
          minimumHeight="short"
          onValueChange={(value) => update("inspectActionItems", value)}
          placeholder="Record retained actions or state that none remain."
          value={draft.inspectActionItems}
        />
        <TerasNoteField
          label="Completion note"
          minimumHeight="short"
          onValueChange={(value) => update("completionNote", value)}
          placeholder="Optional operator closeout note."
          value={draft.completionNote}
        />
        <TerasNoteField
          label="Residual follow-up"
          minimumHeight="short"
          onValueChange={(value) => update("residualFollowUp", value)}
          placeholder="Optional follow-up that remains outside closeout."
          value={draft.residualFollowUp}
        />
      </TerasFieldGrid>
    </TerasDialog>
  );
}

export function ExecutionCloseoutImpactDialog({
  draft,
  onClose,
  onDraftChange,
  open,
}: {
  draft: ExecutionCloseoutDraft;
  onClose: () => void;
  onDraftChange: (draft: ExecutionCloseoutDraft) => void;
  open: boolean;
}) {
  const existing = draft.existingProduct;
  const entrant = draft.workspaceEntrant;

  function updateExisting(
    field: keyof ExecutionCloseoutDraft["existingProduct"],
    value: string,
  ) {
    onDraftChange({
      ...draft,
      existingProduct: { ...existing, [field]: value },
    });
  }

  function updateEntrant(
    field: keyof ExecutionCloseoutDraft["workspaceEntrant"],
    value: string | string[],
  ) {
    onDraftChange({
      ...draft,
      workspaceEntrant: { ...entrant, [field]: value },
    });
  }

  return (
    <TerasDialog
      actions={
        <TerasActionButton onClick={onClose} emphasis="primary">
          Done
        </TerasActionButton>
      }
      closeLabel="Close impact details"
      contentOverflow="auto"
      description={
        draft.impactKind === "existing-product-change"
          ? "Bind the Delivery outcome to an already admitted product without claiming publication or release."
          : "Prepare a typed Workspace Intake candidate without claiming classification or active inventory."
      }
      height="fill"
      kicker="Delivery Closeout"
      onClose={onClose}
      open={open && draft.impactKind !== "none"}
      title={
        draft.impactKind === "existing-product-change"
          ? "Existing Product Impact"
          : "Workspace Entrant Impact"
      }
      width="large"
    >
      {draft.impactKind === "existing-product-change" ? (
        <TerasFieldStack spacing="normal">
          <TerasFieldGrid columns={2} align="stretch">
            <TerasTextField
              label="Product id"
              onValueChange={(value) => updateExisting("productId", value)}
              placeholder="governance-console"
              value={existing.productId}
            />
            <TerasTextField
              label="Registry version"
              onValueChange={(value) => updateExisting("registryVersion", value)}
              placeholder="products-v4"
              value={existing.registryVersion}
            />
            <TerasTextField
              label="Registry ref"
              onValueChange={(value) => updateExisting("registryRef", value)}
              placeholder="workspace-governance://products/product-id"
              value={existing.registryRef}
            />
            <TerasTextField
              label="Product owner ref"
              onValueChange={(value) => updateExisting("productOwnerRef", value)}
              placeholder="repo://product-owner"
              value={existing.productOwnerRef}
            />
          </TerasFieldGrid>
          <TerasNoteField
            label="Change summary"
            minimumHeight="short"
            onValueChange={(value) => updateExisting("changeSummary", value)}
            placeholder="Summarize the completed change to the active product."
            value={existing.changeSummary}
          />
        </TerasFieldStack>
      ) : null}
      {draft.impactKind === "workspace-entrant" ? (
        <TerasFieldStack spacing="normal">
          <TerasSelectField
            label="Entrant kind"
            onValueChange={(value) => updateEntrant("entrantKind", value)}
            options={[
              { label: "Product", value: "product" },
              { label: "Repository", value: "repository" },
              { label: "Component", value: "component" },
            ]}
            value={entrant.entrantKind}
          />
          <TerasFieldGrid columns={2} align="stretch">
            <TerasTextField
              label="Name"
              onValueChange={(value) => updateEntrant("name", value)}
              placeholder="Candidate display name"
              value={entrant.name}
            />
            <TerasTextField
              label="Canonical key"
              onValueChange={(value) => updateEntrant("canonicalKey", value)}
              placeholder="stable-candidate-key"
              value={entrant.canonicalKey}
            />
            <TerasTextField
              label="Candidate ref"
              onValueChange={(value) => updateEntrant("candidateRef", value)}
              placeholder="delivery://candidates/..."
              value={entrant.candidateRef}
            />
            <TerasTextField
              label="Candidate version"
              onValueChange={(value) => updateEntrant("candidateVersion", value)}
              placeholder="candidate-v1"
              value={entrant.candidateVersion}
            />
            <TerasTextField
              label="Source owner ref"
              onValueChange={(value) => updateEntrant("sourceOwnerRef", value)}
              placeholder="repo://source-owner"
              value={entrant.sourceOwnerRef}
            />
            <TerasTextField
              label="Security owner"
              onValueChange={(value) => updateEntrant("securityOwner", value)}
              placeholder="security-architecture"
              value={entrant.securityOwner}
            />
          </TerasFieldGrid>
          {entrant.entrantKind === "repository" ? (
            <TerasFieldGrid columns={2} align="stretch">
              <TerasTextField
                label="Repository class"
                onValueChange={(value) => updateEntrant("repoClass", value)}
                placeholder="product-source"
                value={entrant.repoClass}
              />
              <TerasSelectField
                label="Security bindings"
                onValueChange={(value) =>
                  updateEntrant("requiresSecurityBindings", value)
                }
                options={[
                  { label: "Not required", value: "no" },
                  { label: "Required", value: "yes" },
                ]}
                value={entrant.requiresSecurityBindings}
              />
            </TerasFieldGrid>
          ) : null}
          {entrant.entrantKind === "product" ? (
            <>
              <TerasFieldGrid columns={2} align="stretch">
                <TerasTextField
                  label="Intended endpoint"
                  onValueChange={(value) => updateEntrant("intendedEndpoint", value)}
                  placeholder="Target product endpoint"
                  value={entrant.intendedEndpoint}
                />
                <TerasTextField
                  label="Platform owner"
                  onValueChange={(value) => updateEntrant("platformOwner", value)}
                  placeholder="platform-engineering"
                  value={entrant.platformOwner}
                />
                <TerasTextField
                  label="Runtime owner"
                  onValueChange={(value) => updateEntrant("runtimeOwner", value)}
                  placeholder="Owning runtime"
                  value={entrant.runtimeOwner}
                />
              </TerasFieldGrid>
              <TerasTextListField
                items={entrant.sourceOwners}
                itemLabel={(index) => `Source owner ${index + 1}`}
                label="Source owners"
                minItems={1}
                onItemsChange={(items) => updateEntrant("sourceOwners", items)}
                placeholder="repo://source-owner"
                visibleItems={2}
              />
            </>
          ) : null}
          {entrant.entrantKind === "component" ? (
            <TerasFieldGrid columns={2} align="stretch">
              <TerasTextField
                label="Component class"
                onValueChange={(value) => updateEntrant("componentClass", value)}
                placeholder="shared-service"
                value={entrant.componentClass}
              />
              <TerasTextField
                label="Owner repo"
                onValueChange={(value) => updateEntrant("ownerRepo", value)}
                placeholder="component-owner-repo"
                value={entrant.ownerRepo}
              />
              <TerasTextField
                label="Product"
                onValueChange={(value) => updateEntrant("product", value)}
                placeholder="Optional product id"
                value={entrant.product}
              />
            </TerasFieldGrid>
          ) : null}
          <TerasFieldGrid columns={2} align="stretch">
            <TerasTextField
              label="Validation posture"
              onValueChange={(value) => updateEntrant("validationPosture", value)}
              placeholder="owner-repo-validated"
              value={entrant.validationPosture}
            />
            <TerasTextField
              label="WGCF graph role"
              onValueChange={(value) =>
                updateEntrant("validationWgcfGraphRole", value)
              }
              placeholder="product-readiness-aggregate"
              value={entrant.validationWgcfGraphRole}
            />
          </TerasFieldGrid>
          <TerasNoteField
            label="Validation notes"
            minimumHeight="short"
            onValueChange={(value) => updateEntrant("validationNotes", value)}
            placeholder="Describe the expected validation boundary."
            value={entrant.validationNotes}
          />
          <TerasTextListField
            items={entrant.validationCatalogRefs}
            itemLabel={(index) => `Catalog ref ${index + 1}`}
            label="Validation catalog refs"
            onItemsChange={(items) =>
              updateEntrant("validationCatalogRefs", items)
            }
            placeholder="component-contracts"
            visibleItems={2}
          />
        </TerasFieldStack>
      ) : null}
    </TerasDialog>
  );
}
