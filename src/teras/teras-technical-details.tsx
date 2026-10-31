import type { ReactNode } from "react";
import { TerasMetadataList, type TerasMetadataItem } from "./teras-metadata";
import styles from "./teras-patterns.module.css";

export type TerasTechnicalDetailItem = TerasMetadataItem;

export function TerasTechnicalDetails({ items, summary = "Technical details" }: {
  items: readonly TerasTechnicalDetailItem[];
  summary?: ReactNode;
}) {
  return <details className={styles.terasTechnicalDetails}>
    <summary>{summary}</summary>
    <div className={styles.terasTechnicalDetailsBody}>
      <TerasMetadataList shape="list" items={[...items]} />
    </div>
  </details>;
}
