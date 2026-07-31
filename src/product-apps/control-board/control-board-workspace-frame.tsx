import type { ReactNode } from "react";

import { TerasPanel, TerasPanelHeader, type TerasTone } from "@/teras";

import styles from "./control-board.module.css";

export function ControlBoardWorkspaceFrame({
  board,
  boardVariant = "light",
  header,
  selected,
  selectedActive = false,
  selectedFrame = "panel",
  selectedTone = "info",
}: {
  board: ReactNode;
  boardVariant?: "dark" | "light";
  header: ReactNode;
  selected: ReactNode;
  selectedActive?: boolean;
  selectedFrame?: "bare" | "panel";
  selectedTone?: TerasTone;
}) {
  const boardPaneClassName =
    boardVariant === "dark"
      ? `${styles.controlBoardMainPane} ${styles.controlBoardMainPaneDark}`
      : styles.controlBoardMainPane;

  return (
    <div className={styles.controlBoardWorkspaceFrame}>
      <TerasPanel
        className={styles.controlBoardControlStrip}
        frame="padded"
        treatment="neutral"
      >
        {header}
      </TerasPanel>

      <div className={styles.controlBoardWorkspace}>
        <div className={styles.controlBoardColumn}>
          <TerasPanel
            className={boardPaneClassName}
            frame="padded"
            treatment="neutral"
          >
            {board}
          </TerasPanel>
        </div>

        {selectedFrame === "bare" ? (
          <div className={styles.controlBoardSelectedBarePane}>{selected}</div>
        ) : (
          <TerasPanel
            className={styles.controlBoardSelectedPane}
            frame="padded"
            treatment="rail"
            tone={selectedTone}
          >
            {selected}
          </TerasPanel>
        )}
      </div>
    </div>
  );
}

export function ControlBoardWorkspaceHeader({
  actions,
  description,
  kicker,
  title,
}: {
  actions: ReactNode;
  description: ReactNode;
  kicker: string;
  title: ReactNode;
}) {
  return (
    <div className={styles.controlBoardWorkspaceHeader}>
      <TerasPanelHeader
        kicker={kicker}
        title={title}
        description={description}
      />
      {actions}
    </div>
  );
}
