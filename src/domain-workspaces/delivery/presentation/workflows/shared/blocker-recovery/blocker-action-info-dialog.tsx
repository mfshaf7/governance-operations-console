"use client";

import {
  TerasStatusItem,
  TerasList,
  TerasDialog,
  TerasContentTray,
  TerasTrayStack,
} from "@/teras";

import type { DeliveryBlockerRecoveryAction } from "./blocker-recovery-model.ts";

type DeliveryBlockerActionInfoDialogProps = {
  blockerCheckLocations: string[];
  blockerPossibleCauses: string[];
  onClose: () => void;
  open: boolean;
  selectedBlockerRecoveryAction: DeliveryBlockerRecoveryAction;
};

export function DeliveryBlockerActionInfoDialog({
  blockerCheckLocations,
  blockerPossibleCauses,
  onClose,
  open,
  selectedBlockerRecoveryAction,
}: DeliveryBlockerActionInfoDialogProps) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      width="standard"
      closeLabel="Close recovery action info"
      description="Read what this recovery path does, why it fits this blocker, and which proof is required before recording the action."
      kicker="Recovery Action Info"
      onClose={onClose}
      open={open}
      title={selectedBlockerRecoveryAction.label}
    >
      <TerasTrayStack spacing="compact">
        <TerasContentTray
          description={selectedBlockerRecoveryAction.description}
          kicker="Action Purpose"
          title={selectedBlockerRecoveryAction.label}
        />

        <TerasContentTray kicker="Diagnosis" title="Why It Can Happen">
          <TerasList>
            {blockerPossibleCauses.map((cause, index) => (
              <TerasStatusItem
                key={`${cause}-${index}`}
                tone="warn"
                detail={cause}
                label={`Cause ${index + 1}`}
                status="cause"
              />
            ))}
          </TerasList>
        </TerasContentTray>

        <TerasContentTray
          kicker="Evidence"
          title={
            selectedBlockerRecoveryAction.clearsBlocker
              ? "Recovery Proof Required"
              : "Still Blocked Proof"
          }
        >
          <TerasList>
            {selectedBlockerRecoveryAction.evidenceLines.map((line, index) => (
              <TerasStatusItem
                key={`${line}-${index}`}
                tone="ok"
                detail={line}
                label={`Proof ${index + 1}`}
                status="proof"
              />
            ))}
          </TerasList>
        </TerasContentTray>

        <TerasContentTray kicker="Checkpoints" title="Where To Check">
          <TerasList>
            {blockerCheckLocations.map((location, index) => (
              <TerasStatusItem
                key={`${location}-${index}`}
                tone="info"
                detail={location}
                label={`Check ${index + 1}`}
                status="source"
              />
            ))}
          </TerasList>
        </TerasContentTray>
      </TerasTrayStack>
    </TerasDialog>
  );
}
