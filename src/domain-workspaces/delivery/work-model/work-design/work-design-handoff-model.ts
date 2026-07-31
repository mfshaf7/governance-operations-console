import type { DeliveryPackageSummary } from "../../domain/delivery-types.ts";

export function refinementPackageIdForWorkDesignPackage(
  deliveryPackage: Pick<DeliveryPackageSummary, "delivery_package_id">,
) {
  const refinementPackageId = deliveryPackage.delivery_package_id.replace(
    /^pkg-design-/,
    "pkg-refinement-",
  );

  return refinementPackageId === deliveryPackage.delivery_package_id
    ? `${deliveryPackage.delivery_package_id}-refinement`
    : refinementPackageId;
}
