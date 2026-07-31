"use client";

import type { ReactNode } from "react";

import styles from "./console-shell-frame.module.css";

export type ConsoleShellFrameProps = {
  children: ReactNode;
  closeGuardLayer?: ReactNode;
  hasFocusedRuntimeSurface: boolean;
  hasFocusedSystemSurface: boolean;
  hasSelectedWorkbenchSurface: boolean;
  navigation: ReactNode;
};

export function ConsoleShellFrame({
  children,
  closeGuardLayer = null,
  hasFocusedRuntimeSurface,
  hasFocusedSystemSurface,
  hasSelectedWorkbenchSurface,
  navigation,
}: ConsoleShellFrameProps) {
  const stageClassName = hasSelectedWorkbenchSurface
    ? "console-stage-workbench-open"
    : hasFocusedRuntimeSurface
      ? "console-stage-component-open space-y-5"
      : hasFocusedSystemSurface
        ? "console-stage-system-mood-open space-y-5"
        : "space-y-5";

  return (
    <main className="console-shell">
      <section className="unsupported-viewport rounded-[30px] p-6" aria-label="Unsupported viewport">
        <p className="mono text-xs uppercase tracking-[0.24em]">Desktop Console Only</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">Open this cockpit from a laptop or desktop.</h1>
        <p className="mt-4 max-w-xl text-sm leading-6">
          Tablet and mobile operator flows need a separate simplified design. This premium command surface is enabled
          only for desktop-class viewports.
        </p>
        <p className="mono mt-5 text-[10px] uppercase tracking-[0.18em]">Required viewport: 1200px or wider</p>
      </section>
      <div className={`desktop-console ${styles.desktopLayout}`}>
        <div className={styles.navigationSlot}>{navigation}</div>
        <div className={styles.stageSlot}>
          <div className={`console-stage ${stageClassName}`}>
            {children}
          </div>
        </div>
      </div>
      {closeGuardLayer}
    </main>
  );
}
