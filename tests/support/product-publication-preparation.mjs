// Synthetic read-only preparation, never evidence of live publication.
export function publicationPreparation(overrides = {}) {
  const now = Date.now();
  return { schema_version: 1, product_id: "product:synthetic-product", source_available: true, authority_revision: "b".repeat(40),
    status: "prepared", manifest_schema_version: 1,
    manifest_source: { repo: "synthetic-source", path: "product-publication/manifest.json",
      source_revision: "a".repeat(40), manifest_revision: "c".repeat(40), manifest_digest: "sha256:" + "d".repeat(64) },
    owner_repos: ["synthetic-source"], issues: [], publication_authority_granted: false,
    prepared_at: new Date(now).toISOString(), expires_at: new Date(now + 120_000).toISOString(),
    current: { posture: "unlisted", version: 0, previous_receipt: null, request_id: null },
    available_actions: ["publish"], recent_requests: [], ...overrides };
}
