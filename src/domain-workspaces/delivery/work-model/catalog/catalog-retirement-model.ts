import type { DeliveryCatalogValue } from "../../domain/delivery-types.ts";

export function catalogRetirementRequiresRequest(
  value: DeliveryCatalogValue | null,
) {
  return value !== null && value.usage_count > 0;
}

export function catalogRetirementReceiptLabel(
  value: DeliveryCatalogValue | null,
) {
  return catalogRetirementRequiresRequest(value)
    ? "Retirement request staged"
    : "Retirement staged";
}
