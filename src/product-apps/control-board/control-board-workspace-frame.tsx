import type { ReactNode } from "react";

import { TerasPanel, TerasPanelHeader, type TerasTone } from "@/teras";

import styles from "./control-board.module.css";

export function ControlBoardWorkspaceFrame({
  board,
  boardVariant = "light",
  canvasControls,
  header,
  hidden = false,
  selected,
  selectedFrame = "panel",
  selectedTone = "info",
}: {
  board?: ReactNode;
  boardVariant?: "dark" | "light";
  canvasControls?: ReactNode;
  header: ReactNode;
  hidden?: boolean;
  selected?: ReactNode;
  selectedFrame?: "bare" | "panel";
  selectedTone?: TerasTone;
}) {
  const boardPaneClassName =
    boardVariant === "dark"
      ? `${styles.controlBoardMainPane} ${styles.controlBoardMainPaneDark}`
      : styles.controlBoardMainPane;

  const split = Boolean(board && selected);
  return (
    <div className={styles.controlBoardWorkspaceFrame} hidden={hidden}>
      <TerasPanel
        className={styles.controlBoardControlStrip}
        frame="padded"
        treatment="neutral"
      >
        {header}
      </TerasPanel>

      <div className={styles.controlBoardWorkspace} data-split={split}>
        {board ? <div className={styles.controlBoardColumn}>
          <TerasPanel
            className={boardPaneClassName}
            data-control-board-canvas="true"
            data-has-controls={Boolean(canvasControls)}
            frame="padded"
            treatment="neutral"
          >
            {canvasControls ? <>
              <div className={styles.controlBoardCanvasBody} data-control-board-canvas-scroll="true">{board}</div>
              <div className={styles.controlBoardCanvasControls} data-control-board-canvas-controls="true">{canvasControls}</div>
            </> : board}
          </TerasPanel>
        </div> : null}

        {selected && (selectedFrame === "bare" ? (
          <div className={styles.controlBoardSelectedBarePane}>{selected}</div>
        ) : (
          <TerasPanel
            className={styles.controlBoardSelectedPane}
            data-control-board-inspector="true"
            frame="padded"
            layout="header-body"
            overflow="hidden"
            treatment="rail"
            tone={selectedTone}
          >
            {selected}
          </TerasPanel>
        ))}
      </div>
    </div>
  );
}

export function ControlBoardWorkspaceHeader({
  actions,
  description,
  filters,
  kicker,
  split = false,
  title,
}: {
  actions: ReactNode;
  description: ReactNode;
  filters?: ReactNode;
  kicker: string;
  split?: boolean;
  title: ReactNode;
}) {
  const heading = <TerasPanelHeader kicker={kicker} title={title} description={description}
    titleOverflow={filters ? "tooltip" : "default"} />;

  return (
    <div className={styles.controlBoardWorkspaceHeader} data-has-filters={Boolean(filters)} data-split={split}>
      {filters ? <div className={styles.controlBoardHeaderLead}>
        {heading}
        <div className={styles.controlBoardHeaderFilters} data-control-board-header-filters="true">{filters}</div>
      </div> : heading}
      {actions}
    </div>
  );
}
