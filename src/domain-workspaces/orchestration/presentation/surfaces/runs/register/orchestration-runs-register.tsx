import {
  TerasActionButton,
  TerasRecordCellText,
  TerasRecordTable,
  type TerasRecordTableColumn,
  TerasStatusPill,
} from "@/teras";

import type { OrchestrationRunRecord } from "@/domain-workspaces/orchestration/domain/orchestration-run-types";
import {
  formatOrchestrationRunTimestamp,
  orchestrationRunCurrentNode,
  orchestrationRunEffectPostureLabel,
  orchestrationRunStateLabel,
  orchestrationRunStateTone,
} from "../orchestration-runs-view-model.ts";

export function OrchestrationRunsRegister({
  onOpenRun,
  onSelectRun,
  records,
  selectedRunId,
}: {
  onOpenRun: (record: OrchestrationRunRecord) => void;
  onSelectRun: (record: OrchestrationRunRecord) => void;
  records: OrchestrationRunRecord[];
  selectedRunId: string | null;
}) {
  const columns: Array<TerasRecordTableColumn<OrchestrationRunRecord>> = [
    {
      header: "Run",
      intent: "primary",
      key: "run-source",
      render: (record) => (
        <TerasRecordCellText
          description={`${record.sourceDomain} / ${record.sourceRecordRef}`}
          meta={`${record.definitionId} / v${record.definitionVersion}`}
          title={record.runId}
          variant="value-stack"
        />
      ),
    },
    {
      header: "Current Node",
      intent: "secondary",
      key: "current-node",
      render: (record) => {
        const node = orchestrationRunCurrentNode(record);

        return (
          <TerasRecordCellText
            description={node?.owner ?? "Awaiting scheduling"}
            title={node?.label ?? "Not started"}
            variant="value-stack"
          />
        );
      },
    },
    {
      header: "State",
      intent: "status",
      key: "state",
      render: (record) => (
        <TerasStatusPill tone={orchestrationRunStateTone(record.state)}>
          {orchestrationRunStateLabel(record.state)}
        </TerasStatusPill>
      ),
    },
    {
      header: "Updated",
      intent: "technical",
      key: "updated",
      render: (record) => (
        <TerasRecordCellText
          description={orchestrationRunEffectPostureLabel(record.effectPosture)}
          title={formatOrchestrationRunTimestamp(record.updatedAt)}
          variant="value-stack"
        />
      ),
    },
    {
      header: "Action",
      intent: "action",
      key: "action",
      render: (record) => (
        <TerasActionButton
          onClick={(event) => {
            event.stopPropagation();
            onOpenRun(record);
          }}
          size="table-compact"
          emphasis="secondary"
        >
          Open
        </TerasActionButton>
      ),
    },
  ];

  return (
    <TerasRecordTable
      columns={columns}
      fill
      getRowId={(record) => record.id}
      onSelect={onSelectRun}
      rows={records}
      selectedRowId={selectedRunId}
    />
  );
}
