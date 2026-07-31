import { ChevronDown } from "lucide-react";
import type { CSSProperties } from "react";

import styles from "@/product-apps/context-board/context-board-workbench.module.css";
import { TerasStatusPill } from "@/teras";
import type { WorkDesignContextSource } from "./work-design-context-board-types.ts";

type WorkDesignContextBoardSourcesProps = {
  collapsed: boolean;
  onToggle: () => void;
  sources: WorkDesignContextSource[];
  style: CSSProperties;
};

export function WorkDesignContextBoardSources({
  collapsed,
  onToggle,
  sources,
  style,
}: WorkDesignContextBoardSourcesProps) {
  return (
    <div
      className={styles.contextBoardFloatingSources}
      data-board-control="true"
      data-collapsed={collapsed ? "true" : "false"}
      style={style}
    >
      <button
        className={styles.contextBoardFloatingSourcesHeader}
        onClick={onToggle}
        type="button"
      >
        <span>Context Sources</span>
        <TerasStatusPill
          className={`${styles.contextBoardMiniPill} ${styles.contextBoardSourceCountPill}`}
          tone="info"
        >
          {sources.length} sources
        </TerasStatusPill>
        <ChevronDown aria-hidden="true" size={13} />
      </button>
      {collapsed ? null : (
        <div className={styles.contextBoardSourceCluster}>
          {sources.map((source) => (
            <div className={styles.contextBoardSourceChip} key={source.label}>
              <span className={styles.contextBoardSourceName}>
                {source.label}
              </span>
              <TerasStatusPill
                className={styles.contextBoardMiniPill}
                tone={source.tone}
              >
                {source.status}
              </TerasStatusPill>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
