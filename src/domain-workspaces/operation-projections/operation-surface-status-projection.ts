import type {
  TerasSurfaceStatusItem,
  TerasSurfaceStatusModel,
  TerasTone,
} from "@/teras";

import type {
  OperationSurfaceStatusItem,
  OperationSurfaceStatusModel,
  OperationSurfaceStatusState,
} from "./operation-view-types.ts";

export function operationSurfaceStatusStateLabel(
  state: OperationSurfaceStatusState,
) {
  return state.replaceAll("-", " ");
}

export function resolveOperationSurfaceStatusTone(
  item: OperationSurfaceStatusItem,
): TerasTone {
  if (item.tone) {
    return item.tone;
  }

  switch (item.state) {
    case "current":
    case "online":
    case "ready":
      return "ok";
    case "denied":
    case "failed":
    case "offline":
      return "danger";
    case "stale":
      return "stale";
    case "blocked":
    case "degraded":
    case "local":
    case "syncing":
      return "warn";
  }
}

export function projectOperationSurfaceStatusItem(
  item: OperationSurfaceStatusItem,
): TerasSurfaceStatusItem {
  return {
    detail: item.detail,
    facts: item.facts,
    id: item.id,
    label: item.label,
    stateLabel: operationSurfaceStatusStateLabel(item.state),
    tone: resolveOperationSurfaceStatusTone(item),
  };
}

export function projectOperationSurfaceStatusItems(
  items: OperationSurfaceStatusItem[],
) {
  return items.map(projectOperationSurfaceStatusItem);
}

export function projectOperationSurfaceStatusModel(
  model: OperationSurfaceStatusModel,
): TerasSurfaceStatusModel {
  return {
    ...model,
    items: projectOperationSurfaceStatusItems(model.items),
  };
}
