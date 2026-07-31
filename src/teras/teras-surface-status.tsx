"use client";

import { useState } from "react";

import styles from "./teras-patterns.module.css";
import { TerasPanel, TerasPanelHeader } from "./teras-panel";
import { TerasRailButton } from "./teras-rail-button";
import { TerasStatusDetailDialog } from "./teras-status-detail-dialog";
import type { TerasSurfaceStatusModel } from "./teras-types";
import { cx } from "./teras-utils";

export function TerasSurfaceStatusPanel({
  className,
  model,
  signalAttribute,
}: {
  className?: string;
  model: TerasSurfaceStatusModel;
  signalAttribute?: string;
}) {
  const [activeStatusId, setActiveStatusId] = useState<string | null>(null);
  const activeStatus =
    model.items.find((status) => status.id === activeStatusId) ?? null;

  return (
    <>
      <TerasPanel
        className={cx(styles.terasSurfaceStatusPanel, className)}
        tone={model.tone}
        treatment="rail"
      >
        <div
          className={styles.terasSurfaceStatusContent}
          data-teras-surface-status-panel="true"
        >
          <TerasPanelHeader
            description={model.summary}
            kicker={model.kicker}
            statusLabel={model.statusLabel}
            statusTone={model.tone}
            title={model.title}
          />
          <div
            aria-label={model.ariaLabel}
            className={styles.terasSurfaceStatusGrid}
          >
            {model.items.map((status) => {
              const attributeValue = String(status.label);

              return (
                <div
                  data-teras-surface-status-signal={status.id}
                  {...(signalAttribute
                    ? { [signalAttribute]: attributeValue }
                    : {})}
                  key={status.id}
                >
                  <TerasRailButton
                    ariaLabel={`Open ${status.label} status details`}
                    available
                    current={activeStatusId === status.id}
                    detail="Open status details"
                    label={status.label}
                    onSelect={() => setActiveStatusId(status.id)}
                    stateLabel={status.stateLabel}
                    tone={status.tone}
                    variant="status"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </TerasPanel>

      <TerasStatusDetailDialog
        activeStatus={activeStatus}
        model={model}
        onClose={() => setActiveStatusId(null)}
      />
    </>
  );
}
