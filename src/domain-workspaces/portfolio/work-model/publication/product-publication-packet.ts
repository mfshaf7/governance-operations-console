import type {
  PortfolioSegment,
  ProductAccessClass,
  ProductForm,
  ProductListingScope,
  ProductListingState,
  ProductRegistryLifecycle,
  ProductTag,
} from "../../domain/product-portfolio-vocabulary.ts";
import type {
  ProductPublicationKind,
  ProductPublicationPacket,
} from "./product-publication-types.ts";

export const portfolioSegments = [
  "client",
  "personal",
  "workspace",
] as const satisfies readonly PortfolioSegment[];

export const productForms = [
  "application",
  "cli",
  "documentation",
  "integration",
  "library",
  "operator-tool",
  "package",
  "service",
] as const satisfies readonly ProductForm[];

export const productTags = [
  "collaboration",
  "delivery",
  "developer-tool",
  "documentation",
  "governance",
  "integration",
  "operations",
] as const satisfies readonly ProductTag[];

export const productListingScopes = [
  "client",
  "internal",
  "public",
] as const satisfies readonly ProductListingScope[];

export const productAccessClasses = [
  "private",
  "public",
  "restricted",
] as const satisfies readonly ProductAccessClass[];

export const productListingStates = [
  "listed",
  "retired",
  "unlisted",
] as const satisfies readonly ProductListingState[];

export const productRegistryLifecycles = [
  "fully-governed",
  "platform-integrated",
] as const satisfies readonly ProductRegistryLifecycle[];

export const productPublicationKinds = [
  "new-product",
  "product-retirement",
  "product-update",
  "release-update",
] as const satisfies readonly ProductPublicationKind[];

function hasValue(values: readonly string[], value: unknown): boolean {
  return typeof value === "string" && values.includes(value);
}

function blank(value: string): boolean {
  return value.trim().length === 0;
}

export function productPublicationPacketViolations(
  packet: ProductPublicationPacket,
): string[] {
  const violations: string[] = [];

  if (packet.schemaVersion !== "1") violations.push("schema-version");
  if (!hasValue(productPublicationKinds, packet.publicationKind)) {
    violations.push("publication-kind");
  }
  if (!hasValue(productRegistryLifecycles, packet.product.lifecycle)) {
    violations.push("product-lifecycle");
  }
  if (!hasValue(productRegistryLifecycles, packet.maturity.level)) {
    violations.push("product-maturity");
  }
  if (!hasValue(portfolioSegments, packet.classification.portfolioSegment)) {
    violations.push("portfolio-segment");
  }
  if (!hasValue(productForms, packet.classification.productForm)) {
    violations.push("product-form");
  }
  if (packet.classification.tags.some((tag) => !hasValue(productTags, tag))) {
    violations.push("product-tags");
  }
  if (!hasValue(productListingStates, packet.listing.requestedState)) {
    violations.push("listing-state");
  }
  if (!hasValue(productListingScopes, packet.listing.requestedScope)) {
    violations.push("listing-scope");
  }
  if (
    !hasValue(
      productAccessClasses,
      packet.experience.accessContract.accessClass,
    )
  ) {
    violations.push("access-class");
  }
  if (
    packet.experience.accessContract.permittedListingScopes.some(
      (scope) => !hasValue(productListingScopes, scope),
    )
  ) {
    violations.push("permitted-listing-scopes");
  }
  if (
    packet.classification.portfolioSegment === "client" &&
    (packet.classification.clientRef === null ||
      blank(packet.classification.clientRef))
  ) {
    violations.push("client-ref-required");
  }
  if (
    packet.classification.portfolioSegment !== "client" &&
    packet.classification.clientRef !== null
  ) {
    violations.push("client-ref-not-applicable");
  }
  if (
    new Set(packet.classification.tags).size !==
    packet.classification.tags.length
  ) {
    violations.push("duplicate-product-tags");
  }

  return violations;
}

export function sameAppliedPublication(
  packet: ProductPublicationPacket,
  applied: {
    idempotencyKey: string;
    packetId: string;
    sourceVersions: ProductPublicationPacket["sourceVersions"];
  },
): boolean {
  return (
    packet.packetId === applied.packetId &&
    packet.idempotencyKey === applied.idempotencyKey &&
    JSON.stringify(packet.sourceVersions) ===
      JSON.stringify(applied.sourceVersions)
  );
}
