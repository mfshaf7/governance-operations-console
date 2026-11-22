"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { GripVertical, LockKeyhole } from "lucide-react";
import {
  TerasContentRegion, TerasEmptyState, TerasInspectionSection, TerasMetadataList,
  TerasPanelHeader, TerasRecordMetaText, TerasSelectField, TerasStatusPill, type TerasTone,
} from "@/teras";
import { ControlBoardInspectorActions, ControlBoardInspectorHeader } from "./control-board-inspection-layout";
import { ControlBoardWorkspaceFrame } from "./control-board-workspace-frame";
import { ControlBoardCard, ControlBoardCardStack, ControlBoardLanePanel, ControlBoardLaneRow } from "./control-board-dashboard";
import styles from "./control-board-planning.module.css";

export type PlanningBoardItem = {
  id: string;
  title: string;
  type: string;
  number: number | null;
  description: string;
  dependencies: readonly number[];
  epicId: number;
  epicTitle: string;
  available: boolean;
  canReturnToBacklog?: boolean;
  moveUnavailableReason?: string;
  completed?: boolean;
  scheduleSummary?: string;
};
export type PlanningColumn = {
  id: string;
  title: string;
  description: string;
  empty: string;
  tone: TerasTone;
  readOnly?: boolean;
};
const dragType = "application/x-console-pi-work-item";

export function planningItemLabel(item: Pick<PlanningBoardItem, "number" | "type">) {
  return item.number === null ? item.type : `${item.type} #${item.number}`;
}

