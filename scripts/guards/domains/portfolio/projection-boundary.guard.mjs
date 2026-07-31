import {
  assertAppFile,
  assertIncludes,
  assertOmits,
  assertRepoIncludes,
} from "../../guard-lib.mjs";

const portfolioRoot = "src/domain-workspaces/portfolio";
const contract =
  "docs/product/domain-contracts/portfolio.md";
const packetModel =
  `${portfolioRoot}/work-model/publication/product-publication-packet.ts`;
const publicationDecisionModel =
  `${portfolioRoot}/work-model/publication/product-publication-decision-model.ts`;
const publicationProjection =
  `${portfolioRoot}/work-model/publication/product-publication-projection.ts`;
const publicationRequirements =
  `${portfolioRoot}/work-model/publication/product-publication-requirements.ts`;
const entryProjection =
  `${portfolioRoot}/work-model/publication/product-entry-projection.ts`;
const commandPolicy =
  `${portfolioRoot}/work-model/publication/product-portfolio-command-policy.ts`;
const scenarioProjection =
  `${portfolioRoot}/read-model/fixtures/product-portfolio/product-portfolio-scenario-projection.ts`;
const fixtureValidation =
  `${portfolioRoot}/read-model/fixtures/product-portfolio/product-portfolio-fixture-validation.ts`;
const publicationSources =
  `${portfolioRoot}/read-model/fixtures/product-portfolio/publication-sources.fixture.ts`;
const selectors =
  `${portfolioRoot}/read-model/selectors/product-portfolio-selectors.ts`;
const effectiveProjection =
  `${portfolioRoot}/local-runtime/product-portfolio-effective-projection.ts`;
const historyProjection =
  `${portfolioRoot}/local-runtime/product-portfolio-history-projection.ts`;
const runtime =
  `${portfolioRoot}/local-runtime/product-portfolio-runtime.ts`;
const runtimeModel =
  `${portfolioRoot}/local-runtime/product-portfolio-runtime-model.ts`;
const workspaceController =
  `${portfolioRoot}/presentation/workspace/use-product-portfolio-workspace-controller.ts`;
const fixtureTest =
  "tests/operation-projections/product-portfolio-model.test.mjs";
const effectiveProjectionTest =
  "tests/operation-projections/portfolio-effective-projection.test.mjs";
const publicationCaptureTest =
  "tests/operation-projections/product-portfolio-publication-capture.test.mjs";
const runtimeTest = "tests/operation-runtime/portfolio-runtime.test.mjs";

