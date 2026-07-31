import type { HTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import type { TerasDataAttributes } from "./teras-types";
import { cx } from "./teras-utils";

export function TerasSelectorValueInspectorLayout({
  children,
  className,
  inspector,
  inspectorProps,
  selector,
  selectorProps,
  values,
  valuesProps,
  ...props
}: HTMLAttributes<HTMLDivElement> &
  TerasDataAttributes & {
    inspector?: ReactNode;
    inspectorProps?: HTMLAttributes<HTMLElement> & TerasDataAttributes;
    selector?: ReactNode;
    selectorProps?: HTMLAttributes<HTMLElement> & TerasDataAttributes;
    values?: ReactNode;
    valuesProps?: HTMLAttributes<HTMLElement> & TerasDataAttributes;
  }) {
  const {
    className: selectorClassName,
    ...resolvedSelectorProps
  } = selectorProps ?? {};
  const { className: valuesClassName, ...resolvedValuesProps } =
    valuesProps ?? {};
  const {
    className: inspectorClassName,
    ...resolvedInspectorProps
  } = inspectorProps ?? {};

  return (
    <div
      {...props}
      className={cx(styles.terasSelectorValueInspectorLayout, className)}
      data-teras-selector-value-inspector-layout="true"
    >
      <section
        {...resolvedSelectorProps}
        className={cx(
          styles.terasSelectorValueInspectorSelectorZone,
          selectorClassName,
        )}
      >
        {selector}
      </section>
      <section
        {...resolvedValuesProps}
        className={cx(styles.terasSelectorValueInspectorValuesZone, valuesClassName)}
      >
        {values}
      </section>
      <aside
        {...resolvedInspectorProps}
        className={cx(
          styles.terasSelectorValueInspectorInspectorZone,
          inspectorClassName,
        )}
      >
        {inspector}
      </aside>
      {children}
    </div>
  );
}

export function TerasSelectorRailList({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div
      {...props}
      className={cx(styles.terasSelectorRailList, className)}
      data-teras-selector-rail-list="true"
    >
      {children}
    </div>
  );
}
