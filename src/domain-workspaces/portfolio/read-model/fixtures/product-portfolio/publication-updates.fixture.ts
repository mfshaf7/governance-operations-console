import type { ProductPortfolioFixtureScenario } from "../../types/product-portfolio-fixture-types.ts";
import { projectProductPublication } from "../../../work-model/publication/product-publication-projection.ts";
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
    syntheticFields: ["publicationPacket", "projectionContext"],
  };
}

const releaseBaselinePacket = productPacketFixture({
  accessClass: "restricted",
  availability: "live",
  displayName: "Release Update Product",
  form: "application",
  highestRealEndpoint: "owner-managed-release",
  id: "release-update-product",
  lifecycle: "platform-integrated",
  listingScope: "internal",
  packetId: "portfolio-fixture://release-update-product/v1",
  primaryExperienceKind: "web-application",
  purpose: "Provide a stable entry for release update projection.",
  releaseVersion: "1.0.0",
  segment: "workspace",
  summary: "Existing managed product before its next release publication.",
  tags: ["developer-tool"],
});
const releaseBaselineEntry = publishedEntryFixture(releaseBaselinePacket);
const releaseUpdatePacket = {
  ...productPacketFixture({
    accessClass: "restricted",
    availability: "live",
    displayName: "Release Update Product",
    form: "application",
    highestRealEndpoint: "owner-managed-release",
    id: "release-update-product",
    lifecycle: "platform-integrated",
    listingScope: "internal",
    listingState: "unlisted",
    packetId: "portfolio-fixture://release-update-product/v2",
    primaryExperienceKind: "web-application",
    publicationKind: "release-update",
    purpose: "Provide a stable entry for release update projection.",
    releaseVersion: "1.1.0",
    segment: "workspace",
    summary: "Existing managed product with a newer source-backed release.",
    tags: ["developer-tool"],
  }),
  supersedesPublicationRef: releaseBaselinePacket.packetId,
};

const retirementBaselinePacket = productPacketFixture({
  accessClass: "public",
  availability: "not-applicable",
  displayName: "Product Retirement Target",
  form: "documentation",
  highestRealEndpoint: "documentation-release",
  id: "product-retirement-target",
  lifecycle: "platform-integrated",
  listingScope: "public",
  packetId: "portfolio-fixture://product-retirement-target/active",
  primaryExperienceKind: "documentation",
  purpose: "Provide an active product entry before retirement.",
  segment: "personal",
  summary: "Active documentation product with retained release history.",
  tags: ["documentation"],
});
const retirementBaselineEntry = publishedEntryFixture(retirementBaselinePacket);
const retirementUpdatePacket = {
  ...productPacketFixture({
    accessClass: "public",
    availability: "not-applicable",
    displayName: "Product Retirement Target",
    form: "documentation",
    highestRealEndpoint: "documentation-release",
    id: "product-retirement-target",
    lifecycle: "platform-integrated",
    listingScope: "public",
    listingState: "retired",
    packetId: "portfolio-fixture://product-retirement-target/retired",
    primaryExperienceKind: "documentation",
    publicationKind: "product-retirement",
    purpose: "Retain the product record after source-backed retirement.",
    segment: "personal",
    summary: "Retired documentation product retained with its prior history.",
    tags: ["documentation"],
  }),
  supersedesPublicationRef: retirementBaselinePacket.packetId,
};

const replayBaselinePacket = productPacketFixture({
  accessClass: "restricted",
  availability: "live",
  displayName: "Replay Product",
  form: "service",
  highestRealEndpoint: "platform-integrated-runtime",
  id: "idempotent-replay-product",
  lifecycle: "platform-integrated",
  listingScope: "internal",
  packetId: "portfolio-fixture://idempotent-replay-product/v1",
  primaryExperienceKind: "service",
  purpose: "Provide an existing product for replay projection.",
  segment: "workspace",
  summary: "Existing service before an idempotent update is applied.",
  tags: ["operations"],
});
const replayBaselineEntry = publishedEntryFixture(replayBaselinePacket);
const replayPacket = {
  ...productPacketFixture({
    accessClass: "restricted",
    availability: "live",
    displayName: "Replay Product",
    form: "service",
    highestRealEndpoint: "platform-integrated-runtime",
    id: "idempotent-replay-product",
    lifecycle: "platform-integrated",
    listingScope: "internal",
    packetId: "portfolio-fixture://idempotent-replay-product/v2",
    primaryExperienceKind: "service",
    publicationKind: "product-update",
    purpose: "Provide an existing product for replay projection.",
    segment: "workspace",
    summary: "Applied service update replayed with the same packet identity.",
    tags: ["operations"],
  }),
  supersedesPublicationRef: replayBaselinePacket.packetId,
};
const firstReplayProjection = projectProductPublication(
  replayPacket,
  projectionContextFixture({ existingEntry: replayBaselineEntry }),
);
if (firstReplayProjection.entry === null) {
  throw new Error("Replay fixture failed to create its applied entry.");
}

export const publicationUpdateScenarios = [
  {
    expected: expectedFixture({
      publicationState: "published",
      allowedCommands: [
        "open-product",
        "view-history",
        "set-listing",
        "open-primary-target",
      ],
      entryProjection: "update",
      requiredAction: { kind: "none" },
      statusAxes: {
        access: "restricted",
        publication: "published",
        availability: "live",
        freshness: "fresh",
        listing: "listed",
        maturity: "platform-integrated",
      },
    }),
    projectionContext: projectionContextFixture({
      existingEntry: releaseBaselineEntry,
    }),
    provenance: syntheticProvenance(),
    publicationPacket: releaseUpdatePacket,
    scenarioId: "release-update-existing-product",
  },
  {
    expected: expectedFixture({
      publicationState: "published",
      allowedCommands: ["open-product", "view-history"],
      entryProjection: "retire",
      requiredAction: { kind: "none" },
      statusAxes: {
        access: "public",
        publication: "published",
        availability: "not-applicable",
        freshness: "fresh",
        listing: "retired",
        maturity: "platform-integrated",
      },
    }),
    projectionContext: projectionContextFixture({
      existingEntry: retirementBaselineEntry,
    }),
    provenance: syntheticProvenance(),
    publicationPacket: retirementUpdatePacket,
    scenarioId: "product-retirement-update",
  },
  {
    expected: expectedFixture({
      publicationState: "published",
      allowedCommands: [
        "open-product",
        "view-history",
        "set-listing",
        "open-primary-target",
      ],
      entryProjection: "replay",
      requiredAction: { kind: "none" },
      statusAxes: {
        access: "restricted",
        publication: "published",
        availability: "live",
        freshness: "fresh",
        listing: "listed",
        maturity: "platform-integrated",
      },
    }),
    projectionContext: projectionContextFixture({
      appliedPublications: [firstReplayProjection.receipt],
      existingEntry: firstReplayProjection.entry,
    }),
    provenance: syntheticProvenance(),
    publicationPacket: replayPacket,
    scenarioId: "idempotent-publication-replay",
  },
] satisfies ProductPortfolioFixtureScenario[];
