import type { HTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import {
  TerasPanel,
  TerasPanelHeader,
} from "./teras-panel";
import type { TerasDataAttributes, TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

type TerasRegisterPanelDensity = "compact-control" | "normal";

export function TerasRegisterPanel({
  actions,
  actionsLayout = "inline",
  bodyProps,
  children,
  className,
  density = "normal",
  description,
  filterBar,
  headerClassName,
  kicker,
  statusLabel,
  statusTone = "info",
  title,
  ...props
}: {
  actions?: ReactNode;
  actionsLayout?: "inline" | "overlay";
  bodyProps?: HTMLAttributes<HTMLDivElement> & TerasDataAttributes;
  children: ReactNode;
  className?: string;
  density?: TerasRegisterPanelDensity;
  description?: ReactNode;
  filterBar: ReactNode;
  headerClassName?: string;
  kicker: string;
  statusLabel?: ReactNode;
  statusTone?: TerasTone;
  title: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "children">) {
  const {
    className: bodyClassName,
    ...resolvedBodyProps
  } = bodyProps ?? {};

  return (
    <TerasPanel
      {...props}
      className={cx(styles.terasRegisterPanel, className)}
      data-register-density={density}
      data-register-body-min={
        density === "compact-control" ? "compact" : "fill"
      }
      layout="header-toolbar-body"
      overflow="hidden"
      treatment="neutral"
    >
      <TerasPanelHeader
        actions={actions}
        actionsLayout={actions || statusLabel ? actionsLayout : undefined}
        className={headerClassName}
        description={description}
        kicker={kicker}
        statusLabel={actions ? undefined : statusLabel}
        statusTone={statusTone}
        title={title}
      />
      {filterBar}
      <div
        {...resolvedBodyProps}
        className={cx(styles.terasRegisterPanelBody, bodyClassName)}
      >
        {children}
      </div>
    </TerasPanel>
  );
}
