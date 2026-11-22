import type { ReactNode } from "react";

import { TerasEmptyState, TerasFilterBar, TerasPanel, TerasPanelHeader, TerasRegisterPanel } from "@/teras";

import styles from "./control-board-planning.module.css";

export type EpicPlanningStatus = "all" | "needs-attention" | "no-issues";

const epicPlanningStatuses = [
  { value: "all", label: "All statuses" },
  { value: "needs-attention", label: "Needs attention" },
  { value: "no-issues", label: "No issues flagged" },
] as const;

export function ControlBoardPlanningOverview({
  attention, attentionCount, featureTargets, epicSearch, epicStatus, onEpicSearchChange, onEpicStatusChange, epics,
  calendarAction, calendarDates,
}: {
  attention: ReactNode;
  attentionCount: number;
  featureTargets: readonly { id: string; label: string; count: number; dateRange?: string }[];
  calendarAction?: ReactNode;
  calendarDates: "none" | "pi-only" | "iterations";
  epicSearch: string;
  epicStatus: EpicPlanningStatus;
  onEpicSearchChange: (value: string) => void;
  onEpicStatusChange: (value: EpicPlanningStatus) => void;
  epics: ReactNode;
}) {
  const maxCount = Math.max(1, ...featureTargets.map(target => target.count));
  const hasSchedule = calendarDates === "iterations";
  const targetTitle = hasSchedule ? "Delivery by iteration" : "Recorded targets";
  const targetDescription = hasSchedule ? "Feature delivery targets and saved iteration dates."
    : calendarDates === "pi-only" ? "PI dates are saved. Iteration dates have yet to be recorded."
    : "No calendar dates saved.";

  return (
    <div className={styles.overview}>
      <div className={styles.overviewPanels}>
        <TerasPanel aria-label="Planning attention" frame="padded" density="compact" spacing="tight"
          treatment="rail" tone={attentionCount ? "warn" : "info"}>
          <TerasPanelHeader kicker="Review" title="Planning attention"
            description="Resolve schedule conflicts and review gaps in the plan."
            statusLabel={attentionCount > 0 ? String(attentionCount) : undefined} statusTone="warn" />
          {attention}
        </TerasPanel>
        <TerasPanel aria-label={targetTitle} frame="padded" density="compact" spacing="tight" treatment="neutral">
          <TerasPanelHeader kicker={hasSchedule ? "Schedule" : "Planning"} title={targetTitle}
            description={targetDescription} actions={calendarAction} actionsLayout="inline" />
          {featureTargets.length ? <ul className={styles.iterationTargets} aria-label="Feature delivery targets">
            {featureTargets.map(target => <li key={target.id} className={styles.iterationTarget}
              data-missing-target={target.id === ""}>
              <span className={styles.iterationName}>{target.label}</span>
              <span className={styles.iterationCount}>{target.count}<span className="sr-only">
                {target.count === 1 ? " Feature" : " Features"}
              </span></span>
              <div className={styles.iterationTrack} aria-hidden="true">
                <div className={styles.iterationFill} style={{ width: `${target.count / maxCount * 100}%` }} />
              </div>
              {target.dateRange && <small className={styles.iterationDates}>{target.dateRange}</small>}
            </li>)}
          </ul> : <TerasEmptyState>No Feature scope recorded for this view.</TerasEmptyState>}
        </TerasPanel>
      </div>
      <TerasRegisterPanel aria-label="Epic register" kicker="Register" title="Epics in this PI" density="compact-control"
        description="Review PI objectives and Feature delivery targets across Epics."
        filterBar={<TerasFilterBar className={styles.epicFilters}
          filters={[{ label: "Filter status", value: epicStatus, options: epicPlanningStatuses,
            onValueChange: onEpicStatusChange }]}
          search={{ ariaLabel: "Find Epic", placeholder: "Search by Epic name or number…",
            value: epicSearch, onValueChange: onEpicSearchChange }} />}>
        {epics}
      </TerasRegisterPanel>
    </div>
  );
}
