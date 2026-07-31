import assert from "node:assert/strict";
import test from "node:test";

import { productPortfolioReadModel } from "../../src/domain-workspaces/portfolio/read-model/product-portfolio-read-model.ts";
import {
  productPortfolioWorkspaceStatuses,
  productPortfolioWorkspaceSummaryMetrics,
  productPortfolioWorkspaceSurfaces,
} from "../../src/domain-workspaces/portfolio/presentation/workspace/product-portfolio-workspace-view-model.ts";
import {
  productPortfolioProductsForRegister,
  productPortfolioProductsViewCount,
} from "../../src/domain-workspaces/portfolio/presentation/surfaces/products/products-view-model.ts";
import {
  productDashboardHistoryRows,
  productDashboardSummaryCards,
  productDashboardTabs,
} from "../../src/domain-workspaces/portfolio/presentation/surfaces/products/dashboard/product-dashboard-view-model.ts";
import {
  createProductListingCommand,
  productCurationAnchorEntries,
  productCurationLatestReceipt,
  productCurationViewAfterApply,
  productListingDraftForEntry,
  productPortfolioCurationEntries,
  productPortfolioCurationViews,
} from "../../src/domain-workspaces/portfolio/presentation/surfaces/curation/curation-view-model.ts";
import {
  productPublicationActionModel,
  productPublicationRecordsForRegister,
  productPublicationRegisterViews,
} from "../../src/domain-workspaces/portfolio/presentation/surfaces/publication/publication-view-model.ts";
import {
  initialProductPublicationDraft,
  productPublicationDecisionSubmission,
  productPublicationDecisionValidation,
  productPublicationSessionSteps,
} from "../../src/domain-workspaces/portfolio/presentation/surfaces/publication/session/publication-session-view-model.ts";
import { applyProductPublicationDecision } from "../../src/domain-workspaces/portfolio/work-model/publication/product-publication-decision-model.ts";
import { applyProductListingCommand } from "../../src/domain-workspaces/portfolio/work-model/listing/product-listing-model.ts";

test("Product Portfolio exposes exactly the accepted peer surfaces", () => {
  assert.deepEqual(
    productPortfolioWorkspaceSurfaces.map((surface) => surface.id),
    ["products", "publication", "curation"],
  );
});

test("Products register defaults to active listings and combines all accepted filters", () => {
  const active = productPortfolioProductsForRegister(
    productPortfolioReadModel.entries,
    {
      availability: "all",
      listingView: "active",
      maturity: "all",
      query: "",
      scope: "all",
    },
  );
  const filtered = productPortfolioProductsForRegister(
    productPortfolioReadModel.entries,
    {
      availability: "live",
      listingView: "active",
      maturity: "fully-governed",
      query: "openclaw",
      scope: "internal",
    },
  );

  assert.equal(active.length, productPortfolioReadModel.summary.listed);
  assert.deepEqual(
    filtered.map((entry) => entry.identity.productId),
    ["openclaw"],
  );
  assert.equal(
    productPortfolioProductsViewCount(
      productPortfolioReadModel.entries,
      "unlisted",
    ),
    productPortfolioReadModel.summary.unlisted,
  );
  assert.equal(
    productPortfolioProductsViewCount(
      productPortfolioReadModel.entries,
      "retired",
    ),
    productPortfolioReadModel.summary.retired,
  );
});

test("workspace summary and status stay derived from Product Portfolio truth", () => {
  const productsSummary = productPortfolioWorkspaceSummaryMetrics(
    productPortfolioReadModel,
    "products",
  );
  const publicationSummary = productPortfolioWorkspaceSummaryMetrics(
    productPortfolioReadModel,
    "publication",
  );
  const statuses = productPortfolioWorkspaceStatuses(productPortfolioReadModel);

  assert.deepEqual(
    productsSummary.map((metric) => metric.label),
    ["Managed", "Listed", "Live", "Unlisted", "Retired"],
  );
  assert.deepEqual(
    publicationSummary.map((metric) => metric.label),
    ["Captured", "Needs Review", "Published", "Rejected"],
  );
  assert.deepEqual(
    statuses.map((status) => [status.id, status.state]),
    [
      ["source-mode", "local"],
      ["projection", "current"],
      ["runtime-evidence", "degraded"],
      ["source-freshness", "stale"],
    ],
  );
});

