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
  const canonicalInventory = model.source_truth === "OpenProject-backed OOS";
  const ownerScopedState = deliveryProjectionWorkspaceState(model.projection_state.status);
  return [
    ...(model.evidence_coverage && model.evidence_coverage.intake.state !== "current" ? [{
      id:"intake-evidence",label:"Intake evidence",state:model.evidence_coverage.intake.state === "unavailable"?("offline" as const):("stale" as const),
      detail:model.evidence_coverage.intake.detail,facts:[{label:"Coverage",value:model.evidence_coverage.intake.state}],
    }] : []),
    {
      detail: sourceIsPrototypeLocal
        ? "Delivery is using the curated prototype read model; no live ART read path is connected."
        : backendIsOffline
          ? model.projection_state.detail
          : canonicalInventory
            ? "Canonical ART inventory is read through OOS. Each workflow resolves its own current mutation authority."
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
        canonicalInventory
          ? "Canonical mutations use each workflow's authenticated OOS route and fresh approval checks. Inventory visibility alone does not prove an operation is available or authorized."
          : "Delivery mutation remains prototype-local from this workspace; OpenProject-backed ART stays the source adapter and future write boundary.",
      facts: [
        {
          label: "Source Truth",
          value: model.source_truth,
        },
        {
          label: "Mutation",
          value: canonicalInventory ? "workflow-scoped OOS checks" : "prototype-local",
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
      state: canonicalInventory ? ownerScopedState : "local",
      tone: canonicalInventory && ownerScopedState === "current" ? "info" : undefined,
    },
    {
      detail:
        canonicalInventory
          ? "OOS supplies this canonical inventory. Operation readiness, command authorization and durable receipts are resolved by the selected workflow, not granted by Home."
          : "OOS is represented as the future workflow boundary; current prototype actions remain local until backend wiring is admitted.",
      facts: [
        {
          label: "Boundary",
          value: canonicalInventory ? "server-only OOS-mediated" : "prototype-local / future OOS-mediated",
        },
        {
          label: "Apply Authority",
          value: canonicalInventory ? "selected workflow; explicit owner checks" : "future OOS-mediated",
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
      state: canonicalInventory ? ownerScopedState : "local",
      tone: canonicalInventory && ownerScopedState === "current" ? "info" : undefined,
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
