import type { HTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { TerasActionRow } from "./teras-action";
import { TerasContentTray } from "./teras-content-tray";
import {
  TerasPanel,
  TerasPanelHeader,
} from "./teras-panel";
import type { TerasDataAttributes, TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

type TerasRecordControlActionRowSpacing = "compact" | "none" | "normal" | "tight";

type TerasRecordControlReceipt = {
  content: ReactNode;
  kicker?: ReactNode;
  props?: HTMLAttributes<HTMLElement> & TerasDataAttributes;
};

export function TerasRecordControlActionPanel({
  action,
  actionRowSpacing = "tight",
  boundary,
  boundaryKicker,
  boundaryTitle,
  className,
  description,
  kicker,
  receipt,
  title,
  tone,
  ...props
}: {
  action: ReactNode;
  actionRowSpacing?: TerasRecordControlActionRowSpacing;
  boundary: ReactNode;
  boundaryKicker: ReactNode;
  boundaryTitle?: ReactNode;
  className?: string;
  description: ReactNode;
  kicker: string;
  receipt?: TerasRecordControlReceipt | null;
  title: ReactNode;
  tone: TerasTone;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "title">) {
  const {
    className: receiptClassName,
    ...resolvedReceiptProps
  } = receipt?.props ?? {};

  return (
    <TerasPanel
      {...props}
      className={cx(styles.terasRecordControlActionPanel, className)}
      data-teras-record-control-action-panel="true"
      tone={tone}
      treatment="rail"
    >
      <TerasPanelHeader
        description={description}
        kicker={kicker}
        title={title}
      />

      <TerasContentTray
        className={styles.terasRecordControlActionTray}
        kicker={boundaryKicker}
        title={boundaryTitle}
      >
        {boundary}
      </TerasContentTray>

      {receipt ? (
        <TerasContentTray
          {...resolvedReceiptProps}
          className={cx(
            styles.terasRecordControlActionReceipt,
            receiptClassName,
          )}
          kicker={receipt.kicker ?? "Local Receipt"}
        >
          {receipt.content}
        </TerasContentTray>
      ) : null}

      <TerasActionRow spacing={actionRowSpacing}>{action}</TerasActionRow>
    </TerasPanel>
  );
}
