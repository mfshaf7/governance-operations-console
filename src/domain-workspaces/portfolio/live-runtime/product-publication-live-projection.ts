import type { ProductPortfolioPublicationSubmission } from "../local-runtime/product-portfolio-runtime-model.ts";
import type { ProductPublicationAuthorityEvidence } from "../work-model/publication/product-publication-decision-types.ts";
import { governedProductPublicationTarget } from "../work-model/publication/product-publication-audience-model.ts";
import type {
  GovernedProductPublicationIntent,
  GovernedProductPublicationResult,
} from "./product-publication-live-types.ts";

export function governedIntentFromPortfolioDecision(
  submission: ProductPortfolioPublicationSubmission,
): GovernedProductPublicationIntent {
  const { record } = submission;
  if (record.provenance.mode !== "authority-snapshot") {
    throw new Error(
      "Synthetic or companion fixture data cannot enter governed Product Publication.",
    );
  }
  if (submission.draft.outcome !== "publish") {
    throw new Error(
      "Declining a candidate is a Console review disposition, not an OOS publication action.",
    );
  }
  const binding = record.publicationPacket.governedPublication;
  if (!binding) {
    throw new Error(
      "The publication source has no exact owner-manifest and version binding.",
    );
  }
  const target = governedProductPublicationTarget(submission.draft.listing);
  if (
    (target.posture === "unlisted" && binding.action !== "unpublish") ||
    (target.posture !== "unlisted" && !new Set(["publish", "update"]).has(binding.action)) ||
    binding.action === "archive"
  ) {
    throw new Error(
      "The reviewed publication action conflicts with the selected target posture.",
    );
  }
  return {
    action: binding.action,
    current_publication_posture: binding.currentPosture,
    decided_at: submission.decidedAt,
    expected_publication_version: binding.expectedVersion,
    idempotency_key: binding.idempotencyKey,
    manifest_source: {
      manifest_digest: binding.manifestSource.manifestDigest,
      manifest_revision: binding.manifestSource.manifestRevision,
      path: binding.manifestSource.path,
      repo: binding.manifestSource.repo,
      source_revision: binding.manifestSource.sourceRevision,
    },
    operator_reason: `Apply the reviewed ${binding.action} action for ${record.publicationPacket.product.productId}.`,
    previous_receipt: binding.previousReceipt
      ? {
          publication_version: binding.previousReceipt.publicationVersion,
          receipt_digest: binding.previousReceipt.receiptDigest,
          receipt_id: binding.previousReceipt.receiptId,
        }
      : null,
    request_id: binding.requestId,
    requested_at: submission.decidedAt,
    target_publication: target,
  };
}

export function portfolioSubmissionFromGovernedResult({
  result,
  submission,
}: {
  result: GovernedProductPublicationResult;
  submission: ProductPortfolioPublicationSubmission;
}): ProductPortfolioPublicationSubmission {
  const localProductId = submission.record.publicationPacket.product.productId;
  if (
    result.receipt.product_id !== localProductId &&
    result.receipt.product_id !== `product:${localProductId}`
  ) {
    throw new Error(
      "The authoritative Product Publication receipt belongs to another product.",
    );
  }
  if (result.state !== "applied") {
    throw new Error(
      `Product Publication was rejected by authoritative readiness (${result.receipt.receipt_id}). Correct owner evidence before retrying.`,
    );
  }
  const command = result.command;
  const manifestSource = command.manifest_source as GovernedProductPublicationIntent["manifest_source"];
  const targetPublication = command.target_publication as GovernedProductPublicationIntent["target_publication"];
  const readiness = result.readiness as {
    ledger?: { ref?: { uri?: unknown } };
  };
  const authorityEvidence: ProductPublicationAuthorityEvidence = {
    authorityRevision: String(command.authority_revision),
    ownerManifest: {
      manifestDigest: manifestSource.manifest_digest,
      manifestRevision: manifestSource.manifest_revision,
      path: manifestSource.path,
      repo: manifestSource.repo,
      sourceRevision: manifestSource.source_revision,
    },
    ownerReceiptRef: result.receipt.owner_receipt_ref,
    publicationVersion: result.receipt.publication_version,
    readinessReceiptRef: String(readiness.ledger?.ref?.uri ?? ""),
    receiptDigest: result.receipt_digest,
    requestDigest: result.receipt.request_digest,
    requestId: result.request_id,
    resolution: result.resolution,
    targetPublication: structuredClone(targetPublication),
  };
  if (!authorityEvidence.readinessReceiptRef.startsWith("wgcf://")) {
    throw new Error("The authoritative readiness receipt reference is unavailable.");
  }
  return {
    ...submission,
    authorityEvidence,
    decidedByRef: String(command.operator_id),
    idempotencyKey: String(command.idempotency_key),
    receiptId: result.receipt.receipt_id,
    receiptRef: result.receipt.owner_receipt_ref,
    recordedAt: result.receipt.recorded_at,
  };
}
