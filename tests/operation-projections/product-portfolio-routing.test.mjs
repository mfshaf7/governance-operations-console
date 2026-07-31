import assert from "node:assert/strict";
import test from "node:test";

import { projectCommandCenterAttention } from "../../src/command-center/read-model/command-center-attention.ts";
import { portfolioAttentionSource } from "../../src/domain-workspaces/portfolio/read-model/attention-source.ts";
import { productPortfolioReadModel } from "../../src/domain-workspaces/portfolio/read-model/product-portfolio-read-model.ts";
import {
  resolveProductPortfolioEntryIntent,
  resolveProductPortfolioRoute,
} from "../../src/domain-workspaces/portfolio/presentation/routing/product-portfolio-route-model.ts";

test("Portfolio routes every published required move to its owning surface", () => {
  assert.deepEqual(
    resolveProductPortfolioEntryIntent(
      intent("degraded-service", "portfolio.repair-runtime-evidence"),
      productPortfolioReadModel,
    ),
    { kind: "product-dashboard", productId: "degraded-service" },
  );
  assert.deepEqual(
    resolveProductPortfolioEntryIntent(
      intent("new-product-delivery-candidate", "portfolio.review-publication"),
      productPortfolioReadModel,
    ),
    {
      kind: "publication",
      productId: "new-product-delivery-candidate",
    },
  );
  assert.deepEqual(
    resolveProductPortfolioEntryIntent(
      intent("missing-manifest-candidate", "portfolio.repair-publication"),
      productPortfolioReadModel,
    ),
    { kind: "publication", productId: "missing-manifest-candidate" },
  );
  assert.deepEqual(
    resolveProductPortfolioEntryIntent(
      intent("unlisted-library", "portfolio.review-listing"),
      productPortfolioReadModel,
    ),
    { kind: "curation", productId: "unlisted-library" },
  );
  assert.equal(
    resolveProductPortfolioEntryIntent(
      intent("openclaw", "portfolio.unknown"),
      productPortfolioReadModel,
    ),
    null,
  );
});

test("Portfolio exposes unsupported owner routes as unavailable", () => {
  assert.deepEqual(
    resolveProductPortfolioRoute(
      "owner://product-owner:missing-manifest-candidate",
      productPortfolioReadModel,
    ),
    {
      kind: "unavailable",
      reason: "This owner does not yet expose a console or external route.",
    },
  );
});

test("Portfolio attention retains missing-manifest repair identity", () => {
  const source = portfolioAttentionSource.getSnapshot();
  const projection = projectCommandCenterAttention(
    [source],
    source.source.projectedAt,
  );
  const candidate = projection.candidates.find(
    ({ candidateId }) =>
      candidateId ===
      "portfolio:missing-manifest-candidate:portfolio.repair-publication",
  );

  assert.ok(candidate);
  assert.equal(candidate.subject.title, "Missing Manifest Candidate");
  assert.match(candidate.source.ref, /missing-manifest-candidate/);
  assert.deepEqual(projection.issues, []);
});

function intent(subjectRef, requiredMoveRef) {
  return {
    mode: requiredMoveRef.includes("repair") ? "resolve" : "review",
    requiredMoveRef,
    subjectRef,
  };
}
