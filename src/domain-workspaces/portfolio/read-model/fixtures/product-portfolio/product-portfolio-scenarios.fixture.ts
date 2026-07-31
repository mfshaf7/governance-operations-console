import type { ProductPortfolioFixtureScenario } from "../../types/product-portfolio-fixture-types.ts";
import { publicationCandidateScenarios } from "./publication-candidates.fixture.ts";
import { catalogProductScenarios } from "./catalog-products.fixture.ts";
import { managedProductScenarios } from "./managed-products.fixture.ts";
import { publicationUpdateScenarios } from "./publication-updates.fixture.ts";

export const productPortfolioScenarios = [
  ...managedProductScenarios,
  ...catalogProductScenarios,
  ...publicationCandidateScenarios,
  ...publicationUpdateScenarios,
] satisfies ProductPortfolioFixtureScenario[];
