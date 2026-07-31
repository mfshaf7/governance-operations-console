import assert from "node:assert/strict";
import test from "node:test";

import {
  getProductPortfolioEffectiveReadModel,
  getProductPortfolioRuntimeCapabilities,
  getProductPortfolioRuntimeProjectionSnapshot,
  listProductPortfolioRuntimeReceipts,
  submitProductPortfolioPublicationDecision,
  submitProductPortfolioListingCommand,
} from "../../src/domain-workspaces/portfolio/local-runtime/product-portfolio-runtime.ts";
import { productPortfolioReadModel } from "../../src/domain-workspaces/portfolio/read-model/product-portfolio-read-model.ts";

test("Product Portfolio runtime declares prototype-local submit capability", () => {
  const capabilities = getProductPortfolioRuntimeCapabilities();

  assert.equal(capabilities.mode, "local");
  assert.equal(capabilities.canSubmit, true);
});

test("Product Portfolio publication retries reuse one run and effective projection", async () => {
  const record = scenario("new-product-delivery-candidate");
  const submission = {
    decidedAt: "2026-07-23T13:00:00.000Z",
    decidedByRef: "operator://portfolio-test",
    draft: {
      listing: {
        featured: false,
        scope: "internal",
        state: "listed",
      },
      outcome: "publish",
    },
    idempotencyKey: "runtime-publication-candidate",
    record,
  };
  const first = await submitProductPortfolioPublicationDecision(submission);
  const repeated = await submitProductPortfolioPublicationDecision(submission);
  const receipts = await listProductPortfolioRuntimeReceipts(record.scenarioId);
  const effective = getProductPortfolioEffectiveReadModel();

  assert.equal(first.receipt.receiptId, repeated.receipt.receiptId);
  assert.equal(first.receipt.resultState, "published");
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].durability, "prototype-local");
  assert.equal(
    effective.entries.some(
      (entry) => entry.identity.productId === first.receipt.productId,
    ),
    true,
  );
  assert.equal(
    getProductPortfolioRuntimeProjectionSnapshot().publicationReceipts.length,
    1,
  );
  await assert.rejects(
    submitProductPortfolioPublicationDecision({
      ...submission,
      decidedAt: "2026-07-23T13:01:00.000Z",
      idempotencyKey: "runtime-conflicting-publication-candidate",
    }),
    /already resolved/i,
  );
});

test("Product Portfolio listing retries reuse one receipt and mutate effective listing only", async () => {
  const sourceEntry = getProductPortfolioEffectiveReadModel().entries.find(
    (entry) => entry.identity.productId === "unlisted-library",
  );
  assert.ok(sourceEntry);
  const command = {
    draft: {
      featured: false,
      position: { kind: "first" },
      scope: "internal",
      state: "listed",
    },
    expectedPublicationReceiptRef:
      sourceEntry.provenance.publicationReceiptRef,
    idempotencyKey: "runtime-listing-update",
    productId: sourceEntry.identity.productId,
    submittedAt: "2026-07-23T13:05:00.000Z",
    submittedByRef: "operator://portfolio-test",
  };
  const first = await submitProductPortfolioListingCommand(command);
  const repeated = await submitProductPortfolioListingCommand({
    ...command,
    submittedAt: "2026-07-23T13:06:00.000Z",
  });
  const receipts = await listProductPortfolioRuntimeReceipts(
    sourceEntry.identity.productId,
  );
  const effectiveEntry = getProductPortfolioEffectiveReadModel().entries.find(
    (entry) => entry.identity.productId === sourceEntry.identity.productId,
  );

  assert.equal(first.receipt.receiptId, repeated.receipt.receiptId);
  assert.equal(receipts.length, 1);
  assert.equal(effectiveEntry?.listing.state, "listed");
  assert.equal(sourceEntry.listing.state, "unlisted");
  assert.equal(
    getProductPortfolioRuntimeProjectionSnapshot().listingApplications.length,
    1,
  );
  await assert.rejects(
    submitProductPortfolioListingCommand({
      ...command,
      draft: {
        featured: false,
        position: null,
        scope: "internal",
        state: "unlisted",
      },
      submittedAt: "2026-07-23T13:07:00.000Z",
    }),
    /idempotency key is already bound/i,
  );
});

test("Product Portfolio runtime rejects a stale listing command", async () => {
  const sourceEntry = getProductPortfolioEffectiveReadModel().entries.find(
    (entry) => entry.identity.productId === "openclaw",
  );
  assert.ok(sourceEntry);

  await assert.rejects(
    submitProductPortfolioListingCommand({
      draft: {
        featured: sourceEntry.listing.featured,
        position: { kind: "last" },
        scope: sourceEntry.listing.scope,
        state: "listed",
      },
      expectedPublicationReceiptRef: "portfolio://stale-publication",
      idempotencyKey: "runtime-stale-listing",
      productId: sourceEntry.identity.productId,
      submittedAt: "2026-07-23T13:10:00.000Z",
      submittedByRef: "operator://portfolio-test",
    }),
    /projection changed/i,
  );
});

function scenario(scenarioId) {
  const found = productPortfolioReadModel.scenarioProjections.find(
    (candidate) => candidate.scenarioId === scenarioId,
  );
  assert.ok(found, `Missing Portfolio scenario ${scenarioId}`);
  return found;
}
