import {
  TerasChoiceGroup,
  TerasNoteField,
  TerasStatusPill,
  TerasTrayStack,
  TerasWizardPanel,
} from "@/teras";
import type { ProductPortfolioScenarioProjection } from "../../../../read-model/types/product-portfolio-fixture-types.ts";
import type { ProductListingScope } from "@/domain-workspaces/portfolio/domain/product-portfolio-vocabulary";
import { productListingScopeLabel } from "../../products/products-view-model.ts";
import {
  productPublicationDecisionOptions,
  productPublicationDecisionValidation,
  productPublicationListingStateOptions,
  productPublicationPlacementOptions,
  productPublicationRejectionOptions,
  type ProductPublicationSessionDraft,
} from "./publication-session-view-model.ts";

export function ProductPublicationDecisionStep({
  draft,
  onDraftChange,
  record,
}: {
  draft: ProductPublicationSessionDraft;
  onDraftChange: (patch: Partial<ProductPublicationSessionDraft>) => void;
  record: ProductPortfolioScenarioProjection;
}) {
  const validation = productPublicationDecisionValidation(record, draft);
  const scopeOptions =
    record.publicationPacket.experience.accessContract.permittedListingScopes.map(
      (scope) => ({
        id: scope,
        label: productListingScopeLabel(scope),
        tone: "info" as const,
      }),
    );

  return (
    <TerasWizardPanel
      actions={
        <TerasStatusPill tone={validation.allowed ? "ok" : "warn"}>
          {validation.allowed ? "Ready" : "Needs decision"}
        </TerasStatusPill>
      }
      description="Choose one controlled publication outcome. Portfolio may change listing fields only within the verified access contract."
      kicker="Publication Work"
      title="Publication Decision"
    >
      <TerasTrayStack spacing="loose">
        <TerasChoiceGroup
          ariaLabel="Product publication outcome"
          frame="tray"
          label="Outcome"
          onSelect={(decision) => onDraftChange({ decision })}
          options={productPublicationDecisionOptions}
          selectedId={draft.decision}
        />
        {draft.decision === "publish" ? (
          <>
            <TerasChoiceGroup
              ariaLabel="Product listing state"
              frame="tray"
              label="Listing State"
              onSelect={(listingState) =>
                onDraftChange({
                  featured: listingState === "listed" ? draft.featured : false,
                  listingState,
                })
              }
              options={productPublicationListingStateOptions}
              selectedId={draft.listingState}
            />
            <TerasChoiceGroup<ProductListingScope>
              ariaLabel="Product listing scope"
              frame="tray"
              label="Listing Scope"
              onSelect={(scope) => onDraftChange({ scope })}
              options={scopeOptions}
              selectedId={draft.scope}
            />
            {draft.listingState === "listed" ? (
              <TerasChoiceGroup
                ariaLabel="Product listing placement"
                frame="tray"
                label="Placement"
                onSelect={(placement) =>
                  onDraftChange({ featured: placement === "featured" })
                }
                options={productPublicationPlacementOptions}
                selectedId={draft.featured ? "featured" : "standard"}
              />
            ) : null}
          </>
        ) : (
          <>
            <TerasChoiceGroup
              ariaLabel="Product publication rejection reason"
              frame="tray"
              label="Rejection Reason"
              onSelect={(reasonCode) => onDraftChange({ reasonCode })}
              options={productPublicationRejectionOptions}
              selectedId={draft.reasonCode}
            />
            {draft.reasonCode === "other" ? (
              <TerasNoteField
                label="Rejection note"
                minimumHeight="short"
                onValueChange={(reasonNote) => onDraftChange({ reasonNote })}
                placeholder="Explain why this product publication is rejected."
                value={draft.reasonNote}
              />
            ) : null}
          </>
        )}
      </TerasTrayStack>
    </TerasWizardPanel>
  );
}
