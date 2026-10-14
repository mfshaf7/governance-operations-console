import type { WorkspaceContinuityProduct } from "../../../../../workspace-continuity/workspace-continuity-types.ts";

export type ProductContinuityFilter = Readonly<{
  maturity: WorkspaceContinuityProduct["maturity"] | "all";
  posture: WorkspaceContinuityProduct["posture"] | "all";
  query: string;
}>;

export function selectProductContinuityRecords(
  products: readonly WorkspaceContinuityProduct[],
  filter: ProductContinuityFilter,
) {
  const query = filter.query.trim().toLowerCase();
  return products.filter((product) => {
    const searchable = [
      product.product_id,
      product.name,
      product.owners.platform,
      product.owners.runtime,
      product.owners.security,
      ...product.owners.source,
    ].join(" ").toLowerCase();
    return (filter.maturity === "all" || product.maturity === filter.maturity) &&
      (filter.posture === "all" || product.posture === filter.posture) &&
      (!query || searchable.includes(query));
  });
}

export function productContinuitySummary(
  products: readonly WorkspaceContinuityProduct[],
) {
  return {
    active: products.filter((item) => item.posture === "active").length,
    managed: products.length,
    readinessAttention: products.filter(
      (item) => item.publication_readiness.control_state !== "current",
    ).length,
    retired: products.filter((item) => item.posture === "retired").length,
    suspended: products.filter((item) => item.posture === "suspended").length,
  };
}

export function productContinuityMaturityLabel(
  maturity: WorkspaceContinuityProduct["maturity"],
) {
  return maturity.split("-").map(capitalize).join(" ");
}

export function productContinuityReadinessLabel(
  product: WorkspaceContinuityProduct,
) {
  const readiness = product.publication_readiness;
  if (readiness.control_state === "unavailable") return "No readiness";
  if (readiness.control_state === "stale") return "Readiness stale";
  if (readiness.actionable) return "Ready";
  return readiness.outcome ?? "Not actionable";
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
