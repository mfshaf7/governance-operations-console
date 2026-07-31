import type {
  DeliveryProjectionState,
  DeliverySourceTruth,
} from "../domain/delivery-common.ts";
import type { DeliveryAuditEvent } from "../domain/delivery-audit.ts";
import type { DeliveryCatalogReadModel } from "../domain/delivery-catalog.ts";
import type {
  DeliveryApplyIntent,
  DeliveryArtNode,
  DeliveryBoardSummary,
  DeliveryFamilyMapGroup,
  DeliverySelectedPackage,
} from "../domain/delivery-execution.ts";
import type { DeliveryIntakeSource } from "../domain/delivery-intake.ts";
import type { DeliveryPackageSummary } from "../domain/delivery-package.ts";

export type DeliveryReadModel = {
  apply_intents: DeliveryApplyIntent[];
  family_map: {
    groups: DeliveryFamilyMapGroup[];
  };
  art_tree: {
    roots: DeliveryArtNode[];
  };
  audit_events: DeliveryAuditEvent[];
  board_summary: DeliveryBoardSummary;
  catalog: DeliveryCatalogReadModel;
  generated_at: string;
  intake_sources: DeliveryIntakeSource[];
  packages: DeliveryPackageSummary[];
  projection_state: DeliveryProjectionState;
  schema_version: 1;
  selected_delivery_package_id: string;
  selected_packages: DeliverySelectedPackage[];
  source_truth: DeliverySourceTruth;
};
