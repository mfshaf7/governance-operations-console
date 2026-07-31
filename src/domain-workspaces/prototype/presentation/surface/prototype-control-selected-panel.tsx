import { TerasActionButton, TerasActionRow, TerasSelectedPanel } from "@/teras";

import type { PrototypeRecord } from "../../read-model/prototype-workspace-read-model.ts";
import {
  prototypeSelectedPanelMeta,
  prototypeSelectedPanelStatus,
} from "../shared/prototype-record-display-model.ts";

export function PrototypeControlSelectedPanel({
  onOpenCurrentAction,
  onOpenDashboard,
  selectedRecord,
}: {
  onOpenCurrentAction: (record: PrototypeRecord) => void;
  onOpenDashboard: (record: PrototypeRecord) => void;
  selectedRecord: PrototypeRecord;
}) {
  const selectedStatus = prototypeSelectedPanelStatus(selectedRecord);

  return (
    <TerasSelectedPanel
      action={{
        description: selectedRecord.currentMove.detail,
        kicker: "Required Action",
        node: (
          <TerasActionRow spacing="tight">
            <TerasActionButton
              data-prototype-current-action="true"
              emphasis="primary"
              onClick={() => onOpenCurrentAction(selectedRecord)}
              tone={
                selectedRecord.currentMove.tone === "danger"
                  ? "danger"
                  : "accent"
              }
            >
              {selectedRecord.currentMove.actionLabel}
            </TerasActionButton>
            <TerasActionButton
              data-prototype-open-dashboard-action="true"
              onClick={() => onOpenDashboard(selectedRecord)}
              emphasis="secondary"
            >
              Open Dashboard
            </TerasActionButton>
          </TerasActionRow>
        ),
        title: selectedRecord.currentMove.label,
      }}
      description={selectedRecord.summary}
      kicker="Selected Prototype"
      meta={prototypeSelectedPanelMeta(selectedRecord)}
      selected
      status={{
        label: selectedStatus.label,
        tone: selectedStatus.tone,
      }}
      title={selectedRecord.name}
      tone={selectedStatus.tone}
      variant="compact"
    />
  );
}
