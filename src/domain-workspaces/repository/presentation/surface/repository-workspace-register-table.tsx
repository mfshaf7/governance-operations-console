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
  rowOffset=0,
  onInspectRepository,
  onSelectRepository,
  records,
  selectedRepositoryId,
}: {
  rowOffset?:number;
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
      render: (_record, index) => String(rowOffset + index + 1).padStart(2, "0"),
    },
    {
      header: "Repository",
      intent: "primary",
      key: "repository",
      render: (record) => (
        <TerasRecordCellText
          description={repositoryRecordDescription(record)}
          title={record.providerIdentity ? `${record.providerIdentity.owner}/${record.providerIdentity.name}` : record.name}
        />
      ),
    },
    {
      header: "Visibility",
      intent: "status",
      key: "visibility",
      render: (record) => (
        <span title={record.visibilityObservedAt ? `GitHub visibility recorded ${record.visibilityObservedAt}` : "GitHub visibility has not been confirmed"}>
          {record.visibility === "private" ? "Private" : record.visibility === "internal" ? "Internal" : record.visibility === "public" ? "Public" : "Unknown"}
        </span>
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
          size="table-compact"
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
