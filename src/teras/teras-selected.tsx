import type { ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { TerasMetadataList, type TerasMetadataItem } from "./teras-metadata";
import { TerasPanel, TerasPanelHeader } from "./teras-panel";
import type { TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

type TerasSelectedPanelVariant = "compact" | "rich";
type TerasSelectedPanelAction = {
  description: ReactNode;
  kicker?: string;
  node?: ReactNode;
  title: ReactNode;
};
type TerasSelectedPanelStatus = {
  label?: ReactNode;
  tone?: TerasTone;
};

export function TerasRequiredActionCard({
  action,
  className,
  description,
  kicker = "Required Action",
  title,
}: {
  action?: ReactNode;
  className?: string;
  description: ReactNode;
  kicker?: string;
  title: ReactNode;
}) {
  return (
    <div className={cx(styles.terasRequiredActionCard, className)}>
      <TerasPanelHeader
        description={description}
        kicker={kicker}
        title={title}
      />
      {action ? (
        <div className={styles.terasRequiredActionCardActionRow}>
          {action}
        </div>
      ) : null}
    </div>
  );
}

export function TerasSelectedPanel({
  action,
  className,
  description,
  facts,
  kicker,
  meta,
  selected = false,
  status,
  title,
  tone = "info",
  variant,
}: {
  action?: TerasSelectedPanelAction | null;
  className?: string;
  description: ReactNode;
  facts?: TerasMetadataItem[];
  kicker: string;
  meta?: TerasMetadataItem[];
  selected?: boolean;
  status?: TerasSelectedPanelStatus;
  title: ReactNode;
  tone?: TerasTone;
  variant: TerasSelectedPanelVariant;
}) {
  const statusTone = status?.tone ?? tone;

  if (variant === "compact") {
    return (
      <TerasPanel
        className={cx(styles.terasSelectedPanelCompact, className)}
        data-teras-selected-panel="compact"
        frame="flush"
        tone={tone}
        treatment={selected ? "rail" : "state"}
      >
        <TerasPanelHeader
          actionsLayout="inline"
          description={description}
          kicker={kicker}
          statusLabel={status?.label}
          statusTone={statusTone}
          title={title}
        />
        {meta?.length ? (
          <TerasMetadataList
            items={meta}
            shape="line"
            treatment="chip"
            wrap
          />
        ) : null}
        {action ? (
          <TerasRequiredActionCard
            action={action.node}
            description={action.description}
            kicker={action.kicker}
            title={action.title}
          />
        ) : null}
      </TerasPanel>
    );
  }

  return (
    <TerasPanel
      className={cx(styles.terasSelectedPanelRich, className)}
      data-teras-selected-panel="rich"
      frame="flush"
      tone={tone}
      treatment={selected ? "rail" : "state"}
    >
      <TerasPanelHeader
        description={description}
        kicker={kicker}
        statusLabel={status?.label}
        statusTone={statusTone}
        title={title}
      />
      {facts?.length || action ? (
        <div
          className={styles.terasSelectedPanelRichContent}
          data-teras-selected-panel-content="true"
        >
          {facts?.length ? <TerasMetadataList items={facts} /> : null}
          {action ? (
            <TerasRequiredActionCard
              action={action.node}
              description={action.description}
              kicker={action.kicker}
              title={action.title}
            />
          ) : null}
        </div>
      ) : null}
    </TerasPanel>
  );
}
