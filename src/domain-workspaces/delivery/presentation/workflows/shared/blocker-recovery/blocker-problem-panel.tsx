"use client";

import { TerasMetadataList, TerasPanel, TerasPanelHeader } from "@/teras";

import type { DeliveryBlockerRecoveryDialogProps } from "./blocker-recovery-dialog-types.ts";
import {
  deliveryBlockerProblemMetadata,
  deliveryBlockerProblemPanelProjection,
} from "./blocker-recovery-model.ts";

type DeliveryBlockerProblemPanelProps = Pick<
  DeliveryBlockerRecoveryDialogProps,
  | "activeBlockerIssue"
  | "blockerProblemClearanceValue"
  | "blockerProblemLockValue"
  | "blockerProblemRecoveryValue"
  | "blockerProblemStatusLabel"
  | "blockerProblemStatusTone"
  | "deliveryPackage"
>;

export function DeliveryBlockerProblemPanel({
  activeBlockerIssue,
  blockerProblemClearanceValue,
  blockerProblemLockValue,
  blockerProblemRecoveryValue,
  blockerProblemStatusLabel,
  blockerProblemStatusTone,
  deliveryPackage,
}: DeliveryBlockerProblemPanelProps) {
  const panelProjection = deliveryBlockerProblemPanelProjection({
    activeBlockerIssue,
    deliveryPackage,
  });

  return (
    <TerasPanel
      frame="padded"
      treatment="rail"
      spacing="compact"
      tone={blockerProblemStatusTone}
    >
      <TerasPanelHeader
        description={panelProjection.description}
        kicker="Problem"
        statusLabel={blockerProblemStatusLabel}
        statusTone={blockerProblemStatusTone}
        title={panelProjection.title}
      />
      <TerasMetadataList
        columns={2}
        items={deliveryBlockerProblemMetadata({
          blockerProblemClearanceValue,
          blockerProblemLockValue,
          blockerProblemRecoveryValue,
          deliveryPackage,
        })}
      />
    </TerasPanel>
  );
}
