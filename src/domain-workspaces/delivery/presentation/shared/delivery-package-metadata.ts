import type { TerasMetadataItem } from "@/teras";

import type { DeliveryPackageSummary } from "../../read-model/index.ts";

export function deliveryPackageSourceMetadata(
  deliveryPackage: DeliveryPackageSummary,
): TerasMetadataItem[] {
  return [
    { label: "Epic", value: `#${deliveryPackage.legacy_epic_id}` },
    { label: "Source", value: deliveryPackage.source_ref },
  ];
}

export function deliveryPackagePacketMetadata({
  deliveryPackage,
  packetId,
}: {
  deliveryPackage: DeliveryPackageSummary;
  packetId: string;
}): TerasMetadataItem[] {
  return [
    { label: "Epic", value: `#${deliveryPackage.legacy_epic_id}` },
    { label: "Packet", value: packetId },
  ];
}
