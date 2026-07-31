import type { HTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import type { TerasDataAttributes } from "./teras-types";
import { cx } from "./teras-utils";

type TerasPrimarySideSlotProps = HTMLAttributes<HTMLElement> &
  TerasDataAttributes;

export function TerasPrimarySideLayout({
  className,
  primaryMain,
  primaryMainProps,
  primaryTop,
  primaryTopProps,
  sideFill,
  sideFillProps,
  sideTop,
  sideTopProps,
  ...props
}: HTMLAttributes<HTMLDivElement> &
  TerasDataAttributes & {
    primaryMain: ReactNode;
    primaryMainProps?: TerasPrimarySideSlotProps;
    primaryTop: ReactNode;
    primaryTopProps?: TerasPrimarySideSlotProps;
    sideFill: ReactNode;
    sideFillProps?: TerasPrimarySideSlotProps;
    sideTop?: ReactNode;
    sideTopProps?: TerasPrimarySideSlotProps;
  }) {
  const {
    className: primaryTopClassName,
    ...resolvedPrimaryTopProps
  } = primaryTopProps ?? {};
  const {
    className: primaryMainClassName,
    ...resolvedPrimaryMainProps
  } = primaryMainProps ?? {};
  const { className: sideTopClassName, ...resolvedSideTopProps } =
    sideTopProps ?? {};
  const { className: sideFillClassName, ...resolvedSideFillProps } =
    sideFillProps ?? {};

  return (
    <div
      {...props}
      className={cx(styles.terasPrimarySideLayout, className)}
      data-teras-primary-side-layout="true"
    >
      <section className={styles.terasPrimarySidePrimary}>
        <div
          {...resolvedPrimaryTopProps}
          className={cx(
            styles.terasPrimarySidePrimaryTop,
            primaryTopClassName,
          )}
        >
          {primaryTop}
        </div>
        <div
          {...resolvedPrimaryMainProps}
          className={cx(
            styles.terasPrimarySidePrimaryMain,
            primaryMainClassName,
          )}
        >
          {primaryMain}
        </div>
      </section>

      <aside className={styles.terasPrimarySideSide}>
        {sideTop ? (
          <div
            {...resolvedSideTopProps}
            className={cx(styles.terasPrimarySideSideTop, sideTopClassName)}
          >
            {sideTop}
          </div>
        ) : null}
        <div
          {...resolvedSideFillProps}
          className={cx(
            styles.terasPrimarySideSideFill,
            sideFillClassName,
          )}
        >
          {sideFill}
        </div>
      </aside>
    </div>
  );
}
