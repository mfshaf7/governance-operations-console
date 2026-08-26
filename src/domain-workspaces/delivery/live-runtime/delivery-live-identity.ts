import type { DeliveryPackageSummary } from "../read-model/index.ts";

const packageRefPattern = /^delivery-package:([1-9][0-9]*)$/;

export function deliveryLivePackageRef(
  deliveryPackage: Pick<DeliveryPackageSummary, "legacy_epic_id">,
) {
  return `delivery-package:${deliveryPackage.legacy_epic_id}`;
}

export function deliveryLiveIdentity(packageRef: string) {
  const recordId = packageRef.match(packageRefPattern)?.[1];
  if (!recordId) {
    throw new Error("Delivery package identity is invalid.");
  }

  return {
    deliveryId: `delivery-${recordId}`,
    packageRef,
    sourceRef: `openproject://work_packages/${recordId}`,
  };
}
