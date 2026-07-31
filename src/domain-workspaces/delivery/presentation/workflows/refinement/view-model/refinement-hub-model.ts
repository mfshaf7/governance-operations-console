import type { TerasMetadataItem } from "@/teras";

import type {
  DeliveryPackagePosture,
  DeliveryPackageSummary,
  DeliveryRefinementApplyReceipt,
  DeliveryRefinementPacket,
  DeliveryRefinementStepId,
  DeliveryTone,
} from "../../../../read-model/index.ts";
import { getDeliveryEffectivePackageProjection } from "../../../../read-model/index.ts";

import {
  refinementCanApply,
  refinementEffectiveOpenGateCount,
} from "./refinement-gate-model.ts";
import {
  refinementPacketStatusLabel,
  refinementPacketStatusTone,
} from "./refinement-packet-model.ts";

export type RefinementHubRoute = "blocker";
export type RefinementHubStep = DeliveryRefinementStepId | "receipt";

export type RefinementHubAction = {
  buttonLabel: string;
  description: string;
  route?: RefinementHubRoute;
  step?: RefinementHubStep;
  title: string;
  tone: DeliveryTone;
};

export type RefinementBlockerStatusProjection = {
  description: string;
  facts: TerasMetadataItem[];
  title: string;
};

export function refinementHubViewProjection({
  activeReceipt = null,
  deliveryPackage,
  hubAction,
  metadataReady,
  packet,
}: {
  activeReceipt?: DeliveryRefinementApplyReceipt | null;
  deliveryPackage: DeliveryPackageSummary;
  hubAction: RefinementHubAction | null;
  metadataReady: boolean;
  packet: DeliveryRefinementPacket;
}) {
  const openGateCount = refinementEffectiveOpenGateCount({
    metadataReady,
    packet,
  });
  const packetTone = refinementPacketStatusTone(packet);
  const refinementBlocked = refinementIsBlocked({
    deliveryPackage,
    packet,
    refinementReceipt: activeReceipt,
  });
  const blockerStatus = refinementBlocked
    ? refinementBlockerStatusProjection({ deliveryPackage, packet })
    : null;
  const packageProjection = getDeliveryEffectivePackageProjection(
    deliveryPackage,
    {
      refinementReceipt: activeReceipt,
    },
  );
  const hubTone = activeReceipt
    ? activeReceipt.tone
    : refinementHubPostureTone(packageProjection.posture, packet);
  const statusFacts =
    blockerStatus?.facts ??
    refinementHubStatusMetadata({ activeReceipt, openGateCount, packet });

  return {
    actionButtonLabel: hubAction?.buttonLabel ?? "Continue",
    actionDescription:
      hubAction?.description ??
      "Continue the current Refinement step and resolve metadata before apply.",
    actionTitle: hubAction?.title ?? "Continue Refinement",
    actionTone: hubAction?.tone ?? ("warn" as DeliveryTone),
    hubTone,
    packageStatusLabel: packageProjection.posture,
    packageStatusTone: packageProjection.tone,
    packageSummary: packageProjection.summary,
    progressDescription: refinementBlocked
      ? "Normal Refinement steps stay locked until Blocker Recovery records repair proof, keeps the blocker, or accepts risk."
      : "Open a workflow step when the required move allows it. Receipt evidence lives in history.",
    progressTone: refinementBlocked
      ? ("danger" as DeliveryTone)
      : activeReceipt
        ? ("ok" as DeliveryTone)
        : packetTone,
    refinementBlocked,
    statusDescription:
      blockerStatus?.description ??
      refinementHubStatusSummary({
        activeReceipt,
        deliveryPackage,
        metadataReady,
        packet,
      }),
    statusFacts,
    statusTitle: blockerStatus
      ? blockerStatus.title
      : activeReceipt
        ? "Receipt Recorded"
        : openGateCount > 0
          ? "Readiness Needs Attention"
          : "Metadata Ready For Apply Review",
  };
}

