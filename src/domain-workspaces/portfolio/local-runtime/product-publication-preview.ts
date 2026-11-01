import type { ProductPortfolioEntry } from "../domain/product-portfolio-entry-types.ts";
import type { ProductPublicationPreparation } from "../live-runtime/product-publication-preparation.ts";

// Explicit design examples only; no publication authority or successful receipt.
export function preparePreviewPublication(entries: readonly ProductPortfolioEntry[], productId: string): ProductPublicationPreparation {
      const entry = entries.find(entry => `product:${entry.identity.productId}` === productId);
      if (!entry) throw new Error("Select an example product.");
      const posture = entry.listing.state === "retired" ? "archived" : entry.listing.state === "unlisted" ? "unlisted" : entry.listing.scope;
      const listed = posture !== "unlisted";
      const now = Date.now();
      return { schema_version: 1, product_id: productId, source_available: true, authority_revision: "0".repeat(40),
        status: "prepared", manifest_schema_version: posture === "archived" ? 2 : 1,
        manifest_source: { repo: "preview-owner", path: "product-publication/manifest.json",
          source_revision: "1".repeat(40), manifest_revision: "2".repeat(40), manifest_digest: "sha256:" + "3".repeat(64) },
        owner_repos: ["preview-owner"], issues: [], publication_authority_granted: false,
        prepared_at: new Date(now).toISOString(), expires_at: new Date(now + 120_000).toISOString(),
        current: { posture, version: listed ? 1 : 0,
          previous_receipt: listed ? { publication_posture: posture, publication_version: 1,
            receipt_id: `product-publication-receipt:preview:${entry.identity.productId}`, receipt_digest: "sha256:" + "4".repeat(64) } : null,
          request_id: listed ? `product-publication-request:preview:${entry.identity.productId}` : null },
        available_actions: posture === "archived" ? ["restore"] : listed ? ["update", "unpublish"] : ["publish"], recent_requests: [],
      };
}
