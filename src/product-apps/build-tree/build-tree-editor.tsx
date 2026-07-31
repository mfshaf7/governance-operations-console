"use client";

import type { ReactNode } from "react";

import {
  TerasPanel,
  TerasPanelHeader,
  TerasPanelStack,
} from "@/teras";

import type { BuildTreeViewMode } from "./build-tree-model";
import {
  buildTreeToggleAllAriaLabel,
  buildTreeToggleAllLabel,
  buildTreeViewModeOptions,
} from "./build-tree-view-contract";
import styles from "./build-tree-editor.module.css";

export type BuildTreeEditorSideFill = "first" | "last" | "middle";

export type BuildTreeEditorCopy = {
  treeDescription?: ReactNode;
  treeKicker?: string;
  treeTitle?: ReactNode;
  viewSwitchAriaLabel?: string;
};

export type BuildTreeEditorProps = {
  copy?: BuildTreeEditorCopy;
  mode: BuildTreeViewMode;
  onSelectMode: (mode: BuildTreeViewMode) => void;
  onToggleAll: () => void;
  sideContent: ReactNode;
  sideFill?: BuildTreeEditorSideFill;
  treeContent: ReactNode;
  treeFullyExpanded: boolean;
};

const defaultEditorCopy = {
  treeDescription: "Tree nodes are draft-only until review and apply.",
  treeKicker: "Tree Editor",
  treeTitle: "Draft Tree",
  viewSwitchAriaLabel: "Build Tree view mode",
};

export function BuildTreeEditor({
  copy,
  mode,
  onSelectMode,
  onToggleAll,
  sideContent,
  sideFill = "last",
  treeContent,
  treeFullyExpanded,
}: BuildTreeEditorProps) {
  const resolvedCopy = {
    ...defaultEditorCopy,
    ...copy,
  };

  return (
    <div className={styles.buildTreeEditorGrid}>
      <TerasPanel
        className={styles.buildTreeEditorTreePanel}
        frame="padded"
        treatment="neutral"
      >
        <TerasPanelHeader
          actions={
            <div
              aria-label={resolvedCopy.viewSwitchAriaLabel}
              className={styles.buildTreeEditorViewSwitch}
            >
              {buildTreeViewModeOptions.map(({ mode: optionMode, label }) => (
                <button
                  aria-pressed={mode === optionMode}
                  className={
                    mode === optionMode
                      ? styles.buildTreeEditorViewSwitchActive
                      : ""
                  }
                  key={optionMode}
                  onClick={() => onSelectMode(optionMode)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          }
          actionsLayout="inline"
          kicker={resolvedCopy.treeKicker}
          title={resolvedCopy.treeTitle}
          description={resolvedCopy.treeDescription}
        />
        <div className={styles.buildTreeEditorUtilityRow}>
          <button
            aria-label={buildTreeToggleAllAriaLabel(treeFullyExpanded)}
            className={styles.buildTreeEditorToggleAll}
            onClick={onToggleAll}
            type="button"
          >
            {buildTreeToggleAllLabel(treeFullyExpanded)}
          </button>
        </div>
        {treeContent}
      </TerasPanel>

      <TerasPanelStack fill={sideFill}>
        {sideContent}
      </TerasPanelStack>
    </div>
  );
}