export function refinementHubSelectedMetadata({
  deliveryPackage,
  packet,
}: {
  deliveryPackage: DeliveryPackageSummary;
  packet: DeliveryRefinementPacket;
}): TerasMetadataItem[] {
  return [
    { label: "Epic", value: `#${deliveryPackage.legacy_epic_id}` },
    { label: "Source", value: deliveryPackage.source_ref },
    {
      label: "Target PI",
      value: deliveryPackage.target_pi ?? "Not committed",
    },
    { label: "Packet", value: packet.packet_id },
  ];
}

export function refinementHubStatusMetadata({
  activeReceipt = null,
  openGateCount,
  packet,
}: {
  activeReceipt?: DeliveryRefinementApplyReceipt | null;
  openGateCount: number;
  packet: DeliveryRefinementPacket;
}): TerasMetadataItem[] {
  return [
    { label: "Open Gates", value: String(openGateCount) },
    { label: "Packet", value: packet.packet_id },
    { label: "Last Saved", value: packet.last_saved_at },
    {
      label: "Receipt",
      value: activeReceipt ? activeReceipt.receipt_id : "Pending",
    },
  ];
}

export function refinementIsBlocked({
  deliveryPackage,
  packet,
  refinementReceipt = packet.receipt,
}: {
  deliveryPackage: DeliveryPackageSummary;
  packet: DeliveryRefinementPacket;
  refinementReceipt?: DeliveryRefinementApplyReceipt | null;
}) {
  return (
    getDeliveryEffectivePackageProjection(deliveryPackage, {
      refinementReceipt,
    }).posture === "Blocked" || packet.status === "blocked"
  );
}

export function refinementBlockerStatusProjection({
  deliveryPackage,
  packet,
}: {
  deliveryPackage: DeliveryPackageSummary;
  packet: DeliveryRefinementPacket;
}): RefinementBlockerStatusProjection {
  const blockedGate =
    packet.readiness_gates.find((gate) => gate.status === "blocked") ?? null;
  const blockedField = packet.draft_groups
    .flatMap((group) => group.fields)
    .find(
      (field) =>
        field.status === "blocked" ||
        Object.values(field.target_statuses ?? {}).includes("blocked"),
    );

  return {
    description:
      blockedGate?.detail ??
      "Refinement cannot apply metadata because the package is blocked.",
    facts: [
      {
        label: "Blocked Gate",
        value: blockedGate?.label ?? "Package Posture",
      },
      {
        label: "Affected Field",
        value: blockedField?.label ?? "Metadata boundary",
      },
      {
        label: "Locked Steps",
        value: "Metadata, Readiness, Apply",
      },
      {
        label: "Recovery Path",
        value: "Blocker Recovery",
      },
    ],
    title: blockedGate?.label ?? `${deliveryPackage.display_name} is blocked`,
  };
}

