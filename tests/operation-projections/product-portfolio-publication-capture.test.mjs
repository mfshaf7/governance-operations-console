import assert from "node:assert/strict";
import test from "node:test";

import {
  getProductPortfolioEffectiveProjection,
  submitProductPortfolioPublicationCapture,
} from "../../src/domain-workspaces/portfolio/local-runtime/product-portfolio-runtime.ts";
import { productPortfolioReadModel } from "../../src/domain-workspaces/portfolio/read-model/product-portfolio-read-model.ts";

test("Product Portfolio captures only a catalogued source into Publication", async () => {
  const source = publicationSource();

  assert.equal(
    productPortfolioReadModel.publicationRecords.some(
      (record) => record.scenarioId === source.scenarioId,
    ),
    false,
  );

  const result = await submitProductPortfolioPublicationCapture({
    capturedAt: "2026-07-30T08:00:00.000Z",
    capturedByRef: "operator://portfolio-test",
    expectedPublicationReceiptRef: source.projection.receipt.receiptRef,
    sourceId: source.scenarioId,
  });
  const effective = getProductPortfolioEffectiveProjection();

  assert.equal(result.source.scenarioId, source.scenarioId);
  assert.equal(result.receipt.resultState, "captured");
  assert.equal(result.receipt.sourceId, source.scenarioId);
  assert.equal(effective.captureReceipts.length, 1);
  assert.equal(
    effective.readModel.publicationQueue.some(
      (record) => record.scenarioId === source.scenarioId,
    ),
    true,
  );
  assert.equal(
    effective.readModel.publicationRecords.find(
      (record) => record.scenarioId === source.scenarioId,
    )?.projection.publicationState,
    "captured",
  );
  assert.deepEqual(
    effective.readModel.historyByProductId[
      source.publicationPacket.product.productId
    ]?.map((event) => event.kind),
    ["publication-capture"],
  );
});

test("Product Portfolio publication capture is idempotent for one source version", async () => {
  const source = publicationSource();
  const first = await submitProductPortfolioPublicationCapture({
    capturedAt: "2026-07-30T08:01:00.000Z",
    capturedByRef: "operator://portfolio-test",
    expectedPublicationReceiptRef: source.projection.receipt.receiptRef,
    sourceId: source.scenarioId,
  });
  const second = await submitProductPortfolioPublicationCapture({
    capturedAt: "2026-07-30T08:02:00.000Z",
    capturedByRef: "operator://portfolio-test",
    expectedPublicationReceiptRef: source.projection.receipt.receiptRef,
    sourceId: source.scenarioId,
  });

  assert.equal(second.receipt.receiptId, first.receipt.receiptId);
  assert.equal(getProductPortfolioEffectiveProjection().captureReceipts.length, 1);
});

test("Product Portfolio rejects arbitrary and stale capture sources", async () => {
  const source = publicationSource();

  await assert.rejects(
    submitProductPortfolioPublicationCapture({
      capturedAt: "2026-07-30T08:03:00.000Z",
      capturedByRef: "operator://portfolio-test",
      expectedPublicationReceiptRef: "portfolio-fixture://stale",
      sourceId: source.scenarioId,
    }),
    /changed after capture opened/,
  );
  await assert.rejects(
    submitProductPortfolioPublicationCapture({
      capturedAt: "2026-07-30T08:04:00.000Z",
      capturedByRef: "operator://portfolio-test",
      expectedPublicationReceiptRef: "portfolio-fixture://invented",
      sourceId: "invented-source",
    }),
    /no longer available/,
  );
});

function publicationSource() {
  const source = productPortfolioReadModel.publicationSources[0];
  assert.ok(source, "Missing Product Portfolio publication source fixture.");
  return source;
}
