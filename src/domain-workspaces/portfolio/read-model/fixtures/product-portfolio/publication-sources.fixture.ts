import type { ProductPortfolioFixtureScenario } from "../../types/product-portfolio-fixture-types.ts";
import {
  expectedFixture,
  productPacketFixture,
  projectionContextFixture,
} from "./product-portfolio-fixture-builders.ts";

const workspaceEvidenceExplorer = productPacketFixture({
  accessClass: "restricted",
  availability: "live",
  displayName: "Workspace Evidence Explorer",
  form: "operator-tool",
  governedProdPromotion: false,
  highestRealEndpoint: "platform-integrated-runtime",
  id: "workspace-evidence-explorer",
  lifecycle: "platform-integrated",
  listingScope: "internal",
  primaryExperienceKind: "operator-interface",
  purpose:
    "Give workspace operators a focused interface for inspecting governed evidence.",
  segment: "workspace",
  stageSupported: true,
  summary:
    "Managed operator surface for finding and reviewing workspace evidence.",
  tags: ["governance", "operations"],
});

export const productPortfolioPublicationSourceScenarios = [
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
        routeRef: `portfolio://publication/${workspaceEvidenceExplorer.packetId}`,
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
    provenance: {
      authorityRefs: [],
      mode: "synthetic",
      syntheticFields: ["publicationPacket"],
    },
    publicationPacket: workspaceEvidenceExplorer,
    scenarioId: "curated-workspace-evidence-explorer",
  },
] satisfies ProductPortfolioFixtureScenario[];
