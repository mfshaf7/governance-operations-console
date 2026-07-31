import type { ProductPublicationPacket } from "./product-publication-types.ts";
import {
  productPublicationPacketViolations,
  sameAppliedPublication,
} from "./product-publication-packet.ts";
import type {
  ProductPublicationDecision,
  ProductPortfolioCommand,
  ProductPortfolioProjectionContext,
  ProductPublicationProjection,
} from "./product-publication-review-types.ts";
import { productPublicationRequirements } from "./product-publication-requirements.ts";
import {
  productEntryFromPacket,
  productPublicationReceipt,
} from "./product-entry-projection.ts";
import {
  productCommandsForEntry,
  productRequiredActionForEntry,
  withForbiddenProductCommands,
} from "./product-portfolio-command-policy.ts";

export function projectProductPublication(
  packet: ProductPublicationPacket,
  context: ProductPortfolioProjectionContext,
): ProductPublicationProjection {
  const effectivePacket = productPublicationPacketForDecision(
    packet,
    context.publicationDecision,
  );
  const packetViolations = productPublicationPacketViolations(effectivePacket);
  if (packetViolations.length > 0) {
    throw new Error(
      `Invalid product publication packet ${packet.packetId}: ${packetViolations.join(
        ", ",
      )}`,
    );
  }

  const replay = context.appliedPublications.find((applied) =>
    sameAppliedPublication(packet, applied),
  );
  if (replay !== undefined) {
    const allowedCommands =
      context.existingEntry === null
        ? []
        : productCommandsForEntry(context.existingEntry);
    return withForbiddenProductCommands({
      publicationState: context.existingEntry === null ? "captured" : "published",
      allowedCommands,
      entry: context.existingEntry,
      entryProjection: "replay",
      receipt: replay,
      requiredAction:
        context.existingEntry === null
          ? {
              kind: "review-publication",
              ownerRef: "portfolio",
              requirementCodes: [],
              routeRef: `portfolio://publication/${packet.packetId}`,
            }
          : productRequiredActionForEntry(context.existingEntry),
      requirements: productPublicationRequirements(
        effectivePacket,
        context.existingEntry,
      ),
    });
  }

  const requirements = productPublicationRequirements(
    effectivePacket,
    context.existingEntry,
  );
  const unresolved = requirements.filter((item) => item.state !== "satisfied");

  if (
    packet.publicationKind === "new-product" &&
    context.existingEntry !== null
  ) {
    return withForbiddenProductCommands({
      publicationState: "rejected",
      allowedCommands: ["open-product"],
      entry: context.existingEntry,
      entryProjection: "retain",
      receipt: productPublicationReceipt(
        effectivePacket,
        context,
        "rejected",
        "duplicate-product",
      ),
      requiredAction: {
        kind: "open-existing-product",
        ownerRef: context.existingEntry.ownership.productOwnerRef,
        requirementCodes: [],
        routeRef: `portfolio://products/${packet.product.productId}`,
      },
      requirements,
    });
  }

  if (
    effectivePacket.publicationKind === "new-product" &&
    context.publicationDecision?.outcome === "reject"
  ) {
    return withForbiddenProductCommands({
      publicationState: "rejected",
      allowedCommands: [],
      entry: context.existingEntry,
      entryProjection: context.existingEntry === null ? "none" : "retain",
      receipt: productPublicationReceipt(
        effectivePacket,
        context,
        "rejected",
        context.publicationDecision.reasonCode,
      ),
      requiredAction: { kind: "none" },
      requirements,
    });
  }

  if (unresolved.length > 0) {
    const listingOnly = unresolved.every(
      (item) => item.code === "listing-scope",
    );
    const owner = unresolved[0]?.ownerRef ?? "portfolio";
    const route =
      unresolved[0]?.routeRef ?? `portfolio://publication/${packet.packetId}`;
    const allowedCommands: ProductPortfolioCommand[] = [
      "review-publication",
      "open-owner-route",
      "reject-publication",
    ];
    if (listingOnly) allowedCommands.push("set-listing");

    return withForbiddenProductCommands({
      publicationState: "needs-review",
      allowedCommands,
      entry: context.existingEntry,
      entryProjection: context.existingEntry === null ? "none" : "retain",
      receipt: productPublicationReceipt(
        effectivePacket,
        context,
        "needs-review",
      ),
      requiredAction: {
        kind: "repair-publication",
        ownerRef: owner,
        requirementCodes: unresolved.map((item) => item.code),
        routeRef: route,
      },
      requirements,
    });
  }

  if (
    packet.publicationKind === "new-product" &&
    context.publicationDecision === null
  ) {
    return withForbiddenProductCommands({
      publicationState: "captured",
      allowedCommands: [
        "review-publication",
        "publish-product",
        "reject-publication",
      ],
      entry: null,
      entryProjection: "none",
      receipt: productPublicationReceipt(effectivePacket, context, "captured"),
      requiredAction: {
        kind: "review-publication",
        ownerRef: "portfolio",
        requirementCodes: [],
        routeRef: `portfolio://publication/${packet.packetId}`,
      },
      requirements,
    });
  }

  const result =
    context.existingEntry === null
      ? "created"
      : packet.publicationKind === "product-retirement"
        ? "retired"
        : "updated";
  const appliedReceipt = productPublicationReceipt(
    effectivePacket,
    context,
    result,
  );
  const entry = productEntryFromPacket(
    effectivePacket,
    context,
    context.publicationDecision?.receiptRef ?? appliedReceipt.receiptRef,
  );

  return withForbiddenProductCommands({
    publicationState: "published",
    allowedCommands: productCommandsForEntry(entry),
    entry,
    entryProjection:
      result === "created"
        ? "create"
        : result === "retired"
          ? "retire"
          : "update",
    receipt: appliedReceipt,
    requiredAction: productRequiredActionForEntry(entry),
    requirements,
  });
}

function productPublicationPacketForDecision(
  packet: ProductPublicationPacket,
  decision: ProductPublicationDecision | null,
): ProductPublicationPacket {
  if (decision?.outcome !== "publish" || decision.listing === null) {
    return packet;
  }

  return {
    ...packet,
    listing: {
      ...packet.listing,
      featured: decision.listing.featured,
      requestedScope: decision.listing.scope,
      requestedState: decision.listing.state,
    },
  };
}
