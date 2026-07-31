import type {
  DeliveryPackageSummary,
  DeliveryRefinementPacket,
  DeliveryTone,
} from "../../../../read-model/index.ts";

export function refinementPacketForPackage(
  deliveryPackage: DeliveryPackageSummary,
): DeliveryRefinementPacket | null {
  return deliveryPackage.refinement_packet ?? null;
}

export function refinementSourceWorkDesignPackageId(
  packet: DeliveryRefinementPacket,
) {
  return (
    packet.handoff.finalized_brief_ref.match(
      /^brief:\/\/work-design\/([^/]+)\//,
    )?.[1] ?? null
  );
}

export function refinementPacketStatusLabel(packet: DeliveryRefinementPacket) {
  switch (packet.status) {
    case "applied":
      return "applied";
    case "blocked":
      return "blocked";
    case "drafting":
      return "drafting";
    case "ready_for_review":
      return "needs review";
    case "stale":
      return "stale";
  }
}

export function refinementPacketStatusTone(
  packet: DeliveryRefinementPacket,
): DeliveryTone {
  switch (packet.status) {
    case "applied":
      return "ok";
    case "blocked":
      return "danger";
    case "stale":
      return "muted";
    case "drafting":
    case "ready_for_review":
      return "warn";
  }
}
