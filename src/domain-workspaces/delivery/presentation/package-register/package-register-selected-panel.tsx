"use client";

import { useState } from "react";
import { TerasActionButton, TerasContentTray, TerasDialog, TerasSelectedPanel, TerasTechnicalDetails } from "@/teras";

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
  const [contextOpen, setContextOpen] = useState(false);
  const selectedProjection = deliveryPackageRegisterSelectedPanelProjection({
    deliveryPackage,
    fallbackTone: surface.tone,
  });

  const fullDescription = selectedProjection.description;
  const longDescription = fullDescription.length > 280;
  const description = longDescription ? `${fullDescription.slice(0, 277).trimEnd()}…` : fullDescription;
  const facts = deliveryPackageRegisterSelectedFacts(deliveryPackage).map(fact => fact.label === "Source"
    ? { ...fact, label: "Source evidence", value: <TerasTechnicalDetails items={[{ label: "Original reference", value: fact.value }]} /> }
    : fact);
  if (longDescription) facts.push({ label: "Original context", value: <TerasActionButton size="table-compact" emphasis="secondary" onClick={() => setContextOpen(true)}>Full context</TerasActionButton> });

  return (
    <>
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
      description={description}
      facts={facts}
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
    <TerasDialog open={contextOpen} onClose={() => setContextOpen(false)} title="Package Context" kicker="Original package context"
      description="Complete package summary from the selected Delivery projection." width="large" height="content" contentOverflow="auto"
      actions={<TerasActionButton emphasis="secondary" onClick={() => setContextOpen(false)}>Back to Register</TerasActionButton>}>
      <TerasContentTray title={selectedProjection.title} description={fullDescription} />
    </TerasDialog>
    </>
  );
}
