import type { ProductPortfolioFixtureProvenance } from "../../types/product-portfolio-fixture-types.ts";

export function productFixtureProvenanceViolations(
  provenance: ProductPortfolioFixtureProvenance,
): string[] {
  const violations: string[] = [];

  if (
    provenance.mode === "authority-snapshot" &&
    provenance.syntheticFields.length > 0
  ) {
    violations.push("authority-snapshot-has-synthetic-fields");
  }
  if (
    provenance.mode === "synthetic-companion" &&
    (provenance.authorityRefs.length === 0 ||
      provenance.syntheticFields.length === 0)
  ) {
    violations.push("synthetic-companion-missing-provenance");
  }
  if (provenance.mode === "synthetic" && provenance.authorityRefs.length > 0) {
    violations.push("synthetic-fixture-claims-authority");
  }

  return violations;
}