test("Product Dashboard exposes the accepted stable sections and five truthful cards", () => {
  const entry = productPortfolioReadModel.entries.find(
    (candidate) => candidate.identity.productId === "openclaw",
  );
  assert.ok(entry);

  assert.deepEqual(
    productDashboardTabs.map((tab) => tab.value),
    ["overview", "operations", "history"],
  );
  assert.deepEqual(
    productDashboardSummaryCards(entry).map((card) => card.label),
    ["Maturity", "Availability", "Release", "Listing", "Freshness"],
  );
  assert.deepEqual(
    productDashboardSummaryCards(entry).map((card) => card.value),
    ["Fully governed", "Live", "1.0.0", "Listed", "Fresh"],
  );
  const history =
    productPortfolioReadModel.historyByProductId[entry.identity.productId];
  assert.ok(history);
  assert.deepEqual(
    history.map((event) => event.kind),
    ["release", "runtime-observation", "product-publication"],
  );
  assert.deepEqual(
    productDashboardHistoryRows(history).map((row) => row.label),
    ["Product release", "Runtime observation", "Product publication"],
  );
});

test("Curation exposes six accepted cohorts and excludes retired products", () => {
  assert.deepEqual(
    productPortfolioCurationViews.map((view) => view.id),
    ["all-active", "featured", "internal", "client", "public", "unlisted"],
  );

  for (const view of productPortfolioCurationViews) {
    const entries = productPortfolioCurationEntries(
      productPortfolioReadModel.entries,
      view.id,
    );
    assert.equal(
      entries.some((entry) => entry.listing.state === "retired"),
      false,
    );
  }

  const featured = productPortfolioCurationEntries(
    productPortfolioReadModel.entries,
    "featured",
  );
  const unlisted = productPortfolioCurationEntries(
    productPortfolioReadModel.entries,
    "unlisted",
  );

  assert.equal(
    featured.every(
      (entry) => entry.listing.state === "listed" && entry.listing.featured,
    ),
    true,
  );
  assert.equal(
    unlisted.every((entry) => entry.listing.state === "unlisted"),
    true,
  );
});

test("Curation produces structured relative listing drafts and deterministic commands", () => {
  const entry = productPortfolioReadModel.entries.find(
    (candidate) => candidate.identity.productId === "openclaw",
  );
  const unlisted = productPortfolioReadModel.entries.find(
    (candidate) => candidate.identity.productId === "unlisted-library",
  );
  assert.ok(entry);
  assert.ok(unlisted);

  const currentDraft = productListingDraftForEntry(
    productPortfolioReadModel.entries,
    entry,
  );
  const unlistedDraft = productListingDraftForEntry(
    productPortfolioReadModel.entries,
    unlisted,
  );
  const anchors = productCurationAnchorEntries(
    productPortfolioReadModel.entries,
    entry,
    false,
  );
  const commandInput = {
    draft: currentDraft,
    entry,
    submittedAt: "2026-07-23T10:00:00.000Z",
    submittedByRef: "operator://portfolio-test",
  };

  assert.equal(currentDraft.state, "listed");
  assert.equal(
    currentDraft.state === "listed" &&
      ["first", "last", "after"].includes(currentDraft.position.kind),
    true,
  );
  assert.deepEqual(unlistedDraft, {
    featured: false,
    position: null,
    scope: "internal",
    state: "unlisted",
  });
  assert.equal(
    anchors.every(
      (anchor) =>
        anchor.identity.productId !== entry.identity.productId &&
        anchor.listing.state === "listed" &&
        anchor.listing.featured === false,
    ),
    true,
  );
  assert.equal(
    createProductListingCommand(commandInput).idempotencyKey,
    createProductListingCommand(commandInput).idempotencyKey,
  );
});

test("Curation keeps the applied product visible and scopes receipt confirmation", () => {
  const sourceEntry = productPortfolioReadModel.entries.find(
    (candidate) => candidate.identity.productId === "unlisted-library",
  );
  const otherEntry = productPortfolioReadModel.entries.find(
    (candidate) => candidate.identity.productId === "openclaw",
  );
  assert.ok(sourceEntry);
  assert.ok(otherEntry);

  const sourceResult = applyProductListingCommand(
    productPortfolioReadModel.entries,
    createProductListingCommand({
      draft: {
        featured: false,
        position: { kind: "last" },
        scope: "internal",
        state: "listed",
      },
      entry: sourceEntry,
      submittedAt: "2026-07-23T11:00:00.000Z",
      submittedByRef: "operator://portfolio-test",
    }),
  );
  const otherResult = applyProductListingCommand(
    productPortfolioReadModel.entries,
    createProductListingCommand({
      draft: {
        featured: false,
        position: null,
        scope: "internal",
        state: "unlisted",
      },
      entry: otherEntry,
      submittedAt: "2026-07-23T11:05:00.000Z",
      submittedByRef: "operator://portfolio-test",
    }),
  );

  assert.equal(
    productCurationViewAfterApply("unlisted", sourceResult.entry),
    "all-active",
  );
  assert.equal(
    productCurationLatestReceipt(
      [sourceResult.receipt, otherResult.receipt],
      sourceEntry.identity.productId,
    )?.receiptId,
    sourceResult.receipt.receiptId,
  );
});

