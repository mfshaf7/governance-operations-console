import assert from "node:assert/strict";
import test from "node:test";

import {
  projectProductPortfolioEffectiveProjection,
  projectProductPortfolioEffectiveReadModel,
} from "../../src/domain-workspaces/portfolio/local-runtime/product-portfolio-effective-projection.ts";
import { productPortfolioPublicationCaptureIdempotencyKey } from "../../src/domain-workspaces/portfolio/local-runtime/product-portfolio-runtime-model.ts";
import { productPortfolioReadModel } from "../../src/domain-workspaces/portfolio/read-model/product-portfolio-read-model.ts";
import { applyProductPublicationDecision } from "../../src/domain-workspaces/portfolio/work-model/publication/product-publication-decision-model.ts";
import { applyProductListingCommand } from "../../src/domain-workspaces/portfolio/work-model/listing/product-listing-model.ts";

test("Product Portfolio derives publication state from a local receipt without mutating source truth", () => {
  const record = scenario("new-product-delivery-candidate");
  const result = applyProductPublicationDecision({
    context: record.projectionContext,
    decidedAt: "2026-07-23T12:00:00.000Z",
    decidedByRef: "operator://portfolio-test",
    draft: {
      listing: {
        featured: false,
        scope: "internal",
        state: "listed",
      },
      outcome: "publish",
    },
    idempotencyKey: "effective-publication-candidate",
    packet: record.publicationPacket,
  });
  const effective = projectProductPortfolioEffectiveReadModel({
    runtimeProjection: {
      publicationReceipts: [result.receipt],
      captureReceipts: [],
      listingApplications: [],
    },
    sourceReadModel: productPortfolioReadModel,
  });

  assert.equal(record.projection.entry, null);
  assert.equal(
    effective.entries.some(
      (entry) =>
        entry.identity.productId === record.publicationPacket.product.productId,
    ),
    true,
  );
  assert.equal(
    effective.publicationQueue.some(
      (candidate) => candidate.scenarioId === record.scenarioId,
    ),
    false,
  );
  assert.equal(effective.summary.managed, productPortfolioReadModel.summary.managed + 1);
  assert.deepEqual(
    effective.historyByProductId[
      record.publicationPacket.product.productId
    ]?.map((event) => event.kind),
    [
      "release",
      "runtime-observation",
      "publication-decision",
      "product-publication",
    ],
  );
});

test("Product Portfolio replays listing applications over the projected catalog", () => {
  const sourceEntry = entry("unlisted-library");
  const command = {
    draft: {
      featured: false,
      position: { kind: "first" },
      scope: "internal",
      state: "listed",
    },
    expectedPublicationReceiptRef:
      sourceEntry.provenance.publicationReceiptRef,
    idempotencyKey: "effective-listing-update",
    productId: sourceEntry.identity.productId,
    submittedAt: "2026-07-23T12:05:00.000Z",
    submittedByRef: "operator://portfolio-test",
  };
  const result = applyProductListingCommand(
    productPortfolioReadModel.entries,
    command,
  );
  const effective = projectProductPortfolioEffectiveReadModel({
    runtimeProjection: {
      publicationReceipts: [],
      captureReceipts: [],
      listingApplications: [
        { command, receipt: result.receipt, result },
      ],
    },
    sourceReadModel: productPortfolioReadModel,
  });

  assert.equal(sourceEntry.listing.state, "unlisted");
  assert.equal(
    effective.entries.find(
      (candidate) => candidate.identity.productId === sourceEntry.identity.productId,
    )?.listing.state,
    "listed",
  );
  const effectiveScenario = effective.scenarioProjections.find(
    (candidate) =>
      candidate.projection.entry?.identity.productId ===
      sourceEntry.identity.productId,
  );
  assert.equal(effectiveScenario?.projection.entry?.listing.state, "listed");
  assert.notEqual(
    effectiveScenario?.projection.requiredAction.kind,
    "review-listing",
  );
  assert.equal(effective.summary.listed, productPortfolioReadModel.summary.listed + 1);
  assert.equal(effective.summary.unlisted, productPortfolioReadModel.summary.unlisted - 1);
});

test("Product Portfolio applies only the first valid source-matched terminal receipt", () => {
  const record = scenario("new-product-delivery-candidate");
  const result = applyProductPublicationDecision({
    context: record.projectionContext,
    decidedAt: "2026-07-23T12:10:00.000Z",
    decidedByRef: "operator://portfolio-test",
    draft: {
      listing: {
        featured: false,
        scope: "internal",
        state: "listed",
      },
      outcome: "publish",
    },
    idempotencyKey: "effective-publication-authority",
    packet: record.publicationPacket,
  });
  const malformedReceipt = {
    ...result.receipt,
    productId: "another-product",
    receiptId: "portfolio-publication-malformed",
    recordedAt: "2026-07-23T12:09:00.000Z",
  };
  const projection = projectProductPortfolioEffectiveProjection({
    runtimeProjection: {
      publicationReceipts: [result.receipt, malformedReceipt],
      captureReceipts: [],
      listingApplications: [],
    },
    sourceReadModel: productPortfolioReadModel,
  });

  assert.deepEqual(
    projection.publicationReceipts.map((receipt) => receipt.receiptId),
    [result.receipt.receiptId],
  );
  assert.equal(
    projection.readModel.scenarioProjections.find(
      (candidate) => candidate.scenarioId === record.scenarioId,
    )?.projection.publicationState,
    "published",
  );
  assert.deepEqual(
    projection.reconciliationIssues.map((issue) => [
      issue.kind,
      issue.receiptRef,
    ]),
    [["publication-receipt-rejected", malformedReceipt.receiptId]],
  );
});

