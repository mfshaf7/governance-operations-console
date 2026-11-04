import type { WorkspaceInventoryLifecyclePreparation } from "./workspace-registry-types.ts";

export function inventoryPreparationPosture(preparation: WorkspaceInventoryLifecyclePreparation) {
  return preparation.authority_kind === "internal-instance-record" ? preparation.current_record.posture : preparation.expected_state.posture;
}

export function inventoryRestoreAvailable(preparation: WorkspaceInventoryLifecyclePreparation) {
  return preparation.authority_kind === "internal-instance-record"
    ? ["inventory.suspend", "inventory.retire"].includes(preparation.latest_receipt_ref.action)
    : preparation.latest_event_ref !== null;
}
