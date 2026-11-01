import type { GovernedProductPublicationAction, GovernedProductPublicationIntent, GovernedProductPublicationPreviousReceipt } from "./product-publication-live-types.ts";
import { assertGovernedProductPublicationIntent } from "./product-publication-live-contract.ts";

export type ProductPublicationPreparation = {
  schema_version: 1;
  product_id: string;
  authority_revision: string | null;
  source_available: boolean;
  status: "prepared" | "blocked";
  manifest_source: GovernedProductPublicationIntent["manifest_source"] | null;
  manifest_schema_version: 1 | 2 | null;
  owner_repos: string[];
  issues: { code: string; message: string }[];
  prepared_at: string;
  expires_at: string;
  publication_authority_granted: false;
  current: { posture: "unlisted" | "internal" | "client" | "public" | "archived";
    version: number; previous_receipt: GovernedProductPublicationPreviousReceipt | null; request_id: string | null };
  available_actions: GovernedProductPublicationAction[];
  recent_requests: { request_id: string; action: GovernedProductPublicationAction; state: "applied" | "rejected"; recorded_at: string }[];
};

export function assertProductPublicationPreparation(value: unknown, productId: string, now = Date.now()): ProductPublicationPreparation {
  const p = value as ProductPublicationPreparation | null;
  const source = p?.manifest_source;
  const invalid = (): never => { throw new Error("Publication information could not be verified. Load it again."); };
  if (!p) throw new Error("Publication information is unavailable.");
  if (p.schema_version !== 1 || p.product_id !== productId || !/^product:[a-z0-9][a-z0-9._-]*$/.test(productId)
    || !["prepared", "blocked"].includes(p.status) || typeof p.source_available !== "boolean"
    || (p.source_available ? !/^[a-f0-9]{40}$/.test(p.authority_revision ?? "") : p.authority_revision !== null || p.status !== "blocked" || p.available_actions?.length !== 0 || !p.recent_requests?.length)
    || p.publication_authority_granted !== false || !Array.isArray(p.owner_repos) || !p.owner_repos.length || p.owner_repos.length > 8
    || p.owner_repos.some(owner => typeof owner !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(owner))
    || !Array.isArray(p.issues) || p.issues.length > 8 || p.issues.some(issue => typeof issue?.code !== "string" || typeof issue?.message !== "string" || issue.message.length > 1024)
    || !Number.isFinite(Date.parse(p.prepared_at)) || !Number.isFinite(Date.parse(p.expires_at))
    || Date.parse(p.prepared_at) > now + 30_000 || Date.parse(p.expires_at) <= now
    || Date.parse(p.expires_at) <= Date.parse(p.prepared_at)
    || Date.parse(p.expires_at) - Date.parse(p.prepared_at) > 120_000
    || !p.current || !["unlisted", "internal", "client", "public", "archived"].includes(p.current.posture)
    || !Number.isSafeInteger(p.current.version) || p.current.version < 0
    || !Array.isArray(p.available_actions) || p.available_actions.length > 5
    || p.available_actions.some(action => !["publish", "update", "unpublish", "archive", "restore"].includes(action))
    || !Array.isArray(p.recent_requests) || p.recent_requests.length > 20
    || p.recent_requests.some(row => !/^product-publication-request:[a-z0-9][a-z0-9._:-]*$/.test(row?.request_id ?? "")
      || !["applied", "rejected"].includes(row.state) || !["publish", "update", "unpublish", "archive", "restore"].includes(row.action)
      || !Number.isFinite(Date.parse(row.recorded_at)))) invalid();
  if (p.status === "prepared") {
    if (!source || !p.owner_repos.includes(source.repo) || typeof source.path !== "string" || !/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$)).+$/.test(source.path)
      || !/^[a-f0-9]{40}$/.test(source.source_revision) || !/^[a-f0-9]{40}$/.test(source.manifest_revision)
      || !/^sha256:[a-f0-9]{64}$/.test(source.manifest_digest) || ![1, 2].includes(p.manifest_schema_version ?? 0) || p.issues.length) invalid();
  } else if (source !== null || p.manifest_schema_version !== null || !p.issues.length) invalid();
  if (p.current.version === 0) {
    if (p.current.posture !== "unlisted" || p.current.previous_receipt !== null || p.current.request_id !== null) invalid();
  } else {
    const previous = p.current.previous_receipt;
    if (!previous || previous.publication_version !== p.current.version || previous.publication_posture !== p.current.posture
      || !/^product-publication-request:[a-z0-9][a-z0-9._:-]*$/.test(p.current.request_id ?? "")
      || !/^product-publication-receipt:[a-z0-9][a-z0-9._:-]*$/.test(previous.receipt_id)
      || !/^sha256:[a-f0-9]{64}$/.test(previous.receipt_digest)) invalid();
  }
  return p;
}

export function preparedPublicationIntent(preparation: ProductPublicationPreparation, action: GovernedProductPublicationAction,
  reason: string, requestId: string, at: string) {
  const p = assertProductPublicationPreparation(preparation, preparation.product_id, Date.parse(at));
  if (p.status !== "prepared" || !p.manifest_source || !p.manifest_schema_version || !p.available_actions.includes(action)) {
    throw new Error("Load current publication information and choose an available action.");
  }
  const target = action === "archive" ? { posture: "archived", listing_scope: "historical-archive", audience: "historical", access_class: "historical-read-only" }
    : ["unpublish", "restore"].includes(action) ? { posture: "unlisted", listing_scope: null, audience: null, access_class: null }
      : { posture: "internal", listing_scope: "workspace-portfolio", audience: "workspace-operators", access_class: "workspace-authenticated" };
  return assertGovernedProductPublicationIntent({ schema_version: p.manifest_schema_version, action,
    request_id: requestId, idempotency_key: requestId, requested_at: at, decided_at: at,
    current_publication_posture: p.current.posture, expected_publication_version: p.current.version,
    previous_receipt: p.current.previous_receipt ? {
      receipt_id: p.current.previous_receipt.receipt_id, receipt_digest: p.current.previous_receipt.receipt_digest,
      publication_version: p.current.previous_receipt.publication_version,
      ...(p.manifest_schema_version === 2 ? { publication_posture: p.current.posture } : {}),
    } : null, manifest_source: p.manifest_source,
    operator_reason: reason.trim(), target_publication: target });
}

export const publicationActionLabels: Record<GovernedProductPublicationAction, string> = {
  publish: "Add to catalog", update: "Update catalog entry", unpublish: "Remove from catalog",
  archive: "Archive retired product", restore: "Restore as unlisted",
};
export const publicationPostureLabels = { unlisted: "Not listed", internal: "Workspace catalog", client: "Client catalog", public: "Public catalog", archived: "Archived" };
