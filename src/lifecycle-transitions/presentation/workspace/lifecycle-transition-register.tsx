import {
  TerasRecordCellText,
  TerasRecordMetaText,
  TerasRecordStatusStack,
  TerasRecordTable,
  TerasStatusPill,
  type TerasRecordTableColumn,
} from "@/teras";

import type {
  LifecycleTransitionOverviewItem,
} from "../lifecycle-transition-overview-view-model";
import {
  lifecycleTransitionShortReference,
  lifecycleTransitionTimestamp,
} from "./lifecycle-transitions-workspace-view-model";

const columns: TerasRecordTableColumn<LifecycleTransitionOverviewItem>[] = [
  {
    header: "Source",
    intent: "primary",
    key: "source",
    render: (item) => (
      <TerasRecordCellText
        meta={item.sourceVersion}
        title={lifecycleTransitionShortReference(item.sourceRecordId)}
      />
    ),
  },
  {
    header: "State",
    intent: "status",
    key: "state",
    render: (item) => (
      <TerasRecordStatusStack
        status={
          <TerasStatusPill size="compact" tone={item.tone}>
            {item.stateLabel}
          </TerasStatusPill>
        }
      />
    ),
  },
  {
    header: "Current owner",
    intent: "secondary",
    key: "owner",
    render: (item) => (
      <TerasRecordCellText
        meta={item.nextAction?.actionLabel}
        title={item.nextAction?.ownerLabel ?? "Target recorded"}
      />
    ),
  },
  {
    header: "Updated",
    intent: "technical",
    key: "updated",
    render: (item) => (
      <TerasRecordMetaText>
        {lifecycleTransitionTimestamp(item.updatedAt)}
      </TerasRecordMetaText>
    ),
  },
];

export function LifecycleTransitionRegister({
  items,
  onSelect,
  selectedTransitionId,
}: {
  items: LifecycleTransitionOverviewItem[];
  onSelect: (item: LifecycleTransitionOverviewItem) => void;
  selectedTransitionId: string | null;
}) {
  return (
    <TerasRecordTable
      columns={columns}
      fill
      getRowId={(item) => item.transitionId}
      onSelect={onSelect}
      rows={items}
      selectedRowId={selectedTransitionId}
    />
  );
}
