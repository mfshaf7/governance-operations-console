"use client";

import { ChevronRight } from "lucide-react";

import { ConsoleShellPanel } from "../console-shell/console-shell-panel";
import { operationWorkbenchSelectorEntries } from "./operation-workbench-selector-model";
import type { OperationWorkbenchSelectorEntry } from "./operation-workbench-selector-model";

export function OperationWorkbenchSelector({
  onSelect,
  selected,
}: {
  onSelect: (entry: OperationWorkbenchSelectorEntry | null) => void;
  selected: OperationWorkbenchSelectorEntry | null;
}) {
  return (
    <ConsoleShellPanel
      className={`operator-approval-panel ${
        selected ? "operator-approval-panel-active" : ""
      }`}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="section-kicker mono text-[11px] uppercase tracking-[0.28em]">
            Operation Workbench
          </p>
          <h2 className="section-heading mt-1 text-xl font-semibold tracking-[-0.04em]">
            Manage operation lifecycles.
          </h2>
        </div>
        <span className="operator-approval-summary mono rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.18em]">
          {operationWorkbenchSelectorEntries.length} paths
        </span>
      </div>
      <div className="operator-approval-strip mt-4 grid gap-1.5 md:grid-cols-4 xl:grid-cols-7">
        {operationWorkbenchSelectorEntries.map((surface, index) => (
          <button
            key={surface.label}
            className={`operator-approval-button rounded-xl px-3 py-2.5 ${
              selected?.label === surface.label
                ? "operator-approval-button-active"
                : ""
            }`}
            type="button"
            onClick={() =>
              onSelect(selected?.label === surface.label ? null : surface)
            }
          >
            <div className="flex items-center gap-2">
              <span className="operator-approval-index mono">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="operator-approval-label truncate text-sm font-semibold tracking-[-0.03em]">
                {surface.label}
              </p>
              <ChevronRight className="operator-approval-chevron ml-auto h-3.5 w-3.5" />
            </div>
          </button>
        ))}
      </div>
      {selected ? (
        <div className="operator-approval-tray-bridge" aria-hidden="true" />
      ) : null}
    </ConsoleShellPanel>
  );
}
