import { TerasActionButton, TerasSelectedPanel } from "@/teras";

import type { DeliveryPackageActionSummary } from "../workflows/shared/package-actions/package-action-routing.ts";
import type { DeliverySurfaceConfig } from "../workspace/workspace-types.ts";
import type { DeliveryPackageRegisterPackage } from "./package-register-types.ts";
import {
  deliveryPackageRegisterSelectedFacts,
  deliveryPackageRegisterSelectedPanelProjection,
} from "./package-register-view-model.ts";

export function DeliveryPackageRegisterSelectedPanel({
  action,
  deliveryPackage,
  onOpenAction,
  surface,
}: {
  action: DeliveryPackageActionSummary | null;
  deliveryPackage: DeliveryPackageRegisterPackage | null;
  onOpenAction: (deliveryPackage: DeliveryPackageRegisterPackage) => void;
  surface: DeliverySurfaceConfig;
}) {
  const selectedProjection = deliveryPackageRegisterSelectedPanelProjection({
    deliveryPackage,
    fallbackTone: surface.tone,
  });

  return (
    <TerasSelectedPanel
      selected={Boolean(deliveryPackage)}
      tone={selectedProjection.selectedTone}
      variant="rich"
      status={{
        label: selectedProjection.statusLabel,
        tone: selectedProjection.statusTone,
      }}
      kicker="Selected Package"
      title={selectedProjection.title}
      description={selectedProjection.description}
      facts={deliveryPackageRegisterSelectedFacts(deliveryPackage)}
      action={
        deliveryPackage && action
          ? {
              node: (
                <TerasActionButton
                  data-delivery-package-id={deliveryPackage.delivery_package_id}
                  data-delivery-package-action={surface.id}
                  onClick={() => onOpenAction(deliveryPackage)}
                  emphasis="primary"
                >
                  {action.buttonLabel}
                </TerasActionButton>
              ),
              description: action.description,
              kicker: "Required Action",
              title: action.title,
            }
          : null
      }
    />
  );
}
