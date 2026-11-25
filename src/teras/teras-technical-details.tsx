import type { ReactNode } from "react";
import { TerasMetadataList, type TerasMetadataItem } from "./teras-metadata";
import styles from "./teras-patterns.module.css";

export type TerasTechnicalDetailItem = TerasMetadataItem;

export function TerasTechnicalDetails({ items, summary = "Technical details", children, defaultOpen = false }: {
  items: readonly TerasTechnicalDetailItem[];
  summary?: ReactNode;
  children?: ReactNode;
  defaultOpen?: boolean;
}) {
  return <details className={styles.terasTechnicalDetails} open={defaultOpen}>
    <summary>{summary}</summary>
    <div className={styles.terasTechnicalDetailsBody}>
      {items.length ? <TerasMetadataList shape="list" items={[...items]} /> : null}
      {children}
    </div>
  </details>;
}
