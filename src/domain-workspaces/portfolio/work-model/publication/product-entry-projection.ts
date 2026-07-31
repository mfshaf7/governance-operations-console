import type { ProductPortfolioEntry } from "../../domain/product-portfolio-entry-types.ts";
import type { ProductPublicationPacket } from "./product-publication-types.ts";
import type {
  ProductPublicationRejectionReasonCode,
  ProductPortfolioProjectionContext,
  ProductPublicationReceipt,
} from "./product-publication-review-types.ts";

function newestRuntimeObservation(packet: ProductPublicationPacket) {
  return [...packet.runtimeObservations].sort((left, right) =>
    right.observedAt.localeCompare(left.observedAt),
  )[0];
}

export function productEntryFromPacket(
  packet: ProductPublicationPacket,
  context: ProductPortfolioProjectionContext,
  receiptRef: string,
): ProductPortfolioEntry {
  const observation = newestRuntimeObservation(packet);
  const stale =
    observation?.expiresAt !== null &&
    observation?.expiresAt !== undefined &&
    observation.expiresAt <= context.evaluatedAt;
  const availability = stale
    ? "unknown"
    : (observation?.availability ?? "unknown");
  const freshness =
    observation === undefined ? "unknown" : stale ? "stale" : "fresh";
  const primaryTarget = packet.experience.primaryTarget;

  if (primaryTarget === null) {
    throw new Error(
      `Product ${packet.product.productId} has no primary target.`,
    );
  }

  const projectedEntry: ProductPortfolioEntry = {
    classification: {
      clientRef: packet.classification.clientRef,
      portfolioSegment: packet.classification.portfolioSegment,
      productForm: packet.classification.productForm,
      tags: [...packet.classification.tags],
    },
    delivery: {
      historyRefs: Array.from(
        new Set([
          ...(context.existingEntry?.delivery.historyRefs ?? []),
          ...packet.delivery.historyRefs,
          ...(packet.delivery.latestOutcomeRef === null
            ? []
            : [packet.delivery.latestOutcomeRef]),
        ]),
      ),
      latestOutcomeRef: packet.delivery.latestOutcomeRef,
    },
    experience: {
      accessClass: packet.experience.accessContract.accessClass,
      primaryTarget: { ...primaryTarget },
      secondaryTargets: packet.experience.secondaryTargets.map((target) => ({
        ...target,
      })),
    },
    identity: {
      artworkRef: packet.manifest.artworkRef,
      displayName: packet.manifest.displayName,
      productId: packet.product.productId,
      purpose: packet.manifest.purpose,
      registryRef: packet.product.registryRef,
      summary: packet.manifest.summary,
    },
    listing: {
      featured: packet.listing.featured,
      scope: packet.listing.requestedScope,
      sortOrder: packet.listing.sortOrder,
      state:
        packet.publicationKind === "product-retirement"
          ? "retired"
          : packet.listing.requestedState,
    },
    maturity: {
      governedProdPromotion: packet.maturity.governedProdPromotion,
      highestRealEndpoint: packet.maturity.highestRealEndpoint,
      level: packet.maturity.level,
      productLifecycle: packet.product.lifecycle,
      stageSupported: packet.maturity.stageSupported,
    },
    ownership: {
      platformOwnerRef: packet.owners.platformOwnerRef,
      productOwnerRef: packet.owners.productOwnerRef,
      runtimeOwnerRef: packet.owners.runtimeOwnerRef,
      securityOwnerRef: packet.owners.securityOwnerRef,
      sourceOwnerRefs: [...packet.owners.sourceOwnerRefs],
    },
    provenance: {
      freshness,
      publicationReceiptRef: receiptRef,
      refreshedAt: context.evaluatedAt,
      sourceVersions: packet.sourceVersions.map((version) => ({ ...version })),
    },
    release:
      packet.release === null
        ? null
        : {
            ...packet.release,
            evidenceRefs: [...packet.release.evidenceRefs],
          },
    runtime: {
      availability,
      environments: Array.from(
        new Set(packet.runtimeObservations.map((item) => item.environment)),
      ),
      evidenceRefs: packet.runtimeObservations.map((item) => item.evidenceRef),
      observedAt: observation?.observedAt ?? null,
    },
    security: {
      accessContractRef: packet.experience.accessContract.sourceRef,
      permittedListingScopes: [
        ...packet.experience.accessContract.permittedListingScopes,
      ],
      posture: packet.security.posture,
      reviewRefs: [...packet.security.reviewRefs],
    },
    source: {
      documentationTargets: packet.source.documentationTargets.map(
        (target) => ({
          ...target,
        }),
      ),
      manifestRef: packet.manifest.ref,
      repositories: packet.source.repositories.map((repository) => ({
        ...repository,
      })),
    },
  };

  if (context.existingEntry === null) return projectedEntry;

  if (packet.publicationKind === "release-update") {
    return {
      ...context.existingEntry,
      delivery: projectedEntry.delivery,
      provenance: projectedEntry.provenance,
      release: projectedEntry.release,
      runtime: projectedEntry.runtime,
    };
  }

  if (packet.publicationKind === "product-retirement") {
    return {
      ...context.existingEntry,
      delivery: projectedEntry.delivery,
      listing: {
        ...context.existingEntry.listing,
        state: "retired",
      },
      provenance: projectedEntry.provenance,
    };
  }

  return {
    ...projectedEntry,
    listing: context.existingEntry.listing,
  };
}

export function productPublicationReceipt(
  packet: ProductPublicationPacket,
  context: ProductPortfolioProjectionContext,
  result: ProductPublicationReceipt["result"],
  reasonCode: ProductPublicationRejectionReasonCode | null = null,
): ProductPublicationReceipt {
  return {
    idempotencyKey: packet.idempotencyKey,
    packetId: packet.packetId,
    productId: packet.product.productId,
    reasonCode,
    receiptRef: `portfolio-local://publication/${packet.packetId}/${result}`,
    recordedAt: context.evaluatedAt,
    result,
    sourceVersions: packet.sourceVersions.map((version) => ({ ...version })),
  };
}
