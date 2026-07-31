import {
  TerasActionButton,
  TerasRecordCellText,
  TerasRecordTable,
  type TerasRecordTableColumn,
  TerasStatusPill,
} from "@/teras";

import { orchestrationDefinitionPosture } from "../../../../read-model/definitions/orchestration-definition-selectors.ts";
import type { OrchestrationDefinitionRecord } from "@/domain-workspaces/orchestration/domain/orchestration-definition-types";
import {
  orchestrationDefinitionClassificationLabel,
  orchestrationDefinitionClassificationTone,
  orchestrationDefinitionVersionLabel,
} from "../orchestration-definitions-view-model.ts";

export function OrchestrationDefinitionsRegister({
  onOpenDefinition,
  onSelectDefinition,
  records,
  selectedDefinitionId,
}: {
  onOpenDefinition: (record: OrchestrationDefinitionRecord) => void;
  onSelectDefinition: (record: OrchestrationDefinitionRecord) => void;
  records: OrchestrationDefinitionRecord[];
  selectedDefinitionId: string | null;
}) {
  const columns: Array<TerasRecordTableColumn<OrchestrationDefinitionRecord>> =
    [
      {
        header: "Definition",
        intent: "primary",
        key: "definition",
        render: (record) => (
          <TerasRecordCellText
            description={`${record.definitionId} / ${orchestrationDefinitionVersionLabel(record)}`}
            title={record.title}
            variant="value-stack"
          />
        ),
      },
      {
        header: "Source",
        intent: "secondary",
        key: "source",
        render: (record) => (
          <TerasRecordCellText
            description={record.sourceRecordType}
            title={record.sourceDomain}
            variant="value-stack"
          />
        ),
      },
      {
        header: "Classification",
        intent: "status",
        key: "classification",
        render: (record) => (
          <TerasStatusPill
            tone={orchestrationDefinitionClassificationTone(record)}
          >
            {orchestrationDefinitionClassificationLabel(record.classification)}
          </TerasStatusPill>
        ),
      },
      {
        header: "Posture",
        intent: "status",
        key: "posture",
        render: (record) => {
          const posture = orchestrationDefinitionPosture(record);

          return (
            <TerasStatusPill tone={posture.tone}>
              {posture.label}
            </TerasStatusPill>
          );
        },
      },
      {
        header: "Action",
        intent: "action",
        key: "action",
        render: (record) => (
          <TerasActionButton
            onClick={(event) => {
              event.stopPropagation();
              onOpenDefinition(record);
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
      onSelect={onSelectDefinition}
      rows={records}
      selectedRowId={selectedDefinitionId}
    />
  );
}
