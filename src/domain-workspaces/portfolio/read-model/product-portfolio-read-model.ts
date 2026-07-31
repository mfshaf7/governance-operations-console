import { productPortfolioPublicationSourceScenarios } from "./fixtures/product-portfolio/publication-sources.fixture.ts";
import { productPortfolioScenarios } from "./fixtures/product-portfolio/product-portfolio-scenarios.fixture.ts";
import { projectProductPortfolioScenario } from "./fixtures/product-portfolio/product-portfolio-scenario-projection.ts";
import { productPortfolioReadModelFromProjections } from "./selectors/product-portfolio-selectors.ts";

export const productPortfolioReadModel =
  productPortfolioReadModelFromProjections(
    productPortfolioScenarios.map(projectProductPortfolioScenario),
    productPortfolioPublicationSourceScenarios.map(
      projectProductPortfolioScenario,
    ),
  );
