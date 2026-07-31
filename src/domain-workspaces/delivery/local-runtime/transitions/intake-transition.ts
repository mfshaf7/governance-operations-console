import type {
  DeliveryIntakeSource,
  DeliveryPackageSummary,
  DeliveryReadModel,
} from "../../read-model/index.ts";

import type { LocalConsumedIntakeRecord } from "./transition-record.ts";
import { deliveryIntakeSourceVersion } from "./transition-record.ts";

export function applyLocalIntakeConsumes(
  model: DeliveryReadModel,
  localRecords: Record<string, LocalConsumedIntakeRecord>,
): DeliveryReadModel {
  const localEntries = Object.entries(localRecords);

  if (localEntries.length === 0) {
    return model;
  }

  const localPackages = new Map<string, DeliveryPackageSummary>();
  const intakeSources = model.intake_sources.map((source) => {
    const localRecord = localRecords[source.accepted_source_id];

    if (
      !localRecord ||
      localRecord.sourceRecordVersion !== deliveryIntakeSourceVersion(source) ||
      source.intake_status === "consumed"
    ) {
      return source;
    }

    const deliveryPackageId = localDeliveryPackageIdForIntakeSource(source);
    localPackages.set(deliveryPackageId, {
      available_actions: [],
      backend_status: "new",
      delivery_package_id: deliveryPackageId,
      display_name: source.title,
      legacy_epic_id: legacyIdFromSourceRef(source.source_ref),
      open_child_count: 0,
      package_posture: "Ready",
      source_custody: source.source_custody,
      source_ref: `${source.source_kind === "proposal" ? "Proposal" : "Prototype"} ${source.source_ref}`,
      summary:
        "Local preview consume created the Delivery shell. Work Design owns tree shaping next.",
      target_pi: null,
      tone: "info",
      tree_root_id: `node-design-local-${source.source_ref.toLowerCase()}`,
      workflow_phase: "work_design",
    });

    return {
      ...source,
      consumed_at: localRecord.consumedAt,
      consumed_by: localRecord.consumedBy,
      delivery_package_id: deliveryPackageId,
      evidence_refs: [
        ...source.evidence_refs,
        `prototype-local://delivery/intake/${source.accepted_source_id}`,
      ],
      gate_summary:
        "Delivery shell created in local preview; consume receipt is available.",
      intake_status: "consumed" as const,
      status_label: "Consumed",
      tone: "ok" as const,
      work_design_session_ref: `wgcf://workflows/delivery-work-design/local-${source.source_ref}`,
    };
  });

  const consumedLegacyIds = new Set(
    Array.from(localPackages.values()).map(
      (deliveryPackage) => deliveryPackage.legacy_epic_id,
    ),
  );
  const existingPackages = model.packages.filter(
    (deliveryPackage) =>
      !(
        deliveryPackage.workflow_phase === "intake" &&
        consumedLegacyIds.has(deliveryPackage.legacy_epic_id)
      ),
  );
  const existingPackageIds = new Set(
    existingPackages.map(
      (deliveryPackage) => deliveryPackage.delivery_package_id,
    ),
  );
  const packages = [
    ...existingPackages,
    ...Array.from(localPackages.values()).filter(
      (deliveryPackage) =>
        !existingPackageIds.has(deliveryPackage.delivery_package_id),
    ),
  ];

  return {
    ...model,
    intake_sources: intakeSources,
    packages,
  };
}

export function localDeliveryPackageIdForIntakeSource(
  source: DeliveryIntakeSource,
) {
  return `pkg-design-local-${source.source_ref.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function legacyIdFromSourceRef(sourceRef: string) {
  const numeric = sourceRef.replace(/\D+/g, "");

  if (numeric) {
    return Number(numeric);
  }

  return Array.from(sourceRef).reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) % 1_000_000,
    0,
  );
}
