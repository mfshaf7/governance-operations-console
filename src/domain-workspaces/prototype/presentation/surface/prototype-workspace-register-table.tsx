"use client";

import {
  TerasActionButton,
  TerasRecordCellText,
  TerasRecordTable,
  TerasStatusPill,
  type TerasRecordTableColumn,
} from "@/teras";

import type { PrototypeRecord } from "../../read-model/prototype-workspace-read-model.ts";
import { prototypeOverviewContext } from "../shared/prototype-record-display-model.ts";
import {
  prototypeLifecycleLabel,
  prototypeRecordActionEmphasis,
  prototypeRecordStatusLabel,
  prototypeRecordTone,
} from "../../read-model/selectors/prototype-workspace-selectors.ts";

export function PrototypeWorkspaceRegisterTable({
  rowOffset=0,
  onOpenRecord,
  onSelectRecord,
  records,
  selectedRecordId,
}: {
  rowOffset?:number;
  onOpenRecord: (record: PrototypeRecord) => void;
  onSelectRecord: (record: PrototypeRecord) => void;
  records: PrototypeRecord[];
  selectedRecordId: string | null;
}) {
  return (
    <TerasRecordTable
      ariaLabel="Prototypes"
      columns={prototypeRegisterColumns({ onOpenRecord, rowOffset })}
      fill
      getRowId={(record) => record.id}
      onSelect={onSelectRecord}
      rows={records}
      selectedRowId={selectedRecordId}
    />
  );
}

function prototypeRegisterColumns({
  rowOffset,
  onOpenRecord,
}: {
  rowOffset:number;
  onOpenRecord: (record: PrototypeRecord) => void;
}): Array<TerasRecordTableColumn<PrototypeRecord>> {
  return [
    {
      header: "No.",
      intent: "index",
      key: "index",
      render: (_record, index) => String(rowOffset + index + 1).padStart(2, "0"),
    },
    {
      header: "Prototype",
      intent: "primary",
      key: "prototype",
      render: (record) => (
        <TerasRecordCellText description={prototypeOverviewContext(record.summary, 160)} title={record.name} />
      ),
    },
    {
      header: "Source",
      intent: "secondary",
      key: "source",
      render: (record) => (
        <TerasRecordCellText
          description={record.owner}
          title={prototypeLifecycleLabel(record.lifecycle)}
        />
      ),
    },
    {
      header: "Status",
      intent: "status",
      key: "status",
      render: (record) => (
        <TerasStatusPill tone={prototypeRecordTone(record)} wrap="nowrap">
          {prototypeRecordStatusLabel(record)}
        </TerasStatusPill>
      ),
    },
    {
      header: "Inspect",
      intent: "action",
      key: "action",
      render: (record) => (
        <TerasActionButton
          data-prototype-register-action="true"
          onClick={(event) => {
            event.stopPropagation();
            onOpenRecord(record);
          }}
          emphasis={prototypeRecordActionEmphasis(record)}
          tone={prototypeRecordTone(record) === "danger" ? "danger" : "accent"}
        >
          Inspect
        </TerasActionButton>
      ),
    },
  ];
}