test("Publication register exposes exactly Open and Resolved from normalized state", () => {
  const open = productPublicationRecordsForRegister(
    productPortfolioReadModel.publicationRecords,
    "open",
  );
  const resolved = productPublicationRecordsForRegister(
    productPortfolioReadModel.publicationRecords,
    "resolved",
  );

  assert.deepEqual(
    productPublicationRegisterViews.map((view) => view.value),
    ["open", "resolved"],
  );
  assert.deepEqual(
    open.map((record) => record.projection.publicationState).sort(),
    ["captured", "needs-review", "needs-review"],
  );
  assert.equal(
    resolved.every(
      (record) =>
        record.projection.publicationState === "published" ||
        record.projection.publicationState === "rejected",
    ),
    true,
  );
  assert.equal(
    resolved.filter(
      (record) => record.projection.publicationState === "rejected",
    ).length,
    productPortfolioReadModel.publicationSummary.rejected,
  );
  assert.equal(
    open.length + resolved.length,
    productPortfolioReadModel.publicationRecords.length,
  );
  assert.equal(
    resolved.length,
    productPortfolioReadModel.publicationSummary.published +
      productPortfolioReadModel.publicationSummary.rejected,
  );
});

test("duplicate publication candidates bypass manual review and open the existing product", () => {
  const duplicate = productPortfolioReadModel.publicationRecords.find(
    (record) => record.scenarioId === "duplicate-product-candidate",
  );
  assert.ok(duplicate);

  assert.equal(duplicate.projection.publicationState, "rejected");
  assert.ok(duplicate.projection.entry);
  assert.equal(productPublicationActionModel(duplicate).label, "Open Existing Product");
});

test("Publication session is exactly Checks, Decision, Result and gates Result on a receipt", () => {
  const record = productPortfolioReadModel.publicationRecords.find(
    (candidate) =>
      candidate.scenarioId === "new-product-delivery-candidate",
  );
  assert.ok(record);

  const draft = initialProductPublicationDraft(record);
  const submission = productPublicationDecisionSubmission({
    decidedAt: "2026-07-23T10:00:00.000Z",
    decidedByRef: "operator://portfolio-test",
    draft,
    record,
  });
  const before = productPublicationSessionSteps({
    activeStep: "checks",
    receipt: null,
    record,
  });
  const result = applyProductPublicationDecision({
    context: record.projectionContext,
    decidedAt: submission.decidedAt,
    decidedByRef: submission.decidedByRef,
    draft: submission.draft,
    idempotencyKey: submission.idempotencyKey,
    packet: record.publicationPacket,
  });
  const after = productPublicationSessionSteps({
    activeStep: "result",
    receipt: result.receipt,
    record,
  });

  assert.deepEqual(
    before.map((step) => step.id),
    ["checks", "decision", "result"],
  );
  assert.equal(before[2].available, false);
  assert.equal(after[2].available, true);
});

test("Publication corrects only listing-scope conflicts within the permitted contract", () => {
  const record = productPortfolioReadModel.publicationRecords.find(
    (candidate) =>
      candidate.scenarioId === "scope-exceeds-policy-candidate",
  );
  assert.ok(record);

  const draft = initialProductPublicationDraft(record);

  assert.equal(draft.scope, "internal");
  assert.equal(productPublicationDecisionValidation(record, draft).allowed, true);
});

test("source-owned missing evidence blocks publication but still permits controlled rejection", () => {
  const record = productPortfolioReadModel.publicationRecords.find(
    (candidate) => candidate.scenarioId === "missing-manifest-candidate",
  );
  assert.ok(record);

  const publishDraft = initialProductPublicationDraft(record);
  const rejectDraft = {
    ...publishDraft,
    decision: "reject",
    reasonCode: "source-withdrawn",
  };
  const otherWithoutNote = {
    ...rejectDraft,
    reasonCode: "other",
    reasonNote: "",
  };

  assert.equal(
    productPublicationDecisionValidation(record, publishDraft).allowed,
    false,
  );
  assert.equal(
    productPublicationDecisionValidation(record, rejectDraft).allowed,
    true,
  );
  assert.equal(
    productPublicationDecisionValidation(record, otherWithoutNote).allowed,
    false,
  );
});

test("Publication submissions use deterministic idempotency for the same packet and decision", () => {
  const record = productPortfolioReadModel.publicationRecords.find(
    (candidate) =>
      candidate.scenarioId === "new-product-delivery-candidate",
  );
  assert.ok(record);
  const draft = initialProductPublicationDraft(record);

  const first = productPublicationDecisionSubmission({
    decidedAt: "2026-07-23T10:00:00.000Z",
    decidedByRef: "operator://portfolio-test",
    draft,
    record,
  });
  const second = productPublicationDecisionSubmission({
    decidedAt: "2026-07-23T10:05:00.000Z",
    decidedByRef: "operator://portfolio-test",
    draft,
    record,
  });

  assert.equal(first.idempotencyKey, second.idempotencyKey);
});
