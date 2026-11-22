"use client";

import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { TerasPanel } from "./teras-panel";
import type { TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

export function TerasSurfaceNav({
  ariaLabel,
  children,
  className,
  description,
  keepCurrentVisible = false,
  kicker,
  title,
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  description: ReactNode;
  keepCurrentVisible?: boolean;
  kicker: ReactNode;
  title: ReactNode;
}) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!keepCurrentVisible || !nav) return;

    const revealCurrent = () => {
      const current = nav.querySelector('[aria-current="page"]');
      if (!current || nav.scrollWidth <= nav.clientWidth) return;
      const viewport = nav.getBoundingClientRect();
      const button = current.getBoundingClientRect();
      if (button.left < viewport.left) nav.scrollLeft += button.left - viewport.left - 4;
      else if (button.right > viewport.right) nav.scrollLeft += button.right - viewport.right + 4;
    };

    revealCurrent();
    const observer = new ResizeObserver(revealCurrent);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [keepCurrentVisible]);

  return (
    <TerasPanel
      className={cx(styles.terasSurfaceNav, className)}
      tone="warn"
      treatment="rail"
    >
      <div className={styles.terasSurfaceNavHeader}>
        <span>{kicker}</span>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <nav ref={navRef} aria-label={ariaLabel} className={styles.terasSurfaceNavList}>
        {children}
      </nav>
    </TerasPanel>
  );
}

export function TerasSurfaceNavButton({
  className,
  current,
  kicker,
  layout = "inline",
  meta,
  onClick,
  title,
  tone = "muted",
  ...buttonProps
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "title"> & {
  current: boolean;
  layout?: "inline" | "stacked";
  kicker: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
  tone?: TerasTone;
}) {
  return (
    <button
      {...buttonProps}
      aria-current={current ? "page" : buttonProps["aria-current"]}
      className={cx(
        styles.terasSurfaceNavButton,
        current && styles.terasSurfaceNavButtonActive,
        className,
      )}
      data-layout={layout}
      data-current={current}
      data-tone={tone}
      onClick={onClick}
      type={buttonProps.type ?? "button"}
    >
      <span>{kicker}</span>
      <strong>{title}</strong>
      {meta !== undefined ? <small>{meta}</small> : null}
    </button>
  );
}
