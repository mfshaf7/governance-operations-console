import assert from "node:assert/strict";
import test from "node:test";

import { productPortfolioReadModel } from "../../src/domain-workspaces/portfolio/read-model/product-portfolio-read-model.ts";
import { productPortfolioScenarios } from "../../src/domain-workspaces/portfolio/read-model/fixtures/product-portfolio/product-portfolio-scenarios.fixture.ts";
import {
  productPortfolioStatusAxes,
  projectProductPortfolioScenario,
} from "../../src/domain-workspaces/portfolio/read-model/fixtures/product-portfolio/product-portfolio-scenario-projection.ts";
import {
  selectProductPortfolioCatalog,
  selectProductPortfolioEntryById,
} from "../../src/domain-workspaces/portfolio/read-model/selectors/product-portfolio-selectors.ts";
import { productPortfolioCommands } from "../../src/domain-workspaces/portfolio/work-model/publication/product-portfolio-command-policy.ts";

const requiredScenarioIds = [
  "managed-openclaw",
  "managed-openproject",
  "personal-public-application",
  "client-restricted-application",
  "public-cli-release",
  "unlisted-library",
  "degraded-service",
  "stale-runtime-evidence",
  "retired-documentation",
  "new-product-delivery-candidate",
  "missing-manifest-candidate",
  "scope-exceeds-policy-candidate",
  "duplicate-product-candidate",
  "release-update-existing-product",
  "product-retirement-update",
  "idempotent-publication-replay",
];

test("Product Portfolio carries the complete locked fixture matrix", () => {
  assert.deepEqual(
    productPortfolioScenarios.map((scenario) => scenario.scenarioId),
    requiredScenarioIds,
  );
  assert.equal(new Set(requiredScenarioIds).size, requiredScenarioIds.length);
});

test("every Product Portfolio scenario projects its independent expected axes", () => {
  for (const scenario of productPortfolioScenarios) {
    const { projection } = projectProductPortfolioScenario(scenario);

    assert.equal(
      projection.publicationState,
      scenario.expected.publicationState,
      scenario.scenarioId,
    );
    assert.equal(
      projection.entryProjection,
      scenario.expected.entryProjection,
      scenario.scenarioId,
    );
    assert.deepEqual(
      projection.requiredAction,
      scenario.expected.requiredAction,
      scenario.scenarioId,
    );
    assert.deepEqual(
      projection.allowedCommands,
      scenario.expected.allowedCommands,
      scenario.scenarioId,
    );
    assert.deepEqual(
      projection.forbiddenCommands,
      scenario.expected.forbiddenCommands,
      scenario.scenarioId,
    );
    assert.deepEqual(
      productPortfolioStatusAxes(scenario, projection),
      scenario.expected.statusAxes,
      scenario.scenarioId,
    );
  }
});

test("authority-backed managed products preserve registry facts", () => {
  const openClaw = scenario("managed-openclaw").publicationPacket;
  const openProject = scenario("managed-openproject").publicationPacket;

  assert.deepEqual(openClaw.owners.sourceOwnerRefs, [
    "openclaw-telegram-enhanced",
    "openclaw-host-bridge",
    "openclaw-runtime-distribution",
  ]);
  assert.equal(openClaw.owners.runtimeOwnerRef, "openclaw-runtime-distribution");
  assert.equal(openClaw.product.lifecycle, "fully-governed");
  assert.equal(openClaw.maturity.highestRealEndpoint, "governed-prod");
  assert.equal(openClaw.maturity.stageSupported, true);
  assert.equal(openClaw.maturity.governedProdPromotion, true);

  assert.deepEqual(openProject.owners.sourceOwnerRefs, ["platform-engineering"]);
  assert.equal(openProject.owners.runtimeOwnerRef, "platform-engineering");
  assert.equal(openProject.product.lifecycle, "platform-integrated");
  assert.equal(
    openProject.maturity.highestRealEndpoint,
    "platform-integrated-runtime",
  );
  assert.equal(openProject.maturity.stageSupported, false);
  assert.equal(openProject.maturity.governedProdPromotion, false);
});

test("catalog and publication selectors keep active, unlisted, and retired products separate", () => {
  assert.deepEqual(productPortfolioReadModel.summary, {
    listed: 10,
    managed: 13,
    retired: 2,
    unlisted: 1,
  });
  assert.equal(
    selectProductPortfolioCatalog(productPortfolioReadModel.entries).length,
    10,
  );
  assert.deepEqual(
    selectProductPortfolioCatalog(productPortfolioReadModel.entries, {
      listingStates: ["unlisted"],
    }).map((entry) => entry.identity.productId),
    ["unlisted-library"],
  );
  assert.deepEqual(
    productPortfolioReadModel.publicationQueue.map((item) => item.scenarioId),
    [
      "new-product-delivery-candidate",
      "missing-manifest-candidate",
      "scope-exceeds-policy-candidate",
    ],
  );
  assert.equal(productPortfolioReadModel.publicationRecords.length, 13);
  assert.deepEqual(productPortfolioReadModel.publicationSummary, {
    published: 9,
    captured: 1,
    needsReview: 2,
    rejected: 1,
  });
  assert.deepEqual(productPortfolioReadModel.workspaceStatus, {
    publicationQueue: 3,
    degradedProducts: 1,
    staleProducts: 1,
    state: "attention",
  });
  assert.deepEqual(
    productPortfolioReadModel.publicationSources.map(
      (source) => source.scenarioId,
    ),
    ["curated-workspace-evidence-explorer"],
  );
  assert.equal(
    productPortfolioReadModel.publicationRecords.some(
      (record) => record.scenarioId === "curated-workspace-evidence-explorer",
    ),
    false,
  );
});

