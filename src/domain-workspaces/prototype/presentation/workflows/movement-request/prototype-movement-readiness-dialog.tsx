import { TerasStatusItem, TerasDialog, TerasList } from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import { movementGateChecklistRows } from "./prototype-movement-request-view-model.ts";

export function PrototypeMovementReadinessDialog({
  onClose,
  open,
  record,
  sourceDeliveryPacket,
}: {
  onClose: () => void;
  open: boolean;
  record: PrototypeRecord;
  sourceDeliveryPacket: boolean;
}) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      closeLabel="Close Delivery readiness facts"
      description={
        sourceDeliveryPacket
          ? "Source, baseline, custody, and issue facts retained for OOS validation."
          : "Source, baseline, custody, and issue facts retained with this local request draft."
      }
      kicker="Delivery Readiness"
      onClose={onClose}
      open={open}
      width="standard"
      title="Delivery Readiness Facts"
    >
      <TerasList frame="contained">
        {movementGateChecklistRows(record).map((row, index) => (
          <TerasStatusItem
            tone={row.tone}
            detail={row.detail}
            index={String(index + 1).padStart(2, "0")}
            key={row.id}
            label={row.label}
            status={row.status}
          />
        ))}
      </TerasList>
    </TerasDialog>
  );
}
