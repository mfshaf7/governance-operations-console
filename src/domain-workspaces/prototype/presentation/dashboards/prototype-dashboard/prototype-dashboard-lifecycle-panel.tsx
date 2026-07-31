import {
  TerasActionButton,
  TerasActionRow,
  TerasPanel,
  TerasPanelHeader,
} from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";

export function PrototypeDashboardLifecyclePanel({
  onOpenCloseout,
  onOpenHistory,
  record,
}: {
  onOpenCloseout: (record: PrototypeRecord) => void;
  onOpenHistory: (record: PrototypeRecord) => void;
  record: PrototypeRecord;
}) {
  const isTerminal =
    record.lifecycle === "retired" || record.lifecycle === "graduated";

  if (isTerminal) {
    return (
      <TerasPanel
        density="compact"
        fit="content"
        frame="padded"
        treatment="neutral"
        spacing="normal"
      >
        <TerasPanelHeader
          description="Review retained receipts and closeout evidence."
          kicker="History"
          title="Review archive"
        />
        <TerasActionRow spacing="normal">
          <TerasActionButton
            onClick={() => onOpenHistory(record)}

            emphasis="secondary"
          >
            View History
          </TerasActionButton>
        </TerasActionRow>
      </TerasPanel>
    );
  }

  return (
    <TerasPanel
      density="compact"
      fit="content"
      frame="padded"
      treatment="neutral"
      spacing="normal"
    >
      <TerasPanelHeader
        description="Prepare lifecycle closeout when this prototype should stop."
        kicker="Closeout"
        title="Closeout / Retirement"
      />
      <TerasActionRow spacing="normal">
        <TerasActionButton
          disabled={record.landing.state !== "landed"}
          onClick={() => onOpenCloseout(record)}

          emphasis="secondary"
        >
          Open Closeout
        </TerasActionButton>
      </TerasActionRow>
    </TerasPanel>
  );
}
