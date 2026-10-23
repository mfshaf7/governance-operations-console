import { assertGovernedProductPublicationIntent, assertGovernedProductPublicationResult } from "./product-publication-live-contract.ts";
import type { GovernedProductPublicationAction, GovernedProductPublicationResult, GovernedProductPublicationTarget } from "./product-publication-live-types.ts";

export type OwnerPublicationDraft = {
  repo: string; path: string; sourceRevision: string; manifestRevision: string;
  manifestDigest: string; schemaVersion: string; action: GovernedProductPublicationAction; reason: string;
};
export const emptyOwnerPublicationDraft: OwnerPublicationDraft = {
  repo: "", path: "", sourceRevision: "", manifestRevision: "", manifestDigest: "", schemaVersion: "1", action: "publish", reason: "",
};

export function ownerPublicationIntent(draft: OwnerPublicationDraft, requestId: string, at: string, previous: GovernedProductPublicationResult | null) {
  if (previous) {
    assertGovernedProductPublicationResult(previous);
    if (previous.state !== "applied") throw new Error("Use the actual latest applied publication request as the prior state.");
  }
  const current = previous?.receipt.publication_posture ?? "unlisted";
  const sources = { publish: ["unlisted"], update: ["internal", "client", "public"], unpublish: ["internal", "client", "public"], archive: ["unlisted"], restore: ["archived"] };
  if (!sources[draft.action]?.includes(current) || (!previous && draft.action !== "publish")) {
    throw new Error("This action requires the actual prior publication receipt in its allowed source posture.");
  }
  const target: GovernedProductPublicationTarget = draft.action === "archive"
    ? { posture: "archived", listing_scope: "historical-archive", audience: "historical", access_class: "historical-read-only" }
    : ["unpublish", "restore"].includes(draft.action)
      ? { posture: "unlisted", listing_scope: null, audience: null, access_class: null }
      : { posture: "internal", listing_scope: "workspace-portfolio", audience: "workspace-operators", access_class: "workspace-authenticated" };
  return assertGovernedProductPublicationIntent({
    schema_version: Number(draft.schemaVersion), action: draft.action,
    request_id: requestId, idempotency_key: requestId, requested_at: at, decided_at: at,
    current_publication_posture: current, expected_publication_version: previous?.receipt.publication_version ?? 0,
    previous_receipt: previous ? { ...(draft.schemaVersion === "2" ? { publication_posture: current } : {}), publication_version: previous.receipt.publication_version,
      receipt_id: previous.receipt.receipt_id, receipt_digest: previous.receipt_digest } : null,
    manifest_source: { repo: draft.repo.trim(), path: draft.path.trim(), source_revision: draft.sourceRevision.trim(),
      manifest_revision: draft.manifestRevision.trim(), manifest_digest: draft.manifestDigest.trim() },
    operator_reason: draft.reason.trim(), target_publication: target,
  });
}