export function PIPlanningBoard({ items, knownNodes, columns, placements, header, onMove, canvasControls, renderInspection, renderInspectorActions, assignmentLabel, emptyInspector, initialSelectedId }: {
  items: PlanningBoardItem[];
  knownNodes: readonly PlanningBoardItem[];
  columns: PlanningColumn[];
  placements: Record<string, string>;
  onMove: (id: string, iteration: string) => void;
  header: ReactNode;
  canvasControls?: ReactNode;
  renderInspectorActions?: (item: PlanningBoardItem) => ReactNode;
  renderInspection?: (item: PlanningBoardItem) => ReactNode;
  assignmentLabel: string;
  emptyInspector: string;
  initialSelectedId?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const draggingId = useRef<string | null>(null);
  const [dropColumn, setDropColumn] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [queries, setQueries] = useState<Record<string, string>>({});
  const selected = items.find(item => item.id === selectedId);
  const selectedActions = selected ? renderInspectorActions?.(selected) : null;

  function endDrag() {
    draggingId.current = null;
    setDropColumn(null);
  }

  function canMoveTo(item: PlanningBoardItem, column: PlanningColumn) {
    return item.available && !column.readOnly && (column.id !== "" || item.canReturnToBacklog)
      && (placements[item.id] ?? "") !== column.id;
  }

  function moveItem(item: PlanningBoardItem, assignment: string) {
    const column = columns.find(candidate => candidate.id === assignment);
    if (!column || !canMoveTo(item, column)) return;
    onMove(item.id, assignment);
    setSelectedId(item.id);
    setAnnouncement(`${item.title} moved to ${column.title}.`);
  }

  function startDrag(event: DragEvent<HTMLButtonElement>, item: PlanningBoardItem) {
    event.dataTransfer.setData(dragType, item.id);
    event.dataTransfer.effectAllowed = "move";
    draggingId.current = item.id;
  }

  return <ControlBoardWorkspaceFrame
    header={header}
    canvasControls={canvasControls}
    board={<>
      <p className="sr-only" role="status">{announcement}</p>
      <ControlBoardLaneRow className={styles.lanes}>
        {columns.map(column => {
          const laneItems = items.filter(item => (placements[item.id] ?? "") === column.id)
            .sort((left, right) => Number(right.available) - Number(left.available));
          const query = queries[column.id] ?? "";
          const needle = query.trim().toLowerCase();
          const shown = laneItems.filter(item =>
            `${planningItemLabel(item)} ${item.title} Epic ${item.epicId} ${item.epicTitle}`.toLowerCase().includes(needle));
          return <div key={column.id} className={styles.dropZone} data-pi-planning-column={column.title}
            data-drop-active={dropColumn === column.id ? "true" : undefined}
            onDragOver={event => {
              const item = items.find(candidate => candidate.id === draggingId.current);
              if (!item || !canMoveTo(item, column)) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              if (dropColumn !== column.id) setDropColumn(column.id);
            }}
            onDragLeave={event => {
              if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
                setDropColumn(current => current === column.id ? null : current);
              }
            }}
            onDrop={event => {
              if (!draggingId.current) return;
              event.preventDefault();
              const id = event.dataTransfer.getData(dragType);
              const item = items.find(candidate => candidate.id === id && id === draggingId.current);
              if (item) moveItem(item, column.id);
              endDrag();
            }}>
            <ControlBoardLanePanel count={laneItems.length} description={column.description} title={column.title} tone={column.tone}
              search={{ label: `Search ${column.title} items`, value: query,
                onValueChange: value => setQueries(current => ({ ...current, [column.id]: value })),
                resultLabel: needle ? `${shown.length} of ${laneItems.length} shown` : undefined }}>
              {shown.length ? <ControlBoardCardStack>
                {shown.map(item => <ControlBoardCard key={item.id} aria-pressed={selectedId === item.id}
                  className={styles.card} data-planning-item={item.id} draggable={item.available}
                  aria-description={item.moveUnavailableReason}
                  kicker={planningItemLabel(item)} title={<span className={styles.cardTitle}>{item.title}</span>}
                  detail={`Epic ${item.epicId} · ${item.epicTitle}`}
                  pills={item.completed ? <TerasStatusPill tone="ok" size="compact">Done</TerasStatusPill>
                    : item.scheduleSummary ? <TerasStatusPill tone="muted" size="compact">{item.scheduleSummary}</TerasStatusPill> : undefined}
                  tone={column.tone} selected={selectedId === item.id} onClick={() => setSelectedId(item.id)}
                  onDragStart={item.available ? event => startDrag(event, item) : undefined} onDragEnd={endDrag}>
                  {item.available
                    ? <GripVertical size={16} className={styles.grip} aria-hidden="true" />
                    : <LockKeyhole size={13} className={styles.grip} aria-hidden="true" />}
                </ControlBoardCard>)}
              </ControlBoardCardStack> : <TerasEmptyState>{needle ? "No items match this search." : column.empty}</TerasEmptyState>}
            </ControlBoardLanePanel>
          </div>;
        })}
      </ControlBoardLaneRow>
    </>}
    selected={selected ? <>
      <header>
        <ControlBoardInspectorHeader closeLabel="Close planning item details" onClose={() => setSelectedId(null)}>
          <TerasPanelHeader kicker={planningItemLabel(selected)} title={selected.title}
            description={`Epic ${selected.epicId} · ${selected.epicTitle}`}
            statusLabel={columns.find(column => column.id === (placements[selected.id] ?? ""))?.title}
            statusTone={columns.find(column => column.id === (placements[selected.id] ?? ""))?.tone} />
        </ControlBoardInspectorHeader>
        {selectedActions && <ControlBoardInspectorActions>{selectedActions}</ControlBoardInspectorActions>}
      </header>
      <TerasContentRegion scroll>
        {renderInspection?.(selected)}
        {selected.description.trim() && <TerasInspectionSection title="Description">
          <TerasRecordMetaText>{selected.description}</TerasRecordMetaText>
        </TerasInspectionSection>}
        {selected.dependencies.length > 0 && <TerasInspectionSection title="Depends on">
          <TerasMetadataList columns={1} items={selected.dependencies.map(number => {
            const prerequisite = knownNodes.find(node => node.number === number);
            return { label: prerequisite ? planningItemLabel(prerequisite) : `Work item #${number}`,
              value: prerequisite?.title ?? "Details unavailable in this plan",
              detail: prerequisite && prerequisite.epicId !== selected.epicId
                ? `Epic ${prerequisite.epicId} · ${prerequisite.epicTitle}` : undefined };
          })} />
        </TerasInspectionSection>}
        <TerasInspectionSection title={assignmentLabel}>
          {selected.available ? <TerasSelectField label={assignmentLabel === "Delivery target" ? "Target iteration" : "Move to"} options={columns.filter(column => !column.readOnly && (column.id || selected.canReturnToBacklog))
            .map(({ id, title }) => ({ label: title, value: id || "backlog" }))}
            value={placements[selected.id] || "backlog"} onValueChange={assignment => moveItem(selected, assignment === "backlog" ? "" : assignment)} />
            : <TerasRecordMetaText>{selected.moveUnavailableReason}</TerasRecordMetaText>}
        </TerasInspectionSection>
      </TerasContentRegion>
    </> : <TerasEmptyState fill>{emptyInspector}</TerasEmptyState>}
  />;
}
