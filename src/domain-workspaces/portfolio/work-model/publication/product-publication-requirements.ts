import type { ProductPortfolioEntry } from "../../domain/product-portfolio-entry-types.ts";
import type { ProductPublicationPacket } from "./product-publication-types.ts";
import type {
  ProductPublicationRequirement,
  ProductPublicationRequirementCode,
} from "./product-publication-review-types.ts";

function present(value: string): boolean {
  return value.trim().length > 0;
}

function requirement(
  code: ProductPublicationRequirementCode,
  state: ProductPublicationRequirement["state"],
  ownerRef: string,
  routeRef: string,
  evidenceRefs: string[] = [],
): ProductPublicationRequirement {
  return { code, evidenceRefs, ownerRef, routeRef, state };
}

export function productPublicationRequirements(
  packet: ProductPublicationPacket,
  existingEntry: ProductPortfolioEntry | null,
): ProductPublicationRequirement[] {
  const productRoute = `owner://${packet.owners.productOwnerRef}`;
  const securityRoute = `owner://${packet.security.ownerRef}`;
  const registryEvidence = [
    packet.product.registryRef,
    ...packet.sourceVersions
      .filter((version) => version.authority === "workspace-governance")
      .map((version) => version.ref),
  ].filter(present);
  const activeProductInventoryReady =
    present(packet.product.productId) &&
    packet.product.registryRef ===
      `workspace-governance://products/${packet.product.productId}` &&
    present(packet.product.registryVersion) &&
    packet.product.lifecycle === packet.maturity.level &&
    packet.sourceVersions.some(
      (version) =>
        version.authority === "workspace-governance" &&
        version.ref === packet.product.registryRef &&
        version.version === packet.product.registryVersion,
    );
  const manifestReady =
    present(packet.manifest.ref) &&
    present(packet.manifest.digest) &&
    present(packet.manifest.displayName) &&
    present(packet.manifest.purpose) &&
    present(packet.manifest.summary);
  const ownershipReady =
    present(packet.owners.productOwnerRef) &&
    present(packet.owners.platformOwnerRef) &&
    present(packet.owners.runtimeOwnerRef) &&
    present(packet.owners.securityOwnerRef) &&
    packet.owners.sourceOwnerRefs.length > 0 &&
    packet.owners.sourceOwnerRefs.every(present);
  const sourceReady =
    packet.source.repositories.length > 0 &&
    packet.source.repositories.every(
      (repository) => present(repository.ownerRef) && present(repository.ref),
    );
  const classificationReady =
    (packet.classification.portfolioSegment === "client" &&
      packet.classification.clientRef !== null &&
      present(packet.classification.clientRef)) ||
    (packet.classification.portfolioSegment !== "client" &&
      packet.classification.clientRef === null);
  const experienceReady =
    packet.experience.primaryTarget !== null &&
    present(packet.experience.primaryTarget.label) &&
    present(packet.experience.primaryTarget.sourceRef) &&
    packet.experience.primaryTarget.verified;
  const accessReady =
    present(packet.experience.accessContract.sourceRef) &&
    present(packet.experience.accessContract.sourceVersion) &&
    present(packet.experience.accessContract.verifiedAt) &&
    packet.experience.accessContract.permittedListingScopes.length > 0;
  const listingReady =
    packet.experience.accessContract.permittedListingScopes.includes(
      packet.listing.requestedScope,
    );
  const securityReady =
    present(packet.security.ownerRef) &&
    packet.security.posture !== "review-required" &&
    (packet.security.posture === "not-applicable" ||
      (packet.security.reviewRefs.length > 0 &&
        packet.security.evidenceRefs.length > 0));
  const releaseReady =
    packet.release === null ||
    (present(packet.release.ref) &&
      present(packet.release.version) &&
      present(packet.release.releasedAt) &&
      packet.release.evidenceRefs.length > 0);
  const graduationReady =
    packet.publicationKind !== "new-product" ||
    packet.delivery.graduationRefs.length > 0 ||
    packet.delivery.latestOutcomeRef !== null;
  const existingProductReady =
    packet.publicationKind === "new-product" ||
    (existingEntry !== null &&
      existingEntry.identity.productId === packet.product.productId &&
      existingEntry.identity.registryRef === packet.product.registryRef);

  return [
    requirement(
      "active-product-inventory",
      activeProductInventoryReady ? "satisfied" : "missing",
      "workspace-governance",
      `workspace-governance://products/${packet.product.productId}`,
      registryEvidence,
    ),
    requirement(
      "manifest",
      manifestReady ? "satisfied" : "missing",
      packet.owners.productOwnerRef || "product-owner",
      productRoute,
      manifestReady ? [packet.manifest.ref] : [],
    ),
    requirement(
      "ownership",
      ownershipReady ? "satisfied" : "missing",
      "workspace-governance",
      "workspace-governance://owners",
      ownershipReady ? packet.owners.sourceOwnerRefs : [],
    ),
    requirement(
      "source-custody",
      sourceReady ? "satisfied" : "missing",
      packet.owners.productOwnerRef || "product-owner",
      productRoute,
      packet.source.repositories.map((repository) => repository.ref),
    ),
    requirement(
      "classification",
      classificationReady ? "satisfied" : "missing",
      packet.owners.productOwnerRef || "product-owner",
      productRoute,
      [packet.manifest.ref].filter(present),
    ),
    requirement(
      "experience-target",
      experienceReady ? "satisfied" : "missing",
      packet.owners.productOwnerRef || "product-owner",
      productRoute,
      packet.experience.primaryTarget === null
        ? []
        : [packet.experience.primaryTarget.sourceRef],
    ),
    requirement(
      "access-contract",
      accessReady ? "satisfied" : "missing",
      packet.security.ownerRef || "security-architecture",
      securityRoute,
      accessReady ? [packet.experience.accessContract.sourceRef] : [],
    ),
    requirement(
      "security-review",
      securityReady ? "satisfied" : "missing",
      packet.security.ownerRef || "security-architecture",
      securityRoute,
      [...packet.security.reviewRefs, ...packet.security.evidenceRefs],
    ),
    requirement(
      "listing-scope",
      listingReady ? "satisfied" : "conflict",
      "portfolio",
      `portfolio://publication/${packet.packetId}`,
      [packet.experience.accessContract.sourceRef].filter(present),
    ),
    requirement(
      "release-evidence",
      releaseReady ? "satisfied" : "missing",
      packet.owners.productOwnerRef || "product-owner",
      productRoute,
      packet.release?.evidenceRefs ?? [],
    ),
    requirement(
      "delivery-or-graduation-evidence",
      graduationReady ? "satisfied" : "missing",
      "workspace-delivery-art",
      "workspace-delivery-art://product-outcomes",
      [
        ...packet.delivery.graduationRefs,
        ...(packet.delivery.latestOutcomeRef === null
          ? []
          : [packet.delivery.latestOutcomeRef]),
      ],
    ),
    requirement(
      "existing-product",
      existingProductReady
        ? "satisfied"
        : existingEntry === null
          ? "missing"
          : "conflict",
      "workspace-governance",
      "workspace-governance://products",
      existingEntry === null ? [] : [existingEntry.identity.registryRef],
    ),
  ];
}
