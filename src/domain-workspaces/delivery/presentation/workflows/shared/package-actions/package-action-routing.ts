import type { DeliveryTone } from "../../../../read-model/index.ts";

import type { DeliveryPackageActionRoute } from "./package-action-types.ts";
import type { DeliverySurfaceConfig } from "../../../workspace/workspace-types.ts";
import {
  deliveryPackageRegisterActionTitle,
  deliveryPackageRegisterActionTone,
  deliveryPackageRegisterStep,
  deliveryPackageRegisterStepLabel,
  deliveryPackageRegisterStatusLabel,
} from "../../../package-register/package-register-view-model.ts";
import type { DeliveryPackageRegisterPackage } from "../../../package-register/package-register-types.ts";

export type DeliveryPackageActionSummary = {
  buttonLabel: string;
  description: string;
  route: DeliveryPackageActionRoute;
  statusLabel: string;
  title: string;
  tone: DeliveryTone;
};

export function packageActionForSurface(
  surface: DeliverySurfaceConfig,
  deliveryPackage: DeliveryPackageRegisterPackage,
): DeliveryPackageActionSummary {
  if (surface.id === "work-design") {
    const recovery = deliveryPackage.delivery_package_register_recovery;
    const requiredStep =
      recovery?.registerStep ?? deliveryPackageRegisterStep(deliveryPackage);

    if (recovery) {
      if (recovery.statusLabel === "Blocked") {
        return {
          buttonLabel: "Open Design Hub",
          description:
            "This Work Design blocker stays in Design Hub until a repair clears it or risk is explicitly accepted.",
          route: "work-design",
          statusLabel: "blocked",
          title: "Open Blocked Design Hub",
          tone: "danger",
        };
      }

      return {
        buttonLabel: "Open Design Hub",
        description:
          recovery.statusLabel === "Risk Accepted"
            ? "Risk was accepted locally, so Work Design can continue while the unresolved proof remains visible in the recovery receipt."
            : `Current required step is ${recovery.stepLabel}. Open the hub to inspect status before continuing.`,
        route: "work-design",
        statusLabel: recovery.statusLabel,
        title: recovery.actionTitle,
        tone:
          recovery.statusLabel === "Risk Accepted"
            ? "danger"
            : deliveryPackageRegisterActionTone(requiredStep),
      };
    }

    if (deliveryPackageRegisterStatusLabel(deliveryPackage) === "Blocked") {
      return {
        buttonLabel: "Open Design Hub",
        description:
          "This Work Design blocker opens in Design Hub first so blocker reason, source, and recovery action stay visible.",
        route: "work-design",
        statusLabel: "blocked",
        title: "Open Blocked Design Hub",
        tone: "danger",
      };
    }

    return {
      buttonLabel: "Open Design Hub",
      description: `Current required step is ${deliveryPackageRegisterStepLabel(requiredStep)}. Open the hub to inspect status before continuing.`,
      route: "work-design",
      statusLabel: deliveryPackageRegisterStatusLabel(deliveryPackage),
      title: deliveryPackageRegisterActionTitle(requiredStep),
      tone: deliveryPackageRegisterActionTone(requiredStep),
    };
  }

  if (surface.id === "refinement") {
    const effectiveStatus = deliveryPackageRegisterStatusLabel(deliveryPackage);
    const blocked = effectiveStatus === "Blocked";
    const done = effectiveStatus === "Done";
    const deferred = effectiveStatus === "Deferred";
    return {
      buttonLabel: "Open Refinement Hub",
      description: blocked
        ? "Open the Refinement Hub first. The hub will show why the package cannot continue and route handling through Blocker Recovery."
        : done
          ? "Open the Refinement Hub first. The hub will show the completed receipt and route inspection through History."
          : deferred
            ? "Open the Refinement Hub first. The hub will show that this package is not active for Refinement apply."
            : "Open the Refinement Hub to inspect current status, required move, readiness gates, apply plan, and receipt access.",
      route: "refinement",
      statusLabel: blocked
        ? "blocked"
        : done
          ? "done"
          : deferred
            ? "deferred"
            : "ready",
      title: blocked
        ? "Open Blocked Refinement Hub"
        : done
          ? "View Refinement History"
          : deferred
            ? "Open Inactive Refinement Hub"
            : "Open Refinement Hub",
      tone: blocked ? "danger" : done ? "ok" : deferred ? "muted" : "warn",
    };
  }

  throw new Error(
    `Delivery package actions are owned by Work Design and Refinement; ${surface.id} must route through its own surface action.`,
  );
}
