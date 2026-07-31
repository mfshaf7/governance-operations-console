import assert from "node:assert/strict";
import test from "node:test";

import { productPortfolioReadModel } from "../../src/domain-workspaces/portfolio/read-model/product-portfolio-read-model.ts";
import { productPortfolioScenarios } from "../../src/domain-workspaces/portfolio/read-model/fixtures/product-portfolio/product-portfolio-scenarios.fixture.ts";
import { selectProductPortfolioCatalog } from "../../src/domain-workspaces/portfolio/read-model/selectors/product-portfolio-selectors.ts";
import {
  applyProductPublicationDecision,
  validateProductPublicationDecision,
} from "../../src/domain-workspaces/portfolio/work-model/publication/product-publication-decision-model.ts";
import {
  applyProductListingCommand,
  validateProductListingCommand,
} from "../../src/domain-workspaces/portfolio/work-model/listing/product-listing-model.ts";
import { productPublicationRequirements } from "../../src/domain-workspaces/portfolio/work-model/publication/product-publication-requirements.ts";

test("catalog maturity filtering uses normalized lifecycle values", () => {
  const fullyGoverned = selectProductPortfolioCatalog(
    productPortfolioReadModel.entries,
    {
      listingStates: ["listed", "unlisted"],
      maturityLevels: ["fully-governed"],
    },
  );

  assert.deepEqual(
    fullyGoverned.map((entry) => entry.identity.productId),
    ["openclaw"],
  );
});

test("publication can correct listing scope without mutating source publication truth", () => {
  const fixture = structuredClone(scenario("scope-exceeds-policy-candidate"));
  const originalScope = fixture.publicationPacket.listing.requestedScope;
  const result = applyProductPublicationDecision({
    context: fixture.projectionContext,
    decidedAt: "2026-07-23T10:00:00.000Z",
    decidedByRef: "operator://portfolio",
    draft: {
      listing: {
        featured: false,
        scope: "internal",
        state: "listed",
      },
      outcome: "publish",
    },
    idempotencyKey: "publish-scope-policy-candidate",
    packet: fixture.publicationPacket,
  });

  assert.equal(originalScope, "public");
  assert.equal(fixture.publicationPacket.listing.requestedScope, "public");
  assert.equal(result.projection.publicationState, "published");
  assert.equal(result.projection.entry?.listing.scope, "internal");
  assert.equal(result.receipt.listing?.scope, "internal");
  assert.equal(result.receipt.resultState, "published");
});

test("Portfolio publication requires active Workspace product inventory", () => {
  const fixture = structuredClone(scenario("new-product-delivery-candidate"));
  const requirement = productPublicationRequirements(
    fixture.publicationPacket,
    null,
  ).find((candidate) => candidate.code === "active-product-inventory");
  assert.equal(requirement?.state, "satisfied");

  fixture.publicationPacket.product.registryRef =
    "portfolio://products/unadmitted-product";
  const invalidRequirement = productPublicationRequirements(
    fixture.publicationPacket,
    null,
  ).find((candidate) => candidate.code === "active-product-inventory");
  assert.equal(invalidRequirement?.state, "missing");
});

test("operator rejection records a controlled reason even when source evidence is incomplete", () => {
  const fixture = structuredClone(scenario("missing-manifest-candidate"));
  const result = applyProductPublicationDecision({
    context: fixture.projectionContext,
    decidedAt: "2026-07-23T10:05:00.000Z",
    decidedByRef: "operator://portfolio",
    draft: {
      outcome: "reject",
      reasonCode: "source-withdrawn",
      reasonNote: "The source owner withdrew this publication.",
    },
    idempotencyKey: "reject-missing-manifest-candidate",
    packet: fixture.publicationPacket,
  });

  assert.equal(result.projection.publicationState, "rejected");
  assert.equal(result.projection.entry, null);
  assert.equal(result.projection.receipt.reasonCode, "source-withdrawn");
  assert.equal(result.receipt.decision.reasonCode, "source-withdrawn");
  assert.equal(result.receipt.resultState, "rejected");
});

test("Other publication rejection requires an operator note", () => {
  const fixture = scenario("new-product-delivery-candidate");
  const validation = validateProductPublicationDecision({
    context: fixture.projectionContext,
    draft: {
      outcome: "reject",
      reasonCode: "other",
      reasonNote: "  ",
    },
    packet: fixture.publicationPacket,
  });

  assert.equal(validation.allowed, false);
  assert.match(validation.findings.join(" "), /rejection note/i);
});

test("listing commands mutate listing only and normalize the selected cohort order", () => {
  const current = entry("unlisted-library");
  const result = applyProductListingCommand(productPortfolioReadModel.entries, {
    draft: {
      featured: false,
      position: { kind: "first" },
      scope: "internal",
      state: "listed",
    },
    expectedPublicationReceiptRef: current.provenance.publicationReceiptRef,
    idempotencyKey: "list-internal-contract-library",
    productId: current.identity.productId,
    submittedAt: "2026-07-23T10:10:00.000Z",
    submittedByRef: "operator://portfolio",
  });
  const projectedWithoutListing = {
    ...result.entry,
    listing: current.listing,
  };

  assert.deepEqual(projectedWithoutListing, current);
  assert.equal(result.entry.listing.state, "listed");
  assert.equal(result.entry.listing.sortOrder, 100);
  assert.equal(result.receipt.resultState, "updated");
  assert.equal(result.receipt.before.state, "unlisted");
  assert.equal(result.receipt.after.state, "listed");
  assert.equal(result.receipt.reorderedProductIds.length > 0, true);
});

test("listing validation blocks stale drafts, policy widening, and retired products", () => {
  const current = entry("unlisted-library");
  const baseCommand = {
    draft: {
      featured: false,
      position: { kind: "last" },
      scope: "internal",
      state: "listed",
    },
    expectedPublicationReceiptRef: current.provenance.publicationReceiptRef,
    idempotencyKey: "validate-listing",
    productId: current.identity.productId,
    submittedAt: "2026-07-23T10:15:00.000Z",
    submittedByRef: "operator://portfolio",
  };

  const stale = validateProductListingCommand(productPortfolioReadModel.entries, {
    ...baseCommand,
    expectedPublicationReceiptRef: "portfolio://stale-receipt",
  });
  const widened = validateProductListingCommand(
    productPortfolioReadModel.entries,
    {
      ...baseCommand,
      draft: { ...baseCommand.draft, scope: "public" },
    },
  );
  const retired = entry("retired-documentation");
  const retiredValidation = validateProductListingCommand(
    productPortfolioReadModel.entries,
    {
      ...baseCommand,
      expectedPublicationReceiptRef:
        retired.provenance.publicationReceiptRef,
      productId: retired.identity.productId,
    },
  );

  assert.equal(stale.allowed, false);
  assert.match(stale.findings.join(" "), /projection changed/i);
  assert.equal(widened.allowed, false);
  assert.match(widened.findings.join(" "), /not permitted/i);
  assert.equal(retiredValidation.allowed, false);
  assert.match(retiredValidation.findings.join(" "), /Retired products/i);
});

function entry(productId) {
  const found = productPortfolioReadModel.entries.find(
    (candidate) => candidate.identity.productId === productId,
  );
  assert.ok(found, `Missing Portfolio entry ${productId}`);
  return found;
}

function scenario(scenarioId) {
  const fixture = productPortfolioScenarios.find(
    (candidate) => candidate.scenarioId === scenarioId,
  );
  assert.ok(fixture, `Missing Portfolio fixture ${scenarioId}`);
  return fixture;
}
