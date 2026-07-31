import type { ProductPublicationPacket } from "./product-publication-types.ts";
import { projectProductPublication } from "./product-publication-projection.ts";
import type {
  ProductPublicationDecision,
  ProductPortfolioProjectionContext,
} from "./product-publication-review-types.ts";
import type {
  ProductPublicationDecisionApplyResult,
  ProductPublicationDecisionDraft,
  ProductPublicationDecisionReceipt,
  ProductPublicationDecisionValidation,
} from "./product-publication-decision-types.ts";

export function validateProductPublicationDecision({
  context,
  draft,
  packet,
}: {
  context: ProductPortfolioProjectionContext;
  draft: ProductPublicationDecisionDraft;
  packet: ProductPublicationPacket;
}): ProductPublicationDecisionValidation {
  const findings: string[] = [];

  if (packet.publicationKind !== "new-product") {
    findings.push("Only new-product packets use a publication decision.");
  }
  if (context.existingEntry !== null) {
    findings.push(
      "An existing product is resolved through duplicate handling.",
    );
  }
  if (
    draft.outcome === "publish" &&
    draft.listing.state === "unlisted" &&
    draft.listing.featured
  ) {
    findings.push("An unlisted product cannot be featured.");
  }
  if (
    draft.outcome === "reject" &&
    draft.reasonCode === "other" &&
    draft.reasonNote.trim().length === 0
  ) {
    findings.push("A rejection note is required for the Other reason.");
  }

  if (findings.length > 0) {
    return { allowed: false, findings };
  }

  try {
    const projection = projectProductPublication(packet, {
      ...context,
      publicationDecision: productPublicationDecisionFromDraft({
        decidedAt: context.evaluatedAt,
        decidedByRef: "operator://validation",
        draft,
        receiptRef: "portfolio-local://publication/validation",
      }),
    });

    if (draft.outcome === "publish" && projection.publicationState !== "published") {
      const unresolved = projection.requirements
        .filter((requirement) => requirement.state !== "satisfied")
        .map((requirement) => requirement.code);
      findings.push(
        unresolved.length > 0
          ? `Publication requirements remain unresolved: ${unresolved.join(", ")}.`
          : "The product publication is not eligible for publication.",
      );
    }
    if (
      draft.outcome === "reject" &&
      projection.publicationState !== "rejected"
    ) {
      findings.push("The product publication could not be rejected.");
    }
  } catch (error) {
    findings.push(
      error instanceof Error
        ? error.message
        : "The product publication could not be evaluated.",
    );
  }

  return { allowed: findings.length === 0, findings };
}

export function applyProductPublicationDecision({
  context,
  decidedAt,
  decidedByRef,
  draft,
  idempotencyKey,
  packet,
}: {
  context: ProductPortfolioProjectionContext;
  decidedAt: string;
  decidedByRef: string;
  draft: ProductPublicationDecisionDraft;
  idempotencyKey: string;
  packet: ProductPublicationPacket;
}): ProductPublicationDecisionApplyResult {
  const commandFindings = [
    [idempotencyKey, "An idempotency key is required."],
    [decidedAt, "A decision timestamp is required."],
    [decidedByRef, "A decision owner is required."],
  ]
    .filter(([value]) => value.trim().length === 0)
    .map(([, finding]) => finding);
  const validation = validateProductPublicationDecision({
    context,
    draft,
    packet,
  });
  const findings = [...commandFindings, ...validation.findings];

  if (findings.length > 0) {
    throw new Error(findings.join(" "));
  }

  const receiptId = `portfolio-publication-${commandSlug(idempotencyKey)}`;
  const receiptRef = `portfolio-local://publication/${receiptId}`;
  const decision = productPublicationDecisionFromDraft({
    decidedAt,
    decidedByRef,
    draft,
    receiptRef,
  });
  const projection = projectProductPublication(packet, {
    ...context,
    publicationDecision: decision,
    evaluatedAt: decidedAt,
  });
  const published = projection.publicationState === "published";
  const receipt: ProductPublicationDecisionReceipt = {
    commandName: "portfolio.publication.apply",
    decision,
    idempotencyKey,
    listing: projection.entry?.listing ?? null,
    packetId: packet.packetId,
    productId: packet.product.productId,
    publicationReceiptRef: projection.receipt.receiptRef,
    receiptId,
    recordedAt: decidedAt,
    requirementSnapshot: projection.requirements.map((requirement) => ({
      ...requirement,
      evidenceRefs: [...requirement.evidenceRefs],
    })),
    resultState: published ? "published" : "rejected",
    resultingProductRef: published
      ? `portfolio://products/${packet.product.productId}`
      : null,
    schemaVersion: 1,
    sourceVersions: packet.sourceVersions.map((version) => ({ ...version })),
    summary: published
      ? `${packet.manifest.displayName} published to Product Portfolio.`
      : `${packet.manifest.displayName} publication rejected.`,
  };

  return { projection, receipt };
}

function productPublicationDecisionFromDraft({
  decidedAt,
  decidedByRef,
  draft,
  receiptRef,
}: {
  decidedAt: string;
  decidedByRef: string;
  draft: ProductPublicationDecisionDraft;
  receiptRef: string;
}): ProductPublicationDecision {
  if (draft.outcome === "publish") {
    return {
      decidedAt,
      decidedByRef,
      listing: { ...draft.listing },
      outcome: "publish",
      reasonCode: null,
      reasonNote: null,
      receiptRef,
    };
  }

  const reasonNote = draft.reasonNote.trim();
  return {
    decidedAt,
    decidedByRef,
    listing: null,
    outcome: "reject",
    reasonCode: draft.reasonCode,
    reasonNote: reasonNote.length > 0 ? reasonNote : null,
    receiptRef,
  };
}

function commandSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (slug.length === 0) {
    throw new Error("The command idempotency key cannot be empty.");
  }

  return slug;
}
