"use client";

import styles from "./teras-patterns.module.css";
import { TerasDialog } from "./teras-dialog";
import { TerasMetadataList } from "./teras-metadata";
import type {
  TerasSurfaceStatusItem,
  TerasSurfaceStatusModel,
} from "./teras-types";

export function TerasStatusDetailDialog({
  activeStatus,
  model,
  onClose,
}: {
  activeStatus: TerasSurfaceStatusItem | null;
  model: TerasSurfaceStatusModel;
  onClose: () => void;
}) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      width="standard"
      closeLabel={
        activeStatus
          ? `Close ${activeStatus.label} status details`
          : "Close status details"
      }
      description={activeStatus?.detail ?? ""}
      kicker={model.kicker}
      onClose={onClose}
      open={Boolean(activeStatus)}
      title={activeStatus ? `${activeStatus.label} Status` : "Status"}
    >
      {activeStatus ? (
        <TerasMetadataList
          className={styles.terasSurfaceStatusModalFacts}
          data-teras-surface-status-modal={activeStatus.id}
          items={activeStatus.facts}
          {...(model.detailDataAttribute
            ? { [model.detailDataAttribute]: String(activeStatus.label) }
            : {})}
        />
      ) : null}
    </TerasDialog>
  );
}