export const guard = {
  id: "portfolio/projection-boundary",
  run() {
    const failures = [];

    for (const requiredPath of [
      packetModel,
      publicationDecisionModel,
      publicationProjection,
      publicationRequirements,
      entryProjection,
      commandPolicy,
      scenarioProjection,
      fixtureValidation,
      publicationSources,
      selectors,
      effectiveProjection,
      historyProjection,
      runtime,
      runtimeModel,
      workspaceController,
      fixtureTest,
      effectiveProjectionTest,
      publicationCaptureTest,
      runtimeTest,
    ]) {
      assertAppFile(failures, requiredPath);
    }

    assertRepoIncludes(failures, contract, [
      "Portfolio is a composed projection.",
      "Product publication state is separate from product lifecycle",
      "runtime availability. A Portfolio publication review is a command",
      "Portfolio listing visibility and product runtime exposure are different",
      "`projection_context` is input truth, not expected output",
      "An existing `product_id` can produce at most one active Portfolio entry.",
      "Rejected or orphaned local receipts remain unapplied and produce typed",
      "Curated and adapter-projected candidates remain outside the Publication register",
    ]);
    assertIncludes(failures, packetModel, [
      "portfolioSegments",
      "productForms",
      "productListingScopes",
      "productAccessClasses",
      "productPublicationPacketViolations",
      "sameAppliedPublication",
    ]);
    assertIncludes(failures, publicationDecisionModel, [
      "validateProductPublicationDecision",
      "applyProductPublicationDecision",
      "projectProductPublication",
      "Only new-product packets use a publication decision.",
    ]);
    assertIncludes(failures, publicationProjection, [
      "sameAppliedPublication",
      'packet.publicationKind === "new-product" &&',
      'packet.publicationKind === "product-retirement"',
      "projectProductPublication",
    ]);
    assertIncludes(failures, publicationRequirements, [
      "productPublicationRequirements",
      "permittedListingScopes.includes",
      '"active-product-inventory"',
      '"delivery-or-graduation-evidence"',
      '"existing-product"',
    ]);
    assertIncludes(failures, entryProjection, [
      'packet.publicationKind === "product-retirement"',
      "observation.expiresAt <= context.evaluatedAt",
      "productEntryFromPacket",
      "productPublicationReceipt",
    ]);
    assertIncludes(failures, commandPolicy, [
      'entry.provenance.freshness === "stale"',
      "productPortfolioCommands",
      "withForbiddenProductCommands",
    ]);
    assertIncludes(failures, fixtureValidation, [
      "productFixtureProvenanceViolations",
      "authority-snapshot-has-synthetic-fields",
      "synthetic-companion-missing-provenance",
    ]);
    assertIncludes(failures, scenarioProjection, [
      "projectProductPortfolioScenario",
      "productPortfolioStatusAxes",
      "productFixtureProvenanceViolations",
    ]);
    assertOmits(failures, commandPolicy, [
      '"deploy-product"',
      '"retire-product"',
      '"change-runtime-access"',
    ]);
    assertIncludes(failures, selectors, [
      "selectProductPortfolioCatalog",
      "selectProductPortfolioPublicationQueue",
      "selectProductPortfolioSummary",
      "selectProductPortfolioWorkspaceStatus",
      "productPortfolioReadModelFromProjections",
    ]);
    assertIncludes(failures, effectiveProjection, [
      "projectProductPortfolioEffectiveProjection",
      "productPublicationReceiptsByPacket",
      "unmatchedProductPublicationReceiptIssues",
      "productPublicationReceiptMatchesProjection",
      "productListingApplicationMatchesResult",
      "projectProductPortfolioListingScenarios",
      "productCommandsForEntry",
      "productRequiredActionForEntry",
      "withForbiddenProductCommands",
      "left.recordedAt.localeCompare(right.recordedAt)",
      "left.receiptId.localeCompare(right.receiptId)",
      "reconciliationIssues",
      '"capture-receipt-rejected"',
      '"publication-receipt-rejected"',
      '"listing-receipt-rejected"',
      "seenReceiptIds",
    ]);
    assertIncludes(failures, runtime, [
      "getProductPortfolioEffectiveProjection",
      "effectiveProjection.publicationReceipts.find",
      "The product publication decision is already resolved.",
      "sameProductListingCommandIntent",
      "The listing idempotency key is already bound to a different update.",
      "The prior listing update did not pass receipt reconciliation.",
    ]);
    assertIncludes(failures, workspaceController, [
      "projectProductPortfolioEffectiveProjection",
      "effectiveProjection.readModel",
      "listingReceipts: effectiveProjection.listingReceipts",
      "decisionReceipts: effectiveProjection.publicationReceipts",
    ]);
    assertOmits(failures, workspaceController, [
      "runtimeProjection.listingApplications.at(-1)",
      "decisionReceipts: runtimeProjection.publicationReceipts",
    ]);
    assertIncludes(failures, fixtureTest, [
      '"managed-openclaw"',
      '"managed-openproject"',
      '"new-product-delivery-candidate"',
      '"scope-exceeds-policy-candidate"',
      '"idempotent-publication-replay"',
      "restricted runtime access can coexist with public discoverability",
      "unknown controlled vocabulary fails",
      "the curated publication source remains separate, structured, and synthetic",
    ]);
    assertIncludes(failures, effectiveProjectionTest, [
      "rejects malformed listing applications",
      "rejects capture receipts that do not match a catalogued source",
      "projection.reconciliationIssues",
    ]);
    assertIncludes(failures, publicationCaptureTest, [
      "captures only a catalogued source",
      "capture is idempotent for one source version",
      "rejects arbitrary and stale capture sources",
    ]);
    assertIncludes(failures, runtimeTest, [
      "listing retries reuse one receipt",
      "idempotency key is already bound",
    ]);

    return failures;
  },
};

export default guard;
