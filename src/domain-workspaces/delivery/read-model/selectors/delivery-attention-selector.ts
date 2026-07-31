import type { DeliveryPackageSummary } from "../../domain/delivery-package.ts";
import type { DeliveryTone } from "../../domain/delivery-common.ts";
import type { DeliveryReadModel } from "../delivery-read-model.ts";
import { getDeliveryEffectivePackageProjection } from "../../domain/delivery-package-posture.ts";

export type DeliveryAttentionTarget = Readonly<{
  packageId?: string;
  sourceId?: string;
  surfaceId: "execution-board" | "intake" | "refinement" | "work-design";
}>;

export type DeliveryAttentionItem = Readonly<{
  actionLabel: string;
  detail: string;
  label: string;
  rank: number;
  target: DeliveryAttentionTarget;
  title: string;
  tone: DeliveryTone;
}>;

export function getDeliveryAttentionItems(
  model: DeliveryReadModel,
): DeliveryAttentionItem[] {
  const items: DeliveryAttentionItem[] = [];
  const failedIntakeSourceRefs = new Set(
    model.intake_sources
      .filter((source) => source.intake_status === "consume_failed")
      .map((source) => source.source_ref),
  );

  for (const source of model.intake_sources) {
    if (source.intake_status === "consume_failed") {
      items.push({
        actionLabel: "Open Intake",
        detail: source.gate_summary || source.summary,
        label: "Consume Failed",
        rank: 20,
        target: {
          sourceId: source.accepted_source_id,
          surfaceId: "intake",
        },
        title: `${source.source_ref} ${source.title}`,
        tone: "danger",
      });
      continue;
    }

    if (source.intake_status === "needs_consume") {
      items.push({
        actionLabel: "Open Intake",
        detail: source.summary,
        label: "Accepted Source",
        rank: 30,
        target: {
          sourceId: source.accepted_source_id,
          surfaceId: "intake",
        },
        title: `${source.source_ref} ${source.title}`,
        tone: "warn",
      });
    }
  }

  for (const deliveryPackage of model.packages) {
    const packageItem = deliveryAttentionItemForPackage(
      deliveryPackage,
      failedIntakeSourceRefs,
    );
    if (packageItem) {
      items.push(packageItem);
    }
  }

  return items.sort(
    (left, right) =>
      left.rank - right.rank || left.title.localeCompare(right.title),
  );
}

function deliveryAttentionItemForPackage(
  deliveryPackage: DeliveryPackageSummary,
  failedIntakeSourceRefs: Set<string>,
): DeliveryAttentionItem | null {
  const packageProjection =
    getDeliveryEffectivePackageProjection(deliveryPackage);
  const packagePosture = packageProjection.posture;
  const packageSummary = packageProjection.summary;

  if (deliveryPackage.workflow_phase === "intake") {
    if (packagePosture !== "Blocked") {
      return null;
    }

    const sourceSourceRef = deliveryPackage.source_ref.replace(
      /^Proposal\s+/,
      "",
    );
    if (sourceSourceRef && failedIntakeSourceRefs.has(sourceSourceRef)) {
      return null;
    }

    return {
      actionLabel: "Open Intake",
      detail: packageSummary,
      label: "Intake Blocked",
      rank: 20,
      target: { surfaceId: "intake" },
      title: deliveryPackage.display_name,
      tone: "danger",
    };
  }

  if (deliveryPackage.workflow_phase === "work_design") {
    if (packagePosture === "Blocked") {
      return {
        actionLabel: "Open Work Design",
        detail: deliveryPackage.work_design_blocker?.summary ?? packageSummary,
        label: "Work Design Blocked",
        rank: 10,
        target: {
          packageId: deliveryPackage.delivery_package_id,
          surfaceId: "work-design",
        },
        title: deliveryPackage.display_name,
        tone: "danger",
      };
    }

    if (packagePosture === "Ready") {
      return {
        actionLabel: "Open Work Design",
        detail: packageSummary,
        label: "Design Ready",
        rank: 40,
        target: {
          packageId: deliveryPackage.delivery_package_id,
          surfaceId: "work-design",
        },
        title: deliveryPackage.display_name,
        tone: "info",
      };
    }
  }

  if (deliveryPackage.workflow_phase === "refinement") {
    if (packagePosture === "Blocked") {
      return {
        actionLabel: "Open Refinement",
        detail: packageSummary,
        label: "Refinement Blocked",
        rank: 12,
        target: {
          packageId: deliveryPackage.delivery_package_id,
          surfaceId: "refinement",
        },
        title: deliveryPackage.display_name,
        tone: "danger",
      };
    }

    if (packagePosture === "Ready") {
      return {
        actionLabel: "Open Refinement",
        detail: packageSummary,
        label: "Refinement Ready",
        rank: 50,
        target: {
          packageId: deliveryPackage.delivery_package_id,
          surfaceId: "refinement",
        },
        title: deliveryPackage.display_name,
        tone: "warn",
      };
    }
  }

  if (
    packagePosture === "Closeout Pending" &&
    deliveryPackage.workflow_phase === "execution"
  ) {
    return {
      actionLabel: "Open Board",
      detail: packageSummary,
      label: "Closeout",
      rank: 60,
      target: { surfaceId: "execution-board" },
      title: deliveryPackage.display_name,
      tone: "warn",
    };
  }

  if (
    packagePosture === "Blocked" &&
    (deliveryPackage.workflow_phase === "execution" ||
      deliveryPackage.workflow_phase === "audit_only")
  ) {
    return {
      actionLabel: "Open Board",
      detail: packageSummary,
      label: "Execution Blocked",
      rank: 14,
      target: { surfaceId: "execution-board" },
      title: deliveryPackage.display_name,
      tone: "danger",
    };
  }

  return null;
}
