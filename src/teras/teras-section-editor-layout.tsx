import type { ReactNode } from "react";
import { TerasContentRegion } from "./teras-content-layout";
import { TerasPanel } from "./teras-panel";
import styles from "./teras-patterns.module.css";

/** A focused editor with a desktop section rail and a compact selector. */
export function TerasSectionEditorLayout({ navigation, selector, sectionSelector, children, fill = false, contentKey }: {
  navigation: ReactNode; selector: ReactNode; sectionSelector: ReactNode; children: ReactNode; fill?: boolean; contentKey?: string;
}) {
  return <div className={styles.terasSectionEditorContainer} data-fill={fill}>
    <div className={styles.terasSectionEditorLayout} data-teras-section-editor-layout="true">
      <div className={styles.terasSectionEditorNavigation}>{navigation}</div>
      <TerasPanel className={styles.terasSectionEditorBody} frame="padded" density="compact" spacing="compact"
        fit={fill ? "fill" : "content"} layout={fill ? "header-body" : undefined}>
        <div className={styles.terasSectionEditorControls}>
          <div className={styles.terasSectionEditorSelector}>{selector}</div>
          {sectionSelector}
        </div>
        {fill ? <TerasContentRegion key={contentKey} className={styles.terasSectionEditorContent}
          fill>{children}</TerasContentRegion> : children}
      </TerasPanel>
    </div>
  </div>;
}