export function refinementHubAction({
  activeReceipt = null,
  deliveryPackage,
  packet,
}: {
  activeReceipt?: DeliveryRefinementApplyReceipt | null;
  deliveryPackage: DeliveryPackageSummary;
  packet: DeliveryRefinementPacket;
}): RefinementHubAction {
  const packageProjection = getDeliveryEffectivePackageProjection(
    deliveryPackage,
    { refinementReceipt: activeReceipt },
  );

  if (
    refinementIsBlocked({
      deliveryPackage,
      packet,
      refinementReceipt: activeReceipt,
    })
  ) {
    return {
      buttonLabel: "Open Blocker Recovery",
      description:
        "Refinement cannot set or clear blocked state directly. Open Blocker Recovery to diagnose the blocked metadata gate, record repair proof, keep it blocked, or accept risk.",
      route: "blocker",
      title: "Blocker Route Required",
      tone: "danger",
    };
  }

  if (packageProjection.posture === "Deferred" || packet.status === "stale") {
    return {
      buttonLabel: "View History",
      description:
        "This package is not active for Refinement apply. Inspect history, then return to the source package posture outside this workflow.",
      step: "receipt",
      title: "Refinement Not Active",
      tone: "muted",
    };
  }

  if (activeReceipt || packet.receipt || packet.status === "applied") {
    return {
      buttonLabel: "View Receipt",
      description:
        activeReceipt && !packet.receipt
          ? "A local Refinement apply receipt is recorded. Inspect local receipt evidence while source package status waits for backend projection refresh."
          : "Refinement already produced an apply receipt. Inspect immutable receipt evidence before making another decision.",
      step: "receipt",
      title: "Receipt Recorded",
      tone: "ok",
    };
  }

  const blockedGate = packet.readiness_gates.find(
    (gate) => gate.status === "blocked",
  );
  if (blockedGate) {
    return {
      buttonLabel: "Review Blocked Gate",
      description: blockedGate.detail,
      step: "readiness_review",
      title: blockedGate.label,
      tone: "danger",
    };
  }

  const openGate = packet.readiness_gates.find(
    (gate) => gate.status === "open",
  );
  if (openGate) {
    return {
      buttonLabel: "Review Open Gates",
      description: openGate.detail,
      step: "readiness_review",
      title: openGate.label,
      tone: "warn",
    };
  }

  if (refinementCanApply(packet)) {
    return {
      buttonLabel: "Review Apply Plan",
      description:
        "Readiness gates allow apply review. Inspect OOS operations before submitting Refinement.",
      step: "apply_refinement",
      title: "Ready For Apply Review",
      tone: "warn",
    };
  }

  return {
    buttonLabel: "Continue Refinement",
    description:
      "Continue the current Refinement step and resolve missing metadata before apply.",
    step: packet.active_step,
    title: "Continue Current Step",
    tone: "warn",
  };
}

export function refinementHubStatusSummary({
  activeReceipt = null,
  deliveryPackage,
  metadataReady = false,
  packet,
}: {
  activeReceipt?: DeliveryRefinementApplyReceipt | null;
  deliveryPackage: DeliveryPackageSummary;
  metadataReady?: boolean;
  packet: DeliveryRefinementPacket;
}) {
  const statusLabel = refinementPacketStatusLabel(packet);
  const openGateCount = refinementEffectiveOpenGateCount({
    metadataReady,
    packet,
  });
  const packageProjection = getDeliveryEffectivePackageProjection(
    deliveryPackage,
    { refinementReceipt: activeReceipt },
  );

  if (
    refinementIsBlocked({
      deliveryPackage,
      packet,
      refinementReceipt: activeReceipt,
    })
  ) {
    return "Package is blocked. Refinement can inspect metadata, but blocker disposition must happen through Blocker Recovery.";
  }

  if (packageProjection.posture === "Deferred") {
    return "Package is deferred outside Refinement. This workflow can inspect history, but it should not apply metadata until the package returns to an active posture.";
  }

  if (activeReceipt && !packet.receipt) {
    return "A local Refinement apply receipt is recorded. Source package status remains unchanged until backend projection refreshes.";
  }

  if (packet.status === "applied") {
    return "Refinement has an apply receipt. The package can be inspected from receipt/history posture.";
  }

  if (metadataReady && openGateCount === 0) {
    return "Metadata Workbench decisions are ready for operator apply review. Inspect the OOS apply plan before submitting Refinement.";
  }

  return `Refinement packet is ${statusLabel}. Use the required move before applying metadata.`;
}

export function refinementHubPostureTone(
  posture: DeliveryPackagePosture,
  packet: DeliveryRefinementPacket,
): DeliveryTone {
  if (posture === "Blocked" || packet.status === "blocked") {
    return "danger";
  }

  if (posture === "Deferred" || packet.status === "stale") {
    return "muted";
  }

  return refinementPacketStatusTone(packet);
}
