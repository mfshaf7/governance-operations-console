import {
  TerasActionButton,
  TerasActionRow,
  TerasPanel,
  TerasPanelHeader,
} from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import type { PrototypeClosureLifecycle } from "../../../live-runtime/prototype-closure-live-types.ts";

export function PrototypeDashboardLifecyclePanel({
  lifecycle,
  onOpenCloseout,
  onOpenHistory,
  record,
}: {
  lifecycle: PrototypeClosureLifecycle;
  onOpenCloseout: (record: PrototypeRecord) => void;
  onOpenHistory: (record: PrototypeRecord) => void;
  record: PrototypeRecord;
}) {
  const isTerminal =
    lifecycle === "retired" || lifecycle === "graduated";

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
          description="Review Studio lifecycle events and Closure receipts."
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
        description="Review the source and request a governed lifecycle change."
        kicker="Closure"
        title="Prototype Closure"
      />
      <TerasActionRow spacing="normal">
        <TerasActionButton
          onClick={() => onOpenCloseout(record)}

          emphasis="secondary"
        >
          Open Closure
        </TerasActionButton>
      </TerasActionRow>
    </TerasPanel>
  );
}
