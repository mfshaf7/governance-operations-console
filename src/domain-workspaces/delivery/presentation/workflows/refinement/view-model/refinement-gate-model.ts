import type {
  DeliveryRefinementGateStatus,
  DeliveryRefinementPacket,
  DeliveryRefinementReadinessGate,
  DeliveryTone,
} from "../../../../read-model/index.ts";

export function refinementGateStatusTone(
  status: DeliveryRefinementGateStatus,
): DeliveryTone {
  switch (status) {
    case "blocked":
      return "danger";
    case "open":
      return "warn";
    case "warning":
      return "muted";
    case "passed":
      return "ok";
  }
}

export function refinementCanApply(packet: DeliveryRefinementPacket) {
  if (packet.status === "blocked" || packet.status === "stale") {
    return false;
  }

  return packet.readiness_gates.every(
    (gate) => gate.status === "passed" || gate.status === "warning",
  );
}

export function refinementCanApplyWithMetadataReview({
  metadataReady,
  packet,
}: {
  metadataReady: boolean;
  packet: DeliveryRefinementPacket;
}) {
  if (packet.status === "blocked" || packet.status === "stale") {
    return false;
  }

  return packet.readiness_gates.every(
    (gate) =>
      gate.status === "passed" ||
      gate.status === "warning" ||
      (metadataReady && refinementGateAcceptsMetadataDraft(gate)),
  );
}

export function refinementOpenGateCount(packet: DeliveryRefinementPacket) {
  return packet.readiness_gates.filter(
    (gate) => gate.status === "blocked" || gate.status === "open",
  ).length;
}

export function refinementEffectiveOpenGateCount({
  metadataReady,
  packet,
}: {
  metadataReady: boolean;
  packet: DeliveryRefinementPacket;
}) {
  return packet.readiness_gates.filter(
    (gate) =>
      gate.status === "blocked" ||
      (gate.status === "open" &&
        !(metadataReady && refinementGateAcceptsMetadataDraft(gate))),
  ).length;
}

export function refinementGateAcceptsMetadataDraft(
  gate: DeliveryRefinementReadinessGate,
) {
  return (
    gate.status === "open" &&
    Boolean(gate.oos_route) &&
    (gate.oos_route?.includes("/delivery-work-items/") ||
      gate.oos_route?.includes("/delivery-initiatives/"))
  );
}

export function refinementGateReviewState({
  gate,
  metadataReady,
}: {
  gate: DeliveryRefinementReadinessGate;
  metadataReady: boolean;
}): {
  detail: string;
  label: string;
  tone: DeliveryTone;
} {
  if (metadataReady && refinementGateAcceptsMetadataDraft(gate)) {
    return {
      detail: `${gate.detail} Local Metadata Workbench decisions are ready for operator apply review.`,
      label: "draft ready",
      tone: "info",
    };
  }

  return {
    detail: gate.detail,
    label: gate.status,
    tone: refinementGateStatusTone(gate.status),
  };
}
