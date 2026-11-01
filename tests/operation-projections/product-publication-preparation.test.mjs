import assert from "node:assert/strict";
import test from "node:test";
import { publicationPreparation } from "../support/product-publication-preparation.mjs";
import { assertProductPublicationPreparation, preparedPublicationIntent } from "../../src/domain-workspaces/portfolio/live-runtime/product-publication-preparation.ts";

test("publication review derives immutable machine fields from prepared owner information", () => {
  const prepared = publicationPreparation();
  const intent = preparedPublicationIntent(prepared, "publish", "Make the product discoverable", "product-publication-request:test", new Date().toISOString());
  assert.deepEqual(intent.manifest_source, prepared.manifest_source);
  assert.deepEqual(intent.target_publication, { posture: "internal", listing_scope: "workspace-portfolio", audience: "workspace-operators", access_class: "workspace-authenticated" });
  assert.equal(intent.expected_publication_version, 0);
  assert.equal(intent.previous_receipt, null);
  assert.equal(prepared.publication_authority_granted, false);
});

test("publication review fails on missing, expired, cross-product or malformed preparation", () => {
  const p = publicationPreparation();
  for (const change of [
    { expires_at: new Date(Date.now() - 1).toISOString() },
    { manifest_source: { ...p.manifest_source, manifest_digest: "bad" } },
    { current: { ...p.current, version: 1 } },
    { publication_authority_granted: true },
    { recent_requests: [{ request_id: "not-a-request", state: "applied", action: "publish", recorded_at: new Date().toISOString() }] },
  ]) assert.throws(() => assertProductPublicationPreparation({ ...p, ...change }, p.product_id));
  assert.throws(() => assertProductPublicationPreparation(p, "product:other"));
  assert.throws(() => preparedPublicationIntent({ ...p, status: "blocked", manifest_source: null,
    manifest_schema_version: null, issues: [{ code: "missing", message: "Owner information needed" }] },
  "publish", "Reason", "product-publication-request:test", new Date().toISOString()));
});

test("updates bind the latest owner receipt without adding schema-two fields to a schema-one command", () => {
  const previous = { publication_posture: "internal", publication_version: 3,
    receipt_id: "product-publication-receipt:prior", receipt_digest: "sha256:" + "e".repeat(64) };
  const prepared = publicationPreparation({ current: { posture: "internal", version: 3,
    previous_receipt: previous, request_id: "product-publication-request:prior" }, available_actions: ["update", "unpublish"] });
  const intent = preparedPublicationIntent(prepared, "update", "Refresh product information", "product-publication-request:test", new Date().toISOString());
  assert.equal(intent.previous_receipt.publication_version, 3);
  assert.equal(intent.previous_receipt.publication_posture, undefined);
  assert.throws(() => preparedPublicationIntent(prepared, "archive", "Reason", "product-publication-request:test", new Date().toISOString()));
});

test("preparation preserves the contract product identity grammar", () => {
  const p = publicationPreparation({ product_id: "product:client_app.v2" });
  assert.equal(assertProductPublicationPreparation(p, p.product_id).product_id, "product:client_app.v2");
});

test("journal recovery stays available on source failure without permitting another publication", () => {
  const p = publicationPreparation({ source_available: false, authority_revision: null, status: "blocked",
    manifest_source: null, manifest_schema_version: null, available_actions: [],
    issues: [{ code: "publication-source-unavailable", message: "Earlier request results remain available" }],
    current: { posture: "internal", version: 1, request_id: "product-publication-request:prior",
      previous_receipt: { publication_posture: "internal", publication_version: 1,
        receipt_id: "product-publication-receipt:prior", receipt_digest: "sha256:" + "e".repeat(64) } },
    recent_requests: [{ request_id: "product-publication-request:prior", action: "publish", state: "applied", recorded_at: new Date().toISOString() }],
  });
  assert.equal(assertProductPublicationPreparation(p, p.product_id).current.version, 1);
  assert.throws(() => preparedPublicationIntent(p, "publish", "Reason", "product-publication-request:test", new Date().toISOString()));
  assert.throws(() => assertProductPublicationPreparation({ ...p, recent_requests: [] }, p.product_id));
});

test("prepared source locations follow the existing relative-path contract", () => {
  const p = publicationPreparation();
  const custom = { ...p, manifest_source: { ...p.manifest_source, path: "catalog/active-product" } };
  assert.equal(assertProductPublicationPreparation(custom, custom.product_id).manifest_source.path, "catalog/active-product");
  for (const path of ["/etc/passwd", "../secret", "a/../../secret"]) assert.throws(() => assertProductPublicationPreparation({ ...p, manifest_source: { ...p.manifest_source, path } }, p.product_id));
});
