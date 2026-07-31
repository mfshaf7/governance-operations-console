import type { DeliveryReadModel, DeliveryTone } from "../../read-model/index.ts";
import type { OperationSurfaceStatusItem } from "@/domain-workspaces/operation-projections";

export type DeliveryWorkspaceComponentStatus = OperationSurfaceStatusItem;

export function deliveryWorkspaceComponentStatuses(
  model: DeliveryReadModel,
): DeliveryWorkspaceComponentStatus[] {
  const projectionLabel = formatProjectionStatus(model.projection_state.status);
  const backendState =
    model.projection_state.status === "permission_denied"
      ? "denied"
      : "offline";
  const backendIsOffline = [
    "backend_unavailable",
    "permission_denied",
    "read_error",
  ].includes(model.projection_state.status);
  const sourceIsPrototypeLocal = model.source_truth === "mock";
  return [
    {
      detail: sourceIsPrototypeLocal
        ? "Delivery is using the curated prototype read model; no live ART read path is connected."
        : backendIsOffline
          ? model.projection_state.detail
          : "Prototype read path is available through the current Delivery projection.",
      facts: [
        {
          label: "Read Path",
          value: sourceIsPrototypeLocal
            ? "prototype fixture"
            : backendIsOffline
              ? "offline"
              : "online",
        },
        {
          label: "Backend State",
          value: sourceIsPrototypeLocal
            ? "not connected"
            : backendIsOffline
              ? projectionLabel
              : "available",
        },
        {
          label: "Source Truth",
          value: model.source_truth,
        },
        {
          label: "Generated",
          value: model.generated_at,
        },
      ],
      id: "backend",
      label: sourceIsPrototypeLocal ? "Read Model" : "Backend",
      state: sourceIsPrototypeLocal
        ? "local"
        : backendIsOffline
          ? backendState
          : "online",
      tone: sourceIsPrototypeLocal ? "info" : undefined,
    },
    {
      detail: model.projection_state.detail,
      facts: [
        {
          label: "Status",
          value: projectionLabel,
        },
        {
          label: "Checked",
          value: model.projection_state.checked_at,
        },
        {
          label: "Revision",
          value: model.projection_state.source_revision,
        },
        {
          label: "Projection Detail",
          value: model.projection_state.detail,
        },
      ],
      id: "projection",
      label: "Projection",
      tone: projectionTone(model),
      state: deliveryProjectionWorkspaceState(model.projection_state.status),
    },
    {
      detail:
        "Delivery mutation remains prototype-local from this workspace; OpenProject-backed ART stays the source adapter and future write boundary.",
      facts: [
        {
          label: "Source Truth",
          value: model.source_truth,
        },
        {
          label: "Mutation",
          value: "prototype-local",
        },
        {
          label: "Adapter",
          value: "OpenProject-backed ART",
        },
        {
          label: "Scope",
          value: "workspace delivery projection",
        },
      ],
      id: "write-path",
      label: "Write Path",
      state: "local",
    },
    {
      detail:
        "OOS is represented as the future workflow boundary; current prototype actions remain local until backend wiring is admitted.",
      facts: [
        {
          label: "Boundary",
          value: "prototype-local / future OOS-mediated",
        },
        {
          label: "Apply Authority",
          value: "future OOS-mediated",
        },
        {
          label: "Workflow Role",
          value: "orchestration boundary",
        },
        {
          label: "Mutation Scope",
          value: "no live apply from Home",
        },
      ],
      id: "oos",
      label: "OOS",
      state: "local",
    },
  ];
}

function deliveryProjectionWorkspaceState(
  status: DeliveryReadModel["projection_state"]["status"],
) {
  switch (status) {
    case "fresh":
      return "current";
    case "permission_denied":
      return "denied";
    case "read_error":
    case "backend_unavailable":
      return "failed";
    case "projection_sync_required":
      return "syncing";
    case "stale":
      return "stale";
  }
}

export function projectionTone(model: DeliveryReadModel): DeliveryTone {
  switch (model.projection_state.status) {
    case "backend_unavailable":
    case "permission_denied":
    case "read_error":
      return "danger";
    case "projection_sync_required":
    case "stale":
      return "stale";
    case "fresh":
    default:
      return "ok";
  }
}

function formatProjectionStatus(
  status: DeliveryReadModel["projection_state"]["status"],
) {
  return status.replaceAll("_", " ");
}
