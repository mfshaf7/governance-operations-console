import type { ReactNode } from "react";
import styles from "./teras-patterns.module.css";

/** A focused editor with a desktop section rail and a compact selector. */
export function TerasSectionEditorLayout({ navigation, selector, sectionSelector, children }: {
  navigation: ReactNode; selector: ReactNode; sectionSelector: ReactNode; children: ReactNode;
}) {
  return <div className={styles.terasSectionEditorLayout} data-teras-section-editor-layout="true">
    <div className={styles.terasSectionEditorNavigation}>{navigation}</div>
    <div className={styles.terasSectionEditorBody}>
      <div className={styles.terasSectionEditorControls}>
        <div className={styles.terasSectionEditorSelector}>{selector}</div>
        {sectionSelector}
      </div>
      {children}
    </div>
  </div>;
}