test("the curated publication source remains separate, structured, and synthetic", () => {
  const source = productPortfolioReadModel.publicationSources[0];

  assert.ok(source);
  assert.equal(source.scenarioId, "curated-workspace-evidence-explorer");
  assert.equal(
    source.publicationPacket.product.productId,
    "workspace-evidence-explorer",
  );
  assert.equal(source.publicationPacket.publicationKind, "new-product");
  assert.equal(source.publicationPacket.classification.clientRef, null);
  assert.equal(source.provenance.mode, "synthetic");
  assert.deepEqual(source.provenance.authorityRefs, []);
  assert.equal(source.projection.publicationState, "captured");
  assert.equal(source.projection.entry, null);
  assert.equal(
    source.projection.requirements.every(
      (requirement) => requirement.state === "satisfied",
    ),
    true,
  );
  assert.equal(
    productPortfolioScenarios.some(
      (scenario) => scenario.scenarioId === source.scenarioId,
    ),
    false,
  );
});

test("normalized entries expose one stable product projection with source groups", () => {
  const entry = selectProductPortfolioEntryById(
    productPortfolioReadModel.entries,
    "openclaw",
  );

  assert.ok(entry);
  assert.deepEqual(Object.keys(entry).sort(), [
    "classification",
    "delivery",
    "experience",
    "identity",
    "listing",
    "maturity",
    "ownership",
    "provenance",
    "release",
    "runtime",
    "security",
    "source",
  ]);
  assert.equal(entry.identity.productId, "openclaw");
  assert.equal(entry.listing.state, "listed");
  assert.equal(entry.experience.accessClass, "restricted");
  assert.equal(entry.runtime.availability, "live");
});

test("restricted runtime access can coexist with public discoverability when policy permits it", () => {
  const fixture = structuredClone(scenario("scope-exceeds-policy-candidate"));
  fixture.publicationPacket.experience.accessContract.permittedListingScopes = [
    "internal",
    "public",
  ];

  const { projection } = projectProductPortfolioScenario(fixture);
  const listingRequirement = projection.requirements.find(
    (requirement) => requirement.code === "listing-scope",
  );

  assert.equal(listingRequirement?.state, "satisfied");
  assert.equal(projection.publicationState, "captured");
  assert.equal(
    fixture.publicationPacket.experience.accessContract.accessClass,
    "restricted",
  );
});

test("unknown controlled vocabulary fails instead of becoming display prose", () => {
  const fixture = structuredClone(scenario("personal-public-application"));
  fixture.publicationPacket.classification.productForm = "game";

  assert.throws(
    () => projectProductPortfolioScenario(fixture),
    /product-form/,
  );
});

test("publication replay returns the prior receipt and does not create history", () => {
  const fixture = scenario("idempotent-publication-replay");
  const priorReceipt = fixture.projectionContext.appliedPublications[0];
  const { projection } = projectProductPortfolioScenario(fixture);

  assert.ok(priorReceipt);
  assert.equal(projection.entryProjection, "replay");
  assert.equal(projection.receipt.receiptRef, priorReceipt.receiptRef);
  assert.equal(
    projection.entry?.provenance.publicationReceiptRef,
    fixture.projectionContext.existingEntry?.provenance.publicationReceiptRef,
  );
});

test("release and retirement publications mutate only their owned entry fields", () => {
  const releaseFixture = scenario("release-update-existing-product");
  const release = projectProductPortfolioScenario(releaseFixture).projection;
  const retirementFixture = scenario("product-retirement-update");
  const retirement =
    projectProductPortfolioScenario(retirementFixture).projection;

  assert.equal(
    release.entry?.identity.summary,
    releaseFixture.projectionContext.existingEntry?.identity.summary,
  );
  assert.notEqual(
    release.entry?.identity.summary,
    releaseFixture.publicationPacket.manifest.summary,
  );
  assert.equal(release.entry?.listing.state, "listed");
  assert.equal(releaseFixture.publicationPacket.listing.requestedState, "unlisted");
  assert.equal(release.entry?.release?.version, "1.1.0");

  assert.equal(
    retirement.entry?.identity.summary,
    retirementFixture.projectionContext.existingEntry?.identity.summary,
  );
  assert.notEqual(
    retirement.entry?.identity.summary,
    retirementFixture.publicationPacket.manifest.summary,
  );
  assert.equal(retirement.entry?.listing.state, "retired");
});

test("an update cannot be applied to a different existing product", () => {
  const fixture = structuredClone(scenario("release-update-existing-product"));
  fixture.projectionContext.existingEntry.identity.productId = "other-product";

  const { projection } = projectProductPortfolioScenario(fixture);
  const identityRequirement = projection.requirements.find(
    (requirement) => requirement.code === "existing-product",
  );

  assert.equal(projection.publicationState, "needs-review");
  assert.equal(projection.entryProjection, "retain");
  assert.equal(identityRequirement?.state, "conflict");
});

test("Portfolio commands remain bounded to publication, listing, and navigation", () => {
  assert.equal(productPortfolioCommands.includes("retire-product"), false);
  assert.equal(productPortfolioCommands.includes("deploy-product"), false);
  assert.equal(productPortfolioCommands.includes("change-runtime-access"), false);

  const retired = projectProductPortfolioScenario(
    scenario("product-retirement-update"),
  ).projection;
  assert.deepEqual(retired.allowedCommands, ["open-product", "view-history"]);
});

function scenario(scenarioId) {
  const fixture = productPortfolioScenarios.find(
    (candidate) => candidate.scenarioId === scenarioId,
  );
  assert.ok(fixture, `Missing Portfolio fixture ${scenarioId}`);
  return fixture;
}
