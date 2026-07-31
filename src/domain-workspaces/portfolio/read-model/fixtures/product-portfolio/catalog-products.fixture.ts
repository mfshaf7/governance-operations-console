import type { ProductPortfolioFixtureScenario } from "../../types/product-portfolio-fixture-types.ts";
import {
  publicationDecisionFixture,
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

const personalPublicApplication = productPacketFixture({
  accessClass: "public",
  availability: "live",
  displayName: "Personal Release Notes",
  form: "application",
  highestRealEndpoint: "owner-managed-release",
  id: "personal-public-application",
  lifecycle: "platform-integrated",
  listingScope: "public",
  primaryExperienceKind: "web-application",
  purpose: "Publish a small personal release-notes application.",
  segment: "personal",
  summary: "Public personal application with a verified live target.",
  tags: ["developer-tool"],
});

const clientRestrictedApplication = productPacketFixture({
  accessClass: "restricted",
  availability: "live",
  clientRef: "client-ref://fixture-001",
  displayName: "Client Workspace Portal",
  form: "application",
  highestRealEndpoint: "client-managed-runtime",
  id: "client-restricted-application",
  lifecycle: "platform-integrated",
  listingScope: "client",
  primaryExperienceKind: "web-application",
  purpose: "Provide an authenticated application for an opaque client account.",
  segment: "client",
  summary: "Restricted client application without copied client identity data.",
  tags: ["collaboration"],
});

const publicCliRelease = productPacketFixture({
  accessClass: "public",
  availability: "live",
  displayName: "Workspace Audit CLI",
  form: "cli",
  highestRealEndpoint: "package-release",
  href: "https://packages.example.test/workspace-audit-cli",
  id: "public-cli-release",
  lifecycle: "platform-integrated",
  listingScope: "public",
  primaryExperienceKind: "package",
  purpose: "Distribute a public command-line workspace audit tool.",
  segment: "personal",
  summary:
    "Versioned CLI accessed through a package target rather than a web runtime.",
  tags: ["developer-tool", "governance"],
});

const unlistedLibrary = productPacketFixture({
  accessClass: "private",
  availability: "not-applicable",
  displayName: "Internal Contract Library",
  form: "library",
  highestRealEndpoint: "owner-managed-release",
  id: "unlisted-library",
  lifecycle: "platform-integrated",
  listingScope: "internal",
  listingState: "unlisted",
  primaryExperienceKind: "documentation",
  purpose: "Provide shared internal contract helpers to owner repositories.",
  segment: "workspace",
  summary:
    "Published internal library intentionally omitted from the active catalog.",
  tags: ["developer-tool", "governance"],
});

const degradedService = productPacketFixture({
  accessClass: "restricted",
  availability: "degraded",
  displayName: "Workspace Event Relay",
  form: "service",
  highestRealEndpoint: "platform-integrated-runtime",
  id: "degraded-service",
  lifecycle: "platform-integrated",
  listingScope: "internal",
  primaryExperienceKind: "service",
  purpose: "Relay governed workspace events between approved owners.",
  segment: "workspace",
  summary:
    "Managed service that remains listed while runtime evidence needs attention.",
  tags: ["integration", "operations"],
});

const staleRuntimeEvidence = productPacketFixture({
  accessClass: "restricted",
  availability: "live",
  displayName: "Stale Runtime Product",
  expiresAt: "2026-07-22T09:30:00.000Z",
  form: "service",
  highestRealEndpoint: "platform-integrated-runtime",
  id: "stale-runtime-evidence",
  lifecycle: "platform-integrated",
  listingScope: "internal",
  primaryExperienceKind: "service",
  purpose: "Prove expiry behavior for previously healthy runtime evidence.",
  segment: "workspace",
  summary: "Listed service whose previous healthy observation has expired.",
  tags: ["operations"],
});

const retiredDocumentation = productPacketFixture({
  accessClass: "public",
  availability: "not-applicable",
  displayName: "Retired Operator Handbook",
  form: "documentation",
  highestRealEndpoint: "documentation-release",
  id: "retired-documentation",
  lifecycle: "platform-integrated",
  listingScope: "public",
  listingState: "retired",
  primaryExperienceKind: "documentation",
  purpose: "Retain historical documentation and release evidence.",
  segment: "personal",
  summary: "Retired documentation retained for product and release history.",
  tags: ["documentation"],
});

export const catalogProductScenarios = [
  {
    expected: expectedFixture({
      publicationState: "published",
      allowedCommands: [
        "open-product",
        "view-history",
        "set-listing",
        "open-primary-target",
      ],
      entryProjection: "create",
      requiredAction: { kind: "none" },
      statusAxes: {
        access: "public",
        publication: "published",
        availability: "live",
        freshness: "fresh",
        listing: "listed",
        maturity: "platform-integrated",
      },
    }),
    projectionContext: projectionContextFixture({
      publicationDecision: publicationDecisionFixture(
        personalPublicApplication.product.productId,
      ),
    }),
    provenance: syntheticProvenance(),
    publicationPacket: personalPublicApplication,
    scenarioId: "personal-public-application",
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
      entryProjection: "create",
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
      publicationDecision: publicationDecisionFixture(
        clientRestrictedApplication.product.productId,
      ),
    }),
    provenance: syntheticProvenance(),
    publicationPacket: clientRestrictedApplication,
    scenarioId: "client-restricted-application",
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
      entryProjection: "create",
      requiredAction: { kind: "none" },
      statusAxes: {
        access: "public",
        publication: "published",
        availability: "live",
        freshness: "fresh",
        listing: "listed",
        maturity: "platform-integrated",
      },
    }),
    projectionContext: projectionContextFixture({
      publicationDecision: publicationDecisionFixture(
        publicCliRelease.product.productId,
      ),
    }),
    provenance: syntheticProvenance(),
    publicationPacket: publicCliRelease,
    scenarioId: "public-cli-release",
  },
  {
    expected: expectedFixture({
      publicationState: "published",
      allowedCommands: [
        "open-product",
        "view-history",
        "set-listing",
        "review-listing",
        "open-primary-target",
      ],
      entryProjection: "create",
      requiredAction: {
        kind: "review-listing",
        ownerRef: "portfolio",
        requirementCodes: [],
        routeRef: "portfolio://listing/unlisted-library",
      },
      statusAxes: {
        access: "private",
        publication: "published",
        availability: "not-applicable",
        freshness: "fresh",
        listing: "unlisted",
        maturity: "platform-integrated",
      },
    }),
    projectionContext: projectionContextFixture({
      publicationDecision: publicationDecisionFixture(
        unlistedLibrary.product.productId,
      ),
    }),
    provenance: syntheticProvenance(),
    publicationPacket: unlistedLibrary,
    scenarioId: "unlisted-library",
  },
  {
    expected: expectedFixture({
      publicationState: "published",
      allowedCommands: [
        "open-product",
        "view-history",
        "set-listing",
        "open-primary-target",
        "open-owner-route",
      ],
      entryProjection: "create",
      requiredAction: {
        kind: "repair-runtime-evidence",
        ownerRef: degradedService.owners.runtimeOwnerRef,
        requirementCodes: [],
        routeRef: `owner://${degradedService.owners.runtimeOwnerRef}`,
      },
      statusAxes: {
        access: "restricted",
        publication: "published",
        availability: "degraded",
        freshness: "fresh",
        listing: "listed",
        maturity: "platform-integrated",
      },
    }),
    projectionContext: projectionContextFixture({
      publicationDecision: publicationDecisionFixture(
        degradedService.product.productId,
      ),
    }),
    provenance: syntheticProvenance(),
    publicationPacket: degradedService,
    scenarioId: "degraded-service",
  },
  {
    expected: expectedFixture({
      publicationState: "published",
      allowedCommands: [
        "open-product",
        "view-history",
        "set-listing",
        "open-primary-target",
        "open-owner-route",
      ],
      entryProjection: "create",
      requiredAction: {
        kind: "repair-runtime-evidence",
        ownerRef: staleRuntimeEvidence.owners.runtimeOwnerRef,
        requirementCodes: [],
        routeRef: `owner://${staleRuntimeEvidence.owners.runtimeOwnerRef}`,
      },
      statusAxes: {
        access: "restricted",
        publication: "published",
        availability: "unknown",
        freshness: "stale",
        listing: "listed",
        maturity: "platform-integrated",
      },
    }),
    projectionContext: projectionContextFixture({
      publicationDecision: publicationDecisionFixture(
        staleRuntimeEvidence.product.productId,
      ),
    }),
    provenance: syntheticProvenance(),
    publicationPacket: staleRuntimeEvidence,
    scenarioId: "stale-runtime-evidence",
  },
  {
    expected: expectedFixture({
      publicationState: "published",
      allowedCommands: ["open-product", "view-history"],
      entryProjection: "create",
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
      publicationDecision: publicationDecisionFixture(
        retiredDocumentation.product.productId,
      ),
    }),
    provenance: syntheticProvenance(),
    publicationPacket: retiredDocumentation,
    scenarioId: "retired-documentation",
  },
] satisfies ProductPortfolioFixtureScenario[];
