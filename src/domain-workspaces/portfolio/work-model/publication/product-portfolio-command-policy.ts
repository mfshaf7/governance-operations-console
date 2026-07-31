import type { ProductPortfolioEntry } from "../../domain/product-portfolio-entry-types.ts";
import type {
  ProductPortfolioCommand,
  ProductPortfolioRequiredAction,
  ProductPublicationProjection,
} from "./product-publication-review-types.ts";

export const productPortfolioCommands = [
  "publish-product",
  "open-owner-route",
  "open-primary-target",
  "open-product",
  "reject-publication",
  "review-publication",
  "review-listing",
  "set-listing",
  "view-history",
] as const satisfies readonly ProductPortfolioCommand[];

export function productCommandsForEntry(
  entry: ProductPortfolioEntry,
): ProductPortfolioCommand[] {
  const commands: ProductPortfolioCommand[] = ["open-product", "view-history"];

  if (entry.listing.state !== "retired") commands.push("set-listing");
  if (entry.listing.state === "unlisted") commands.push("review-listing");
  if (
    entry.listing.state !== "retired" &&
    entry.experience.primaryTarget.verified &&
    entry.experience.primaryTarget.href !== null
  ) {
    commands.push("open-primary-target");
  }
  if (
    entry.listing.state !== "retired" &&
    (entry.provenance.freshness === "stale" ||
      entry.runtime.availability === "degraded" ||
      entry.runtime.availability === "offline")
  ) {
    commands.push("open-owner-route");
  }

  return commands;
}

export function productRequiredActionForEntry(
  entry: ProductPortfolioEntry,
): ProductPortfolioRequiredAction {
  if (entry.listing.state === "retired") return { kind: "none" };

  if (
    entry.provenance.freshness === "stale" ||
    entry.runtime.availability === "degraded" ||
    entry.runtime.availability === "offline"
  ) {
    return {
      kind: "repair-runtime-evidence",
      ownerRef: entry.ownership.runtimeOwnerRef,
      requirementCodes: [],
      routeRef: `owner://${entry.ownership.runtimeOwnerRef}`,
    };
  }
  if (entry.listing.state === "unlisted") {
    return {
      kind: "review-listing",
      ownerRef: "portfolio",
      requirementCodes: [],
      routeRef: `portfolio://listing/${entry.identity.productId}`,
    };
  }
  return { kind: "none" };
}

export function withForbiddenProductCommands(
  base: Omit<ProductPublicationProjection, "forbiddenCommands">,
): ProductPublicationProjection {
  return {
    ...base,
    forbiddenCommands: productPortfolioCommands.filter(
      (command) => !base.allowedCommands.includes(command),
    ),
  };
}
