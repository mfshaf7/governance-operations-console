import type { ProductPortfolioFixtureScenario } from "../../types/product-portfolio-fixture-types.ts";
import {
  publishedEntryFixture,
  expectedFixture,
  productPacketFixture,
  projectionContextFixture,
} from "./product-portfolio-fixture-builders.ts";

function syntheticProvenance() {
  return {
    authorityRefs: [],
    mode: "synthetic" as const,
    syntheticFields: ["publicationPacket"],
  };
}

const deliveryCandidate = productPacketFixture({
  accessClass: "restricted",
  availability: "live",
  displayName: "Delivery Candidate Product",
  form: "application",
  highestRealEndpoint: "owner-managed-release",
  id: "new-product-delivery-candidate",
  lifecycle: "platform-integrated",
  listingScope: "internal",
  primaryExperienceKind: "web-application",
  purpose: "Prove publication of a complete product publication from Delivery.",
  segment: "workspace",
  summary:
    "Complete new-product packet awaiting a Portfolio publication decision.",
  tags: ["delivery"],
});

const missingManifestCandidate = productPacketFixture({
  accessClass: "restricted",
  availability: "live",
  displayName: "Missing Manifest Candidate",
  form: "service",
  highestRealEndpoint: "platform-integrated-runtime",
  id: "missing-manifest-candidate",
  lifecycle: "platform-integrated",
  listingScope: "internal",
  manifestPresent: false,
  primaryExperienceKind: "service",
  purpose: "This value is deliberately removed by the fixture builder.",
  segment: "workspace",
  summary: "This value is deliberately removed by the fixture builder.",
  tags: ["operations"],
});

const scopePolicyCandidate = productPacketFixture({
  accessClass: "restricted",
  availability: "live",
  displayName: "Scope Policy Candidate",
  form: "application",
  highestRealEndpoint: "client-managed-runtime",
  id: "scope-exceeds-policy-candidate",
  lifecycle: "platform-integrated",
  listingScope: "public",
  permittedListingScopes: ["internal", "client"],
  primaryExperienceKind: "web-application",
  purpose: "Prove that Portfolio cannot exceed verified listing policy.",
  segment: "workspace",
  summary:
    "Complete product packet with a requested scope outside verified policy.",
  tags: ["governance"],
});

const existingDuplicatePacket = productPacketFixture({
  accessClass: "restricted",
  availability: "live",
  displayName: "Existing Managed Product",
  form: "service",
  highestRealEndpoint: "platform-integrated-runtime",
  id: "duplicate-product",
  lifecycle: "platform-integrated",
  listingScope: "internal",
  packetId: "portfolio-fixture://duplicate-product/original",
  primaryExperienceKind: "service",
  purpose: "Represent the already published product for duplicate detection.",
  segment: "workspace",
  summary: "Existing entry retained when a duplicate candidate arrives.",
  tags: ["operations"],
});
const existingDuplicateEntry = publishedEntryFixture(existingDuplicatePacket);
const duplicateCandidate = productPacketFixture({
  accessClass: "restricted",
  availability: "live",
  displayName: "Duplicate Managed Product",
  form: "service",
  highestRealEndpoint: "platform-integrated-runtime",
  id: "duplicate-product",
  lifecycle: "platform-integrated",
  listingScope: "internal",
  packetId: "portfolio-fixture://duplicate-product/duplicate",
  primaryExperienceKind: "service",
  purpose: "Attempt to publish a second entry for one stable product id.",
  segment: "workspace",
  summary: "Duplicate candidate that must resolve to the existing product.",
  tags: ["operations"],
});

export const publicationCandidateScenarios = [
  {
    expected: expectedFixture({
      publicationState: "captured",
      allowedCommands: [
        "review-publication",
        "publish-product",
        "reject-publication",
      ],
      entryProjection: "none",
      requiredAction: {
        kind: "review-publication",
        ownerRef: "portfolio",
        requirementCodes: [],
        routeRef: `portfolio://publication/${deliveryCandidate.packetId}`,
      },
      statusAxes: {
        access: "restricted",
        publication: "captured",
        availability: "live",
        freshness: "fresh",
        listing: "listed",
        maturity: "platform-integrated",
      },
    }),
    projectionContext: projectionContextFixture(),
    provenance: syntheticProvenance(),
    publicationPacket: deliveryCandidate,
    scenarioId: "new-product-delivery-candidate",
  },
  {
    expected: expectedFixture({
      publicationState: "needs-review",
      allowedCommands: [
        "review-publication",
        "open-owner-route",
        "reject-publication",
      ],
      entryProjection: "none",
      requiredAction: {
        kind: "repair-publication",
        ownerRef: missingManifestCandidate.owners.productOwnerRef,
        requirementCodes: ["manifest"],
        routeRef: `owner://${missingManifestCandidate.owners.productOwnerRef}`,
      },
      statusAxes: {
        access: "restricted",
        publication: "needs-review",
        availability: "live",
        freshness: "fresh",
        listing: "listed",
        maturity: "platform-integrated",
      },
    }),
    projectionContext: projectionContextFixture(),
    provenance: syntheticProvenance(),
    publicationPacket: missingManifestCandidate,
    scenarioId: "missing-manifest-candidate",
  },
  {
    expected: expectedFixture({
      publicationState: "needs-review",
      allowedCommands: [
        "review-publication",
        "open-owner-route",
        "reject-publication",
        "set-listing",
      ],
      entryProjection: "none",
      requiredAction: {
        kind: "repair-publication",
        ownerRef: "portfolio",
        requirementCodes: ["listing-scope"],
        routeRef: `portfolio://publication/${scopePolicyCandidate.packetId}`,
      },
      statusAxes: {
        access: "restricted",
        publication: "needs-review",
        availability: "live",
        freshness: "fresh",
        listing: "listed",
        maturity: "platform-integrated",
      },
    }),
    projectionContext: projectionContextFixture(),
    provenance: syntheticProvenance(),
    publicationPacket: scopePolicyCandidate,
    scenarioId: "scope-exceeds-policy-candidate",
  },
  {
    expected: expectedFixture({
      publicationState: "rejected",
      allowedCommands: ["open-product"],
      entryProjection: "retain",
      requiredAction: {
        kind: "open-existing-product",
        ownerRef: existingDuplicateEntry.ownership.productOwnerRef,
        requirementCodes: [],
        routeRef: "portfolio://products/duplicate-product",
      },
      statusAxes: {
        access: "restricted",
        publication: "rejected",
        availability: "live",
        freshness: "fresh",
        listing: "listed",
        maturity: "platform-integrated",
      },
    }),
    projectionContext: projectionContextFixture({
      existingEntry: existingDuplicateEntry,
    }),
    provenance: syntheticProvenance(),
    publicationPacket: duplicateCandidate,
    scenarioId: "duplicate-product-candidate",
  },
] satisfies ProductPortfolioFixtureScenario[];
