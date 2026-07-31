import type { DeliveryIntakeSource } from "../../../read-model/index.ts";

import {
  TerasActionButton,
  TerasRecordCellText,
  TerasRecordMetaText,
  TerasRecordTable,
  type TerasRecordTableColumn,
  TerasStatusPill,
} from "@/teras";

import { intakeActionLabel } from "./intake-view-model.ts";

export function DeliveryIntakeRegisterTable({
  onAction,
  onSelect,
  selectedSourceId,
  sources,
}: {
  onAction: (source: DeliveryIntakeSource) => void;
  onSelect: (source: DeliveryIntakeSource) => void;
  selectedSourceId: string | null;
  sources: DeliveryIntakeSource[];
}) {
  const columns: Array<TerasRecordTableColumn<DeliveryIntakeSource>> = [
    {
      header: "No.",
      intent: "index",
      key: "index",
      render: (_source, index) => String(index + 1).padStart(2, "0"),
    },
    {
      header: "Accepted Source",
      intent: "primary",
      key: "source",
      render: (source) => (
        <TerasRecordCellText
          description={`${source.source_ref} / ${source.owner}`}
          title={source.title}
        />
      ),
    },
    {
      header: "Evidence",
      intent: "evidence",
      key: "evidence",
      render: (source) => (
        <TerasRecordMetaText>
          {source.evidence_refs.slice(0, 2).join(" / ")}
        </TerasRecordMetaText>
      ),
    },
    {
      header: "Status",
      intent: "status",
      key: "status",
      render: (source) => (
        <TerasStatusPill tone={source.tone}>
          {source.status_label}
        </TerasStatusPill>
      ),
    },
    {
      header: "Action",
      intent: "action",
      key: "action",
      render: (source) => (
        <TerasActionButton
          onClick={(event) => {
            event.stopPropagation();
            onAction(source);
          }}
          emphasis="secondary"
        >
          {intakeActionLabel(source)}
        </TerasActionButton>
      ),
    },
  ];

  return (
    <TerasRecordTable
      columns={columns}
      fill
      getRowId={(source) => source.accepted_source_id}
      onSelect={onSelect}
      rows={sources}
      selectedRowId={selectedSourceId}
    />
  );
}
