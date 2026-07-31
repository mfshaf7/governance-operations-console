import {
  TerasActionButton,
  TerasActionRow,
  TerasStatusItem,
  TerasMetadataList,
  TerasList,
  TerasStatusPill,
  TerasTrayStack,
  TerasWizardPanel,
} from "@/teras";
import type { ProductPortfolioScenarioProjection } from "../../../../read-model/types/product-portfolio-fixture-types.ts";
import type { ProductPublicationDecisionReceipt } from "../../../../work-model/publication/product-publication-decision-types.ts";
import {
  productPublicationRequirementCounts,
  productPublicationRequirementLabel,
} from "../publication-view-model.ts";
import {
  productPublicationDecisionRows,
  productPublicationDecisionValidation,
  productPublicationOnlyListingConflict,
  productPublicationOwnerRepairRequirement,
  productPublicationResultRows,
  type ProductPublicationSessionDraft,
  type ProductPublicationSessionStepId,
} from "./publication-session-view-model.ts";
import type { ProductPortfolioRouteResolution } from "../../../routing/product-portfolio-route-model.ts";

export function ProductPublicationSupportPanels({
  activeStep,
  applyError,
  draft,
  onOpenRoute,
  receipt,
  record,
  resolveRoute,
}: {
  activeStep: ProductPublicationSessionStepId;
  applyError: string | null;
  draft: ProductPublicationSessionDraft;
  onOpenRoute: (routeRef: string) => boolean;
  receipt: ProductPublicationDecisionReceipt | null;
  record: ProductPortfolioScenarioProjection;
  resolveRoute: (routeRef: string) => ProductPortfolioRouteResolution;
}) {
  if (activeStep === "checks") {
    return (
      <ProductPublicationChecksSupport
        onOpenRoute={onOpenRoute}
        record={record}
        resolveRoute={resolveRoute}
      />
    );
  }

  if (activeStep === "decision") {
    const validation = productPublicationDecisionValidation(record, draft);
    const rows = productPublicationDecisionRows(record, draft);

    return (
      <TerasWizardPanel
        actions={
          <TerasStatusPill tone={validation.allowed ? "ok" : "warn"}>
            {validation.allowed ? "Decision ready" : "Action needed"}
          </TerasStatusPill>
        }
        description="Validate only the selected outcome and fields owned by this decision."
        treatment="rail"
        fit="content"
        kicker="Decision Check"
        title="Publication outcome"
        tone={validation.allowed ? "ok" : "warn"}
      >
        <TerasList frame="contained">
          {rows.map((row, index) => (
            <TerasStatusItem
              tone={row.tone}
              detail={row.detail}
              index={String(index + 1).padStart(2, "0")}
              key={row.id}
              label={row.label}
              status={row.status}
            />
          ))}
          {applyError ? (
            <TerasStatusItem
              tone="danger"
              detail={applyError}
              label="Apply Decision"
              status="Failed"
            />
          ) : null}
        </TerasList>
      </TerasWizardPanel>
    );
  }

  if (!receipt) {
    return null;
  }

  return (
    <TerasWizardPanel
      actions={
        <TerasStatusPill
          tone={receipt.resultState === "published" ? "ok" : "muted"}
        >
          Recorded
        </TerasStatusPill>
      }
      description="Confirm the recorded outcome, retained source snapshot, and resulting product entry."
      treatment="rail"
      fit="content"
      kicker="Receipt Check"
      title="Decision recorded"
      tone={receipt.resultState === "published" ? "ok" : "muted"}
    >
      <TerasList frame="contained">
        {productPublicationResultRows(receipt).map((row, index) => (
          <TerasStatusItem
            tone={row.tone}
            detail={row.detail}
            index={String(index + 1).padStart(2, "0")}
            key={row.id}
            label={row.label}
            status={row.status}
          />
        ))}
      </TerasList>
    </TerasWizardPanel>
  );
}

function ProductPublicationChecksSupport({
  onOpenRoute,
  record,
  resolveRoute,
}: {
  onOpenRoute: (routeRef: string) => boolean;
  record: ProductPortfolioScenarioProjection;
  resolveRoute: (routeRef: string) => ProductPortfolioRouteResolution;
}) {
  const counts = productPublicationRequirementCounts(
    record.projection.requirements,
  );
  const clear = counts.satisfied === counts.total;
  const listingOnly = productPublicationOnlyListingConflict(record);
  const repairRequirement = productPublicationOwnerRepairRequirement(record);
  const repairRoute = repairRequirement
    ? resolveRoute(repairRequirement.routeRef)
    : null;
  const repairRouteUnavailable = repairRoute?.kind === "unavailable";
  const tone = clear ? "ok" : counts.missing > 0 ? "danger" : "warn";

  return (
    <TerasTrayStack align="start" spacing="wide">
      <TerasWizardPanel
        actions={
          <TerasStatusPill tone={tone}>
            {clear ? "Clear" : "Review"}
          </TerasStatusPill>
        }
        description="Count source-backed requirement states without replacing their owning evidence."
        treatment="rail"
        fit="content"
        kicker="Publication Check"
        title="Requirement state"
        tone={tone}
      >
        <TerasMetadataList
          columns={3}
          items={[
            { label: "Satisfied", value: counts.satisfied },
            { label: "Missing", value: counts.missing },
            { label: "Conflict", value: counts.conflict },
          ]}
        />
      </TerasWizardPanel>
      <TerasWizardPanel
        description={
          clear
            ? "All required source evidence is present."
            : listingOnly
              ? "Choose a permitted listing scope in Decision."
              : "Repair missing source evidence with the named owner."
        }
        fit="content"
        kicker="Resolution Route"
        title={
          clear
            ? "Ready for decision"
            : listingOnly
              ? "Portfolio correction"
              : "Source-owner repair"
        }
      >
        {repairRequirement ? (
          <TerasTrayStack spacing="normal">
            <TerasMetadataList
              columns={1}
              items={[
                {
                  label: "Requirement",
                  value: productPublicationRequirementLabel(repairRequirement),
                },
                { label: "Owner", value: repairRequirement.ownerRef },
              ]}
            />
            <TerasActionRow fill>
              <TerasActionButton
                disabled={repairRouteUnavailable}
                onClick={() => onOpenRoute(repairRequirement.routeRef)}
                title={
                  repairRouteUnavailable ? repairRoute.reason : undefined
                }
                emphasis="primary"
              >
                {repairRouteUnavailable
                  ? "Owner Route Unavailable"
                  : "Open Owner Route"}
              </TerasActionButton>
            </TerasActionRow>
          </TerasTrayStack>
        ) : (
          <TerasMetadataList
            columns={1}
            items={[
              {
                label: clear ? "Next Move" : "Correction",
                value: clear
                  ? "Choose publication outcome"
                  : "Select permitted scope",
              },
            ]}
          />
        )}
      </TerasWizardPanel>
    </TerasTrayStack>
  );
}
