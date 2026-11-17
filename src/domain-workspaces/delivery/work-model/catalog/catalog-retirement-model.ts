import type { DeliveryCatalogValue } from "../../domain/delivery-types.ts";
export function catalogRetirementBlocked(value: DeliveryCatalogValue | null) { return value !== null && value.usage_count > 0; }
export function catalogRetirementReceiptLabel(_value: DeliveryCatalogValue | null) { return "Retired in preview"; }