test("Product Portfolio rejects malformed listing applications without breaking projection", () => {
  const sourceEntry = entry("unlisted-library");
  const command = {
    draft: {
      featured: false,
      position: { kind: "first" },
      scope: "internal",
      state: "listed",
    },
    expectedPublicationReceiptRef:
      sourceEntry.provenance.publicationReceiptRef,
    idempotencyKey: "effective-listing-authority",
    productId: sourceEntry.identity.productId,
    submittedAt: "2026-07-23T12:15:00.000Z",
    submittedByRef: "operator://portfolio-test",
  };
  const result = applyProductListingCommand(
    productPortfolioReadModel.entries,
    command,
  );
  const malformedApplication = {
    command,
    receipt: {
      ...result.receipt,
      after: {
        ...result.receipt.after,
        state: "unlisted",
      },
      receiptId: "portfolio-listing-malformed",
      recordedAt: "2026-07-23T12:14:00.000Z",
    },
  };
  const projection = projectProductPortfolioEffectiveProjection({
    runtimeProjection: {
      publicationReceipts: [],
      captureReceipts: [],
      listingApplications: [
        { command, receipt: result.receipt, result },
        { ...malformedApplication, result },
      ],
    },
    sourceReadModel: productPortfolioReadModel,
  });

  assert.deepEqual(
    projection.listingReceipts.map((receipt) => receipt.receiptId),
    [result.receipt.receiptId],
  );
  assert.equal(
    projection.readModel.entries.find(
      (candidate) =>
        candidate.identity.productId === sourceEntry.identity.productId,
    )?.listing.state,
    "listed",
  );
  assert.deepEqual(
    projection.reconciliationIssues.map((issue) => [
      issue.kind,
      issue.receiptRef,
    ]),
    [["listing-receipt-rejected", malformedApplication.receipt.receiptId]],
  );
});

test("Product Portfolio rejects capture receipts that do not match a catalogued source", () => {
  const source = productPortfolioReadModel.publicationSources[0];
  assert.ok(source);
  const receipt = {
    capturedByRef: "operator://portfolio-test",
    commandName: "portfolio.publication.capture",
    idempotencyKey: productPortfolioPublicationCaptureIdempotencyKey(
      source.scenarioId,
      source.projection.receipt.receiptRef,
    ),
    kind: "capture",
    packetId: source.publicationPacket.packetId,
    productId: "wrong-product",
    publicationReceiptRef: source.projection.receipt.receiptRef,
    receiptId: "portfolio-publication-capture-malformed",
    recordedAt: "2026-07-23T12:20:00.000Z",
    resultState: "captured",
    schemaVersion: 1,
    sourceId: source.scenarioId,
    sourceVersions: source.publicationPacket.sourceVersions,
    summary: "Malformed capture fixture.",
  };
  const projection = projectProductPortfolioEffectiveProjection({
    runtimeProjection: {
      publicationReceipts: [],
      captureReceipts: [receipt],
      listingApplications: [],
    },
    sourceReadModel: productPortfolioReadModel,
  });

  assert.equal(projection.captureReceipts.length, 0);
  assert.equal(
    projection.readModel.scenarioProjections.some(
      (scenario) => scenario.scenarioId === source.scenarioId,
    ),
    false,
  );
  assert.deepEqual(projection.reconciliationIssues, [
    {
      issueId:
        "portfolio-reconciliation:capture-receipt-rejected:portfolio-publication-capture-malformed",
      kind: "capture-receipt-rejected",
      occurredAt: receipt.recordedAt,
      receiptRef: receipt.receiptId,
      subjectRef: source.scenarioId,
      summary:
        "Capture receipt does not match the catalogued publication source version.",
    },
  ]);
});

function entry(productId) {
  const found = productPortfolioReadModel.entries.find(
    (candidate) => candidate.identity.productId === productId,
  );
  assert.ok(found, `Missing Portfolio entry ${productId}`);
  return found;
}

function scenario(scenarioId) {
  const found = productPortfolioReadModel.scenarioProjections.find(
    (candidate) => candidate.scenarioId === scenarioId,
  );
  assert.ok(found, `Missing Portfolio scenario ${scenarioId}`);
  return found;
}
