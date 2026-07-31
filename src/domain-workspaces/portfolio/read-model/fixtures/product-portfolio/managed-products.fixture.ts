import type { ProductPortfolioFixtureScenario } from "../../types/product-portfolio-fixture-types.ts";
import {
  publicationDecisionFixture,
  expectedFixture,
  productPacketFixture,
  projectionContextFixture,
} from "./product-portfolio-fixture-builders.ts";

const managedOpenClawPacket = productPacketFixture({
  accessClass: "restricted",
  availability: "live",
  displayName: "OpenClaw",
  featured: true,
  form: "operator-tool",
  governedProdPromotion: true,
  highestRealEndpoint: "governed-prod",
  id: "openclaw",
  lifecycle: "fully-governed",
  listingScope: "internal",
  owners: {
    platformOwnerRef: "platform-engineering",
    productOwnerRef: "workspace-governance",
    runtimeOwnerRef: "openclaw-runtime-distribution",
    securityOwnerRef: "security-architecture",
    sourceOwnerRefs: [
      "openclaw-telegram-enhanced",
      "openclaw-host-bridge",
      "openclaw-runtime-distribution",
    ],
  },
  primaryExperienceKind: "operator-interface",
  purpose: "Provide a governed operator runtime for workspace automation.",
  segment: "workspace",
  stageSupported: true,
  summary: "Governed operator runtime assembled from its canonical owners.",
  tags: ["operations", "governance"],
});

const managedOpenProjectPacket = productPacketFixture({
  accessClass: "restricted",
  availability: "live",
  displayName: "OpenProject",
  form: "service",
  highestRealEndpoint: "platform-integrated-runtime",
  href: null,
  id: "openproject",
  lifecycle: "platform-integrated",
  listingScope: "internal",
  owners: {
    platformOwnerRef: "platform-engineering",
    productOwnerRef: "platform-engineering",
    runtimeOwnerRef: "platform-engineering",
    securityOwnerRef: "security-architecture",
    sourceOwnerRefs: ["platform-engineering"],
  },
  primaryExperienceKind: "service",
  purpose:
    "Provide the ART-backed work-state service used by Workspace Delivery.",
  segment: "workspace",
  summary: "Platform-integrated work-state service with ART broker evidence.",
  tags: ["delivery", "collaboration"],
});

export const managedProductScenarios = [
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
        maturity: "fully-governed",
      },
    }),
    projectionContext: projectionContextFixture({
      publicationDecision: publicationDecisionFixture("openclaw"),
    }),
    provenance: {
      authorityRefs: ["workspace-governance/contracts/products.yaml#openclaw"],
      mode: "synthetic-companion",
      syntheticFields: [
        "manifest",
        "listing",
        "release",
        "runtimeObservations",
        "security.evidenceRefs",
      ],
    },
    publicationPacket: managedOpenClawPacket,
    scenarioId: "managed-openclaw",
  },
  {
    expected: expectedFixture({
      publicationState: "published",
      allowedCommands: ["open-product", "view-history", "set-listing"],
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
      publicationDecision: publicationDecisionFixture("openproject"),
    }),
    provenance: {
      authorityRefs: [
        "workspace-governance/contracts/products.yaml#openproject",
      ],
      mode: "synthetic-companion",
      syntheticFields: [
        "manifest",
        "listing",
        "release",
        "runtimeObservations",
        "security.evidenceRefs",
      ],
    },
    publicationPacket: managedOpenProjectPacket,
    scenarioId: "managed-openproject",
  },
] satisfies ProductPortfolioFixtureScenario[];
