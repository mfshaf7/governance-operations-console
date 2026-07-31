import type {
  ProductPortfolioFixtureScenario,
  ProductPortfolioScenarioProjection,
  ProductPortfolioStatusAxes,
} from "../../types/product-portfolio-fixture-types.ts";
import type { ProductPublicationProjection } from "../../../work-model/publication/product-publication-review-types.ts";
import { projectProductPublication } from "../../../work-model/publication/product-publication-projection.ts";
import { productFixtureProvenanceViolations } from "./product-portfolio-fixture-validation.ts";

export function projectProductPortfolioScenario(
  scenario: ProductPortfolioFixtureScenario,
): ProductPortfolioScenarioProjection {
  const provenanceViolations = productFixtureProvenanceViolations(
    scenario.provenance,
  );
  if (provenanceViolations.length > 0) {
    throw new Error(
      `Invalid Portfolio fixture provenance for ${scenario.scenarioId}: ${provenanceViolations.join(
        ", ",
      )}`,
    );
  }

  return {
    projection: projectProductPublication(
      scenario.publicationPacket,
      scenario.projectionContext,
    ),
    projectionContext: scenario.projectionContext,
    provenance: scenario.provenance,
    publicationPacket: scenario.publicationPacket,
    scenarioId: scenario.scenarioId,
  };
}

function packetRuntimeAxes(
  scenario: ProductPortfolioFixtureScenario,
): Pick<ProductPortfolioStatusAxes, "availability" | "freshness"> {
  const observation = [...scenario.publicationPacket.runtimeObservations].sort(
    (left, right) => right.observedAt.localeCompare(left.observedAt),
  )[0];
  if (observation === undefined) {
    return { availability: "unknown", freshness: "unknown" };
  }
  const stale =
    observation.expiresAt !== null &&
    observation.expiresAt <= scenario.projectionContext.evaluatedAt;
  return {
    availability: stale ? "unknown" : observation.availability,
    freshness: stale ? "stale" : "fresh",
  };
}

export function productPortfolioStatusAxes(
  scenario: ProductPortfolioFixtureScenario,
  projection: ProductPublicationProjection,
): ProductPortfolioStatusAxes {
  const packet = scenario.publicationPacket;
  const runtime =
    projection.entry === null
      ? packetRuntimeAxes(scenario)
      : {
          availability: projection.entry.runtime.availability,
          freshness: projection.entry.provenance.freshness,
        };

  return {
    access:
      projection.entry?.experience.accessClass ??
      packet.experience.accessContract.accessClass,
    publication: projection.publicationState,
    availability: runtime.availability,
    freshness: runtime.freshness,
    listing: projection.entry?.listing.state ?? packet.listing.requestedState,
    maturity: projection.entry?.maturity.level ?? packet.maturity.level,
  };
}
