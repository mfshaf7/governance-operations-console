import type { HTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import type { TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

type TerasMetadataShape = "grid" | "line" | "list";
type TerasMetadataTreatment = "card" | "chip";
type TerasMetadataAccent = "none" | "rail";
type TerasMetadataTopOffset = "compact" | "none" | "normal";
export type TerasMetadataItem = {
  detail?: ReactNode;
  label: ReactNode;
  title?: string;
  tone?: TerasTone;
  value: ReactNode;
};

function terasMetadataItemKey(item: TerasMetadataItem, index: number) {
  return typeof item.label === "string"
    ? `teras-metadata-${item.label}-${index}`
    : `teras-metadata-${index}`;
}

export function TerasMetadataList({
  accent = "none",
  className,
  columns = 2,
  items,
  shape = "grid",
  topOffset = "none",
  treatment = "card",
  wrap = false,
  ...props
}: {
  accent?: TerasMetadataAccent;
  className?: string;
  columns?: 1 | 2 | 3;
  items: TerasMetadataItem[];
  shape?: TerasMetadataShape;
  topOffset?: TerasMetadataTopOffset;
  treatment?: TerasMetadataTreatment;
  wrap?: boolean;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">) {
  return (
    <div
      className={cx(styles.terasMetadataList, className)}
      data-accent={accent}
      data-columns={columns}
      data-shape={shape}
      data-top-offset={topOffset}
      data-treatment={treatment}
      data-wrap={wrap}
      {...props}
    >
      {items.map((item, index) => (
        <div
          className={styles.terasMetadataItem}
          data-tone={item.tone}
          key={terasMetadataItemKey(item, index)}
          title={item.title}
        >
          <span className={styles.terasMetadataLabel}>{item.label}</span>
          <strong className={styles.terasMetadataValue}>{item.value}</strong>
          {item.detail ? (
            <small className={styles.terasMetadataDetail}>{item.detail}</small>
          ) : null}
        </div>
      ))}
    </div>
  );
}
