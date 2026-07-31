"use client";

import { useState, useSyncExternalStore } from "react";

import type { PrototypeWorkspaceReadModel } from "../../read-model/prototype-workspace-read-model.ts";
import type { PrototypeRecord } from "../../read-model/prototype-workspace-read-model.ts";
import type { PrototypeCommandId } from "../../work-model/commands/prototype-command-model.ts";
import type { PrototypeWorkspaceRecordFilters } from "../../read-model/selectors/prototype-workspace-selectors.ts";
import {
  getPrototypeRuntimeProjectionSnapshot,
  subscribePrototypeRuntimeProjection,
} from "../../local-runtime/prototype-runtime.ts";

export type PrototypeDialogRoute =
  | "baseline-promotion"
  | "closeout-retirement"
  | "history"
  | "dashboard"
  | "landing"
  | "movement-request"
  | "preview-runtime"
  | "candidate-promotion";

export type PrototypeControlState = ReturnType<typeof usePrototypeControlState>;

const defaultFilters: PrototypeWorkspaceRecordFilters = {
  baseline: "all",
  lifecycle: "all",
  search: "",
};

export function usePrototypeControlState(
  readModel: PrototypeWorkspaceReadModel,
) {
  const defaultSelectedRecordId =
    readModel.records.find((record) => record.lifecycle !== "retired")?.id ??
    readModel.records[0]?.id ??
    null;
  const [activeDialog, setActiveDialog] = useState<PrototypeDialogRoute | null>(
    null,
  );
  const [filters, setFilters] =
    useState<PrototypeWorkspaceRecordFilters>(defaultFilters);
  const localProjection = useSyncExternalStore(
    subscribePrototypeRuntimeProjection,
    getPrototypeRuntimeProjectionSnapshot,
    getPrototypeRuntimeProjectionSnapshot,
  );
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(
    defaultSelectedRecordId,
  );

  return {
    activeDialog,
    filters,
    runtimeProjection: localProjection,
    selectedRecordId,
    setActiveDialog,
    setFilters,
    setSelectedRecordId,
  };
}

export function prototypeDialogRouteForCommand(
  commandId: PrototypeCommandId,
): PrototypeDialogRoute {
  switch (commandId) {
    case "capture-prototype-request":
      return "landing";
    case "record-baseline-promotion":
      return "baseline-promotion";
    case "record-candidate-promotion":
      return "candidate-promotion";
    case "land-prototype-request":
      return "landing";
    case "record-closeout-retirement":
      return "closeout-retirement";
    case "prepare-movement-request":
      return "movement-request";
    case "refresh-preview-proof":
    case "confirm-preview-profile":
    case "restart-preview":
    case "save-preview-profile":
    case "start-preview":
    case "stop-preview":
      return "preview-runtime";
  }
}

export function prototypeDialogRouteForCurrentMove(
  record: PrototypeRecord,
): PrototypeDialogRoute {
  switch (record.currentMove.id) {
    case "archive":
    case "history":
      return "history";
    case "preview-proof":
      return "preview-runtime";
    case "baseline-promotion":
    case "closeout-retirement":
    case "landing":
    case "movement-request":
    case "candidate-promotion":
      return record.currentMove.id;
  }
}
