import { TerasStatusItem, TerasDialog, TerasList } from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import { movementGateChecklistRows } from "./prototype-movement-request-view-model.ts";

export function PrototypeMovementReadinessDialog({
  onClose,
  open,
  record,
}: {
  onClose: () => void;
  open: boolean;
  record: PrototypeRecord;
}) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      closeLabel="Close movement readiness facts"
      description="Source, baseline, custody, and issue facts captured with this Movement request draft."
      kicker="Movement Readiness"
      onClose={onClose}
      open={open}
      width="standard"
      title="Movement Readiness Facts"
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
