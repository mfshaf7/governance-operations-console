import {
  TerasActionButton,
  TerasRecordCellText,
  TerasRecordTable,
  type TerasRecordTableColumn,
  TerasStatusPill,
} from "@/teras";

import type { RepositoryWorkspaceRecord } from "../../read-model/repository-workspace-read-model.ts";
import {
  repositoryRecordActionLabel,
  repositoryRecordDescription,
  repositoryRecordStatusLabel,
  repositoryRecordTone,
} from "../shared/repository-display-model.ts";

export function RepositoryWorkspaceRegisterTable({
  onInspectRepository,
  onSelectRepository,
  records,
  selectedRepositoryId,
}: {
  onInspectRepository: (record: RepositoryWorkspaceRecord) => void;
  onSelectRepository: (record: RepositoryWorkspaceRecord) => void;
  records: RepositoryWorkspaceRecord[];
  selectedRepositoryId: string | null;
}) {
  const columns: Array<TerasRecordTableColumn<RepositoryWorkspaceRecord>> = [
    {
      header: "No.",
      intent: "index",
      key: "index",
      render: (_record, index) => String(index + 1).padStart(2, "0"),
    },
    {
      header: "Repository",
      intent: "primary",
      key: "repository",
      render: (record) => (
        <TerasRecordCellText
          description={repositoryRecordDescription(record)}
          title={record.name}
        />
      ),
    },
    {
      header: "Owner",
      intent: "secondary",
      key: "owner",
      render: (record) => (
        <TerasRecordCellText
          description={record.repoClass}
          title={record.owner}
        />
      ),
    },
    {
      header: "Status",
      intent: "status",
      key: "status",
      render: (record) => (
        <TerasStatusPill tone={repositoryRecordTone(record)}>
          {repositoryRecordStatusLabel(record)}
        </TerasStatusPill>
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
            onInspectRepository(record);
          }}
          emphasis="secondary"
        >
          {repositoryRecordActionLabel(record)}
        </TerasActionButton>
      ),
    },
  ];

  return (
    <TerasRecordTable
      columns={columns}
      fill
      getRowId={(record) => record.id}
      onSelect={onSelectRepository}
      rows={records}
      selectedRowId={selectedRepositoryId}
    />
  );
}
